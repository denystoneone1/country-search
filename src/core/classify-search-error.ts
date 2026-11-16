import { HttpError } from './http-error.js';

export type SearchFailure =
  | { kind: 'aborted' }
  | { kind: 'timeout' }
  | { kind: 'http'; status: number }
  | { kind: 'network' }
  | { kind: 'unknown' };

function isDomException(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

/**
 * Разбирает ошибку поиска по видам. Отмена своего запроса (aborted) - не ошибка для пользователя,
 * а таймаут, HttpError и обрыв сети - настоящие ошибки, которые показываются с кнопкой повтора.
 */
export function classifySearchError(error: unknown): SearchFailure {
  if (isDomException(error, 'AbortError')) {
    return { kind: 'aborted' };
  }
  if (isDomException(error, 'TimeoutError')) {
    return { kind: 'timeout' };
  }
  if (error instanceof HttpError) {
    return { kind: 'http', status: error.status };
  }
  // fetch отклоняет промис с TypeError, когда запрос не дошел до сервера
  if (error instanceof TypeError) {
    return { kind: 'network' };
  }
  return { kind: 'unknown' };
}
