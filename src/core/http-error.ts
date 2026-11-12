export class HttpError extends Error {
  readonly status: number = 0;

  constructor(_status: number) {
    super('Not implemented');
  }
}
