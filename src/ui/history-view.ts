import { h } from './dom.js';

export interface HistoryHandlers {
  onPick: (query: string) => void;
  onClear: () => void;
}

/** Последние запросы: клик по пункту сразу повторяет поиск. Пустая история не рисуется. */
export function renderHistory(
  items: string[],
  { onPick, onClear }: HistoryHandlers,
): HTMLElement[] {
  if (items.length === 0) {
    return [];
  }

  const chips = items.map((query) => {
    const button = h('button', {
      className: 'history__item',
      text: query,
      attrs: { type: 'button' },
    });
    button.addEventListener('click', () => {
      onPick(query);
    });
    return h('li', {}, [button]);
  });

  const clearButton = h('button', {
    className: 'history__clear',
    text: 'Очистить',
    attrs: { type: 'button' },
  });
  clearButton.addEventListener('click', onClear);

  return [
    h('span', { className: 'history__title', text: 'Недавние:' }),
    h('ul', { className: 'history__list' }, chips),
    clearButton,
  ];
}
