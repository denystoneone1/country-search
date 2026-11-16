/** Причина отмены сигнала как Error. Без явной причины abort() дает DOMException AbortError. */
export function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('The operation was aborted.', 'AbortError');
}
