import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawCountry } from './country.js';
import { HttpError } from './http-error.js';
import { createSearchController, type SearchState } from './search-controller.js';
import { abortReason } from './test-utils/fetch-mock.js';
import spainResponse from './fixtures/spain.json' with { type: 'json' };

const DELAY = 300;

interface PendingSearch {
  query: string;
  signal: AbortSignal;
  resolve: (countries: RawCountry[]) => void;
  reject: (error: Error) => void;
}

/** Поиск, который отвечает только по команде теста и отклоняется при отмене, как fetch. */
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

function setup() {
  const { search, calls } = createControlledSearch();
  const states: SearchState[] = [];
  const controller = createSearchController({
    search,
    delay: DELAY,
    onChange: (state) => states.push(state),
  });
  return { controller, search, calls, states };
}

describe('createSearchController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in the idle state', () => {
    const { controller } = setup();

    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('does not search for empty or blank input', () => {
    const { controller, search } = setup();

    controller.input('');
    controller.input('   ');
    vi.advanceTimersByTime(DELAY);

    expect(search).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('waits in the pending state during debounce without sending a request', () => {
    const { controller, search } = setup();

    controller.input('spain');

    expect(controller.getState()).toEqual({ status: 'pending', query: 'spain' });
    expect(search).not.toHaveBeenCalled();
  });

  it('shows loading only once the request is sent after the debounce delay', () => {
    const { controller, search } = setup();

    controller.input('spain');
    vi.advanceTimersByTime(DELAY);

    expect(search).toHaveBeenCalledExactlyOnceWith('spain', expect.any(AbortSignal));
    expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
  });

  it('leaves loading for pending when new input aborts the request in flight', () => {
    const { controller } = setup();

    controller.input('sp');
    vi.advanceTimersByTime(DELAY);
    controller.input('spain');

    expect(controller.getState()).toEqual({ status: 'pending', query: 'spain' });
  });

  it('sends one request for fast typing', () => {
    const { controller, search } = setup();

    controller.input('s');
    controller.input('sp');
    controller.input('spa');
    vi.advanceTimersByTime(DELAY);

    expect(search).toHaveBeenCalledExactlyOnceWith('spa', expect.any(AbortSignal));
  });

  it('shows mapped countries when the search succeeds', async () => {
    const { controller, calls } = setup();

    controller.input('spain');
    vi.advanceTimersByTime(DELAY);
    calls[0]?.resolve(spainResponse);
    await vi.runAllTimersAsync();

    const state = controller.getState();
    expect(state.status).toBe('results');
    expect(state.status === 'results' && state.countries.map(({ name }) => name)).toEqual([
      'Spain',
    ]);
  });

  it('shows the empty state when nothing matches', async () => {
    const { controller, calls } = setup();

    controller.input('zzz');
    vi.advanceTimersByTime(DELAY);
    calls[0]?.resolve([]);
    await vi.runAllTimersAsync();

    expect(controller.getState()).toEqual({ status: 'empty', query: 'zzz' });
  });

  it('aborts the active request on new input before the debounce delay passes', () => {
    const { controller, calls } = setup();

    controller.input('sp');
    vi.advanceTimersByTime(DELAY);
    controller.input('spa');

    expect(calls[0]?.signal.aborted).toBe(true);
  });

  it('aborts the active request and goes idle when the input is cleared', () => {
    const { controller, calls, search } = setup();

    controller.input('sp');
    vi.advanceTimersByTime(DELAY);
    controller.input('');
    vi.advanceTimersByTime(DELAY);

    expect(calls[0]?.signal.aborted).toBe(true);
    expect(search).toHaveBeenCalledOnce();
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('never shows our own cancellation as an error', async () => {
    const { controller, states } = setup();

    controller.input('sp');
    vi.advanceTimersByTime(DELAY);
    controller.input('');
    await vi.runAllTimersAsync();

    expect(states.some(({ status }) => status === 'error')).toBe(false);
  });

  it.each([
    [new HttpError(500), { kind: 'http', status: 500 }],
    [new DOMException('The operation timed out.', 'TimeoutError'), { kind: 'timeout' }],
    [new TypeError('Failed to fetch'), { kind: 'network' }],
  ])('shows a real failure %s as an error', async (error, failure) => {
    const { controller, calls } = setup();

    controller.input('spain');
    vi.advanceTimersByTime(DELAY);
    calls[0]?.reject(error);
    await vi.runAllTimersAsync();

    expect(controller.getState()).toEqual({ status: 'error', query: 'spain', failure });
  });

  it('retries the last entered query right away', async () => {
    const { controller, calls, search } = setup();

    controller.input('spain');
    vi.advanceTimersByTime(DELAY);
    calls[0]?.reject(new HttpError(500));
    await vi.runAllTimersAsync();
    controller.retry();

    expect(search).toHaveBeenLastCalledWith('spain', expect.any(AbortSignal));
    expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
  });

  it('does nothing on retry when nothing was searched', () => {
    const { controller, search } = setup();

    controller.retry();

    expect(search).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('searches right away with searchNow and drops a pending debounced search', () => {
    const { controller, search } = setup();

    controller.input('fra');
    controller.searchNow('spain');
    vi.advanceTimersByTime(DELAY);

    expect(search).toHaveBeenCalledExactlyOnceWith('spain', expect.any(AbortSignal));
  });

  it('aborts the active request and stops notifying after dispose', async () => {
    const { controller, calls, states } = setup();

    controller.input('spain');
    vi.advanceTimersByTime(DELAY);
    const statesBeforeDispose = states.length;
    controller.dispose();
    await vi.runAllTimersAsync();

    expect(calls[0]?.signal.aborted).toBe(true);
    expect(states).toHaveLength(statesBeforeDispose);
  });
});
