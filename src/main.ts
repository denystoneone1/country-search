import { mountApp } from './app.js';
import { createCachedSearch } from './core/cached-search.js';
import { searchCountries } from './core/search-countries.js';
import { createSearchHistory, type HistoryStorage } from './core/search-history.js';

/** В некоторых браузерах уже само обращение к localStorage бросает SecurityError. */
function getLocalStorage(): HistoryStorage {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
  }
}

mountApp(document.body, {
  search: createCachedSearch(searchCountries),
  history: createSearchHistory(getLocalStorage()),
});
