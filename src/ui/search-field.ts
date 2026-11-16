import { h } from './dom.js';

export interface SearchField {
  element: HTMLElement;
  setValue: (value: string) => void;
}

export function createSearchField(onInput: (value: string) => void): SearchField {
  const input = h('input', {
    className: 'search__input',
    attrs: {
      id: 'country-query',
      type: 'search',
      placeholder: 'Например, spain',
      autocomplete: 'off',
      spellcheck: 'false',
      enterkeyhint: 'search',
    },
  });
  input.addEventListener('input', () => {
    onInput(input.value);
  });

  const label = h('label', {
    className: 'search__label',
    text: 'Название страны',
    attrs: { for: input.id },
  });

  return {
    element: h('div', { className: 'search' }, [label, input]),
    setValue: (value) => {
      input.value = value;
      input.focus();
    },
  };
}
