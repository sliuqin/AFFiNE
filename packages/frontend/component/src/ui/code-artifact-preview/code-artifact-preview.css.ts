import { style } from '@vanilla-extract/css';

export const container = style({
  width: '100%',
  height: '100%',
  border: '1px solid #e1e4e8',
  borderRadius: '8px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#ffffff',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  height: '52px',
});

export const languageLabel = style({
  fontSize: '12px',
  fontWeight: '600',
  color: '#656d76',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const languageBadge = style({
  position: 'absolute',
  top: '12px',
  right: '12px',
  fontSize: '10px',
  fontWeight: '600',
  color: '#656d76',
  backgroundColor: '#f6f8fa',
  padding: '4px 8px',
  borderRadius: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  zIndex: 10,
});

export const content = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
});

export const codeContainer = style({
  position: 'relative',
  flex: 1,
  overflow: 'auto',
});

export const codeHighlight = style({
  height: '100%',
  margin: 0,
  fontFamily:
    '"Fira Code", "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
  fontSize: '14px',
  lineHeight: '1.5',
});

export const previewContainer = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
});

export const previewIframe = style({
  width: '100%',
  height: '100%',
  border: 'none',
  flex: 1,
});
