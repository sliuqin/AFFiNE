import { PeekViewService } from '@affine/core/modules/peek-view';
import { AttachmentViewExtension } from '@blocksuite/affine/blocks/attachment/view';
import { BookmarkViewExtension } from '@blocksuite/affine/blocks/bookmark/view';
import { CalloutViewExtension } from '@blocksuite/affine/blocks/callout/view';
import { CodeBlockViewExtension } from '@blocksuite/affine/blocks/code/view';
import { DataViewViewExtension } from '@blocksuite/affine/blocks/data-view/view';
import { DatabaseViewExtension } from '@blocksuite/affine/blocks/database/view';
import { DividerViewExtension } from '@blocksuite/affine/blocks/divider/view';
import { EdgelessTextViewExtension } from '@blocksuite/affine/blocks/edgeless-text/view';
import { EmbedViewExtension } from '@blocksuite/affine/blocks/embed/view';
import { FrameViewExtension } from '@blocksuite/affine/blocks/frame/view';
import { ImageViewExtension } from '@blocksuite/affine/blocks/image/view';
import { LatexViewExtension } from '@blocksuite/affine/blocks/latex/view';
import { ListViewExtension } from '@blocksuite/affine/blocks/list/view';
import { NoteViewExtension } from '@blocksuite/affine/blocks/note/view';
import { ParagraphBlockConfigExtension } from '@blocksuite/affine/blocks/paragraph';
import { ParagraphViewExtension } from '@blocksuite/affine/blocks/paragraph/view';
import {
  type ViewExtensionContext,
  ViewExtensionManager,
  ViewExtensionProvider,
} from '@blocksuite/affine/ext-loader';
import { MigratingViewExtension } from '@blocksuite/affine/extensions/view';
import { ToolbarModuleExtension } from '@blocksuite/affine/shared/services';
import { BlockFlavourIdentifier } from '@blocksuite/affine/std';
import { FrameworkProvider } from '@toeverything/infra';
import { z } from 'zod';

import { toolbarAIEntryConfig } from '../ai';
import { AIChatBlockSpec } from '../ai/blocks';
import { AITranscriptionBlockSpec } from '../ai/blocks/ai-chat-block/ai-transcription-block';
import { edgelessToolbarAIEntryConfig } from '../ai/entries/edgeless';
import { imageToolbarAIEntryConfig } from '../ai/entries/image-toolbar/setup-image-toolbar';
import { AICodeBlockWatcher } from '../ai/extensions/ai-code';
import { getAIEdgelessRootWatcher } from '../ai/extensions/ai-edgeless-root';
import { getAIPageRootWatcher } from '../ai/extensions/ai-page-root';
import { AiSlashMenuConfigExtension } from '../ai/extensions/ai-slash-menu';
import { CopilotTool } from '../ai/tool/copilot-tool';
import { aiPanelWidget } from '../ai/widgets/ai-panel/ai-panel';
import { edgelessCopilotWidget } from '../ai/widgets/edgeless-copilot';
import { buildDocDisplayMetaExtension } from '../extensions/display-meta';
import { getEditorConfigExtension } from '../extensions/editor-config';
import { getPagePreviewThemeExtension } from '../extensions/entry/enable-preview';
import { getFontConfigExtension } from '../extensions/font-config';
import { patchPeekViewService } from '../extensions/peek-view-service';
import { getTelemetryExtension } from '../extensions/telemetry';
import { getThemeExtension } from '../extensions/theme';

const optionsSchema = z.object({
  enableAI: z.boolean().optional(),
  framework: z.instanceof(FrameworkProvider),
});

class MigratingAffineViewExtension extends ViewExtensionProvider<
  z.infer<typeof optionsSchema>
> {
  override name = 'affine-view-extensions';

  override schema = optionsSchema;

  override setup(
    context: ViewExtensionContext,
    options?: z.infer<typeof optionsSchema>
  ) {
    super.setup(context);
    const { framework, enableAI } = options || {};
    if (framework) {
      context.register([
        getThemeExtension(framework),
        getFontConfigExtension(),
        buildDocDisplayMetaExtension(framework),
      ]);
      if (context.scope === 'page' || context.scope === 'edgeless') {
        context.register(getTelemetryExtension());
        context.register(getEditorConfigExtension(framework));
      }
      if (
        context.scope === 'preview-page' ||
        context.scope === 'preview-edgeless'
      ) {
        context.register(getPagePreviewThemeExtension(framework));
        context.register(patchPeekViewService(framework.get(PeekViewService)));
      }
      if (enableAI) {
        context.register(AIChatBlockSpec);
        context.register(AITranscriptionBlockSpec);
        context.register(
          [
            AICodeBlockWatcher,
            ToolbarModuleExtension({
              id: BlockFlavourIdentifier('custom:affine:image'),
              config: imageToolbarAIEntryConfig(),
            }),
            ParagraphBlockConfigExtension({
              getPlaceholder: model => {
                const placeholders = {
                  text: "Type '/' for commands, 'space' for AI",
                  h1: 'Heading 1',
                  h2: 'Heading 2',
                  h3: 'Heading 3',
                  h4: 'Heading 4',
                  h5: 'Heading 5',
                  h6: 'Heading 6',
                  quote: '',
                };
                return placeholders[model.props.type];
              },
            }),
          ].flat()
        );
        if (context.scope === 'edgeless') {
          context.register([
            CopilotTool,
            aiPanelWidget,
            edgelessCopilotWidget,
            getAIEdgelessRootWatcher(framework),
            // In note
            ToolbarModuleExtension({
              id: BlockFlavourIdentifier('custom:affine:note'),
              config: toolbarAIEntryConfig(),
            }),
            ToolbarModuleExtension({
              id: BlockFlavourIdentifier('custom:affine:surface:*'),
              config: edgelessToolbarAIEntryConfig(),
            }),
            AiSlashMenuConfigExtension(),
          ]);
        }
        if (context.scope === 'page') {
          context.register([
            aiPanelWidget,
            getAIPageRootWatcher(framework),
            ToolbarModuleExtension({
              id: BlockFlavourIdentifier('custom:affine:note'),
              config: toolbarAIEntryConfig(),
            }),
            AiSlashMenuConfigExtension(),
          ]);
        }
      }
    }
  }
}

const manager = new ViewExtensionManager([
  MigratingViewExtension,

  AttachmentViewExtension,
  BookmarkViewExtension,
  CalloutViewExtension,
  CodeBlockViewExtension,
  DataViewViewExtension,
  DatabaseViewExtension,
  DividerViewExtension,
  EdgelessTextViewExtension,
  EmbedViewExtension,
  FrameViewExtension,
  ImageViewExtension,
  LatexViewExtension,
  ListViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,

  MigratingAffineViewExtension,
]);

export function getViewManager(
  framework: FrameworkProvider,
  enableAI: boolean
) {
  manager.configure(MigratingAffineViewExtension, {
    framework,
    enableAI,
  });
  return manager;
}
