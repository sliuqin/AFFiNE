import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const container = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'auto',
});

export const header = style({
  position: 'sticky',
  top: 0,
  zIndex: 2,
  background: cssVarV2('backgroundPrimary'),
  borderBottom: `1px solid ${cssVarV2('borderColor')}`,
});

export const row = style({
  display: 'flex',
  alignItems: 'stretch',
  borderBottom: `1px solid ${cssVarV2('borderColor')}`,
  position: 'relative',
});

export const cell = style({
  padding: '8px',
  borderRight: `1px solid ${cssVarV2('borderColor')}`,
  display: 'flex',
  alignItems: 'center',
  background: cssVarV2('backgroundPrimary'),
});

export const fixedLeft = style({
  position: 'sticky',
  left: 0,
  zIndex: 1,
  '::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: '-4px',
    width: '4px',
    pointerEvents: 'none',
    background: 'linear-gradient(to right, rgba(0, 0, 0, 0.1), transparent)',
  },
});

export const fixedRight = style({
  position: 'sticky',
  right: 0,
  zIndex: 1,
  '::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '-4px',
    width: '4px',
    pointerEvents: 'none',
    background: 'linear-gradient(to left, rgba(0, 0, 0, 0.1), transparent)',
  },
});

export const body = style({
  flex: 1,
  overflow: 'auto',
  position: 'relative',
  height: 'calc(100% - 40px)',
});

export const scrollContent = style({
  position: 'relative',
  minWidth: '100%',
});

export const cellDivider = style({
  width: '1px',
  height: '100%',
  backgroundColor: cssVarV2('borderColor'),
});
