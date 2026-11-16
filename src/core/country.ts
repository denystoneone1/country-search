/** Страна в том виде, в каком ее отдает countries.dev. Поля без гарантии помечены optional. */
export interface RawCountry {
  name: string;
  alpha3Code: string;
  flag: string;
  flags: { png: string; svg: string };
  region: string;
  subregion: string;
  nativeName: string;
  demonym: string;
  population: number;
  languages: { name: string; nativeName: string }[];
  capital?: string;
  area?: number;
  borders?: string[];
  currencies?: { code: string; name: string; symbol?: string }[];
}

/** Данные для карточки и детального вида. Отсутствующее в ответе значение - null или пустой массив. */
export interface Country {
  code: string;
  name: string;
  nativeName: string;
  flagEmoji: string;
  flagUrl: string;
  capital: string | null;
  region: string;
  subregion: string;
  demonym: string;
  population: number;
  area: number | null;
  languages: string[];
  currencies: string[];
  borders: string[];
}
