import type { RawCountry } from './country.js';
import { HttpError } from './http-error.js';

export const API_URL = 'https://countries.dev';
export const SEARCH_TIMEOUT_MS = 8000;

function buildSearchUrl(query: string): string {
  return `${API_URL}/name/${encodeURIComponent(query.trim())}`;
}

/** Ищет страны по имени. Неуспешный статус ответа превращается в HttpError. */
export async function searchCountries(
  query: string,
  signal: AbortSignal,
  _timeoutMs = SEARCH_TIMEOUT_MS,
): Promise<RawCountry[]> {
  const response = await fetch(buildSearchUrl(query), { signal });

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  return (await response.json()) as RawCountry[];
}
