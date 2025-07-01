import { type WorkbenchService } from '@affine/core/modules/workbench';
import { Service } from '@toeverything/infra';

import type { DocCommentEntity } from '../entities/doc-comment';

export class CommentPanelService extends Service {
  constructor(private readonly workbenchService: WorkbenchService) {
    super();
  }

  private readonly activePendingWatchers = new Set<() => void>();

  /**
   * Watch for pending comments on a doc comment entity and open the sidebar automatically
   */
  watchForPendingComments(entity: DocCommentEntity): () => void {
    let lastPendingCount = 0;

    const subscription = entity.pendingComments$.subscribe(pendingComments => {
      const currentCount = pendingComments.size;

      // If we have a new pending comment (not reply)
      if (currentCount > lastPendingCount) {
        const newPendingComment = Array.from(pendingComments.values()).find(
          comment => !comment.commentId // Not a reply
        );

        if (newPendingComment) {
          this.openCommentPanel();
        }
      }

      lastPendingCount = currentCount;
    });

    const dispose = () => {
      subscription.unsubscribe();
      this.activePendingWatchers.delete(dispose);
    };

    this.activePendingWatchers.add(dispose);
    return dispose;
  }

  /**
   * Open the sidebar and activate the comment tab
   */
  openCommentPanel(): void {
    const workbench = this.workbenchService.workbench;
    const activeView = workbench.activeView$.value;

    if (activeView) {
      workbench.openSidebar();
      activeView.activeSidebarTab('comment');
    }
  }

  override dispose(): void {
    // Clean up all active watchers
    for (const dispose of this.activePendingWatchers) {
      dispose();
    }
    this.activePendingWatchers.clear();
    super.dispose();
  }
}
