export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  cancel: () => void;
}

/**
 * Откладывает вызов fn на delay мс. Каждый новый вызов сбрасывает таймер,
 * поэтому fn получает только аргументы последнего вызова в серии.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): Debounced<Args> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const cancel = (): void => {
    clearTimeout(timerId);
    timerId = undefined;
  };

  const debounced = (...args: Args): void => {
    cancel();
    timerId = setTimeout(() => {
      timerId = undefined;
      fn(...args);
    }, delay);
  };

  return Object.assign(debounced, { cancel });
}
