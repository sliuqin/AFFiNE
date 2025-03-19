import { html } from 'lit';
import { ShadowlessElement } from '@blocksuite/std';
import { AIThinkingIconWithAnimation } from '../_common/icons';

export class AIThinking extends ShadowlessElement {
  protected override render() {
    return html`
      <ai-loading .icon=${AIThinkingIconWithAnimation} .text=${'Thinking...'} />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-thinking': AIThinking;
  }
}

export default AIThinking;
