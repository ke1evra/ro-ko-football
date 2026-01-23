# Этап 1: Логирование и контроль лимита API

**Статус**: ✅ Завершён (2025-01-15)

**Цель**: Внедрить логирование всех запросов к LiveScore API и контроль лимита 45,000 запросов/день.

## Реализованные компоненты

### 1. Коллекция `ApiRequestLogs` (`src/collections/ApiRequestLogs.ts`)

**Назначение**: Хранение детальной информации о каждом запросе к LiveScore API.

**Структура данных**:
```typescript
{
  // Идентификация запроса
  endpoint: string,              // /matches/live.json, /fixtures/matches.json
  params: json,                  // параметры запроса
  source: string,                // 'api-route', 'page', 'script', 'component'

  // Статус и время
  statusCode: number,            // HTTP статус код
  duration: number,              // время выполнения в мс
  createdAt: date,               // время создания

  // Детальное логирование кэширования
  cacheLevel: 'memory' | 'database' | 'livescore',
  cacheStats: {
    memoryCache: { hit: boolean, ttl: number, age: number },
    database: { hit: boolean, lastSyncAt: date, isStale: boolean, staleSince: number },
    livescoreApi: { called: boolean, statusCode: number, duration: number, cached: boolean, attempt: number }
  },

  // Итоговая статистика
  summary: {
    totalRequests: number,
    cacheHits: number,
    memoryHits: number,
    databaseHits: number,
    livescoreApiCalls: number,
    cacheHitRate: number,
    avgDuration: number
  },

  // Метаданные
  userId?: string,               // пользователь (если авторизован)
  ipAddress?: string,            // IP адрес клиента
  userAgent?: string             // User Agent браузера
}
```

**Особенности**:
- Только администраторы могут просматривать логи
- Индексы для быстрого поиска по endpoint, createdAt, cacheLevel, source
- Не использует версионирование (timestamps: false)

### 2. Rate Limiter (`src/lib/http/livescore/rate-limiter.ts`)

**Назначение**: Контроль дневного лимита запросов к LiveScore API (45,000).

**Основные функции**:
- `checkLimit()`: проверка перед выполнением запроса
- `registerRequest()`: регистрация выполненного запроса
- `getStats()`: получение текущей статистики
- Автоматический сброс счётчика в полночь

**Логика работы**:
```typescript
// Пример использования
await rateLimiter.checkLimit() // Бросает ошибку если лимит превышен
// ... выполнение запроса ...
rateLimiter.registerRequest()  // Регистрация успешного запроса
```

**Статистика**:
```typescript
{
  requestsToday: 1234,
  maxDailyRequests: 45000,
  remainingRequests: 43766,
  lastResetDate: "2025-01-15",
  usagePercent: 3,
  status: "ok" | "warning" | "limit_reached"
}
```

### 3. ApiCache (`src/lib/api-cache.ts`)

**Назначение**: In-memory кэширование сырых данных от LiveScore API.

**Основные функции**:
- `get()`: получение данных с автоматическим кэшированием
- `getIfExists()`: получение без выполнения запроса
- `set()`: сохранение в кэш
- `cleanup()`: автоматическая очистка устаревших записей

**Особенности**:
- TTL по умолчанию 2 минуты
- Автоматическая очистка каждые 5 минут
- Поддержка expired данных при ошибках

### 4. LoggedFetch (`src/lib/http/livescore/logged-fetch.ts`)

**Назначение**: Обёртка над fetch с логированием и кэшированием.

**Архитектура**:
```
LoggedFetch.get() → RateLimiter.checkLimit() → ApiCache.get() → LiveScore API
                     ↓                           ↓
              RateLimiter.registerRequest()  Логирование в ApiRequestLogs
```

**Ключевые особенности**:
- Автоматическое логирование каждого запроса
- Контроль лимита 45,000 запросов/день
- 3-уровневое кэширование (memory → database → api)
- Graceful degradation при ошибках

### 5. Обновлённый CustomFetch (`src/lib/http/livescore/customFetch.ts`)

**Изменения**:
- Теперь использует `loggedFetch` вместо прямого fetch
- Автоматический выбор TTL на основе типа запроса:
  - Live матчи: 30 секунд
  - Fixtures: 2 минуты
  - Таблицы: 5 минут
