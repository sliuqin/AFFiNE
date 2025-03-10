import { BlockService } from '@blocksuite/affine/block-std';
import { SurfaceBlockSchema } from '@blocksuite/affine/blocks/surface';

export class MindmapSurfaceBlockService extends BlockService {
  static override readonly flavour = SurfaceBlockSchema.model.flavour;
}
