import React, { useMemo, useState } from 'react';

import { RadioGroup } from '../radio';
import * as styles from './code-artifact-preview.css';
import { CodeHighlight } from './code-highlight';

export type CodeArtifactPreviewProps = {
  code: string;
  language: string;
  previewable: boolean;
  /**
   * Whether the content is complete (for streaming scenarios)
   * When false, preview switch won't be shown even if previewable is true
   */
  complete?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
};

type ViewMode = 'code' | 'preview';

// Create blob URL for iframe preview
const useHtmlBlobUrl = (code: string) => {
  const previewUrl = useMemo(() => {
    const blob = new Blob([code], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [code]);

  // Cleanup blob URL when component unmounts or URL changes
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return previewUrl;
};

const IframePreview = ({ html }: { html: string }) => {
  const blobUrl = useHtmlBlobUrl(html);

  return (
    <iframe
      src={blobUrl}
      className={styles.previewIframe}
      title="HTML Preview"
      sandbox="allow-scripts allow-same-origin allow-forms"
      referrerPolicy="no-referrer"
    />
  );
};

export const CodeArtifactPreviewHeader = ({
  language,
  previewable,
  complete,
  viewMode,
  setViewMode,
}: {
  language: string;
  previewable: boolean;
  complete?: boolean;
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
}) => {
  // Only show preview functionality when content is complete
  const showPreviewSwitch = previewable && complete;
  return (
    <div className={styles.header}>
      {showPreviewSwitch ? (
        <RadioGroup
          borderRadius={6}
          itemHeight={20}
          items={[
            { value: 'code', label: 'Code' },
            { value: 'preview', label: 'Preview' },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      ) : (
        <div className={styles.languageLabel}>{language.toUpperCase()}</div>
      )}
    </div>
  );
};

export const CodeArtifactPreview = ({
  code,
  language,
  previewable,
  complete,
  theme = 'light',
  className = '',
}: CodeArtifactPreviewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('code');

  // Only show preview functionality when content is complete
  const showPreviewSwitch = previewable && complete;

  return (
    <div className={`${styles.container} ${className}`}>
      <CodeArtifactPreviewHeader
        language={language}
        previewable={previewable}
        complete={complete}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      <div className={styles.content}>
        {viewMode === 'code' || !showPreviewSwitch ? (
          <div className={styles.codeContainer}>
            <CodeHighlight
              code={code}
              language={language}
              theme={theme}
              streaming={!complete}
              className={styles.codeHighlight}
            />
          </div>
        ) : (
          <div className={styles.previewContainer}>
            <IframePreview html={code} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeArtifactPreview;
