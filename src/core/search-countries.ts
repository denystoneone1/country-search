import type { RawCountry } from './country.js';
import { HttpError } from './http-error.js';

export const API_URL = 'https://countries.dev';
export const SEARCH_TIMEOUT_MS = 8000;

/**
 * GET к countries.dev. Запрос прерывается и по переданному signal (AbortError),
 * и по таймауту (TimeoutError): оба источника склеены в один сигнал.
 */
export function requestApi(
  path: string,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<Response> {
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  return fetch(`${API_URL}${path}`, { signal: requestSignal });
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
  const response = await requestApi(`/name/${encodeURIComponent(query.trim())}`, signal, timeoutMs);

  if (response.status === NOT_FOUND) {
    return [];
  }
  if (!response.ok) {
    throw new HttpError(response.status);
  }

  return (await response.json()) as RawCountry[];
}
