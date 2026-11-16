import {
  createSearchController,
  type SearchFn,
  type SearchState,
} from './core/search-controller.js';
import type { ResolveCountryNames } from './core/country-names.js';
import { debounce } from './core/debounce.js';
import type { SearchHistory } from './core/search-history.js';
import { createCountryCard } from './ui/country-card.js';
import { createCountryDetails } from './ui/country-details.js';
import { h } from './ui/dom.js';
import { renderHistory } from './ui/history-view.js';
import { createSearchField } from './ui/search-field.js';
import { renderStatus } from './ui/status-view.js';

/** Задержка между последним нажатием клавиши и запросом. Обоснование - в DESIGN.md. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Сколько результат должен провисеть без нового ввода, чтобы запрос попал в историю.
 * Так в историю не попадают части слова, по которым случайно нашлись страны при наборе.
 */
export const HISTORY_SETTLE_MS = 1500;

export interface AppOptions {
  search: SearchFn;
  resolveNames: ResolveCountryNames;
  history: SearchHistory;
}

export function mountApp(root: HTMLElement, { search, resolveNames, history }: AppOptions): void {
  const details = createCountryDetails(resolveNames);
  const historyBar = h('nav', { className: 'history', attrs: { 'aria-label': 'История поиска' } });
  const status = h('div', { className: 'app__status', attrs: { 'aria-live': 'polite' } });
  const results = h('ul', { className: 'results', attrs: { 'aria-label': 'Найденные страны' } });

  const renderHistoryBar = (items: string[]): void => {
    historyBar.replaceChildren(
      ...renderHistory(items, {
        onPick: (query) => {
          searchField.setValue(query);
          controller.searchNow(query);
        },
        onClear: () => {
          history.clear();
          renderHistoryBar([]);
        },
      }),
    );
  };

  const remember = (query: string): void => {
    renderHistoryBar(history.add(query));
  };
  const rememberWhenSettled = debounce(remember, HISTORY_SETTLE_MS);

  const render = (state: SearchState): void => {
    if (state.status === 'results') {
      rememberWhenSettled(state.query);
    } else {
      rememberWhenSettled.cancel();
    }

    status.replaceChildren(renderStatus(state, controller.retry));
    results.replaceChildren(
      ...(state.status === 'results'
        ? state.countries.map((country) =>
            createCountryCard(country, (opened) => {
              // Открытая карточка - явный знак, что запрос нужный: сохраняем без ожидания
              rememberWhenSettled.cancel();
              remember(state.query);
              details.open(opened);
            }),
          )
        : []),
    );
  };

  const controller = createSearchController({
    search,
    delay: SEARCH_DEBOUNCE_MS,
    onChange: render,
  });
  const searchField = createSearchField(controller.input);

  root.append(
    h('main', { className: 'app' }, [
      h('header', { className: 'app__header' }, [
        h('h1', { className: 'app__title', text: 'Поиск стран' }),
        h('p', {
          className: 'app__subtitle',
          text: 'Флаг, столица, регион и население любой страны мира.',
        }),
      ]),
      searchField.element,
      historyBar,
      status,
      results,
    ]),
    details.element,
  );

  renderHistoryBar(history.list());
  render(controller.getState());
}
