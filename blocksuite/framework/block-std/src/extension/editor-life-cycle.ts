import { DisposableGroup, Slot } from '@blocksuite/global/slot';

import type { BlockStdScope } from '../scope/block-std-scope';
import { LifeCycleWatcher } from './lifecycle-watcher';

export class EditorLifeCycleExtension extends LifeCycleWatcher {
  static override key = 'editor-life-cycle';

  disposables = new DisposableGroup();

  readonly slots = {
    created: new Slot(),
    mounted: new Slot(),
    rendered: new Slot(),
    unmounted: new Slot(),
  };

  constructor(override readonly std: BlockStdScope) {
    super(std);

    this.disposables.add(this.slots.created);
    this.disposables.add(this.slots.mounted);
    this.disposables.add(this.slots.rendered);
    this.disposables.add(this.slots.unmounted);
  }

  override created() {
    super.created();
    this.slots.created.emit();
  }

  override mounted() {
    super.mounted();
    this.slots.mounted.emit();
  }

  override rendered() {
    super.rendered();
    this.slots.rendered.emit();
  }

  override unmounted() {
    super.unmounted();
    this.slots.unmounted.emit();

    this.disposables.dispose();
  }
}
