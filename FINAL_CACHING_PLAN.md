# План: Кэширование + Логирование LiveScore API

## ⚠️ КРИТИЧНОЕ ТРЕБОВАНИЕ

**ЖЁСТКИЙ ЛИМИТ: 45,000 запросов/день к LiveScore API**

Это требование должно соблюдаться на ВСЕХ уровнях архитектуры:

- ✅ Автоматическое отключение запросов при достижении лимита
- ✅ Мониторинг текущего количества запросов в реальном времени
- ✅ Алерты при достижении 80% лимита (36,000 запросов)
- ✅ Приоритизация запросов (лайф матчи > фикстуры > остальное)
- ✅ Логирование каждого запроса с подсчётом дневного лимита

---

## Проблема

- Лимит API: 50,000 запросов/день (контрактный)
- **Безопасный лимит: 45,000 запросов/день** (с запасом 10%)
- Текущий пик: 60,000 запросов (превышение на 33%)
- Нет логирования → не понятно откуда запросы
- **Глобальная цель**: НЕ ходить напрямую с сайта в LiveScore API, всё загружать превентивно и хранить в БД

---

## Существующие коллекции в Payload

✅ **Уже есть:**

- `Users` - пользователи
- `Media` - медиафайлы
- `Posts` - публикации
- `Comments` - комментарии
- `CommentVotes` - голоса за комментарии
- `Leagues` - лиги
- `Matches` - матчи
- `MatchStats` - статистика матчей
- `PredictionStats` - статистика прогнозов
- `Markets` - рынки ставок
- `OutcomeGroups` - группы исходов

❌ **НЕ существуют (нужно создать):**

- `Fixtures` - фикстуры (автосинхронизация)
- `Seasons` - сезоны (автосинхронизация)
- `Standings` - турнирные таблицы (ручная синхронизация)
- `MatchEvents` - события матчей (автосинхронизация: вперед/назад/луп)
- `Teams` - команды (ручная синхронизация)
- `Countries` - страны (ручная синхронизация)
- `ApiRequestLogs` - логи запросов

❌ **НЕ нужны (убираем):**

- ~~`Topscorers` - бомбардиры~~ (не нужно пока)

---

## Архитектура: 3 уровня кэширования (разные форматы данных!)

```
Клиент (браузер)
    ↓
SSR Page (Next.js)
    ↓
┌──────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 1: SSR Cache (Next.js)                           │
│ Кэширует НОРМАЛИЗОВАННЫЕ данные (после обработки)        │
│ TTL: 30 сек - 2 мин                                      │
│ Формат: готовые React-компоненты / JSON для фронтенда    │
│ Время доступа: ~2 мс                                     │
└──────────────────────────────────────────────────────────┘
    ↓ (если нет в кэше или устарело)

API Route / Server Action
    ↓
┌──────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 2: Payload Cache (MongoDB)                       │
│ Кэширует НОРМАЛИЗОВАННЫЕ данные (Payload коллекции)      │
│ TTL: зависит от типа данных (1 час - 24 часа)           │
│ Формат: нормализованные объекты с relationships          │
│ Время доступа: ~15 мс                                    │
│                                                          │
│ Коллекции:                                               │
│ - Fixtures (нормализованные фикстуры)                    │
│ - Matches (нормализованные матчи)                        │
│ - Standings (нормализованные таблицы)                    │
│ - Topscorers (нормализованные бомбардиры)                │
│ - Teams, Countries, Seasons                              │
└──────────────────────────────────────────────────────────┘
    ↓ (если нет в БД или устарело)

Фоновый процесс / API Route
    ↓
┌──────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 3: LiveScore API Cache (customFetch.ts)          │
│ Кэширует СЫРЫЕ данные (как приходят от LiveScore)        │
│ TTL: 30 сек - 2 мин                                      │
│ Формат: сырой JSON от LiveScore API                      │
│ Время доступа: ~250 мс (первый запрос)                   │
│                ~2 мс (из кэша apiCache.ts)               │
│                                                          │
│ Эндпоинты:                                               │
│ - /fixtures/matches.json (сырые фикстуры)                │
│ - /matches/live.json (лайф матчи, ТОЛЬКО КЭШ!)           │
│ - /competitions/standings.json (сырые таблицы)           ��
│ - /competitions/topscorers.json (сырые бомбардиры)       │
└──────────────────────────────────────────────────────────┘
    ↓
    Нормализация данных
    ↓
    Сохранение в Payload (УРОВЕНЬ 2)

Фоновые процессы (Workers/Cron):
├── sync-fixtures.mjs (каждый час) ✅ Авто
│   └─> LiveScore API → нормализация → Payload
├── sync-odds-history.mjs (каждые 30 сек) ✅ Авто
│   └─> LiveScore API → нормализация → Payload
├── sync-match-events.mjs (вперед/назад/луп) ✅ Авто
│   └─> LiveScore API → нормализация → Payload
└── sync-seasons.mjs (раз в день) ✅ Авто
    └─> LiveScore API → нормализация → Payload

Ручная синхронизация (через админку):
├── sync-standings.mjs 🔧 Ручная
├── sync-teams.mjs 🔧 Ручная
└── sync-countries.mjs 🔧 Ручная

⚠️ ВАЖНО:
- УРОВЕНЬ 1 (SSR) - кэширует готовые данные для фронтенда
- УРОВЕНЬ 2 (Payload) - кэширует нормализованные данные
- УРОВЕНЬ 3 (LiveScore) - кэширует сырые данные от API
- Данные РАЗНЫЕ на каждом уровне!
```

