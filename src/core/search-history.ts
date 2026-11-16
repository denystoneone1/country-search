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

const DEFAULT_KEY = 'country-search:history';
const DEFAULT_LIMIT = 8;

function parseHistory(saved: string | null): string[] {
  if (!saved) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * История последних запросов. Хранилище передается снаружи, поэтому модуль не зависит от DOM.
 * Если хранилище недоступно (приватный режим, запрет cookies), история живет только в памяти.
 */
export function createSearchHistory(
  storage: HistoryStorage,
  { key = DEFAULT_KEY, limit = DEFAULT_LIMIT }: SearchHistoryOptions = {},
): SearchHistory {
  const read = (): string[] => {
    try {
      return parseHistory(storage.getItem(key));
    } catch {
      return [];
    }
  };

  let items = read();

  const persist = (): void => {
    try {
      storage.setItem(key, JSON.stringify(items));
    } catch {
      // Без хранилища история просто не переживет перезагрузку страницы
    }
  };

  const add = (query: string): string[] => {
    const trimmed = query.trim();
    if (!trimmed) {
      return items;
    }
    const sameQuery = trimmed.toLowerCase();
    items = [trimmed, ...items.filter((item) => item.toLowerCase() !== sameQuery)].slice(0, limit);
    persist();
    return items;
  };

  const clear = (): void => {
    items = [];
    try {
      storage.removeItem(key);
    } catch {
      // Очищать нечего: хранилище недоступно
    }
  };

  return { list: () => items, add, clear };
}
