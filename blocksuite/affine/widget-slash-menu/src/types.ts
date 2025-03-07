import type { BlockStdScope } from '@blocksuite/block-std';
import type { BlockModel } from '@blocksuite/store';
import type { TemplateResult } from 'lit';

export type SlashMenuContext = {
  std: BlockStdScope;
  model: BlockModel;
};

export type SlashMenuTooltip = {
  figure: TemplateResult;
  caption: string;
};

export type SlashMenuItemBase = {
  name: string;
  description?: string;
  icon?: TemplateResult;
  /**
   * This field defines sorting and grouping of menu items like VSCode.
   * The first number indicates the group index, the second number indicates the item index in the group.
   * The group name is the string between `_` and `@`.
   * You can find an example figure in https://code.visualstudio.com/api/references/contribution-points#menu-example
   */
  group?: `${number}_${string}@${number}`;

  // TODO(@L-Sun): move this field to SlashMenuActionItem when refactoring search
  /**
   * The alias of the menu item for search.
   */
  searchAlias?: string[];
  /**
   * The condition to show the menu item.
   */
  when?: (ctx: SlashMenuContext) => boolean;
};

export type SlashMenuActionItem = SlashMenuItemBase & {
  action: (ctx: SlashMenuContext) => void;
  tooltip?: SlashMenuTooltip;
};

export type SlashMenuSubMenu = SlashMenuItemBase & {
  subMenu: SlashMenuItem[];
};

export type SlashMenuItem = SlashMenuActionItem | SlashMenuSubMenu;

export type SlashMenuConfig = {
  // TODO(@L-Sun): change this type to SlashMenuItem[] and (ctx: SlashMenuContext) => SlashMenuItem[]
  /**
   * The items in the slash menu. It can be generated dynamically with the context.
   */
  items: (SlashMenuItem | ((ctx: SlashMenuContext) => SlashMenuItem[]))[];

  /**
   * Slash menu will not be triggered when the condition is true.
   */
  disableWhen?: (ctx: SlashMenuContext) => boolean;
};