---

## Пример потока данных (Fixtures)

### Сценарий 1: Холодный старт (нет данных нигде)

```
1. Пользователь → SSR Page
2. SSR Cache: MISS
3. API Route → Payload.find('fixtures')
4. Payload Cache: MISS (нет в БД)
5. Фоновый процесс → LiveScore API
6. LiveScore API Cache: MISS
7. LiveScore API → сырой JSON:
   {
     "Stages": [{
       "Sid": 12345,
       "Snm": "Premier League",
       "Events": [{
         "Eid": 67890,
         "Eps": "NS",  // Not Started
         "Esd": 1234567890,
         "T1": [{"ID": 1, "Nm": "Arsenal", "Img": "..."}],
         "T2": [{"ID": 2, "Nm": "Chelsea", "Img": "..."}],
         ...
       }]
     }]
   }

8. Нормализация → Payload формат:
   {
     fixtureId: 67890,
     status: 'scheduled',
     date: new Date(1234567890 * 1000),
     homeTeam: { id: 1, name: 'Arsenal', logo: '...' },
     awayTeam: { id: 2, name: 'Chelsea', logo: '...' },
     league: relationship(12345),
     ...
   }

9. Сохранение в Payload (УРОВЕНЬ 2)
10. Возврат в API Route
11. Обработка для фронтенда (добавление локализации, форматирование)
12. Сохранение в SSR Cache (УРОВЕНЬ 1)
13. Возврат пользователю

Время: ~300 мс
```

### Сценарий 2: Данные в Payload (тёплый кэш)

```
1. Пользователь → SSR Page
2. SSR Cache: MISS
3. API Route → Payload.find('fixtures')
4. Payload Cache: HIT (данные в БД, свежие)
5. Возврат нормализованных данных:
   {
     fixtureId: 67890,
     status: 'scheduled',
     homeTeam: { id: 1, name: 'Arsenal', ... },
     ...
   }

6. Обработка для фронтенда
7. Сохранение в SSR Cache (УРОВЕНЬ 1)
8. Возврат пользователю

Время: ~20 мс
```

### Сценарий 3: Данные в SSR Cache (горячий кэш)

```
1. Пользователь → SSR Page
2. SSR Cache: HIT (готовые данные для фронтенда)
3. Возврат пользователю

Время: ~2 мс
```

### Сценарий 4: Лайф матчи (ТОЛЬКО УРОВЕНЬ 3, без БД!)

