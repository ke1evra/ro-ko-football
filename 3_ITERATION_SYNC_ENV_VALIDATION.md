# Итерация 3: Добавление проверки переменных окружения в скрипты sync:*

## Проблема
Скрипты `sync:*` запускались, но сразу падали с ошибкой:
```
[sync-fixtures] Критическая ошибка: Error: Error: missing secret key. A secret key is needed to secure Payload.
```

Это происходило потому, что скрипты пытались инициализировать Payload без проверки необходимых переменных окружения.

## Решение
Добавлена проверка переменных окружения **перед** инициализацией Payload во все скрипты `sync:*`, по аналогии с рабочим скриптом `matches:import:forward`.

### Что было добавлено в каждый скрипт:

1. **Импорты для работы с окружением:**
```typescript
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
```

2. **Загрузка переменных окружения из нескольких источников:**
```typescript
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '.env.local'),
  path.resolve(process.cwd(), '.env.docker'),
  path.resolve(__dirname, '.env.docker'),
]
for (const p of envCandidates) {
  dotenv.config({ path: p })
}
```

3. **Проверка обязательных переменных окружения:**
```typescript
if (!process.env.DATABASE_URI) {
  console.error('Ошибка: не задан DATABASE_URI в .env')
  process.exit(1)
}
if (!process.env.PAYLOAD_SECRET) {
  console.error('Ошибка: не задан PAYLOAD_SECRET в .env')
  process.exit(1)
}
```

4. **Динамический импорт конфига:**
```typescript
const { default: config } = await import('../src/payload.config.ts')
const payload = await getPayload({ config })
```

## Обновленные скрипты
- `scripts/sync-fixtures.mjs`
- `scripts/sync-seasons.mjs`
- `scripts/sync-standings.mjs`
- `scripts/sync-teams.mjs`
- `scripts/sync-countries.mjs`
- `scripts/sync-match-events.mjs`
- `scripts/sync-match-events-retro.mjs`
- `scripts/sync-odds-history.mjs`

## Как это работает

Теперь при запуске скрипта:
1. Загружаются переменные окружения из доступных файлов `.env`
2. Проверяется наличие обязательных переменных (`DATABASE_URI`, `PAYLOAD_SECRET`)
3. Если переменные отсутствуют, скрипт выводит понятное сообщение об ошибке и завершается
4. Если переменные присутствуют, инициализируется Payload и выполняется синхронизация

## Требуемые переменные окружения

Для работы скриптов необходимо установить в `.env`:
```
DATABASE_URI=mongodb://...
PAYLOAD_SECRET=your-secret-key
LIVESCORE_KEY=your-api-key
LIVESCORE_SECRET=your-api-secret
```

## Статус
✅ Завершено. Все скрипты `sync:*` теперь корректно проверяют переменные окружения перед инициализацией.

## Проверка
```bash
# Без переменных окружения - выведет ошибку
npm run sync:fixtures

# С переменными окружения - будет работать
DATABASE_URI=... PAYLOAD_SECRET=... npm run sync:fixtures
```

## Соответствие с эталонным скриптом
Все изменения соответствуют подходу, используемому в рабочем скрипте `matches:import:forward`, что обеспечивает консистентность кодовой базы.
