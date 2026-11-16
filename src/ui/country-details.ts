import { classifySearchError } from '../core/classify-search-error.js';
import type { Country } from '../core/country.js';
import type { ResolveCountryNames } from '../core/country-names.js';
import { createFacts, createFlag } from './country-card.js';
import { h } from './dom.js';
import { formatArea, formatList, formatNumber, NO_DATA } from './format.js';

export interface CountryDetails {
  element: HTMLDialogElement;
  open: (country: Country) => void;
}

function describeCountry({ name, nativeName, region, subregion, demonym }: Country): string {
  const selfName = nativeName && nativeName !== name ? ` (самоназвание ${nativeName})` : '';
  const location = subregion && subregion !== region ? `${subregion}, ${region}` : region;
  return `${name}${selfName} находится в регионе ${location}. Жители: ${demonym || NO_DATA}.`;
}

const NO_BORDERS = 'нет сухопутных границ';

function renderContent(country: Country, borders: HTMLElement): HTMLElement[] {
  return [
    h('header', { className: 'details__header' }, [
      createFlag(country, 'details__flag'),
      h('div', {}, [
        h('h2', {
          className: 'details__title',
          text: `${country.flagEmoji} ${country.name}`,
          attrs: { id: 'details-title' },
        }),
        h('p', { className: 'details__description', text: describeCountry(country) }),
      ]),
    ]),
    createFacts(
      [
        ['Столица', country.capital ?? NO_DATA],
        ['Население', formatNumber(country.population)],
        ['Площадь', formatArea(country.area)],
        ['Языки', formatList(country.languages)],
        ['Валюта', formatList(country.currencies)],
        ['Границы', borders],
      ],
      'details__facts',
    ),
  ];
}

/**
 * Детальный вид страны в нативном dialog: фокус, Esc и затемнение фона дает браузер.
 * Соседи сначала показаны кодами, затем названиями. Загрузка названий отменяется,
 * когда окно закрыли или открыли другую страну.
 */
export function createCountryDetails(resolveNames: ResolveCountryNames): CountryDetails {
  let namesRequest: AbortController | null = null;

  const cancelNamesRequest = (): void => {
    namesRequest?.abort();
    namesRequest = null;
  };

  const loadBorderNames = async (codes: string[], target: HTMLElement): Promise<void> => {
    cancelNamesRequest();
    if (codes.length === 0) {
      return;
    }
    const request = new AbortController();
    namesRequest = request;
    target.setAttribute('aria-busy', 'true');

    try {
      target.textContent = formatList(await resolveNames(codes, request.signal));
    } catch (error) {
      // Отмена значит, что окно уже закрыто или показывает другую страну: коды остаются как есть
      if (classifySearchError(error).kind !== 'aborted') {
        target.textContent = formatList(codes);
      }
    } finally {
      target.removeAttribute('aria-busy');
      if (namesRequest === request) {
        namesRequest = null;
      }
    }
  };

  const content = h('div', { className: 'details__content' });
  const closeButton = h('button', {
    className: 'details__close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Закрыть' },
  });
  const dialog = h(
    'dialog',
    { className: 'details', attrs: { 'aria-labelledby': 'details-title' } },
    [closeButton, content],
  );

  dialog.addEventListener('close', cancelNamesRequest);
  closeButton.addEventListener('click', () => {
    dialog.close();
  });
  // Клик по затемненному фону попадает в сам dialog, а не в его содержимое
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  return {
    element: dialog,
    open: (country) => {
      const borders = h('span', { text: formatList(country.borders, NO_BORDERS) });
      content.replaceChildren(...renderContent(country, borders));
      dialog.showModal();
      void loadBorderNames(country.borders, borders);
    },
  };
}