```
1. Пользователь → SSR Page
2. SSR Cache: MISS (TTL 30 сек)
3. API Route → LiveScore API
4. LiveScore API Cache: HIT (apiCache.ts, TTL 30 сек)
5. Возврат сырых данных
6. Нормализация на лету (НЕ сохраняем в Payload!)
7. Сохранение в SSR Cache (УРОВЕНЬ 1, TTL 30 сек)
8. Возврат пользователю

Время: ~5 мс (из кэша LiveScore)

⚠️ Лайф матчи НЕ сохраняются в Payload!
```

=======

---

## Стратегия кэширования по типам данных

| Тип данных          | Хранение | Кэш       | Обновление       | Синхронизация | Примечание          |
| ------------------- | -------- | --------- | ---------------- | ------------- | ------------------- |
| **Лайф матчи**      | ❌ Нет   | ✅ 30 сек | Реал-тайм        | ❌ Нет        | Только кэш, не в БД |
| **Фикстуры**        | ✅ БД    | ✅ 2 мин  | Каждый час       | ✅ Авто       | Основной источник   |
| **Матчи (история)** | ✅ БД    | ✅ 5 мин  | Каждый час       | ✅ Авто       | Завершённые матчи   |
| **Сезоны**          | ✅ БД    | ✅ 24 ч   | Раз в день       | ✅ Авто       | Редко меняются      |
| **Таблицы**         | ✅ БД    | ✅ 30 мин | По запросу       | 🔧 Ручная     | Обновляются часто   |
| **Команды**         | ✅ БД    | ✅ 24 ч   | По запросу       | 🔧 Ручная     | Редко меняются      |
| **Страны**          | ✅ БД    | ✅ 24 ч   | По запросу       | 🔧 Ручная     | Не меняются         |
| **События матча**   | ✅ БД    | ✅ 1 мин  | Вперед/назад/луп | ✅ Авто       | Во время матча      |
| **История коэфф.**  | ✅ БД    | ✅ 1 мин  | Каждые 30 сек    | ✅ Авто       | Полная история      |

---

## Все эндпоинты LiveScore API (по страницам)

### Страница `/` (главная)

| Компонент                  | Эндпоинт                 | Коллекция  | Хранение                       |
| -------------------------- | ------------------------ | ---------- | ------------------------------ |
| `LiveMatchesWidget`        | `/matches/live.json`     | ❌ Нет     | ✅ Только кэш (30 сек)         |
| `UpcomingAllMatchesWidget` | `/fixtures/matches.json` | `Fixtures` | ✅ БД (обновляется каждый час) |
| `YesterdaysMatchesWidget`  | Payload `Matches`        | `Matches`  | ✅ БД                          |

### Страница `/leagues/[leagueId]`

| Функция                        | Эндпоинт                       | Коллекция   | Хранение           |
| ------------------------------ | ------------------------------ | ----------- | ------------------ |
| `getLeagueInfo`                | `/competitions/list.json`      | `Leagues`   | ✅ БД              |
| `getSeasonsListJson`           | `/seasons/list.json`           | `Seasons`   | ✅ БД (раз в день) |
| `getCompetitionsStandingsJson` | `/competitions/standings.json` | `Standings` | ✅ БД (каждый час) |
| `LeagueMatchesByRounds`        | `/fixtures/matches.json`       | `Fixtures`  | ✅ БД (каждый час) |

### Страница `/leagues/[leagueId]/matches`

| Функция                  | Эндпоинт                  | Коллекция  | Хранение           |
| ------------------------ | ------------------------- | ---------- | ------------------ |
| `getLeagueInfo`          | `/competitions/list.json` | `Leagues`  | ✅ БД              |
| `getMatchesHistoryJson`  | `/matches/history.json`   | `Matches`  | ✅ БД              |
| `getFixturesMatchesJson` | `/fixtures/matches.json`  | `Fixtures` | ✅ БД (каждый час) |

### Страница `/leagues/[leagueId]/topscorers`

