import { Menu, MenuItem } from '@affine/component';
import type { FilterParams } from '@affine/core/modules/collection-rules';

export const SharedFilterValue = ({
  filter,
  onChange,
}: {
  filter: FilterParams;
  onChange: (filter: FilterParams) => void;
}) => {
  return (
    <Menu
      items={
        <>
          <MenuItem
            onClick={() => {
              onChange({
                ...filter,
                value: 'true',
              });
            }}
            selected={filter.value === 'true'}
          >
            {'True'}
          </MenuItem>
          <MenuItem
            onClick={() => {
              onChange({
                ...filter,
                value: 'false',
              });
            }}
            selected={filter.value !== 'true'}
          >
            {'False'}
          </MenuItem>
        </>
      }
    >
      <span>{filter.value === 'true' ? 'True' : 'False'}</span>
    </Menu>
  );
};
