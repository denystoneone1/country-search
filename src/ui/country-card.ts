import type { Country } from '../core/country.js';
import { h } from './dom.js';
import { formatNumber, NO_DATA } from './format.js';

export type Fact = [term: string, value: string];

export function createFlag(country: Country, className: string): HTMLImageElement {
  return h('img', {
    className,
    attrs: {
      src: country.flagUrl,
      alt: `Флаг: ${country.name}`,
      loading: 'lazy',
      decoding: 'async',
    },
  });
}

export function createFacts(facts: Fact[], className: string): HTMLDListElement {
  return h(
    'dl',
    { className },
    facts.map(([term, value]) =>
      h('div', { className: `${className}-row` }, [
        h('dt', { text: term }),
        h('dd', { text: value }),
      ]),
    ),
  );
}

/**
 * Карточка страны. Кнопка с названием растянута на всю карточку через CSS,
 * поэтому детальный вид открывается кликом в любом месте карточки и с клавиатуры.
 */
export function createCountryCard(
  country: Country,
  onOpen: (country: Country) => void,
): HTMLLIElement {
  const openButton = h('button', {
    className: 'card__open',
    text: country.name,
    attrs: { type: 'button', 'aria-haspopup': 'dialog' },
  });
  openButton.addEventListener('click', () => {
    onOpen(country);
  });

  const card = h('article', { className: 'card' }, [
    createFlag(country, 'card__flag'),
    h('h2', { className: 'card__name' }, [openButton]),
    createFacts(
      [
        ['Столица', country.capital ?? NO_DATA],
        ['Регион', country.region],
        ['Население', formatNumber(country.population)],
      ],
      'card__facts',
    ),
  ]);

  return h('li', { className: 'results__item' }, [card]);
}
