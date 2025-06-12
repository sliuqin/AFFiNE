import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { createVar, keyframes, style } from '@vanilla-extract/css';

const fadeIn = keyframes({
  from: {
    opacity: 0,
  },
  to: {
    opacity: 1,
  },
});

const animationDuration = createVar('animationDuration');
const startingOpacity = createVar('startingOpacity');

export const container = style({
  margin: 0,
  padding: 0,
  overflow: 'auto',
  display: 'flex',
  fontSize: cssVar('fontSm'),
});

export const lineNumbers = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: '3rem',
  padding: '12px 0 12px 12px',
  color: cssVarV2('text/secondary'),
  fontSize: cssVar('fontXs'),
  lineHeight: '20px',
  textAlign: 'right',
  userSelect: 'none',
  fontWeight: 400,
});

export const lineNumber = style({
  display: 'block',
  whiteSpace: 'nowrap',
});

export const codeContainer = style({
  flex: 1,
  padding: '12px',
  lineHeight: '20px',
  overflow: 'visible',
  vars: {
    [startingOpacity]: '1',
  },
});

export const streaming = style({
  vars: {
    [animationDuration]: '0.5s',
    [startingOpacity]: '0',
  },
});

export const codeToken = style({
  animation: `${fadeIn} ${animationDuration} ease-in`,
  opacity: startingOpacity,
});