| Функция                         | Эндпоинт                        | Коллекция    | Хранение           |
| ------------------------------- | ------------------------------- | ------------ | ------------------ |
| `getLeagueInfo`                 | `/competitions/list.json`       | `Leagues`    | ✅ БД              |
| `getCompetitionsTopscorersJson` | `/competitions/topscorers.json` | `Topscorers` | ✅ БД (каждый час) |

### Страница `/fixtures/[fixtureId]`

| Функция                  | Эндпоинт                 | Коллекция  | Хранение               |
| ------------------------ | ------------------------ | ---------- | ---------------------- |
| `getFixturesMatchesJson` | `/fixtures/matches.json` | `Fixtures` | ✅ БД (каждый час)     |
| `getMatchesLiveJson`     | `/matches/live.json`     | ❌ Нет     | ✅ Только кэш (30 сек) |
| `getMatchesHistoryJson`  | `/matches/history.json`  | `Matches`  | ✅ БД                  |

### API Routes

| Route                  | Эндпоинт                 | Коллекция             | Хранение               |
| ---------------------- | ------------------------ | --------------------- | ---------------------- |
| `/api/fixtures`        | `/fixtures/matches.json` | `Fixtures`            | ✅ БД (каждый час)     |
| `/api/matches/history` | `/matches/history.json`  | `Matches`             | ✅ БД                  |
| `/api/matches/live`    | `/matches/live.json`     | ❌ Нет                | ✅ Только кэш (30 сек) |
| `/api/matches/events`  | `/matches/events.json`   | `MatchEvents`         | ✅ БД (реал-тайм)      |
| `/api/matches/stats`   | `/matches/stats.json`    | `MatchStats`          | ✅ БД                  |
| `/api/h2h`             | `/teams/head2head.json`  | Строится из `Matches` | ✅ БД                  |
| `/api/team-info`       | `/teams/list.json`       | `Teams`               | ✅ БД (раз в день)     |
| `/api/flags/*`         | `/countries/flag.png`    | `Countries`           | ✅ БД (раз в день)     |
| `/api/ls/countries`    | `/countries/list.json`   | `Countries`           | ✅ БД (раз в день)     |

---

## Новые коллекции (нужно создать)

### 1. `Fixtures` - Фикстуры (НОВАЯ, КРИТИЧНАЯ!)

Структура из API `/fixtures/matches.json`:

```typescript
{
  fixtureId: number,       // ID из API (уникальный)
  date: date,
  time: string,
  homeTeam: { id, name, logo },
  awayTeam: { id, name, logo },
  competition: { id, name },
  league: relationship → Leagues,
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled',
  round: string,
  group: string,
  venue: { name, city, country },

  // Коэффициенты (плавающие!)
  odds: {
    pre: { home: number, draw: number, away: number },
    live: { home: number, draw: number, away: number },
  },

  // История коэффициентов (ВСТРОЕННЫЙ МАССИВ, не отдельная коллекция!)
  oddsHistory: [
    {
      timestamp: date,
      odds: {
        pre: { home: number, draw: number, away: number },
        live: { home: number, draw: number, away: number },
      },
      source: 'api' | 'manual',
    },
  ],

  // Связь с матчем (когда фикстура становится матчем)
  match: relationship → Matches (optional),

  // Метаданные
  lastSyncAt: date,
  syncSource: 'fixtures' | 'live' | 'manual',
}
```

### 2. `Seasons` - Сезоны

Структура из API `/seasons/list.json`:

```typescript
{
  seasonId: number,
  name: string,
  startDate: date,
  endDate: date,
  isCurrent: boolean,
  league: relationship → Leagues,
  lastSyncAt: date,
}
```

### 3. `Standings` - Турнирные таблицы

Структура из API `/competitions/standings.json`:

```typescript
{
  league: relationship → Leagues,
  season: relationship → Seasons,
  position: number,
  team: { id, name },
  played: number,
  won: number,
  drawn: number,
  lost: number,
  goalsFor: number,
  goalsAgainst: number,
  points: number,
  form: string,
  lastSyncAt: date,
}
```

