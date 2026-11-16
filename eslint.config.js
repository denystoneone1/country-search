import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';

const NO_HTML_STRINGS = ['innerHTML', 'outerHTML', 'insertAdjacentHTML'].map((property) => ({
  property,
  message: 'Разметка создается через createElement и textContent.',
}));

export default defineConfig([
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{js,ts}'],
    extends: [js.configs.recommended],
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'error',
      eqeqeq: 'error',
    },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Параметры с префиксом _ нужны в заглушках красных коммитов TDD
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-properties': ['error', ...NO_HTML_STRINGS],
    },
  },
  {
    // Запросы, отмена, маппинг и debounce не зависят от DOM и тестируются без браузера
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'HTMLElement',
      ],
    },
  },
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
  eslintConfigPrettier,
]);
