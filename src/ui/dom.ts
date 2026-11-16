export type Child = Node | string | null | false;

export interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
}

/** Создает элемент без innerHTML: текст попадает в textContent, разметка - через дочерние узлы. */
export function h<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  { className, text, attrs = {} }: ElementOptions = {},
  children: Child[] = [],
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  for (const [name, value] of Object.entries(attrs)) {
    element.setAttribute(name, value);
  }
  for (const child of children) {
    if (child !== null && child !== false) {
      element.append(child);
    }
  }

  return element;
}
