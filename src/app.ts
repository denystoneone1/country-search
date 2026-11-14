import {
  createSearchController,
  type SearchFn,
  type SearchState,
} from './core/search-controller.js';
import { createCountryCard } from './ui/country-card.js';
import { createCountryDetails } from './ui/country-details.js';
import { h } from './ui/dom.js';
import { createSearchField } from './ui/search-field.js';
import { renderStatus } from './ui/status-view.js';

/** Задержка между последним нажатием клавиши и запросом. Обоснование - в DESIGN.md. */
export const SEARCH_DEBOUNCE_MS = 300;

export interface AppOptions {
  search: SearchFn;
}

export function mountApp(root: HTMLElement, { search }: AppOptions): void {
  const details = createCountryDetails();
  const status = h('div', { className: 'app__status', attrs: { 'aria-live': 'polite' } });
  const results = h('ul', { className: 'results', attrs: { 'aria-label': 'Найденные страны' } });

  const render = (state: SearchState): void => {
    status.replaceChildren(renderStatus(state, controller.retry));
    results.replaceChildren(
      ...(state.status === 'results'
        ? state.countries.map((country) => createCountryCard(country, details.open))
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
      status,
      results,
    ]),
    details.element,
  );

  render(controller.getState());
}
