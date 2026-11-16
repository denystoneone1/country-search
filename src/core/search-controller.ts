import { classifySearchError, type SearchFailure } from './classify-search-error.js';
import type { Country, RawCountry } from './country.js';
import { debounce } from './debounce.js';
import { mapCountryResponse } from './map-country-response.js';

export type SearchFn = (query: string, signal: AbortSignal) => Promise<RawCountry[]>;

export type ErrorFailure = Exclude<SearchFailure, { kind: 'aborted' }>;

export type SearchState =
  | { status: 'idle' }
  /** Текст введен, но debounce еще не отправил запрос */
  | { status: 'pending'; query: string }
  /** Запрос отправлен и ждет ответа */
  | { status: 'loading'; query: string }
  | { status: 'results'; query: string; countries: Country[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; failure: ErrorFailure };

export interface SearchControllerOptions {
  search: SearchFn;
  delay: number;
  onChange: (state: SearchState) => void;
}

export interface SearchController {
  /**
   * Изменение текста в поле: отменяет активный запрос сразу и переводит в pending,
   * новый запрос уходит после debounce.
   */
  input: (text: string) => void;
  /** Повторяет последний введенный запрос без ожидания debounce. */
  retry: () => void;
  /** Ищет сразу, без debounce. Нужен для повтора поиска из истории. */
  searchNow: (text: string) => void;
  getState: () => SearchState;
  dispose: () => void;
}

/**
 * Держит состояние поиска и гарантирует, что одновременно жив только один запрос:
 * у каждого запроса свой AbortController, и любое новое действие пользователя отменяет предыдущий.
 */
export function createSearchController({
  search,
  delay,
  onChange,
}: SearchControllerOptions): SearchController {
  let state: SearchState = { status: 'idle' };
  let activeRequest: AbortController | null = null;
  let lastQuery = '';
  let disposed = false;

  const setState = (next: SearchState): void => {
    state = next;
    if (!disposed) {
      onChange(next);
    }
  };

  const abortActiveRequest = (): void => {
    activeRequest?.abort();
    activeRequest = null;
  };

  const run = async (query: string): Promise<void> => {
    abortActiveRequest();
    const request = new AbortController();
    activeRequest = request;
    setState({ status: 'loading', query });

    try {
      const countries = (await search(query, request.signal)).map(mapCountryResponse);
      setState(
        countries.length > 0 ? { status: 'results', query, countries } : { status: 'empty', query },
      );
    } catch (error) {
      const failure = classifySearchError(error);
      // Отмену своего же запроса пользователю не показываем: ее вызвало его новое действие
      if (failure.kind !== 'aborted') {
        setState({ status: 'error', query, failure });
      }
    } finally {
      if (activeRequest === request) {
        activeRequest = null;
      }
    }
  };

  const debouncedRun = debounce((query: string) => {
    void run(query);
  }, delay);

  const input = (text: string): void => {
    abortActiveRequest();
    const query = text.trim();
    lastQuery = query;

    if (!query) {
      debouncedRun.cancel();
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'pending', query });
    debouncedRun(query);
  };

  const searchNow = (text: string): void => {
    const query = text.trim();
    debouncedRun.cancel();
    if (!query) {
      input(query);
      return;
    }
    lastQuery = query;
    void run(query);
  };

  const retry = (): void => {
    if (lastQuery) {
      searchNow(lastQuery);
    }
  };

  const dispose = (): void => {
    disposed = true;
    debouncedRun.cancel();
    abortActiveRequest();
  };

  return { input, retry, searchNow, getState: () => state, dispose };
}
