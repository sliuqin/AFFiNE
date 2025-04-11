import { createUniComponentFromWebComponent } from '../../core/utils/uni-component/uni-component.js';
import { createIcon } from '../../core/utils/uni-icon.js';
import { tableViewModel } from './define.js';
import { MobileDataViewTable } from './mobile/table-view.js';
import { VirtualTable } from './pc/virtual/virtual-table.js';

export const tableViewMeta = tableViewModel.createMeta({
  view: createUniComponentFromWebComponent(VirtualTable),
  mobileView: createUniComponentFromWebComponent(MobileDataViewTable),
  icon: createIcon('DatabaseTableViewIcon'),
});
