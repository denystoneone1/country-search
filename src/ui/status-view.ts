import type { ErrorFailure, SearchState } from '../core/search-controller.js';
import { h } from './dom.js';
import { formatNumber } from './format.js';

function failureMessage(failure: ErrorFailure): string {
  switch (failure.kind) {
    case 'timeout':
      return 'Сервер слишком долго не отвечает.';
    case 'http':
      return `Сервер ответил ошибкой ${String(failure.status)}.`;
    case 'network':
      return 'Нет связи с сервером. Проверьте подключение к интернету.';
    case 'unknown':
      return 'Что-то пошло не так.';
  }
}

function renderLoading(query: string): HTMLElement {
  return h('p', { className: 'status status--loading' }, [
    h('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }),
    `Ищем "${query}"...`,
  ]);
}

function renderEmpty(query: string): HTMLElement {
  return h('div', { className: 'status status--empty' }, [
    h('p', { className: 'status__title', text: 'Ничего не найдено' }),
    h('p', { text: `Стран по запросу "${query}" нет. Попробуйте другое название.` }),
  ]);
}

function renderError(failure: ErrorFailure, onRetry: () => void): HTMLElement {
  const retryButton = h('button', {
    className: 'button',
    text: 'Повторить',
    attrs: { type: 'button' },
  });
  retryButton.addEventListener('click', onRetry);

  return h('div', { className: 'status status--error', attrs: { role: 'alert' } }, [
    h('p', { className: 'status__title', text: 'Не удалось загрузить страны' }),
    h('p', { text: failureMessage(failure) }),
    retryButton,
  ]);
}

/** Строка состояния над списком. Для каждого состояния поиска - свой вид. */
export function renderStatus(state: SearchState, onRetry: () => void): HTMLElement {
  switch (state.status) {
    case 'idle':
      return h('p', {
        className: 'status status--idle',
        text: 'Начните вводить название страны на английском.',
      });
    case 'pending':
      // Пока идет ввод, запрос еще не отправлен: старые карточки уже убраны, спиннера еще нет
      return h('p', { className: 'status status--pending' });
    case 'loading':
      return renderLoading(state.query);
    case 'empty':
      return renderEmpty(state.query);
    case 'error':
      return renderError(state.failure, onRetry);
    case 'results':
      return h('p', {
        className: 'status status--results',
        text: `Найдено: ${formatNumber(state.countries.length)}`,
      });
  }
}