- Упрощённая логика (убраны retry, timeout - теперь в loggedFetch)

## Как это работает

### Поток данных для обычного запроса

```
1. API Route вызывает customFetch()
2. customFetch() вызывает loggedFetch.get()
3. loggedFetch проверяет лимит через rateLimiter.checkLimit()
4. Если лимит OK, проверяет in-memory кэш (apiCache)
5. Если кэш MISS, выполняет запрос к LiveScore API
6. Сохраняет результат в кэш
7. Регистрирует запрос в rateLimiter
8. Логирует всю информацию в ApiRequestLogs
9. Возвращает данные
```

### Контроль лимита

```typescript
// Автоматическая проверка перед каждым запросом
await rateLimiter.checkLimit()

// При превышении лимита:
// 1. Бросает ошибку с описанием
// 2. Запрещает выполнение новых запросов
// 3. Логирует инцидент
```

### Логирование

Каждый запрос создаёт запись в `ApiRequestLogs` с полной информацией:
- Откуда запрос (source)
- Какие параметры (params)
- Время выполнения (duration)
- Уровень кэширования (cacheLevel)
- Детальная статистика кэша (cacheStats)
- Итоговые метрики (summary)

## Мониторинг

### Проверка статистики лимита

```bash
# В браузере или через API
GET /api/cache-stats
```

**Ответ**:
```json
{
  "success": true,
  "stats": {
    "requestsToday": 1234,
    "maxDailyRequests": 45000,
    "remainingRequests": 43766,
    "usagePercent": 3,
    "status": "ok",
    "lastResetDate": "2025-01-15"
  }
}
```

### Просмотр логов в админ-панели

1. Зайти в Payload Admin
2. Перейти в коллекцию "ApiRequestLogs"
3. Фильтровать по endpoint, cacheLevel, source
4. Анализировать эффективность кэширования

## Результаты

### ✅ Достигнуто

1. **Логирование**: Все запросы к LiveScore API логируются в БД
2. **Контроль лимита**: Жёсткий лимит 45,000 запросов/день
3. **Кэширование**: In-memory кэш для сырых данных API
4. **Мониторинг**: Статистика использования в реальном времени

### 📊 Метрики эффективности

**До внедрения**:
- Запросы: 60,000/день (превышение лимита)
- Логирование: отсутствует
- Кэширование: отсутствует

**После внедрения**:
- Запросы: ≤ 45,000/день (в рамках лимита)
- Логирование: 100% запросов
- Кэширование: готово для следующих этапов

### 🔄 Следующие этапы

1. **Этап 2**: Создание коллекций (Fixtures, Seasons, Standings, etc.)
2. **Этап 3**: Скрипты синхронизации данных
3. **Этап 4**: Миграция страниц на работу через БД

## Troubleshooting

### Проблема: Лимит превышен

**Симптомы**: Ошибка "Превышен дневной лимит запросов"

**Решение**:
1. Проверить статистику: `GET /api/cache-stats`
2. Дождаться сброса в полночь
3. Увеличить TTL для часто запрашиваемых данных
4. Оптимизировать использование API

### Проблема: Запросы не логируются

**Симптомы**: В ApiRequestLogs нет новых записей

**Решение**:
1. Проверить подключение к MongoDB
2. Проверить права доступа (только админы)
3. Проверить логи сервера на ошибки Payload

### Проблема: Кэш не работает

**Симптомы**: Каждый запрос идёт в API

**Решение**:
1. Проверить TTL (может быть слишком маленький)
2. Проверить очистку кэша (автоматически каждые 5 минут)
3. Проверить уникальность ключей кэша

## Заключение

Этап 1 успешно внедрил фундаментальную инфраструктуру для контроля и мониторинга использования LiveScore API. Теперь система:

- ✅ Соблюдает лимит 45,000 запросов/день
- ✅ Логирует все запросы для анализа
- ✅ Кэширует данные для снижения нагрузки
- ✅ Предоставляет инструменты мониторинга

Это создаёт надёжную основу для следующих этапов реализации кэширования и оптимизации.