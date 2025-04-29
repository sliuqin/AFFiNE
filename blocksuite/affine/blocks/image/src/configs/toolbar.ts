import { ImageBlockModel, TextAlign } from '@blocksuite/affine-model';
import {
  ActionPlacement,
  type ToolbarModuleConfig,
  ToolbarModuleExtension,
} from '@blocksuite/affine-shared/services';
import {
  BookmarkIcon,
  CaptionIcon,
  CopyIcon,
  DeleteIcon,
  DownloadIcon,
  DuplicateIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
} from '@blocksuite/icons/lit';
import { BlockFlavourIdentifier } from '@blocksuite/std';
import type { ExtensionType } from '@blocksuite/store';

import { ImageBlockComponent } from '../image-block';
import { ImageEdgelessBlockComponent } from '../image-edgeless-block';
import { duplicate } from '../utils';

const trackBaseProps = {
  category: 'image',
  type: 'card view',
};

const builtinToolbarConfig = {
  actions: [
    {
      id: 'a.download',
      tooltip: 'Download',
      icon: DownloadIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(ImageBlockComponent);
        block?.download();
      },
    },
    {
      id: 'b.caption',
      tooltip: 'Caption',
      icon: CaptionIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(ImageBlockComponent);
        block?.captionEditor?.show();

        ctx.track('OpenedCaptionEditor', {
          ...trackBaseProps,
          control: 'add caption',
        });
      },
    },
    {
      id: 'c.1.align-left',
      tooltip: 'Align left',
      icon: TextAlignLeftIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(ImageBlockComponent);
        if (block) {
          ctx.std.host.doc.updateBlock(block.model, {
            textAlign: TextAlign.Left,
          });
        }
      },
    },
    {
      id: 'c.2.align-center',
      tooltip: 'Align center',
      icon: TextAlignCenterIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(ImageBlockComponent);
        if (block) {
          ctx.std.host.doc.updateBlock(block.model, {
            textAlign: TextAlign.Center,
          });
        }
      },
    },
    {
      id: 'c.3.align-right',
      tooltip: 'Align right',
      icon: TextAlignRightIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(ImageBlockComponent);
        if (block) {
          ctx.std.host.doc.updateBlock(block.model, {
            textAlign: TextAlign.Right,
          });
        }
      },
    },
    {
      placement: ActionPlacement.More,
      id: 'a.clipboard',
      actions: [
        {
          id: 'a.copy',
          label: 'Copy',
          icon: CopyIcon(),
          run(ctx) {
            const block = ctx.getCurrentBlockByType(ImageBlockComponent);
            block?.copy();
          },
        },
        {
          id: 'b.duplicate',
          label: 'Duplicate',
          icon: DuplicateIcon(),
          run(ctx) {
            const block = ctx.getCurrentBlockByType(ImageBlockComponent);
            if (!block) return;

            duplicate(block);
          },
        },
      ],
    },
    {
      placement: ActionPlacement.More,
      id: 'b.conversions',
      actions: [
        {
          id: 'a.turn-into-card-view',
          label: 'Turn into card view',
          icon: BookmarkIcon(),
          when(ctx) {
            const supported =
              ctx.store.schema.flavourSchemaMap.has('affine:attachment');
            if (!supported) return false;

            const block = ctx.getCurrentBlockByType(ImageBlockComponent);
            return Boolean(block?.blob);
          },
          run(ctx) {
            const block = ctx.getCurrentBlockByType(ImageBlockComponent);
            block?.convertToCardView();
          },
        },
      ],
    },
    {
      placement: ActionPlacement.More,
      id: 'c.delete',
      label: 'Delete',
      icon: DeleteIcon(),
      variant: 'destructive',
      run(ctx) {
        const block = ctx.getCurrentBlockByType(ImageBlockComponent);
        if (!block) return;

        ctx.store.deleteBlock(block.model);
      },
    },
  ],

  placement: 'inner',
} as const satisfies ToolbarModuleConfig;

const builtinSurfaceToolbarConfig = {
  actions: [
    {
      id: 'a.download',
      tooltip: 'Download',
      icon: DownloadIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(ImageEdgelessBlockComponent);
        block?.download();
      },
    },
    {
      id: 'b.caption',
      tooltip: 'Caption',
      icon: CaptionIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(ImageEdgelessBlockComponent);
        block?.captionEditor?.show();

        ctx.track('OpenedCaptionEditor', {
          ...trackBaseProps,
          control: 'add caption',
        });
      },
    },
  ],

  when: ctx => ctx.getSurfaceModelsByType(ImageBlockModel).length === 1,
} as const satisfies ToolbarModuleConfig;

export const createBuiltinToolbarConfigExtension = (
  flavour: string
): ExtensionType[] => {
  const name = flavour.split(':').pop();

  return [
    ToolbarModuleExtension({
      id: BlockFlavourIdentifier(flavour),
      config: builtinToolbarConfig,
    }),

    ToolbarModuleExtension({
      id: BlockFlavourIdentifier(`affine:surface:${name}`),
      config: builtinSurfaceToolbarConfig,
    }),
  ];
};
