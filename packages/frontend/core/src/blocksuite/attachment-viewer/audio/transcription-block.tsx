import { createReactComponentFromLit } from '@affine/component';
import { LitTranscriptionBlock } from '@affine/core/blocksuite/ai/blocks/ai-chat-block/ai-transcription-block';
import type { TranscriptionBlockModel } from '@blocksuite/affine/model';
import { LiveData, useLiveData } from '@toeverything/infra';
import React, { useCallback } from 'react';

import * as styles from './transcription-block.css';

const AdaptedTranscriptionBlock = createReactComponentFromLit({
  react: React,
  elementClass: LitTranscriptionBlock,
});

export const TranscriptionBlock = ({
  block,
}: {
  block: TranscriptionBlockModel;
}) => {
  const childMap = useLiveData(
    () => LiveData.fromSignal(block.childMap),
    [block.childMap]
  );
  const onDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);
  if (childMap.size === 0) {
    return null;
  }
  return (
    <div
      className={styles.root}
      // draggable + onDragStart to blacklist blocksuite's default drag behavior for attachment block
      draggable="true"
      onDragStart={onDragStart}
    >
      <AdaptedTranscriptionBlock blockId={block.id} />
    </div>
  );
};
