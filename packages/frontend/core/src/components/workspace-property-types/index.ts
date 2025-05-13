import type { FilterParams } from '@affine/core/modules/collection-rules';
import type {
  WorkspacePropertyFilter,
  WorkspacePropertyType,
} from '@affine/core/modules/workspace-property';
import type { I18nString } from '@affine/i18n';
import {
  CheckBoxCheckLinearIcon,
  DateTimeIcon,
  EdgelessIcon,
  FileIcon,
  HistoryIcon,
  LongerIcon,
  MemberIcon,
  NumberIcon,
  PropertyIcon,
  TagIcon,
  TemplateIcon,
  TextIcon,
  TodayIcon,
} from '@blocksuite/icons/rc';

import type { DocListPropertyProps, GroupHeaderProps } from '../explorer/types';
import type { PropertyValueProps } from '../properties/types';
import {
  CheckboxDocListProperty,
  CheckboxFilterValue,
  CheckboxGroupHeader,
  CheckboxValue,
} from './checkbox';
import {
  CreatedByDocListInlineProperty,
  CreatedByUpdatedByFilterValue,
  CreatedByValue,
  ModifiedByGroupHeader,
  UpdatedByDocListInlineProperty,
  UpdatedByValue,
} from './created-updated-by';
import {
  CreateDateDocListProperty,
  CreateDateValue,
  CreatedGroupHeader,
  DateDocListProperty,
  DateFilterValue,
  DateGroupHeader,
  DateValue,
  UpdatedDateDocListProperty,
  UpdatedDateValue,
} from './date';
import {
  DocPrimaryModeDocListProperty,
  DocPrimaryModeFilterValue,
  DocPrimaryModeGroupHeader,
  DocPrimaryModeValue,
} from './doc-primary-mode';
import {
  EdgelessThemeDocListProperty,
  EdgelessThemeValue,
} from './edgeless-theme';
import {
  JournalDocListProperty,
  JournalFilterValue,
  JournalGroupHeader,
  JournalValue,
} from './journal';
import { NumberDocListProperty, NumberValue } from './number';
import { PageWidthDocListProperty, PageWidthValue } from './page-width';
import {
  TagsDocListProperty,
  TagsFilterValue,
  TagsGroupHeader,
  TagsValue,
} from './tags';
import { TemplateDocListProperty, TemplateValue } from './template';
import {
  TextDocListProperty,
  TextFilterValue,
  TextGroupHeader,
  TextValue,
} from './text';

const DateFilterMethod = {
  after: 'com.affine.filter.after',
  before: 'com.affine.filter.before',
  between: 'com.affine.filter.between',
  'last-3-days': 'com.affine.filter.last 3 days',
  'last-7-days': 'com.affine.filter.last 7 days',
  'last-15-days': 'com.affine.filter.last 15 days',
  'last-30-days': 'com.affine.filter.last 30 days',
  'this-week': 'com.affine.filter.this week',
  'this-month': 'com.affine.filter.this month',
  'this-quarter': 'com.affine.filter.this quarter',
  'this-year': 'com.affine.filter.this year',
} as const;

