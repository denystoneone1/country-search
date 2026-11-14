const numberFormat = new Intl.NumberFormat('ru-RU');

export const NO_DATA = 'нет данных';

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatArea(area: number | null): string {
  return area === null ? NO_DATA : `${formatNumber(area)} км²`;
}

export function formatList(items: string[], empty = NO_DATA): string {
  return items.length > 0 ? items.join(', ') : empty;
}
