import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NotificationNotFound, PaginationInput, URLHelper } from '../../base';
import {
  DEFAULT_WORKSPACE_NAME,
  InvitationNotificationCreate,
  InvitationReviewDeclinedNotificationCreate,
  MentionNotification,
  MentionNotificationCreate,
  Models,
  NotificationType,
  UnionNotificationBody,
  Workspace,
} from '../../models';
import { DocReader } from '../doc';
import { Mailer } from '../mail';
import { generateDocPath } from '../utils/doc';
import {
  generateWorkspaceSettingsPath,
  WorkspaceSettingsTab,
} from '../utils/workspace';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly models: Models,
    private readonly docReader: DocReader,
    private readonly mailer: Mailer,
    private readonly url: URLHelper
  ) {}

  async cleanExpiredNotifications() {
    return await this.models.notification.cleanExpiredNotifications();
  }

  async createMention(input: MentionNotificationCreate) {
    const notification = await this.models.notification.createMention(input);
    await this.sendMentionEmail(input);
    return notification;
  }

  private async sendMentionEmail(input: MentionNotificationCreate) {
    const userSetting = await this.models.userSettings.get(input.userId);
    if (!userSetting.receiveMentionEmail) {
      return;
    }
    const receiver = await this.models.user.getWorkspaceUser(input.userId);
    if (!receiver) {
      return;
    }
    const doc = await this.models.doc.getMeta(
      input.body.workspaceId,
      input.body.doc.id
    );
    const title = doc?.title || input.body.doc.title;
    const url = this.url.link(
      generateDocPath({
        workspaceId: input.body.workspaceId,
        docId: input.body.doc.id,
        mode: input.body.doc.mode,
        blockId: input.body.doc.blockId,
        elementId: input.body.doc.elementId,
      })
    );
    await this.mailer.send({
      name: 'Mention',
      to: receiver.email,
      props: {
        user: {
          $$userId: input.body.createdByUserId,
        },
        doc: {
          title,
          url,
        },
      },
    });
    this.logger.log(`Mention email sent to user ${receiver.id}`);
  }

  async createInvitation(input: InvitationNotificationCreate) {
    const workspaceId = input.body.workspaceId;
    const userId = input.userId;
    if (await this.isActiveWorkspaceUser(workspaceId, userId)) {
      return;
    }
    await this.ensureWorkspaceContentExists(workspaceId);
    const notification = await this.models.notification.createInvitation(
      input,
      NotificationType.Invitation
    );
    await this.sendInvitationEmail(input);
    return notification;
  }

  private async sendInvitationEmail(input: InvitationNotificationCreate) {
    const inviteUrl = this.url.link(`/invite/${input.body.inviteId}`);
    if (env.dev) {
      // make it easier to test in dev mode
      this.logger.debug(`Invite link: ${inviteUrl}`);
    }
    const userSetting = await this.models.userSettings.get(input.userId);
    if (!userSetting.receiveInvitationEmail) {
      return;
    }
    const receiver = await this.models.user.getWorkspaceUser(input.userId);
    if (!receiver) {
      return;
    }
    await this.mailer.send({
      name: 'MemberInvitation',
      to: receiver.email,
      props: {
        user: {
          $$userId: input.body.createdByUserId,
        },
        workspace: {
          $$workspaceId: input.body.workspaceId,
        },
        url: inviteUrl,
      },
    });
    this.logger.log(
      `Invitation email sent to user ${receiver.id} for workspace ${input.body.workspaceId}`
    );
  }

  async createInvitationAccepted(input: InvitationNotificationCreate) {
    const workspaceId = input.body.workspaceId;
    if (
      !(await this.isActiveWorkspaceUser(
        workspaceId,
        input.body.createdByUserId
      ))
    ) {
      return;
    }
    await this.ensureWorkspaceContentExists(workspaceId);
    const notification = await this.models.notification.createInvitation(
      input,
      NotificationType.InvitationAccepted
    );
    await this.sendInvitationAcceptedEmail(input);
    return notification;
  }

  private async sendInvitationAcceptedEmail(
    input: InvitationNotificationCreate
  ) {
    const inviterUserId = input.userId;
    const inviteeUserId = input.body.createdByUserId;
    const workspaceId = input.body.workspaceId;
    const userSetting = await this.models.userSettings.get(inviterUserId);
    if (!userSetting.receiveInvitationEmail) {
      return;
    }
    const inviter = await this.models.user.getWorkspaceUser(inviterUserId);
    if (!inviter) {
      return;
    }
    await this.mailer.send({
      name: 'MemberAccepted',
      to: inviter.email,
      props: {
        user: {
          $$userId: inviteeUserId,
        },
        workspace: {
          $$workspaceId: workspaceId,
        },
        url: this.url.link(
          generateWorkspaceSettingsPath({
            workspaceId,
            tab: WorkspaceSettingsTab.members,
          })
        ),
      },
    });
    this.logger.log(
      `Invitation accepted email sent to user ${inviter.id} for workspace ${workspaceId}`
    );
  }

  async createInvitationBlocked(input: InvitationNotificationCreate) {
    await this.ensureWorkspaceContentExists(input.body.workspaceId);
    return await this.models.notification.createInvitation(
      input,
      NotificationType.InvitationBlocked
    );
  }

  async createInvitationRejected(input: InvitationNotificationCreate) {
    await this.ensureWorkspaceContentExists(input.body.workspaceId);
    return await this.models.notification.createInvitation(
      input,
      NotificationType.InvitationRejected
    );
  }

  async createInvitationReviewRequest(input: InvitationNotificationCreate) {
    const workspaceId = input.body.workspaceId;
    if (
      await this.isActiveWorkspaceUser(workspaceId, input.body.createdByUserId)
    ) {
      return;
    }
    await this.ensureWorkspaceContentExists(workspaceId);
    const notification = await this.models.notification.createInvitation(
      input,
      NotificationType.InvitationReviewRequest
    );
    await this.sendInvitationReviewRequestEmail(input);
    return notification;
  }

  private async sendInvitationReviewRequestEmail(
    input: InvitationNotificationCreate
  ) {
    const inviteeUserId = input.body.createdByUserId;
    const reviewerUserId = input.userId;
    const workspaceId = input.body.workspaceId;
    const reviewer = await this.models.user.getWorkspaceUser(reviewerUserId);
    if (!reviewer) {
      return;
    }
    await this.mailer.send({
      name: 'LinkInvitationReviewRequest',
      to: reviewer.email,
      props: {
        user: {
          $$userId: inviteeUserId,
        },
        workspace: {
          $$workspaceId: workspaceId,
        },
        url: this.url.link(
          generateWorkspaceSettingsPath({
            workspaceId,
            tab: WorkspaceSettingsTab.members,
          })
        ),
      },
    });
    this.logger.log(
      `Invitation review request email sent to user ${reviewer.id} for workspace ${workspaceId}`
    );
  }

  async createInvitationReviewApproved(input: InvitationNotificationCreate) {
    const workspaceId = input.body.workspaceId;
    const userId = input.userId;
    if (!(await this.isActiveWorkspaceUser(workspaceId, userId))) {
      return;
    }
    await this.ensureWorkspaceContentExists(workspaceId);
    const notification = await this.models.notification.createInvitation(
      input,
      NotificationType.InvitationReviewApproved
    );
    await this.sendInvitationReviewApprovedEmail(input);
    return notification;
  }

  private async sendInvitationReviewApprovedEmail(
    input: InvitationNotificationCreate
  ) {
    const workspaceId = input.body.workspaceId;
    const receiverUserId = input.userId;
    const receiver = await this.models.user.getWorkspaceUser(receiverUserId);
    if (!receiver) {
      return;
    }
    await this.mailer.send({
      name: 'LinkInvitationApprove',
      to: receiver.email,
      props: {
        workspace: {
          $$workspaceId: workspaceId,
        },
        url: this.url.link(`/workspace/${workspaceId}`),
      },
    });
    this.logger.log(
      `Invitation review approved email sent to user ${receiver.id} for workspace ${workspaceId}`
    );
  }

  async createInvitationReviewDeclined(
    input: InvitationReviewDeclinedNotificationCreate
  ) {
    const workspaceId = input.body.workspaceId;
    const userId = input.userId;
    if (await this.isActiveWorkspaceUser(workspaceId, userId)) {
      return;
    }
    await this.ensureWorkspaceContentExists(workspaceId);
    const notification =
      await this.models.notification.createInvitationReviewDeclined(input);
    await this.sendInvitationReviewDeclinedEmail(input);
    return notification;
  }

  private async sendInvitationReviewDeclinedEmail(
    input: InvitationReviewDeclinedNotificationCreate
  ) {
    const workspaceId = input.body.workspaceId;
    const receiverUserId = input.userId;
    const receiver = await this.models.user.getWorkspaceUser(receiverUserId);
    if (!receiver) {
      return;
    }
    await this.mailer.send({
      name: 'LinkInvitationDecline',
      to: receiver.email,
      props: {
        workspace: {
          $$workspaceId: workspaceId,
        },
      },
    });
    this.logger.log(
      `Invitation review declined email sent to user ${receiver.id} for workspace ${workspaceId}`
    );
  }

  private async ensureWorkspaceContentExists(workspaceId: string) {
    await this.docReader.getWorkspaceContent(workspaceId);
  }

  async markAsRead(userId: string, notificationId: string) {
    try {
      await this.models.notification.markAsRead(notificationId, userId);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        // https://www.prisma.io/docs/orm/reference/error-reference#p2025
        throw new NotificationNotFound();
      }
      throw err;
    }
  }

  /**
   * Find notifications by user id, order by createdAt desc
   */
  async findManyByUserId(userId: string, options?: PaginationInput) {
    const notifications = await this.models.notification.findManyByUserId(
      userId,
      options
    );

    // fill user info
    const userIds = new Set(notifications.map(n => n.body.createdByUserId));
    const users = await this.models.user.getPublicUsers(Array.from(userIds));
    const userInfos = new Map(users.map(u => [u.id, u]));

    // fill workspace info
    const workspaceIds = new Set(notifications.map(n => n.body.workspaceId));
    const workspaces = await this.models.workspace.findMany(
      Array.from(workspaceIds)
    );
    const workspaceInfos = new Map(
      workspaces.map(w => [w.id, this.formatWorkspaceInfo(w)])
    );

    // fill latest doc title
    const mentions = notifications.filter(
      n => n.type === NotificationType.Mention
    ) as MentionNotification[];
    const mentionDocs = await this.models.doc.findMetas(
      mentions.map(m => ({
        workspaceId: m.body.workspaceId,
        docId: m.body.doc.id,
      }))
    );
    for (const [index, mention] of mentions.entries()) {
      const doc = mentionDocs[index];
      if (doc?.title) {
        // use the latest doc title
        mention.body.doc.title = doc.title;
      }
    }

    return notifications.map(n => ({
      ...n,
      body: {
        ...(n.body as UnionNotificationBody),
        // set type to body.type to improve type inference on frontend
        type: n.type,
        workspace: workspaceInfos.get(n.body.workspaceId),
        createdByUser: userInfos.get(n.body.createdByUserId),
      },
    }));
  }

  async countByUserId(userId: string) {
    return await this.models.notification.countByUserId(userId);
  }

  private formatWorkspaceInfo(workspace: Workspace) {
    return {
      id: workspace.id,
      name: workspace.name ?? DEFAULT_WORKSPACE_NAME,
      // TODO(@fengmk2): workspace avatar url is not public access by default, impl it in future
      // avatarUrl: this.workspaceBlobStorage.getAvatarUrl(
      //   workspace.id,
      //   workspace.avatarKey
      // ),
      url: this.url.link(`/workspace/${workspace.id}`),
    };
  }

  private async isActiveWorkspaceUser(workspaceId: string, userId: string) {
    const isActive = await this.models.workspaceUser.getActive(
      workspaceId,
      userId
    );
    return !!isActive;
  }
}
