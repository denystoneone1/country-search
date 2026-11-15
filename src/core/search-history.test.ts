import { describe, expect, it } from 'vitest';
import { createSearchHistory, type HistoryStorage } from './search-history.js';

const KEY = 'test-history';

function createMemoryStorage(initial: Record<string, string> = {}): HistoryStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function createBrokenStorage(): HistoryStorage {
  const fail = () => {
    throw new DOMException('Storage is disabled', 'SecurityError');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

describe('createSearchHistory', () => {
  it('is empty when nothing was saved', () => {
    expect(createSearchHistory(createMemoryStorage(), { key: KEY }).list()).toEqual([]);
  });

  it('puts the latest query first', () => {
    const history = createSearchHistory(createMemoryStorage(), { key: KEY });

    history.add('spain');
    history.add('france');

    expect(history.list()).toEqual(['france', 'spain']);
  });

  it('moves a repeated query to the top instead of duplicating it', () => {
    const history = createSearchHistory(createMemoryStorage(), { key: KEY });

    history.add('spain');
    history.add('france');
    history.add('  Spain ');

    expect(history.list()).toEqual(['Spain', 'france']);
  });

  it('ignores blank queries', () => {
    const history = createSearchHistory(createMemoryStorage(), { key: KEY });

    history.add('   ');

    expect(history.list()).toEqual([]);
  });

  it('keeps only the latest queries within the limit', () => {
    const history = createSearchHistory(createMemoryStorage(), { key: KEY, limit: 2 });

    history.add('spain');
    history.add('france');
    history.add('italy');

    expect(history.list()).toEqual(['italy', 'france']);
  });

  it('survives a reload through the storage', () => {
    const storage = createMemoryStorage();
    createSearchHistory(storage, { key: KEY }).add('spain');

    expect(createSearchHistory(storage, { key: KEY }).list()).toEqual(['spain']);
  });

  it.each(['not json', '{"a":1}', '[1, "spain", null]'])('drops broken saved data %s', (saved) => {
    const history = createSearchHistory(createMemoryStorage({ [KEY]: saved }), { key: KEY });

    expect(history.list()).toEqual(saved.startsWith('[') ? ['spain'] : []);
  });

  it('clears the history', () => {
    const storage = createMemoryStorage();
    const history = createSearchHistory(storage, { key: KEY });
    history.add('spain');

    history.clear();

    expect(history.list()).toEqual([]);
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('keeps working in memory when the storage is unavailable', () => {
    const history = createSearchHistory(createBrokenStorage(), { key: KEY });

    expect(history.add('spain')).toEqual(['spain']);
    expect(history.list()).toEqual(['spain']);
  });
});
