import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController, type SearchState } from './search-controller.js';
import { searchCountries } from './search-countries.js';
import { createControlledFetch, jsonResponse } from './test-utils/fetch-mock.js';
import spainResponse from './fixtures/spain.json' with { type: 'json' };
import antarcticaResponse from './fixtures/antarctica.json' with { type: 'json' };

const DELAY = 300;

function resultNames(state: SearchState): string[] {
  return state.status === 'results' ? state.countries.map(({ name }) => name) : [];
}

/**
 * Гонка устаревших ответов: ответ на ранний запрос приходит позже ответа на поздний.
 * Мок fetch отклоняет промис с AbortError, если signal отменили до ответа, поэтому тест
 * проходит только при настоящей отмене, а не при игнорировании пришедшего позже ответа.
 */
describe('search race of stale responses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function setup() {
    const { fetch, requests } = createControlledFetch();
    vi.stubGlobal('fetch', fetch);
    const states: SearchState[] = [];
    const controller = createSearchController({
      search: (query, signal) => searchCountries(query, signal),
      delay: DELAY,
      onChange: (state) => states.push(state),
    });
    return { controller, requests, states };
  }

  it('shows only the latest query when the earlier response arrives last', async () => {
    const { controller, requests, states } = setup();

    controller.input('a');
    vi.advanceTimersByTime(DELAY);
    controller.input('spain');
    vi.advanceTimersByTime(DELAY);

    const [staleRequest, latestRequest] = requests;
    expect(staleRequest?.signal.aborted).toBe(true);

    latestRequest?.respond(jsonResponse(spainResponse));
    await vi.runAllTimersAsync();
    staleRequest?.respond(jsonResponse(antarcticaResponse));
    await vi.runAllTimersAsync();

    expect(resultNames(controller.getState())).toEqual(['Spain']);
    expect(states.flatMap(resultNames)).not.toContain('Antarctica');
    expect(states.some(({ status }) => status === 'error')).toBe(false);
  });

  it('drops the stale response that arrives while the next query waits for debounce', async () => {
    const { controller, requests, states } = setup();

    controller.input('a');
    vi.advanceTimersByTime(DELAY);
    controller.input('spain');
    requests[0]?.respond(jsonResponse(antarcticaResponse));
    await vi.advanceTimersByTimeAsync(DELAY - 1);

    expect(requests[0]?.signal.aborted).toBe(true);
    expect(states.flatMap(resultNames)).not.toContain('Antarctica');
    expect(controller.getState()).toEqual({ status: 'pending', query: 'spain' });
  });
});
