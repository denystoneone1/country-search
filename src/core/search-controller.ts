import type { SearchFailure } from './classify-search-error.js';
import type { Country, RawCountry } from './country.js';

export type SearchFn = (query: string, signal: AbortSignal) => Promise<RawCountry[]>;

export type ErrorFailure = Exclude<SearchFailure, { kind: 'aborted' }>;

export type SearchState =
  | { status: 'idle' }
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
  input: (text: string) => void;
  retry: () => void;
  searchNow: (text: string) => void;
  getState: () => SearchState;
  dispose: () => void;
}

export function createSearchController(_options: SearchControllerOptions): SearchController {
  throw new Error('Not implemented');
}
