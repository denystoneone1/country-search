import type { Country, RawCountry } from './country.js';

type RawCurrency = NonNullable<RawCountry['currencies']>[number];

function formatCurrency({ name, symbol }: RawCurrency): string {
  return symbol ? `${name} (${symbol})` : name;
}

/** Чистая функция: превращает ответ API в данные для карточки и детального вида. */
export function mapCountryResponse(raw: RawCountry): Country {
  return {
    code: raw.alpha3Code,
    name: raw.name,
    nativeName: raw.nativeName,
    flagEmoji: raw.flag,
    flagUrl: raw.flags.svg,
    // Пустую строку тоже считаем отсутствующей столицей
    capital: raw.capital?.trim() ? raw.capital : null,
    region: raw.region,
    subregion: raw.subregion,
    demonym: raw.demonym,
    population: raw.population,
    area: raw.area ?? null,
    languages: raw.languages.map((language) => language.name),
    currencies: (raw.currencies ?? []).map(formatCurrency),
    borders: [...(raw.borders ?? [])],
  };
}
