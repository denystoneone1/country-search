import { describe, expect, it, vi } from 'vitest';
import { createCachedSearch } from './cached-search.js';
import type { RawCountry } from './country.js';
import { abortReason } from './test-utils/fetch-mock.js';
import spainResponse from './fixtures/spain.json' with { type: 'json' };

interface PendingSearch {
  query: string;
  signal: AbortSignal;
  resolve: (countries: RawCountry[]) => void;
  reject: (error: Error) => void;
}

function createControlledSearch() {
  const calls: PendingSearch[] = [];
  const search = vi.fn(
    (query: string, signal: AbortSignal) =>
      new Promise<RawCountry[]>((resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(abortReason(signal));
        });
        calls.push({ query, signal, resolve, reject });
      }),
  );
  return { search, calls };
}

const signal = () => new AbortController().signal;

describe('createCachedSearch', () => {
  it('returns the result of the underlying search', async () => {
    const { search, calls } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);

    const result = cachedSearch('spain', signal());
    calls[0]?.resolve(spainResponse);

    await expect(result).resolves.toEqual(spainResponse);
  });

  it('takes a repeated query from the cache without a new request', async () => {
    const { search, calls } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);

    const first = cachedSearch('spain', signal());
    calls[0]?.resolve(spainResponse);
    await first;

    await expect(cachedSearch('spain', signal())).resolves.toEqual(spainResponse);
    expect(search).toHaveBeenCalledOnce();
  });

  it('ignores case and surrounding spaces in the cache key', async () => {
    const { search, calls } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);

    const first = cachedSearch('Spain', signal());
    calls[0]?.resolve(spainResponse);
    await first;
    await cachedSearch('  spain ', signal());

    expect(search).toHaveBeenCalledOnce();
  });

  it('sends separate requests for different queries', () => {
    const { search } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);

    void cachedSearch('spain', signal()).catch(() => undefined);
    void cachedSearch('france', signal()).catch(() => undefined);

    expect(search).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight request between identical queries', async () => {
    const { search, calls } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);

    const first = cachedSearch('spain', signal());
    const second = cachedSearch('spain', signal());
    calls[0]?.resolve(spainResponse);

    await expect(Promise.all([first, second])).resolves.toEqual([spainResponse, spainResponse]);
    expect(search).toHaveBeenCalledOnce();
  });

  it('keeps the shared request alive for others when one caller aborts', async () => {
    const { search, calls } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);
    const quitter = new AbortController();

    const abandoned = cachedSearch('spain', quitter.signal);
    const kept = cachedSearch('spain', signal());
    quitter.abort();
    calls[0]?.resolve(spainResponse);

    await expect(abandoned).rejects.toMatchObject({ name: 'AbortError' });
    await expect(kept).resolves.toEqual(spainResponse);
    expect(calls[0]?.signal.aborted).toBe(false);
  });

  it('aborts the underlying request when every caller has aborted', async () => {
    const { search, calls } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);
    const first = new AbortController();
    const second = new AbortController();

    const results = [cachedSearch('spain', first.signal), cachedSearch('spain', second.signal)];
    first.abort();
    second.abort();

    await Promise.allSettled(results);
    expect(calls[0]?.signal.aborted).toBe(true);
  });

  it('starts a new request after the previous one was aborted by everyone', async () => {
    const { search } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);
    const controller = new AbortController();

    const abandoned = cachedSearch('spain', controller.signal);
    controller.abort();
    await abandoned.catch(() => undefined);
    void cachedSearch('spain', signal()).catch(() => undefined);

    expect(search).toHaveBeenCalledTimes(2);
  });

  it('rejects right away without a request when the signal is already aborted', async () => {
    const { search } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);
    const controller = new AbortController();
    controller.abort();

    await expect(cachedSearch('spain', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('does not cache failures', async () => {
    const { search, calls } = createControlledSearch();
    const cachedSearch = createCachedSearch(search);

    const failed = cachedSearch('spain', signal());
    calls[0]?.reject(new TypeError('Failed to fetch'));
    await expect(failed).rejects.toBeInstanceOf(TypeError);

    const retried = cachedSearch('spain', signal());
    calls[1]?.resolve(spainResponse);

    await expect(retried).resolves.toEqual(spainResponse);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('evicts the least recently used query when the cache is full', async () => {
    const { search, calls } = createControlledSearch();
    const cachedSearch = createCachedSearch(search, { maxEntries: 2 });
    const settle = async (query: string) => {
      const result = cachedSearch(query, signal());
      calls.at(-1)?.resolve([]);
      await result;
    };

    await settle('a');
    await settle('b');
    await cachedSearch('a', signal());
    await settle('c');
    search.mockClear();

    await cachedSearch('a', signal());
    void cachedSearch('b', signal()).catch(() => undefined);

    expect(search).toHaveBeenCalledExactlyOnceWith('b', expect.any(AbortSignal));
  });
});
