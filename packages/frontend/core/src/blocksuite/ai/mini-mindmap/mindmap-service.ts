import { BlockService } from '@blocksuite/affine/block-std';
import { Slot } from '@blocksuite/affine/global/slot';
import { RootBlockSchema } from '@blocksuite/affine/model';

export class MindmapService extends BlockService {
  static override readonly flavour = RootBlockSchema.model.flavour;

  requestCenter = new Slot();

  center() {
    this.requestCenter.emit();
  }

  override mounted(): void {}
}
