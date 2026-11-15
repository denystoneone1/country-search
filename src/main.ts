import { mountApp } from './app.js';
import { createCachedSearch } from './core/cached-search.js';
import { searchCountries } from './core/search-countries.js';

mountApp(document.body, { search: createCachedSearch(searchCountries) });
