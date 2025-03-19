import { html } from 'lit';
import { ShadowlessElement } from '@blocksuite/std';
import { AIGeneratingIconWithAnimation } from '../_common/icons';

export class AIGenerating extends ShadowlessElement {
  protected override render() {
    return html`
      <ai-loading
        .icon=${AIGeneratingIconWithAnimation}
        .text=${'AI is generating...'}
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-generating': AIGenerating;
  }
}

export default AIGenerating;
