import type { RawCountry } from './country.js';
import { HttpError } from './http-error.js';
import { requestApi, SEARCH_TIMEOUT_MS } from './search-countries.js';

export type FetchCountryByCode = (code: string, signal: AbortSignal) => Promise<RawCountry>;

export type ResolveCountryNames = (codes: string[], signal: AbortSignal) => Promise<string[]>;

/** Страна по коду ISO 3166-1 alpha-3. countries.dev отдает их только по одной. */
export async function fetchCountryByCode(
  code: string,
  signal: AbortSignal,
  timeoutMs = SEARCH_TIMEOUT_MS,
): Promise<RawCountry> {
  const response = await requestApi(`/alpha/${encodeURIComponent(code)}`, signal, timeoutMs);

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  return (await response.json()) as RawCountry;
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('The operation was aborted.', 'AbortError');
}

/**
 * Превращает коды соседних стран в названия. Названия кэшируются: соседи часто повторяются.
 * Если страну загрузить не удалось, вместо названия остается код, чтобы детальный вид
 * не ломался из-за одной страны. Отмена signal отклоняет весь результат с AbortError.
 */
export function createCountryNameResolver(fetchByCode: FetchCountryByCode): ResolveCountryNames {
  const names = new Map<string, string>();

  const loadName = async (code: string, signal: AbortSignal): Promise<void> => {
    try {
      const country = await fetchByCode(code, signal);
      names.set(code, country.name);
    } catch {
      // Неудачный код не кэшируем: в следующий раз попробуем снова
    }
  };

  return async (codes, signal) => {
    const missing = codes.filter((code) => !names.has(code));
    await Promise.all(missing.map((code) => loadName(code, signal)));

    if (signal.aborted) {
      throw abortError(signal);
    }

    return codes.map((code) => names.get(code) ?? code);
  };
}
