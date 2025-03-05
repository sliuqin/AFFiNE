import { style } from '@vanilla-extract/css';

export const richTextCellStyle = style({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  userSelect: 'none',
});

export const richTextContainerStyle = style({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  outline: 'none',
  fontSize: 'var(--data-view-cell-text-size)',
  lineHeight: 'var(--data-view-cell-text-line-height)',
  wordBreak: 'break-all',
});

export const vLineStyle = style({
  display: 'flex !important',
  alignItems: 'center',
  height: '100%',
  width: '100%',
});

export const vLineChildStyle = style({
  flexGrow: 1,
});

export const headerAreaIconStyle = style({
  height: 'max-content',
  display: 'flex',
  alignItems: 'center',
  marginRight: '8px',
  padding: '2px',
  borderRadius: '4px',
  marginTop: '2px',
  backgroundColor: 'var(--affine-background-secondary-color)',
});

export const headerAreaIconSvgStyle = style({
  width: '14px',
  height: '14px',
  fill: 'var(--affine-icon-color)',
  color: 'var(--affine-icon-color)',
});