export const WorkspacePropertyTypes = {
  tags: {
    icon: TagIcon,
    value: TagsValue,
    name: 'com.affine.page-properties.property.tags',
    uniqueId: 'tags',
    renameable: false,
    description: 'com.affine.page-properties.property.tags.tooltips',
    filterMethod: {
      'include-all': 'com.affine.filter.contains all',
      'include-any-of': 'com.affine.filter.contains one of',
      'not-include-all': 'com.affine.filter.does not contains all',
      'not-include-any-of': 'com.affine.filter.does not contains one of',
      'is-not-empty': 'com.affine.filter.is not empty',
      'is-empty': 'com.affine.filter.is empty',
    },
    allowInGroupBy: true,
    allowInOrderBy: true,
    defaultFilter: { method: 'is-not-empty' },
    filterValue: TagsFilterValue,
    showInDocList: 'inline',
    docListProperty: TagsDocListProperty,
    groupHeader: TagsGroupHeader,
  },
  text: {
    icon: TextIcon,
    value: TextValue,
    name: 'com.affine.page-properties.property.text',
    description: 'com.affine.page-properties.property.text.tooltips',
    filterMethod: {
      is: 'com.affine.editCollection.rules.include.is',
      'is-not': 'com.affine.editCollection.rules.include.is-not',
      'is-not-empty': 'com.affine.filter.is not empty',
      'is-empty': 'com.affine.filter.is empty',
    },
    allowInGroupBy: true,
    allowInOrderBy: true,
    filterValue: TextFilterValue,
    defaultFilter: { method: 'is-not-empty' },
    showInDocList: 'stack',
    docListProperty: TextDocListProperty,
    groupHeader: TextGroupHeader,
  },
  number: {
    icon: NumberIcon,
    value: NumberValue,
    name: 'com.affine.page-properties.property.number',
    description: 'com.affine.page-properties.property.number.tooltips',
    showInDocList: 'stack',
    docListProperty: NumberDocListProperty,
  },
  checkbox: {
    icon: CheckBoxCheckLinearIcon,
    value: CheckboxValue,
    name: 'com.affine.page-properties.property.checkbox',
    description: 'com.affine.page-properties.property.checkbox.tooltips',
    filterMethod: {
      is: 'com.affine.editCollection.rules.include.is',
      'is-not': 'com.affine.editCollection.rules.include.is-not',
    },
    allowInGroupBy: true,
    allowInOrderBy: true,
    filterValue: CheckboxFilterValue,
    defaultFilter: { method: 'is', value: 'true' },
    showInDocList: 'stack',
    docListProperty: CheckboxDocListProperty,
    groupHeader: CheckboxGroupHeader,
  },
  date: {
    icon: DateTimeIcon,
    value: DateValue,
    name: 'com.affine.page-properties.property.date',
    description: 'com.affine.page-properties.property.date.tooltips',
    filterMethod: {
      'is-not-empty': 'com.affine.filter.is not empty',
      'is-empty': 'com.affine.filter.is empty',
      ...DateFilterMethod,
    },
    allowInGroupBy: true,
    allowInOrderBy: true,
    filterValue: DateFilterValue,
    defaultFilter: { method: 'is-not-empty' },
    showInDocList: 'stack',
    docListProperty: DateDocListProperty,
    groupHeader: DateGroupHeader,
  },
  createdBy: {
    icon: MemberIcon,
    value: CreatedByValue,
    name: 'com.affine.page-properties.property.createdBy',
    description: 'com.affine.page-properties.property.createdBy.tooltips',
    allowInGroupBy: true,
    allowInOrderBy: true,
    filterMethod: {
      include: 'com.affine.filter.contains all',
    },
    filterValue: CreatedByUpdatedByFilterValue,
    defaultFilter: { method: 'include', value: '' },
    showInDocList: 'inline',
    docListProperty: CreatedByDocListInlineProperty,
    groupHeader: ModifiedByGroupHeader,
  },
  updatedBy: {
    icon: MemberIcon,
    value: UpdatedByValue,
    name: 'com.affine.page-properties.property.updatedBy',
    description: 'com.affine.page-properties.property.updatedBy.tooltips',
    allowInGroupBy: true,
    allowInOrderBy: true,
    filterMethod: {
      include: 'com.affine.filter.contains all',
    },
    filterValue: CreatedByUpdatedByFilterValue,
    defaultFilter: { method: 'include', value: '' },
    showInDocList: 'inline',
    docListProperty: UpdatedByDocListInlineProperty,
    groupHeader: ModifiedByGroupHeader,
  },
  updatedAt: {
    icon: DateTimeIcon,
    value: UpdatedDateValue,
    name: 'com.affine.page-properties.property.updatedAt',
    description: 'com.affine.page-properties.property.updatedAt.tooltips',
    renameable: false,
    allowInGroupBy: true,
    allowInOrderBy: true,
    filterMethod: {
      ...DateFilterMethod,
    },
    filterValue: DateFilterValue,
    defaultFilter: { method: 'this-week' },
    showInDocList: 'inline',
    docListProperty: UpdatedDateDocListProperty,
    groupHeader: CreatedGroupHeader,
  },
  createdAt: {
    icon: HistoryIcon,
    value: CreateDateValue,
    name: 'com.affine.page-properties.property.createdAt',
    description: 'com.affine.page-properties.property.createdAt.tooltips',
    renameable: false,
    allowInGroupBy: true,
    allowInOrderBy: true,
    filterMethod: {
      ...DateFilterMethod,
    },
    filterValue: DateFilterValue,
    defaultFilter: { method: 'this-week' },
    showInDocList: 'inline',
    docListProperty: CreateDateDocListProperty,
    groupHeader: CreatedGroupHeader,
  },
  docPrimaryMode: {
    icon: FileIcon,
    value: DocPrimaryModeValue,
    name: 'com.affine.page-properties.property.docPrimaryMode',
    description: 'com.affine.page-properties.property.docPrimaryMode.tooltips',
    allowInGroupBy: true,
    allowInOrderBy: true,
    filterMethod: {
      is: 'com.affine.editCollection.rules.include.is',
      'is-not': 'com.affine.editCollection.rules.include.is-not',
    },
    filterValue: DocPrimaryModeFilterValue,
    defaultFilter: { method: 'is', value: 'page' },
    showInDocList: 'stack',
    docListProperty: DocPrimaryModeDocListProperty,
    groupHeader: DocPrimaryModeGroupHeader,
  },
  journal: {
    icon: TodayIcon,
    value: JournalValue,
    name: 'com.affine.page-properties.property.journal',
    description: 'com.affine.page-properties.property.journal.tooltips',
    allowInGroupBy: true,
    allowInOrderBy: true,
    filterMethod: {
      is: 'com.affine.editCollection.rules.include.is',
      'is-not': 'com.affine.editCollection.rules.include.is-not',
    },
    filterValue: JournalFilterValue,
    defaultFilter: { method: 'is', value: 'true' },
    showInDocList: 'stack',
    docListProperty: JournalDocListProperty,
    groupHeader: JournalGroupHeader,
  },
  edgelessTheme: {
    icon: EdgelessIcon,
    value: EdgelessThemeValue,
    name: 'com.affine.page-properties.property.edgelessTheme',
    description: 'com.affine.page-properties.property.edgelessTheme.tooltips',
    showInDocList: 'stack',
    docListProperty: EdgelessThemeDocListProperty,
  },
  pageWidth: {
    icon: LongerIcon,
    value: PageWidthValue,
    name: 'com.affine.page-properties.property.pageWidth',
    description: 'com.affine.page-properties.property.pageWidth.tooltips',
    showInDocList: 'stack',
    docListProperty: PageWidthDocListProperty,
  },
  template: {
    icon: TemplateIcon,
    value: TemplateValue,
    name: 'com.affine.page-properties.property.template',
    renameable: true,
    description: 'com.affine.page-properties.property.template.tooltips',
    showInDocList: 'stack',
    docListProperty: TemplateDocListProperty,
  },
  unknown: {
    icon: PropertyIcon,
    name: 'Unknown',
    renameable: false,
  },
} as {
  [type in WorkspacePropertyType]: {
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    value?: React.FC<PropertyValueProps>;

    allowInOrderBy?: boolean;
    allowInGroupBy?: boolean;
    filterMethod?: { [key in WorkspacePropertyFilter<type>]: I18nString };
    filterValue?: React.FC<{
      filter: FilterParams;
      onChange: (filter: FilterParams) => void;
    }>;
    defaultFilter?: Omit<FilterParams, 'type' | 'key'>;
    /**
     * set a unique id for property type, make the property type can only be created once.
     */
    uniqueId?: string;
    name: I18nString;
    renameable?: boolean;
    description?: I18nString;
    /**
     * Whether to show the property in the doc list,
     * - `inline`: show the property in the doc list inline
     * - `stack`: show as tags
     */
    showInDocList?: 'inline' | 'stack';
    docListProperty?: React.FC<DocListPropertyProps>;
    groupHeader?: React.FC<GroupHeaderProps>;
  };
};

export const isSupportedWorkspacePropertyType = (
  type?: string
): type is WorkspacePropertyType => {
  return type && type !== 'unknown' ? type in WorkspacePropertyTypes : false;
};