### 4. `Topscorers` - Бомбардиры

Структура из API `/competitions/topscorers.json`:

```typescript
{
  league: relationship → Leagues,
  season: relationship → Seasons,
  position: number,
  player: { id, name },
  team: { id, name },
  goals: number,
  assists: number,
  matches: number,
  lastSyncAt: date,
}
```

### 5. `MatchEvents` - События матчей

Структура из API `/matches/events.json`:

```typescript
{
  match: relationship → Matches,
  minute: number,
  type: 'goal' | 'yellow' | 'red' | 'substitution' | 'own_goal' | 'penalty' | 'var' | 'other',
  team: 'home' | 'away',
  player: { id, name },
  assistPlayer: string,
  playerOut: string,
  playerIn: string,
  description: string,
  lastSyncAt: date,
}
```

### 6. `Teams` - Команды

Структура из API `/teams/list.json`:

```typescript
{
  teamId: number,
  name: string,
  country: { id, name },
  logo: string,
  stadium: string,
  lastSyncAt: date,
}
```

### 7. `Countries` - Страны

Структура из API `/countries/list.json`:

```typescript
{
  countryId: number,
  name: string,
  flag: string,
  fifaCode: string,
  lastSyncAt: date,
}
```

### 8. `ApiRequestLogs` - Логи запросов (РАСШИРЕННОЕ ЛОГИРОВАНИЕ!)

```typescript
{
  // Идентификация запроса
  endpoint: string,              // /matches/live.json, /fixtures/matches.json
  params: json,                  // параметры запроса
  source: string,                // 'api-route', 'page', 'script', 'component'

  // Статус и время
  statusCode: number,
  duration: number,              // время выполнения в мс
  createdAt: date,

  // НОВОЕ: Детальное логирование кэширования
  cacheLevel: 'memory' | 'database' | 'livescore',

  // Статистика по уровням кэша
  cacheStats: {
    // УРОВЕНЬ 1: In-Memory Cache (apiCache.ts)
    memoryCache: {
      hit: boolean,              // был ли хит в памяти
      ttl: number,               // TTL в секундах
      age: number,               // возраст данных в памяти (сек)
    },

    // УРОВЕНЬ 2: MongoDB (Payload)
    database: {
      hit: boolean,              // были ли данные в БД
      lastSyncAt: date,          // когда последний раз синхронизировали
      isStale: boolean,          // устарели ли данные
      staleSince: number,        // сколько времени устарели (сек)
    },

    // УРОВЕНЬ 3: LiveScore API (customFetch.ts)
    livescoreApi: {
      called: boolean,           // был ли вызван LiveScore API
      statusCode: number,
      duration: number,          // время ответа API (мс)
      cached: boolean,           // кэшировали ли результат в БД
      attempt: number,           // номер попытки (retry)
    },
  },

  // Итоговая статистика
  summary: {
    totalRequests: number,       // всего обращений за период
    cacheHits: number,           // попадания в кэш (память + БД)
    memoryHits: number,          // попадания в память (apiCache)
    databaseHits: number,        // попадания в БД (MongoDB)
    livescoreApiCalls: number,   // обращений к LiveScore API
    cacheHitRate: number,        // % попаданий в кэш (память + БД)
    avgDuration: number,         // среднее время ответа (мс)
  },

  // Метаданные
  userId: relationship → Users (optional),
  ipAddress: string,
  userAgent: string,
}
```

---

## Метрики логирования

### Что логируется:

| Метрика                       | Описание                                 | Пример        |
| ----------------------------- | ---------------------------------------- | ------------- |
| **Всего обращений**           | Общее количество запросов                | 1,250 за день |
| **Попадания в память**        | Запросы из in-memory cache (apiCache.ts) | 800 (64%)     |
| **Попадания в БД**            | Запросы из MongoDB (Payload)             | 300 (24%)     |
| **Обращения к LiveScore API** | Запросы к LiveScore API (customFetch.ts) | 150 (12%)     |
| **Эффективность кэша**        | (память + БД) / всего                    | 88%           |
| **Среднее время ответа**      | Среднее время обработки                  | 45 мс         |

