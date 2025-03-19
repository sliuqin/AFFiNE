import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const multiMemberSelectContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  position: 'relative',
  padding: '8px',
  width: '214px',
});

export const memberInputContainer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  padding: '4px',
  borderRadius: '4px',
  alignItems: 'center',
  border: `1px solid transparent`,
  borderColor: cssVarV2.layer.insideBorder.blackBorder,
  ':focus-within': {
    borderColor: cssVarV2.layer.insideBorder.primaryBorder,
    boxShadow: cssVar('activeShadow'),
  },
});

export const memberSearchInput = style({
  flex: '1',
  minWidth: '100px',
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '0',
  color: cssVarV2.text.primary,
});

export const memberListContainer = style({
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '300px',
  overflow: 'auto',
});

export const memberSelectedItem = style({
  backgroundColor: cssVarV2.layer.background.hoverOverlay,
});

export const memberDeleteIcon = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '16px',
  height: '16px',
  color: cssVarV2.icon.primary,
  fontSize: '16px',
  cursor: 'pointer',
  borderRadius: '2px',
  ':hover': {
    backgroundColor: cssVarV2.layer.background.tertiary,
  },
});

export const memberPreviewContainer = style({
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  padding: '2px',
  borderRadius: '2px',
  border: `1px solid transparent`,
  borderColor: cssVarV2.layer.insideBorder.blackBorder,
  backgroundColor: cssVarV2.button.secondary,
});

export const memberPreview = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '14px',
  lineHeight: '22px',
});

export const memberItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  overflow: 'hidden',
  padding: '4px',
  borderRadius: '4px',
});

export const memberItemContent = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  overflow: 'hidden',
});

export const memberName = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 4px',
  flex: 1,
});

export const avatar = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px',
});

export const noResultContainer = style({
  display: 'flex',
  alignItems: 'center',
  padding: '4px',
  color: cssVarV2.text.primary,
  fontSize: '14px',
  lineHeight: '22px',
});
