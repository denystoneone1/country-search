import { mountApp } from './app.js';
import { searchCountries } from './core/search-countries.js';

mountApp(document.body, { search: searchCountries });