### Примеры логирования:

**Сценарий 1: Попадание в память (лучший случай)**

```
GET /api/fixtures
├─ Memory Cache (apiCache.ts): HIT (age: 30 сек, TTL: 120 сек)
├─ Duration: 2 мс
└─ Cache Level: memory
```

**Сценарий 2: Попадание в БД (хороший случай)**

```
GET /api/standings
├─ Memory Cache (apiCache.ts): MISS
├─ Database (MongoDB): HIT (lastSync: 45 мин назад, fresh)
├─ Duration: 15 мс
└─ Cache Level: database
```

**Сценарий 3: Обращение к LiveScore API (нормальный случай)**

```
GET /api/topscorers
├─ Memory Cache (apiCache.ts): MISS
├─ Database (MongoDB): MISS (stale, 2 часа назад)
├─ LiveScore API (customFetch.ts): CALL (duration: 250 мс, attempt: 1)
├─ Database (MongoDB): SAVE (новые данные)
├─ Duration: 260 мс
└─ Cache Level: livescore
```

---

## Дашборд статистики (для админ-панели)

**Требуется создать:**

1. `src/app/(frontend)/(site)/admin/cache-stats/page.tsx` - страница статистики кэша
2. `src/lib/cache-stats-calculator.ts` - расчёт метрик

**Показывает:**

- Общее количество запросов за день/неделю/месяц
- Процент попаданий в кэш (память + БД)
- Процент обращений к API
- Процент обращений к провайдеру
- Топ эндпоинтов по количеству запросов
- Топ эндпоинтов по времени ответа
- Тренды эффективности кэша

---

## Связи между коллекциями

```
Leagues ←──────────────────────────────────────┐
   │                                            │
   ├── Seasons (league → Leagues)               │
   │      │                                     │
   │      ├── Standings (season → Seasons)      │
   │      │                                     │
   │      └── Topscorers (season → Seasons)     │
   │                                            │
   ├── Matches (league → Leagues)               │
   │      │                                     │
   │      ├── MatchStats (match → Matches)      │
   │      │                                     │
   │      └── MatchEvents (match → Matches)     │
   │                                            │
   └── Fixtures (league → Leagues) ← НОВАЯ!    │
          │                                     │
          └── match: relationship → Matches     │
                                                │
Teams ←─────────────────────────────────────────┤
                                                │
Countries ←─────────────────────────────────────┘
```

---

## Этапы реализации

⚠️ **ВАЖНО: Документация для каждого этапа**

После завершения каждого этапа необходимо:

1. ✅ Создать файл документации `docs/STAGE_X_[NAME].md` с описанием:
   - Что было реализовано
   - Как это работает (архитектура, потоки данных)
   - Примеры использования
   - API и интерфейсы
   - Troubleshooting
2. ✅ Обновить этот файл (`FINAL_CACHING_PLAN.md`):
   - Отметить этап как завершённый
   - Добавить ссылку на документацию
   - Указать дату завершения

**Цель**: Обеспечить лучшее погружение AI при работе с реализованным функционалом.

---

### Этап 1: Логирование (2 часа) ✅ ЗАВЕРШЁН (2025-01-15)

**Статус**: ✅ Завершён

**Цель**: Понять откуда идут 60k запросов и внедрить контроль лимита 45k/день

**Создано:**

1. ✅ `src/collections/ApiRequestLogs.ts` - коллекция для логов
2. ✅ `src/lib/http/livescore/logged-fetch.ts` - обёртка с логированием
3. ✅ `src/lib/http/livescore/rate-limiter.ts` - контроль лимита 45k/день
4. ✅ `src/lib/api-cache.ts` - in-memory кэш для API

**Изменено:**

1. ✅ `src/payload.config.ts` - добавлена коллекция `ApiRequestLogs`
2. ✅ `src/lib/http/livescore/customFetch.ts` - интегрировано логирование

**Результат**:

