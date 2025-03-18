import type { InlineRange } from '@blocksuite/inline';
import type { BlockStdScope } from '@blocksuite/std';

import type { AffineInlineEditor } from '../../../affine-inline-specs';
import { LinkPopup } from './link-popup';

export function toggleLinkPopup(
  std: BlockStdScope,
  type: LinkPopup['type'],
  inlineEditor: AffineInlineEditor,
  targetInlineRange: InlineRange,
  abortController: AbortController
): LinkPopup {
  const popup = new LinkPopup();
  popup.std = std;
  popup.type = type;
  popup.inlineEditor = inlineEditor;
  popup.targetInlineRange = targetInlineRange;
  popup.abortController = abortController;

  document.body.append(popup);

  return popup;
}
