import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RawCountry } from './country.js';
import { createCountryNameResolver, fetchCountryByCode } from './country-names.js';
import { HttpError } from './http-error.js';
import { API_URL } from './search-countries.js';
import { abortReason, createControlledFetch, jsonResponse } from './test-utils/fetch-mock.js';
import spainResponse from './fixtures/spain.json' with { type: 'json' };

function firstCountry(response: RawCountry[]): RawCountry {
  const [country] = response;
  if (!country) {
    throw new Error('Fixture is empty');
  }
  return country;
}

const spain = firstCountry(spainResponse);
const NAMES: Record<string, string> = { AND: 'Andorra', FRA: 'France', PRT: 'Portugal' };

function countryWithCode(code: string): RawCountry {
  return { ...spain, alpha3Code: code, name: NAMES[code] ?? code };
}

/** Поиск по коду, который отвечает сразу и, как fetch, отклоняется при отмене. */
function createFetchByCode(failingCodes: string[] = []) {
  return vi.fn(
    (code: string, signal: AbortSignal) =>
      new Promise<RawCountry>((resolve, reject) => {
        if (signal.aborted) {
          reject(abortReason(signal));
          return;
        }
        if (failingCodes.includes(code)) {
          reject(new HttpError(500));
          return;
        }
        resolve(countryWithCode(code));
      }),
  );
}

const signal = () => new AbortController().signal;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchCountryByCode', () => {
  it('requests a country by its alpha-3 code', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(jsonResponse(spain)),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCountryByCode('ESP', signal())).resolves.toEqual(spain);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}/alpha/ESP`);
  });

  it('rejects with HttpError on an unsuccessful status', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(jsonResponse({}, 404)));

    await expect(fetchCountryByCode('XXX', signal())).rejects.toMatchObject({ status: 404 });
  });

  it('rejects with TimeoutError when the server does not answer in time', async () => {
    vi.stubGlobal('fetch', createControlledFetch().fetch);

    await expect(fetchCountryByCode('ESP', signal(), 20)).rejects.toMatchObject({
      name: 'TimeoutError',
    });
  });
});

describe('createCountryNameResolver', () => {
  it('returns country names in the order of the codes', async () => {
    const resolveNames = createCountryNameResolver(createFetchByCode());

    await expect(resolveNames(['PRT', 'AND', 'FRA'], signal())).resolves.toEqual([
      'Portugal',
      'Andorra',
      'France',
    ]);
  });

  it('returns an empty list without requests for no codes', async () => {
    const fetchByCode = createFetchByCode();
    const resolveNames = createCountryNameResolver(fetchByCode);

    await expect(resolveNames([], signal())).resolves.toEqual([]);
    expect(fetchByCode).not.toHaveBeenCalled();
  });

  it('remembers names and does not request them again', async () => {
    const fetchByCode = createFetchByCode();
    const resolveNames = createCountryNameResolver(fetchByCode);

    await resolveNames(['AND', 'FRA'], signal());
    await resolveNames(['FRA', 'PRT'], signal());

    expect(fetchByCode.mock.calls.map(([code]) => code)).toEqual(['AND', 'FRA', 'PRT']);
  });

  it('keeps the code for a country that failed to load', async () => {
    const resolveNames = createCountryNameResolver(createFetchByCode(['FRA']));

    await expect(resolveNames(['AND', 'FRA'], signal())).resolves.toEqual(['Andorra', 'FRA']);
  });

  it('tries a failed code again next time', async () => {
    const fetchByCode = createFetchByCode(['FRA']);
    const resolveNames = createCountryNameResolver(fetchByCode);

    await resolveNames(['FRA'], signal());
    await resolveNames(['FRA'], signal());

    expect(fetchByCode).toHaveBeenCalledTimes(2);
  });

  it('rejects with AbortError when cancelled', async () => {
    const { fetch } = createControlledFetch();
    vi.stubGlobal('fetch', fetch);
    const resolveNames = createCountryNameResolver(fetchCountryByCode);
    const controller = new AbortController();

    const names = resolveNames(['AND', 'FRA'], controller.signal);
    controller.abort();

    await expect(names).rejects.toMatchObject({ name: 'AbortError' });
  });
});
