# Итерация 2: Исправление скриптов синхронизации (sync:\*)

## Проблема

Скрипты синхронизации (`sync:fixtures`, `sync:seasons`, `sync:standings`, `sync:teams`, `sync:countries`, `sync:match-events`, `sync:match-events-retro`, `sync:odds-history`) не запускались из-за неправильного способа выполнения и импортов.

### Ошибка

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/ko/payload-starter/src/lib/http/livescore/logged-fetch.js'
```

## Причина

1. Скрипты запускались через `node` вместо `tsx`
2. Импорты использовали расширение `.js` вместо `.ts`
3. Node.js не может напрямую загружать TypeScript файлы без специального загрузчика

## Решение

### 1. Обновлены команды в package.json

Изменены все скрипты `sync:*` с `node` на `tsx`:

```json
// Было:
"sync:fixtures": "node scripts/sync-fixtures.mjs",
"sync:seasons": "node scripts/sync-seasons.mjs",
"sync:standings": "node scripts/sync-standings.mjs",
"sync:teams": "node scripts/sync-teams.mjs",
"sync:countries": "node scripts/sync-countries.mjs",
"sync:match-events": "node scripts/sync-match-events.mjs",
"sync:match-events-retro": "node scripts/sync-match-events-retro.mjs"

// Стало:
"sync:fixtures": "tsx scripts/sync-fixtures.mjs",
"sync:seasons": "tsx scripts/sync-seasons.mjs",
"sync:standings": "tsx scripts/sync-standings.mjs",
"sync:teams": "tsx scripts/sync-teams.mjs",
"sync:countries": "tsx scripts/sync-countries.mjs",
"sync:match-events": "tsx scripts/sync-match-events.mjs",
"sync:match-events-retro": "tsx scripts/sync-match-events-retro.mjs"
```

### 2. Обновлены импорты во всех скриптах

Изменены импорты с `.js` на `.ts` во всех файлах:

**Файлы, которые были обновлены:**

- `scripts/sync-fixtures.mjs`
- `scripts/sync-seasons.mjs`
- `scripts/sync-standings.mjs`
- `scripts/sync-teams.mjs`
- `scripts/sync-countries.mjs`
- `scripts/sync-match-events.mjs`
- `scripts/sync-match-events-retro.mjs`
- `scripts/sync-odds-history.mjs`

**Пример изменения:**

```typescript
// Было:
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.js'
import config from '../src/payload.config.js'

// Стало:
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.ts'
import config from '../src/payload.config.ts'
```

## Как это работает

`tsx` - это TypeScript executor, который:

1. Автоматически компилирует TypeScript в памяти
2. Позволяет импортировать `.ts` файлы напрямую
3. Используется для всех скриптов, которые работают с TypeScript кодом

Это же решение уже применялось для скриптов:

- `matches:import:forward`
- `matches:import:backward`
- `predictions:stats:calc`
- И других скриптов, работающих с TypeScript

## Статус

✅ Исправлено. Все скрипты `sync:*` теперь запускаются корректно.

## Проверка

```bash
npm run sync:fixtures
npm run sync:seasons
npm run sync:standings
npm run sync:teams
npm run sync:countries
npm run sync:match-events
npm run sync:match-events-retro
```

Скрипты теперь запускаются без ошибок модуля. Если возникают ошибки, они будут связаны с отсутствием переменных окружения (DATABASE_URI, PAYLOAD_SECRET и т.д.), что является ожидаемым поведением.

## Файлы, затронутые изменением

- `package.json` - обновлены команды скриптов
- `scripts/sync-fixtures.mjs` - обновлены импорты
- `scripts/sync-seasons.mjs` - обновлены импорты
- `scripts/sync-standings.mjs` - обновлены импорты
- `scripts/sync-teams.mjs` - обновлены импорты
- `scripts/sync-countries.mjs` - обновлены импорты
- `scripts/sync-match-events.mjs` - обновлены импорты
- `scripts/sync-match-events-retro.mjs` - обновлены импорты
- `scripts/sync-odds-history.mjs` - обновлены импорты
