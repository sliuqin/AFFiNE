import { type DependencyList, useMemo, useSyncExternalStore } from 'react';

import type { LiveData } from './livedata';

function noopSubscribe() {
  return () => {};
}

function nullGetSnapshot() {
  return null;
}

function undefinedGetSnapshot() {
  return undefined;
}

/**
 * subscribe LiveData and return the value.
 */
export function useLiveData<Input extends LiveData<any> | null | undefined>(
  liveDataOrFn: Input | (() => Input),
  deps?: any[]
): NonNullable<Input> extends LiveData<infer T>
  ? Input extends undefined
    ? T | undefined
    : Input extends null
      ? T | null
      : T
  : never {
  const liveData = useMemo(() => {
    return typeof liveDataOrFn === 'function' ? liveDataOrFn() : liveDataOrFn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps as DependencyList);

  return useSyncExternalStore(
    liveData ? liveData.reactSubscribe : noopSubscribe,
    liveData
      ? liveData.reactGetSnapshot
      : liveData === undefined
        ? undefinedGetSnapshot
        : nullGetSnapshot
  );
}
