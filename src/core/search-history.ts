export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SearchHistoryOptions {
  key?: string;
  limit?: number;
}

export interface SearchHistory {
  list: () => string[];
  add: (query: string) => string[];
  clear: () => void;
}

export function createSearchHistory(
  _storage: HistoryStorage,
  _options: SearchHistoryOptions = {},
): SearchHistory {
  throw new Error('Not implemented');
}
