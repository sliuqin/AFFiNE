import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const item = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 8px',
  minWidth: '46px',
  lineHeight: '24px',
  fontSize: cssVar('fontBase'),
  color: cssVarV2('text/secondary'),
  borderRadius: 4,
  backgroundColor: 'var(--affine-background-primary-color)',
  cursor: 'pointer',
  userSelect: 'none',
  ':hover': {
    color: cssVarV2('text/primary'),
    backgroundColor: cssVarV2('layer/background/hoverOverlay'),
  },
  selectors: {
    '&[data-active="true"]': {
      color: cssVarV2('text/primary'),
      backgroundColor: cssVarV2('layer/background/secondary'),
    },
  },
});

export const itemContent = style({
  display: 'inline-block',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  textAlign: 'center',
  maxWidth: '128px',
  minWidth: '32px',

  selectors: {
    [`${item}:hover > &`]: {
      mask:
        'linear-gradient(#fff) left / calc(100% - 32px) no-repeat,' +
        'linear-gradient(90deg,#fff 0%,transparent 50%,transparent 100%) right / 32px no-repeat',
    },
  },
});

export const editIconButton = style({
  opacity: 0,
  marginLeft: -16,
  backgroundColor: cssVarV2('layer/background/hoverOverlay'),

  selectors: {
    [`${item}:hover > &`]: {
      opacity: 1,
    },
  },
});

export const closeButton = style({});

export const container = style({
  display: 'flex',
  flexDirection: 'row',
  gap: 4,
});
