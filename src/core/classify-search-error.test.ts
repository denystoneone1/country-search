import { describe, expect, it } from 'vitest';
import { classifySearchError } from './classify-search-error.js';
import { HttpError } from './http-error.js';

describe('classifySearchError', () => {
  it('recognizes our own cancellation as aborted', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');

    expect(classifySearchError(error)).toEqual({ kind: 'aborted' });
  });

  it('recognizes the reason of AbortController.abort() as aborted', () => {
    const controller = new AbortController();
    controller.abort();

    expect(classifySearchError(controller.signal.reason)).toEqual({ kind: 'aborted' });
  });

  it('recognizes a timeout separately from cancellation', () => {
    const error = new DOMException('The operation timed out.', 'TimeoutError');

    expect(classifySearchError(error)).toEqual({ kind: 'timeout' });
  });

  it('keeps the status of an HttpError', () => {
    expect(classifySearchError(new HttpError(503))).toEqual({ kind: 'http', status: 503 });
  });

  it('treats a TypeError from fetch as a network failure', () => {
    expect(classifySearchError(new TypeError('Failed to fetch'))).toEqual({ kind: 'network' });
  });

  it.each([new SyntaxError('Unexpected token'), 'boom', undefined])(
    'treats %s as an unknown failure',
    (error) => {
      expect(classifySearchError(error)).toEqual({ kind: 'unknown' });
    },
  );
});