- ✅ Каждый запрос к LiveScore записывается в БД с детальной статистикой
- ✅ Автоматическое отключение при достижении 45k запросов/день
- ✅ Алерты при 80% лимита (36k запросов)
- ✅ In-memory кэширование сырых данных от API

**Документация**: ✅ `docs/STAGE_1_LOGGING.md`

---

### Этап 2: Новые коллекции (3 часа)

**Статус**: ✅ Завершён

**Цель**: Создать Payload коллекции для хранения нормализованных данных

**Создано:**

1. ✅ `src/collections/Fixtures.ts` - **НОВАЯ, ПРИОРИТЕТНАЯ!** (автосинхронизация)
2. ✅ `src/collections/Seasons.ts` (автосинхронизация)
3. ✅ `src/collections/Standings.ts` (ручная синхронизация)
4. ✅ `src/collections/MatchEvents.ts` (автосинхронизация: вперед/назад/луп)
5. ✅ `src/collections/Teams.ts` (ручная синхронизация)
6. ✅ `src/collections/Countries.ts` (ручная синхронизация)

**Изменено:**

1. ✅ `src/payload.config.ts` - добавлены 6 новых коллекций
2. ✅ `src/collections/Matches.ts` - добавлена связь с `Fixtures`

**Результат**:

- ✅ 6 новых коллекций в Payload для хранения данных
- ✅ Связи между коллекциями настроены
- ✅ Индексы для быстрого поиска
- ✅ Безопасная модель доступа (чтение для всех, запись только программно)

**Документация**: ✅ `docs/STAGE_2_COLLECTIONS.md`

---

### Этап 3: Скрипты синхронизации (4 часа)

**Автосинхронизация (создать скрипты + docker-compose):**

1. `scripts/sync-fixtures.mjs` - синхронизация фикстур (каждый час) ✅
2. `scripts/sync-odds-history.mjs` - история коэффициентов (каждые 30 сек) ✅
3. `scripts/sync-match-events.mjs` - события матчей (вперед/назад/луп) ✅
4. `scripts/sync-seasons.mjs` - синхронизация сезонов (раз в день) ✅

**Ручная синхронизация (создать скрипты, запуск через админку):** 5. `scripts/sync-standings.mjs` - синхронизация таблиц 🔧 6. `scripts/sync-teams.mjs` - синхронизация команд 🔧 7. `scripts/sync-countries.mjs` - синхронизация стран 🔧

**Docker-compose файлы (только для автосинхронизации):**

1. `docker-compose.sync-fixtures.yml`
2. `docker-compose.sync-odds-history.yml`
3. `docker-compose.sync-match-events.yml`
4. `docker-compose.sync-seasons.yml`

---

### Этап 4: Страницы через БД (3 часа)

**Обновить страницы:**

| Страница                         | Изменения                                          |
| -------------------------------- | -------------------------------------------------- |
| `/`                              | Использовать `/api/fixtures` вместо прямых вызовов |
| `/leagues/[leagueId]`            | Брать сезоны из `Seasons`, таблицу из `Standings`  |
| `/leagues/[leagueId]/matches`    | Брать матчи из `Matches` + фикстуры из `Fixtures`  |
| `/leagues/[leagueId]/topscorers` | Брать из `Topscorers`                              |
| `/fixtures/[fixtureId]`          | Брать из `Fixtures` + `Matches` + `MatchStats`     |

**Логика:**

```
Страница → Payload (коллекция) → если устарело → API → сохранить
```

---

## Файлы для создания

