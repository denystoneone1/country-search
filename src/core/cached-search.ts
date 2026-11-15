import type { SearchFn } from './search-controller.js';

export interface CachedSearchOptions {
  maxEntries?: number;
}

export function createCachedSearch(
  _search: SearchFn,
  _options: CachedSearchOptions = {},
): SearchFn {
  throw new Error('Not implemented');
}
