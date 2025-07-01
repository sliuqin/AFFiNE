import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style } from '@vanilla-extract/css';

export const container = style({
  width: '100%',
  height: '100%',
  border: `1px solid transparent`,
  selectors: {
    '&[data-readonly="false"]': {
      borderColor: cssVarV2('layer/insideBorder/border'),
      borderRadius: 16,
    },
    '&[data-readonly="false"]:focus-within': {
      borderColor: cssVarV2('layer/insideBorder/primaryBorder'),
    },
  },
  borderRadius: 4,
});

globalStyle(`${container} .affine-page-root-block-container`, {
  padding: 0,
  minHeight: '32px',
});
