import type { RawCountry } from './country.js';
import type { SearchFn } from './search-controller.js';

export interface CachedSearchOptions {
  maxEntries?: number;
}

const DEFAULT_MAX_ENTRIES = 50;

/** Общий запрос, который ждут несколько вызывающих. Отменяется, только когда ушли все. */
interface InFlightRequest {
  promise: Promise<RawCountry[]>;
  controller: AbortController;
  waiting: number;
}

function toCacheKey(query: string): string {
  return query.trim().toLowerCase();
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('The operation was aborted.', 'AbortError');
}

/**
 * Обертка над поиском с кэшем по строке запроса и дедупликацией одновременных запросов.
 * У каждого вызывающего свой signal: его отмена отклоняет только его промис, а общий
 * сетевой запрос живет, пока его ждет хотя бы один вызывающий.
 */
export function createCachedSearch(
  search: SearchFn,
  { maxEntries = DEFAULT_MAX_ENTRIES }: CachedSearchOptions = {},
): SearchFn {
  // Map хранит порядок вставки: первый ключ - давно не использованный (LRU)
  const cache = new Map<string, RawCountry[]>();
  const inFlight = new Map<string, InFlightRequest>();

  const readCache = (key: string): RawCountry[] | undefined => {
    const cached = cache.get(key);
    if (cached) {
      cache.delete(key);
      cache.set(key, cached);
    }
    return cached;
  };

  const writeCache = (key: string, countries: RawCountry[]): void => {
    cache.set(key, countries);
    if (cache.size > maxEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }
  };

  const startRequest = (key: string, query: string): InFlightRequest => {
    const controller = new AbortController();
    const request: InFlightRequest = {
      controller,
      waiting: 0,
      promise: search(query, controller.signal)
        .then((countries) => {
          writeCache(key, countries);
          return countries;
        })
        .finally(() => {
          if (inFlight.get(key) === request) {
            inFlight.delete(key);
          }
        }),
    };
    // Ошибку получает каждый вызывающий через свой промис, здесь гасим только необработанный reject
    request.promise.catch(() => undefined);
    inFlight.set(key, request);
    return request;
  };

  const release = (key: string, request: InFlightRequest): void => {
    request.waiting -= 1;
    if (request.waiting === 0) {
      if (inFlight.get(key) === request) {
        inFlight.delete(key);
      }
      request.controller.abort();
    }
  };

  return (query, signal) => {
    if (signal.aborted) {
      return Promise.reject(abortError(signal));
    }

    const key = toCacheKey(query);
    const cached = readCache(key);
    if (cached) {
      return Promise.resolve(cached);
    }

    const request = inFlight.get(key) ?? startRequest(key, query);
    request.waiting += 1;

    return new Promise<RawCountry[]>((resolve, reject) => {
      const onAbort = (): void => {
        reject(abortError(signal));
        release(key, request);
      };
      signal.addEventListener('abort', onAbort, { once: true });

      request.promise.then(
        (countries) => {
          signal.removeEventListener('abort', onAbort);
          resolve(countries);
        },
        (error: unknown) => {
          signal.removeEventListener('abort', onAbort);
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  };
}
