import type { RawCountry } from './country.js';

export const API_URL = 'https://countries.dev';

export function searchCountries(_query: string, _signal: AbortSignal): Promise<RawCountry[]> {
  return Promise.reject(new Error('Not implemented'));
}
