import type { SearchDocMenuAction } from '@affine/core/modules/doc-search-menu/services';
import type { LinkedMenuGroup } from '@blocksuite/affine/blocks/root';
import type { Store } from '@blocksuite/affine/store';
import type { Signal } from '@preact/signals-core';

export interface AppSidebarConfig {
  getWidth: () => {
    signal: Signal<number | undefined>;
    cleanup: () => void;
  };
  isOpen: () => {
    signal: Signal<boolean | undefined>;
    cleanup: () => void;
  };
}

export interface AINetworkSearchConfig {
  visible: Signal<boolean | undefined>;
  enabled: Signal<boolean | undefined>;
  setEnabled: (state: boolean) => void;
}

export interface DocDisplayConfig {
  getIcon: (docId: string) => any;
  getTitle: (docId: string) => {
    signal: Signal<string>;
    cleanup: () => void;
  };
  getDoc: (docId: string) => Store | null;
}

export interface DocSearchMenuConfig {
  getDocMenuGroup: (
    query: string,
    action: SearchDocMenuAction,
    abortSignal: AbortSignal
  ) => LinkedMenuGroup;
}
