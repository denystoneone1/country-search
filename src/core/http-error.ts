/** Сервер ответил неуспешным статусом. fetch сам такие ответы не отклоняет, поэтому бросаем вручную. */
export class HttpError extends Error {
  override readonly name = 'HttpError';

  constructor(readonly status: number) {
    super(`Request failed with status ${String(status)}`);
  }
}
