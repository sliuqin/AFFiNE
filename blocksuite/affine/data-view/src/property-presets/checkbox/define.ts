import zod from 'zod';

import { t } from '../../core/logical/type-presets.js';
import { propertyType } from '../../core/property/property-config.js';
export const checkboxPropertyType = propertyType('checkbox');

const FALSE_VALUES = new Set([
  'false',
  'no',
  '0',
  '',
  'undefined',
  'null',
  '否',
  '不',
  '错',
  '错误',
  '取消',
  '关闭',
]);

export const checkboxPropertyModelConfig = checkboxPropertyType.modelConfig({
  name: 'Checkbox',
  valueSchema: zod.boolean().optional(),
  type: () => t.boolean.instance(),
  defaultData: () => ({}),
  cellToString: ({ value }) => (value ? 'True' : 'False'),
  cellFromString: ({ value }) => ({
    value: !FALSE_VALUES.has((value?.trim() ?? '').toLowerCase()),
  }),
  cellToJson: ({ value }) => value ?? null,
  cellFromJson: ({ value }) => (typeof value !== 'boolean' ? undefined : value),
  isEmpty: () => false,
  minWidth: 34,
});
