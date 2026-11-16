# Country Search

Живой поиск стран по имени через [countries.dev](https://countries.dev) с отменой устаревших запросов через `AbortController`. Задание RS School: [Country Search](https://github.com/rolling-scopes-school/tasks/blob/master/fullstack-engineering/tasks/country-search/README.md).

- Деплой: <https://denystoneone1.github.io/country-search/>
- Проектные решения: [DESIGN.md](./DESIGN.md)

## Возможности

- Поиск по мере ввода с debounce 300 мс, пустой ввод запрос не отправляет.
- Каждое изменение ввода сразу отменяет активный запрос, устаревший ответ не попадает на экран.
- Состояния: подсказка, загрузка, результаты, "ничего не найдено" (404), ошибка с кнопкой "Повторить".
- Таймаут запроса 8 с, отличается от собственной отмены.
- Детальный вид страны по клику на карточку: описание, площадь, границы, языки, валюта.
- Бонус: кэш ответов с LRU и общий запрос для одинаковых одновременных поисков, история последних запросов в `localStorage`.

## Запуск

```bash
pnpm install
pnpm run build   # tsc компилирует src в dist (ES-модули)
pnpm dlx serve . # или любой статический сервер, затем открыть index.html
```

## Скрипты

| Скрипт               | Что делает                          |
| -------------------- | ----------------------------------- |
| `pnpm test`          | тесты Vitest                        |
| `pnpm run lint`      | ESLint                              |
| `pnpm run format`    | Prettier, исправляет форматирование |
| `pnpm run typecheck` | проверка типов без сборки           |
| `pnpm run build`     | сборка в `dist`                     |

Husky: `pre-commit` запускает только `lint-staged`, `pre-push` запускает тесты.

## Структура

```
src/
  core/   логика без DOM: debounce, searchCountries, HttpError, маппинг,
          разбор ошибок, контроллер поиска, кэш, история
  ui/     элементы интерфейса на createElement и textContent
  app.ts  связывает контроллер и интерфейс
  main.ts точка входа
```
