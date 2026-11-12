import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from './http-error.js';
import { API_URL, searchCountries } from './search-countries.js';
import { createControlledFetch, jsonResponse } from './test-utils/fetch-mock.js';
import spainResponse from './fixtures/spain.json' with { type: 'json' };

function mockFetch(response: Response) {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpError', () => {
  it('is an Error that keeps the response status', () => {
    const error = new HttpError(500);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(500);
    expect(error.message).toContain('500');
  });
});

describe('searchCountries', () => {
  it('requests countries by name', async () => {
    const fetchMock = mockFetch(jsonResponse(spainResponse));

    await searchCountries('spain', new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}/name/spain`);
  });

  it('trims and encodes the query', async () => {
    const fetchMock = mockFetch(jsonResponse(spainResponse));

    await searchCountries('  united states/ ', new AbortController().signal);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}/name/united%20states%2F`);
  });

  it('resolves with the countries from the response body', async () => {
    mockFetch(jsonResponse(spainResponse));

    const countries = await searchCountries('spain', new AbortController().signal);

    expect(countries).toEqual(spainResponse);
  });

  it('passes a signal that is aborted together with the given one', async () => {
    const fetchMock = mockFetch(jsonResponse(spainResponse));
    const controller = new AbortController();

    await searchCountries('spain', controller.signal);
    const passedSignal = fetchMock.mock.calls[0]?.[1]?.signal;
    controller.abort();

    expect(passedSignal?.aborted).toBe(true);
  });

  it('rejects with AbortError when the request is aborted before the response', async () => {
    const { fetch, requests } = createControlledFetch();
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();

    const result = searchCountries('spain', controller.signal);
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(requests).toHaveLength(1);
  });

  it.each([500, 503, 429])('rejects with HttpError for status %i', async (status) => {
    mockFetch(jsonResponse({ message: 'Server error' }, status));

    const result = searchCountries('spain', new AbortController().signal);

    await expect(result).rejects.toBeInstanceOf(HttpError);
    await expect(result).rejects.toMatchObject({ status });
  });

  it('propagates a network failure as is', async () => {
    const networkError = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', () => Promise.reject(networkError));

    await expect(searchCountries('spain', new AbortController().signal)).rejects.toBe(networkError);
  });
});
