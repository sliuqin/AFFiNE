import { DebugLogger } from '@affine/debug';
import { PageEditorBlockSpecs } from '@blocksuite/affine/extensions';
import { BlockStdScope } from '@blocksuite/affine/std';
import type { Store } from '@blocksuite/affine/store';
import { useMemo } from 'react';
import { Observable } from 'rxjs';

const logger = new DebugLogger('doc-info');

interface ReadonlySignal<T> {
  subscribe: (fn: (value: T) => void) => () => void;
}

export function signalToObservable<T>(
  signal: ReadonlySignal<T>
): Observable<T> {
  return new Observable(subscriber => {
    const unsub = signal.subscribe(value => {
      subscriber.next(value);
    });
    return () => {
      unsub();
    };
  });
}

// todo(pengx17): use rc pool?
export function createBlockStdScope(doc: Store) {
  logger.debug('createBlockStdScope', doc.id);
  const std = new BlockStdScope({
    store: doc,
    extensions: PageEditorBlockSpecs,
  });
  return std;
}

export function useBlockStdScope(doc: Store) {
  return useMemo(() => createBlockStdScope(doc), [doc]);
}
