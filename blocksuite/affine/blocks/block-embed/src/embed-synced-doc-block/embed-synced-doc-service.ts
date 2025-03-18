import { EmbedSyncedDocBlockSchema } from '@blocksuite/affine-model';
import { BlockService } from '@blocksuite/std';

export class EmbedSyncedDocBlockService extends BlockService {
  static override readonly flavour = EmbedSyncedDocBlockSchema.model.flavour;
}
