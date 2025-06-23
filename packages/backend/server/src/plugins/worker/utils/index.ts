export * from './crypto';
export * from './headers';
export * from './url';
export * from './webcontainer';

export function parseJson<T>(data: string): T | null {
  try {
    if (data && typeof data === 'object') return data;
    return JSON.parse(data);
  } catch {
    return null;
  }
}
