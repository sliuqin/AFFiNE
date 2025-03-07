import type { EditorHost } from '@blocksuite/affine/block-std';
import { GfxController, LayerManager } from '@blocksuite/affine/block-std/gfx';
import {
  getSurfaceBlock,
  TemplateJob,
  TemplateMiddlewares,
} from '@blocksuite/affine/blocks';
import { Bound, getCommonBound } from '@blocksuite/affine/global/gfx';

export function createTemplateJob(host: EditorHost) {
  const surface = getSurfaceBlock(host.doc);
  if (!surface) {
    throw new Error('surface is not found');
  }

  const middlewares: ((job: TemplateJob) => void)[] = [];
  const layer = new LayerManager(host.std.get(GfxController));
  const bounds = [...layer.blocks, ...layer.canvasElements].map(i =>
    Bound.deserialize(i.xywh)
  );
  const currentContentBound = getCommonBound(bounds);

  if (currentContentBound) {
    currentContentBound.x += currentContentBound.w + 100;
    middlewares.push(
      TemplateMiddlewares.createInsertPlaceMiddleware(currentContentBound)
    );
  }

  const idxGenerator = layer.createIndexGenerator();
  middlewares.push(
    TemplateMiddlewares.createRegenerateIndexMiddleware(() => idxGenerator())
  );
  middlewares.push(TemplateMiddlewares.replaceIdMiddleware);

  return TemplateJob.create({
    model: surface,
    type: 'template',
    middlewares,
  });
}
