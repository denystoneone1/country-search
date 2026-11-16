import type { RawCountry } from './country.js';

export type FetchCountryByCode = (code: string, signal: AbortSignal) => Promise<RawCountry>;

export type ResolveCountryNames = (codes: string[], signal: AbortSignal) => Promise<string[]>;

export function fetchCountryByCode(
  _code: string,
  _signal: AbortSignal,
  _timeoutMs?: number,
): Promise<RawCountry> {
  return Promise.reject(new Error('Not implemented'));
}

export function createCountryNameResolver(_fetchByCode: FetchCountryByCode): ResolveCountryNames {
  throw new Error('Not implemented');
}
