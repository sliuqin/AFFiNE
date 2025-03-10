import type { AttachmentBlockModel } from '@blocksuite/affine/model';

export type AttachmentViewerProps = {
  model: AttachmentBlockModel;
};

export type PDFViewerProps = {
  model: AttachmentBlockModel;
  name: string;
  ext: string;
  size: string;
};