| Файл                                     | Этап | Тип             | Приоритет |
| ---------------------------------------- | ---- | --------------- | --------- |
| `src/collections/ApiRequestLogs.ts`      | 1    | Коллекция       | 🔴        |
| `src/lib/http/livescore/logged-fetch.ts` | 1    | Утилита         | 🔴        |
| `src/collections/Fixtures.ts`            | 2    | Коллекция       | 🔴        |
| `src/collections/Seasons.ts`             | 2    | Коллекция       | 🟡        |
| `src/collections/Standings.ts`           | 2    | Коллекция       | 🟡        |
| `src/collections/MatchEvents.ts`         | 2    | Коллекция       | 🟡        |
| `src/collections/Teams.ts`               | 2    | Коллекция       | 🟡        |
| `src/collections/Countries.ts`           | 2    | Коллекция       | 🟡        |
| `scripts/sync-fixtures.mjs`              | 3    | Скрипт (авто)   | 🔴        |
| `scripts/sync-odds-history.mjs`          | 3    | Скрипт (авто)   | 🔴        |
| `scripts/sync-match-events.mjs`          | 3    | Скрипт (авто)   | 🔴        |
| `scripts/sync-seasons.mjs`               | 3    | Скрипт (авто)   | 🟡        |
| `scripts/sync-standings.mjs`             | 3    | Скрипт (ручной) | 🟡        |
| `scripts/sync-teams.mjs`                 | 3    | Скрипт (ручной) | 🟡        |
| `scripts/sync-countries.mjs`             | 3    | Скрипт (ручной) | 🟡        |
| `docker-compose.sync-fixtures.yml`       | 3    | Docker          | 🔴        |
| `docker-compose.sync-odds-history.yml`   | 3    | Docker          | 🔴        |
| `docker-compose.sync-match-events.yml`   | 3    | Docker          | 🔴        |
| `docker-compose.sync-seasons.yml`        | 3    | Docker          | 🟡        |

**Итого: 19 новых файлов**

- 7 коллекций
- 1 утилита логирования
- 7 скриптов синхронизации (4 авто + 3 ручных)
- 4 docker-compose фа��ла (только для автосинхронизации)

---

## Файлы для изменения

| Файл                                                               | Этап | Изменения                                 |
| ------------------------------------------------------------------ | ---- | ----------------------------------------- |
| `src/payload.config.ts`                                            | 1, 2 | Добавить 8 коллекций                      |
| `src/lib/http/livescore/customFetch.ts`                            | 1    | Использовать логирование                  |
| `src/collections/Matches.ts`                                       | 2    | Добавить `fixtureId` и связь с `Fixtures` |
| `src/app/(frontend)/(site)/page.tsx`                               | 4    | Использовать `/api/fixtures`              |
| `src/app/(frontend)/(site)/leagues/[leagueId]/page.tsx`            | 4    | Использовать `Seasons` + `Standings`      |
| `src/app/(frontend)/(site)/leagues/[leagueId]/matches/page.tsx`    | 4    | Использовать `Matches` + `Fixtures`       |
| `src/app/(frontend)/(site)/leagues/[leagueId]/topscorers/page.tsx` | 4    | Использовать `Topscorers`                 |
| `src/app/(frontend)/(site)/fixtures/[fixtureId]/page.tsx`          | 4    | Использовать `Fixtures` + `Matches`       |
| `src/components/league/LeagueMatchesByRounds.tsx`                  | 4    | Использовать `Matches` + `Fixtures`       |

**Итого: 9 файлов для изменения**

---

## Оценка времени

| Этап                     | Время   | Приоритет   |
| ------------------------ | ------- | ----------- |
| 1. Логирование           | 2 часа  | 🔴 Критично |
| 2. Новые коллекции       | 4 часа  | 🔴 Высокий  |
| 3. Скрипты синхронизации | 5 часов | 🔴 Высокий  |
| 4. Страницы через БД     | 3 часа  | 🟡 Средний  |

**Итого: 14 часов**

---

## Ожидаемый результат

| Метрика                | До             | После         |
| ---------------------- | -------------- | ------------- |
| Запросов к API         | 60k/день       | ~2k/день      |
| Логирование            | ❌             | ✅ Все в БД   |
| Данные в БД            | Только Matches | Все сущности  |
| История коэффициентов  | ❌             | ✅ В Fixtures |
| Прямые запросы с сайта | 100%           | 0%            |
| Лайф матчи в БД        | ❌             | ❌ Только кэш |

---

## Начинаем?

Подтвердите и я начну с **Этапа 1: Логирование**.
