import type { RawCountry } from './country.js';
import { HttpError } from './http-error.js';

export const API_URL = 'https://countries.dev';
export const SEARCH_TIMEOUT_MS = 8000;

function buildSearchUrl(query: string): string {
  return `${API_URL}/name/${encodeURIComponent(query.trim())}`;
}

/** countries.dev отвечает 404, когда совпадений нет. Это пустой результат, а не ошибка. */
const NOT_FOUND = 404;

/**
 * Ищет страны по имени.
 * Запрос прерывается и по переданному signal (AbortError), и по таймауту (TimeoutError).
 * 404 дает пустой массив, любой другой неуспешный статус - HttpError.
 */
export async function searchCountries(
  query: string,
  signal: AbortSignal,
  timeoutMs = SEARCH_TIMEOUT_MS,
): Promise<RawCountry[]> {
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  const response = await fetch(buildSearchUrl(query), { signal: requestSignal });

  if (response.status === NOT_FOUND) {
    return [];
  }
  if (!response.ok) {
    throw new HttpError(response.status);
  }

  return (await response.json()) as RawCountry[];
}
