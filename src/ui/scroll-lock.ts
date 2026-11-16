const LOCKED_CLASS = 'is-scroll-locked';

/**
 * Запрещает прокрутку страницы под модальным окном и возвращает функцию, которая ее снимает.
 * overflow: hidden у body мобильный Safari игнорирует при свайпе, поэтому body фиксируется
 * на месте со сдвигом на текущую прокрутку, а после закрытия позиция восстанавливается.
 */
export function lockPageScroll(): () => void {
  const { body } = document;
  const scrollTop = window.scrollY;

  body.style.setProperty('--scroll-lock-top', `${String(-scrollTop)}px`);
  body.classList.add(LOCKED_CLASS);

  return () => {
    body.classList.remove(LOCKED_CLASS);
    body.style.removeProperty('--scroll-lock-top');
    window.scrollTo(0, scrollTop);
  };
}
