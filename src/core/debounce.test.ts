import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce.js';

const DELAY = 300;

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call fn before the delay has passed', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY - 1);

    expect(fn).not.toHaveBeenCalled();
  });

  it('calls fn once after the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on every new call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY - 100);
    debounced();
    vi.advanceTimersByTime(DELAY - 100);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes the arguments of the last call', () => {
    const fn = vi.fn<(query: string) => void>();
    const debounced = debounce(fn, DELAY);

    debounced('s');
    debounced('sp');
    debounced('spa');
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledExactlyOnceWith('spa');
  });

  it('calls fn again for calls separated by more than the delay', () => {
    const fn = vi.fn<(query: string) => void>();
    const debounced = debounce(fn, DELAY);

    debounced('sp');
    vi.advanceTimersByTime(DELAY);
    debounced('spain');
    vi.advanceTimersByTime(DELAY);

    expect(fn.mock.calls).toEqual([['sp'], ['spain']]);
  });

  it('does not call fn after cancel', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(DELAY);

    expect(fn).not.toHaveBeenCalled();
  });

  it('keeps independent timers for separate debounced functions', () => {
    const first = vi.fn();
    const second = vi.fn();
    const debouncedFirst = debounce(first, DELAY);
    const debouncedSecond = debounce(second, DELAY);

    debouncedFirst();
    debouncedSecond();
    debouncedFirst.cancel();
    vi.advanceTimersByTime(DELAY);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
