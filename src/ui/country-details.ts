import type { Country } from '../core/country.js';
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

function renderContent(country: Country): HTMLElement[] {
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
        ['Границы', formatList(country.borders, 'нет сухопутных границ')],
      ],
      'details__facts',
    ),
  ];
}

/** Детальный вид страны в нативном dialog: фокус, Esc и затемнение фона дает браузер. */
export function createCountryDetails(): CountryDetails {
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
      content.replaceChildren(...renderContent(country));
      dialog.showModal();
    },
  };
}
