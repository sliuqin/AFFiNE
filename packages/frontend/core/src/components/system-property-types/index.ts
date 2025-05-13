import type { FilterParams } from '@affine/core/modules/collection-rules';
import type { I18nString } from '@affine/i18n';
import { FavoriteIcon, ShareIcon, TagIcon } from '@blocksuite/icons/rc';

import { FavoriteFilterValue } from './favorite';
import { SharedFilterValue } from './shared';
import { TagsFilterValue } from './tags';

export const SystemPropertyTypes = {
  tags: {
    icon: TagIcon,
    name: 'Tags',
    filterMethod: {
      include: 'com.affine.filter.contains all',
      'is-not-empty': 'com.affine.filter.is not empty',
      'is-empty': 'com.affine.filter.is empty',
    },
    filterValue: TagsFilterValue,
  },
  favorite: {
    icon: FavoriteIcon,
    name: 'Favorited',
    filterMethod: {
      is: 'com.affine.filter.is',
    },
    filterValue: FavoriteFilterValue,
  },
  shared: {
    icon: ShareIcon,
    name: 'Shared',
    filterMethod: {
      is: 'com.affine.filter.is',
    },
    filterValue: SharedFilterValue,
  },
} satisfies {
  [type: string]: {
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    name: I18nString;

    allowInOrderBy?: boolean;
    allowInGroupBy?: boolean;
    filterMethod: { [key: string]: I18nString };
    filterValue: React.FC<{
      filter: FilterParams;
      onChange: (filter: FilterParams) => void;
    }>;
  };
};

export type SystemPropertyType = keyof typeof SystemPropertyTypes;

export const isSupportedSystemPropertyType = (
  type?: string
): type is SystemPropertyType => {
  return type ? type in SystemPropertyTypes : false;
};
