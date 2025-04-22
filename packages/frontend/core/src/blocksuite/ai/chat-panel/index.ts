import './chat-panel-messages';

import type { ContextEmbedStatus } from '@affine/graphql';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/lit';
import type { EditorHost } from '@blocksuite/affine/std';
import { ShadowlessElement } from '@blocksuite/affine/std';
import type { ExtensionType, Store } from '@blocksuite/affine/store';
import { HelpIcon } from '@blocksuite/icons/lit';
import { type Signal, signal } from '@preact/signals-core';
import { css, html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { createRef, type Ref, ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';
import { throttle } from 'lodash-es';

import type {
  DocDisplayConfig,
  SearchMenuConfig,
} from '../components/ai-chat-chips';
import type { AINetworkSearchConfig } from '../components/ai-chat-input';
import { type HistoryMessage } from '../components/ai-chat-messages';
import { AIProvider } from '../provider';
import { extractSelectedContent } from '../utils/extract';
import {
  getSelectedImagesAsBlobs,
  getSelectedTextContent,
} from '../utils/selection-utils';
import type { AppSidebarConfig } from './chat-config';
import type { ChatContextValue } from './chat-context';
import type { ChatPanelMessages } from './chat-panel-messages';

const DEFAULT_CHAT_CONTEXT_VALUE: ChatContextValue = {
  quote: '',
  images: [],
  abortController: null,
  messages: [],
  status: 'idle',
  error: null,
  markdown: '',
};

export class ChatPanel extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    chat-panel {
      width: 100%;
      user-select: text;
    }

    .chat-panel-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .chat-panel-title {
      background: var(--affine-background-primary-color);
      position: relative;
      padding: 8px 0px;
      width: 100%;
      height: 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1;

      div:first-child {
        font-size: 14px;
        font-weight: 500;
        color: var(--affine-text-secondary-color);
      }

      div:last-child {
        width: 24px;
        height: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
      }

      svg {
        width: 18px;
        height: 18px;
        color: var(--affine-text-secondary-color);
      }
    }

    chat-panel-messages {
      flex: 1;
      overflow-y: hidden;
    }

    .chat-panel-hints {
      margin: 0 4px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--affine-border-color);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .chat-panel-hints :first-child {
      color: var(--affine-text-primary-color);
    }

    .chat-panel-hints :nth-child(2) {
      color: var(--affine-text-secondary-color);
    }
  `;

  private readonly _chatMessagesRef: Ref<ChatPanelMessages> =
    createRef<ChatPanelMessages>();

  // request counter to track the latest request
  private _updateHistoryCounter = 0;

  private _wheelTriggered = false;

  private readonly _updateHistory = async () => {
    const { doc } = this;

    const currentRequest = ++this._updateHistoryCounter;

    const [histories, actions] = await Promise.all([
      AIProvider.histories?.chats(doc.workspace.id, doc.id),
      AIProvider.histories?.actions(doc.workspace.id, doc.id),
    ]);

    // Check if this is still the latest request
    if (currentRequest !== this._updateHistoryCounter) {
      return;
    }

    const messages: HistoryMessage[] = actions ? [...actions] : [];

    const sessionId = await this._getSessionId();
    const history = histories?.find(history => history.sessionId === sessionId);
    if (history) {
      messages.push(...history.messages);
    }

    this.chatContextValue = {
      ...this.chatContextValue,
      messages: messages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    };

    this._scrollToEnd();
  };

  private readonly _updateEmbeddingProgress = (
    count: Record<ContextEmbedStatus, number>
  ) => {
    const total = count.finished + count.processing + count.failed;
    this.embeddingProgress = [count.finished, total];
  };

  private readonly _getSessionId = async () => {
    if (this._sessionId) {
      return this._sessionId;
    }
    const sessions = (
      (await AIProvider.session?.getSessions(
        this.doc.workspace.id,
        this.doc.id,
        { action: false }
      )) || []
    ).filter(session => !session.parentSessionId);
    const sessionId = sessions.at(-1)?.id;
    this._sessionId = sessionId;
    return this._sessionId;
  };

  private readonly _createSessionId = async () => {
    if (this._sessionId) {
      return this._sessionId;
    }
    this._sessionId = await AIProvider.session?.createSession({
      docId: this.doc.id,
      workspaceId: this.doc.workspace.id,
      promptName: 'Chat With AFFiNE AI',
    });
    return this._sessionId;
  };

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor doc!: Store;

  @property({ attribute: false })
  accessor networkSearchConfig!: AINetworkSearchConfig;

  @property({ attribute: false })
  accessor appSidebarConfig!: AppSidebarConfig;

  @property({ attribute: false })
  accessor searchMenuConfig!: SearchMenuConfig;

  @property({ attribute: false })
  accessor docDisplayConfig!: DocDisplayConfig;

  @property({ attribute: false })
  accessor extensions!: ExtensionType[];

  @state()
  accessor isLoading = false;

  @state()
  accessor chatContextValue: ChatContextValue = DEFAULT_CHAT_CONTEXT_VALUE;

  @state()
  accessor embeddingProgress: [number, number] = [0, 0];

  private _isInitialized = false;

  // always use getSessionId to get the sessionId
  private _sessionId: string | undefined = undefined;

  private _isSidebarOpen: Signal<boolean | undefined> = signal(false);

  private _sidebarWidth: Signal<number | undefined> = signal(undefined);

  private readonly _scrollToEnd = () => {
    if (!this._wheelTriggered) {
      this._chatMessagesRef.value?.scrollToEnd();
    }
  };

  private readonly _throttledScrollToEnd = throttle(this._scrollToEnd, 600);

  private readonly _initPanel = async () => {
    try {
      if (!this._isSidebarOpen.value) return;
      if (this.isLoading) return;
      const userId = (await AIProvider.userInfo)?.id;
      if (!userId) return;

      this.isLoading = true;
      await this._updateHistory();
      this.isLoading = false;
      this._isInitialized = true;
    } catch (error) {
      console.error(error);
    }
  };

  private readonly _resetPanel = () => {
    this._sessionId = undefined;
    this.chatContextValue = DEFAULT_CHAT_CONTEXT_VALUE;
    this.isLoading = false;
    this._isInitialized = false;
    this.embeddingProgress = [0, 0];
  };

  protected override updated(_changedProperties: PropertyValues) {
    if (_changedProperties.has('doc')) {
      this._resetPanel();
      requestAnimationFrame(async () => {
        await this._initPanel();
      });
    }

    if (this.chatContextValue.status === 'loading') {
      // reset the wheel triggered flag when the status is loading
      this._wheelTriggered = false;
    }

    if (
      _changedProperties.has('chatContextValue') &&
      (this.chatContextValue.status === 'loading' ||
        this.chatContextValue.status === 'error' ||
        this.chatContextValue.status === 'success')
    ) {
      setTimeout(this._scrollToEnd, 500);
    }

    if (
      _changedProperties.has('chatContextValue') &&
      this.chatContextValue.status === 'transmitting'
    ) {
      this._throttledScrollToEnd();
    }
  }

  protected override firstUpdated(): void {
    const chatMessages = this._chatMessagesRef.value;
    if (chatMessages) {
      chatMessages.updateComplete
        .then(() => {
          chatMessages.getScrollContainer()?.addEventListener('wheel', () => {
            this._wheelTriggered = true;
          });
        })
        .catch(console.error);
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    if (!this.doc) throw new Error('doc is required');

    this._disposables.add(
      AIProvider.slots.actions.subscribe(({ event }) => {
        const { status } = this.chatContextValue;
        if (
          event === 'finished' &&
          (status === 'idle' || status === 'success')
        ) {
          this._updateHistory().catch(console.error);
        }
      })
    );
    this._disposables.add(
      AIProvider.slots.userInfo.subscribe(() => {
        this._initPanel().catch(console.error);
      })
    );
    this._disposables.add(
      AIProvider.slots.requestOpenWithChat.subscribe(({ host }) => {
        if (this.host === host) {
          extractSelectedContent(host)
            .then(context => {
              if (!context) return;
              this.updateContext(context);
            })
            .catch(console.error);
        }
      })
    );

    const isOpen = this.appSidebarConfig.isOpen();
    this._isSidebarOpen = isOpen.signal;
    this._disposables.add(isOpen.cleanup);

    const width = this.appSidebarConfig.getWidth();
    this._sidebarWidth = width.signal;
    this._disposables.add(width.cleanup);

    this._disposables.add(
      this._isSidebarOpen.subscribe(isOpen => {
        if (isOpen && !this._isInitialized) {
          this._initPanel().catch(console.error);
        }
      })
    );
  }

  updateContext = (context: Partial<ChatContextValue>) => {
    this.chatContextValue = { ...this.chatContextValue, ...context };
  };

  continueInChat = async () => {
    const text = await getSelectedTextContent(this.host, 'plain-text');
    const markdown = await getSelectedTextContent(this.host, 'markdown');
    const images = await getSelectedImagesAsBlobs(this.host);
    this.updateContext({
      quote: text,
      markdown,
      images,
    });
  };

  override render() {
    const width = this._sidebarWidth.value || 0;
    const style = styleMap({
      padding: width > 540 ? '8px 24px 0 24px' : '8px 12px 0 12px',
    });
    const [done, total] = this.embeddingProgress;
    const isEmbedding = total > 0 && done < total;

    return html`<div class="chat-panel-container" style=${style}>
      <div class="chat-panel-title">
        <div>
          ${isEmbedding
            ? html`<span data-testid="chat-panel-embedding-progress"
                >Embedding ${done}/${total}</span
              >`
            : 'AFFiNE AI'}
        </div>
        <div
          @click=${() => {
            AIProvider.toggleGeneralAIOnboarding?.(true);
          }}
        >
          ${HelpIcon()}
        </div>
      </div>
      <chat-panel-messages
        ${ref(this._chatMessagesRef)}
        .chatContextValue=${this.chatContextValue}
        .getSessionId=${this._getSessionId}
        .createSessionId=${this._createSessionId}
        .updateContext=${this.updateContext}
        .host=${this.host}
        .isLoading=${this.isLoading}
        .extensions=${this.extensions}
      ></chat-panel-messages>
      <ai-chat-composer
        .host=${this.host}
        .doc=${this.doc}
        .getSessionId=${this._getSessionId}
        .createSessionId=${this._createSessionId}
        .chatContextValue=${this.chatContextValue}
        .updateContext=${this.updateContext}
        .updateEmbeddingProgress=${this._updateEmbeddingProgress}
        .onHistoryCleared=${this._updateHistory}
        .isVisible=${this._isSidebarOpen}
        .networkSearchConfig=${this.networkSearchConfig}
        .docDisplayConfig=${this.docDisplayConfig}
        .searchMenuConfig=${this.searchMenuConfig}
        .trackOptions=${{
          where: 'chat-panel',
          control: 'chat-send',
        }}
      ></ai-chat-composer>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel': ChatPanel;
  }
}
