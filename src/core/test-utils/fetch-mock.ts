/** Помощники для тестов: мок fetch, который ведет себя как настоящий и честно реагирует на signal. */

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('The operation was aborted.', 'AbortError');
}

export interface PendingRequest {
  url: string;
  signal: AbortSignal;
  respond: (response: Response) => void;
  fail: (error: unknown) => void;
}

/**
 * fetch, который не отвечает сам: тест решает, когда и в каком порядке резолвить запросы.
 * Как и настоящий fetch, отклоняет промис с причиной отмены, если signal отменили раньше ответа.
 */
export function createControlledFetch(): {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  requests: PendingRequest[];
} {
  const requests: PendingRequest[] = [];

  const fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const signal = init?.signal ?? new AbortController().signal;

    return new Promise<Response>((resolve, reject) => {
      if (signal.aborted) {
        reject(abortReason(signal));
        return;
      }
      signal.addEventListener('abort', () => {
        reject(abortReason(signal));
      });
      requests.push({
        url: input instanceof Request ? input.url : String(input),
        signal,
        respond: resolve,
        fail: reject,
      });
    });
  };

  return { fetch, requests };
}
