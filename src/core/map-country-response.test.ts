import { describe, expect, it } from 'vitest';
import type { RawCountry } from './country.js';
import { mapCountryResponse } from './map-country-response.js';
import spainResponse from './fixtures/spain.json' with { type: 'json' };
import antarcticaResponse from './fixtures/antarctica.json' with { type: 'json' };

function firstCountry(response: RawCountry[]): RawCountry {
  const [country] = response;
  if (!country) {
    throw new Error('Fixture is empty');
  }
  return country;
}

const spain = firstCountry(spainResponse);
const antarctica = firstCountry(antarcticaResponse);

describe('mapCountryResponse', () => {
  it('maps card fields of a full response', () => {
    const country = mapCountryResponse(spain);

    expect(country).toMatchObject({
      code: 'ESP',
      name: 'Spain',
      flagEmoji: '🇪🇸',
      flagUrl: 'https://flagcdn.com/es.svg',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      languages: ['Spanish'],
    });
  });

  it('maps detail fields of a full response', () => {
    const country = mapCountryResponse(spain);

    expect(country).toMatchObject({
      nativeName: 'España',
      subregion: 'Southern Europe',
      demonym: 'Spanish',
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
    });
  });

  it('formats currencies with their symbol', () => {
    expect(mapCountryResponse(spain).currencies).toEqual(['Euro (€)']);
  });

  it('keeps currency name alone when the symbol is missing', () => {
    const raw: RawCountry = { ...spain, currencies: [{ code: 'XXX', name: 'Test coin' }] };

    expect(mapCountryResponse(raw).currencies).toEqual(['Test coin']);
  });

  it('keeps every language in the original order', () => {
    expect(mapCountryResponse(antarctica).languages).toEqual(['English', 'Russian']);
  });

  it('uses null and empty arrays for fields missing in the response', () => {
    const country = mapCountryResponse(antarctica);

    expect(country.capital).toBeNull();
    expect(country.currencies).toEqual([]);
    expect(country.borders).toEqual([]);
  });

  it('uses null for a missing area', () => {
    const withoutArea: RawCountry = { ...spain };
    delete withoutArea.area;

    expect(mapCountryResponse(withoutArea).area).toBeNull();
  });

  it('treats an empty capital string as missing', () => {
    expect(mapCountryResponse({ ...spain, capital: '' }).capital).toBeNull();
  });

  it('does not mutate the raw response', () => {
    const raw = structuredClone(spain);

    mapCountryResponse(raw);

    expect(raw).toEqual(spain);
  });

  it('returns arrays that are not shared with the raw response', () => {
    const country = mapCountryResponse(spain);

    expect(country.borders).not.toBe(spain.borders);
  });
});
