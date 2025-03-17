import {
  type ExistedUserInfo,
  UserProvider,
} from '@blocksuite/affine-shared/services';
import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import type { BlockStdScope } from '@blocksuite/block-std';
import { ShadowlessElement } from '@blocksuite/block-std';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import {
  type DeltaInsert,
  ZERO_WIDTH_NON_JOINER,
  ZERO_WIDTH_SPACE,
} from '@blocksuite/inline';
import { css, html } from 'lit';
import { property, state } from 'lit/decorators.js';

type AffineMemberState =
  | {
      type: 'default';
      userInfo: ExistedUserInfo;
    }
  | {
      type: 'removed';
    }
  | {
      type: 'loading';
    }
  | {
      type: 'error';
    };

export class AffineMember extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    .affine-member {
      color: ${unsafeCSSVarV2('text/primary')};
      font-feature-settings:
        'liga' off,
        'clig' off;

      /* Client/baseMedium */
      font-family: Inter;
      font-size: 15px;
      font-style: normal;
      font-weight: 500;
      line-height: 24px; /* 160% */
      padding: 0 4px;
    }
    .affine-member:hover {
      background: var(--affine-hover-color);
    }

    .affine-member[data-selected='true'] {
      background: var(--affine-hover-color);
    }

    .affine-member[data-type='default'] {
      color: ${unsafeCSSVarV2('text/primary')};
    }

    .affine-member[data-type='removed'] {
      color: ${unsafeCSSVarV2('text/disable')};
    }

    .affine-member[data-type='error'] {
      color: ${unsafeCSSVarV2('text/disable')};
    }

    .affine-member[data-type='loading'] {
      color: ${unsafeCSSVarV2('text/placeholder')};
    }
  `;

  override connectedCallback() {
    const result = super.connectedCallback();

    const userService = this.std.getOptional(UserProvider);
    const memberId = this.delta.attributes?.member;
    if (!userService || !memberId) {
      this.state = {
        type: 'error',
      };
      return result;
    }
    userService.revalidateUserInfo(memberId);
    const userInfo$ = userService.userInfo$(memberId);
    if (userInfo$.value) {
      if (userInfo$.value.removed) {
        this.state = {
          type: 'removed',
        };
      } else {
        this.state = {
          type: 'default',
          userInfo: userInfo$.value,
        };
      }
    } else {
      this.state = {
        type: 'loading',
      };
      setTimeout(() => {
        if (userInfo$.value) {
          if (userInfo$.value.removed) {
            this.state = {
              type: 'removed',
            };
          } else {
            this.state = {
              type: 'default',
              userInfo: userInfo$.value,
            };
          }
        } else {
          this.state = {
            type: 'error',
          };
        }
      }, 3000);
    }

    return result;
  }

  override render() {
    if (this.state.type === 'default') {
      const { userInfo } = this.state;
      return html`<span
        data-selected=${this.selected}
        data-type="default"
        class="affine-member"
        >@${userInfo.name ?? 'Unknown'}<v-text
          .str=${ZERO_WIDTH_NON_JOINER}
        ></v-text
      ></span>`;
    }

    if (this.state.type === 'removed') {
      return html`<span
        data-selected=${this.selected}
        data-type="removed"
        class="affine-member"
        >@Inactive Member<v-text .str=${ZERO_WIDTH_NON_JOINER}></v-text
      ></span>`;
    }

    if (this.state.type === 'error') {
      return html`<span
        data-selected=${this.selected}
        data-type="error"
        class="affine-member"
        >@Unknown Member<v-text .str=${ZERO_WIDTH_NON_JOINER}></v-text
      ></span>`;
    }

    return html`<span
      data-selected=${this.selected}
      data-type="loading"
      class="affine-member"
      >@loading...<v-text .str=${ZERO_WIDTH_NON_JOINER}></v-text
    ></span>`;
  }

  @property({ type: Object })
  accessor delta: DeltaInsert<AffineTextAttributes> = {
    insert: ZERO_WIDTH_SPACE,
    attributes: {},
  };

  @property({ type: Boolean })
  accessor selected = false;

  @property({ attribute: false })
  accessor std!: BlockStdScope;

  @state()
  accessor state: AffineMemberState = {
    type: 'loading',
  };
}
