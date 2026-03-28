# 🔍 Отладка ошибок по Digest в Next.js

## Что такое Digest?

**Digest** (например, `2991916274`) — это уникальный хеш ошибки в Next.js, который используется для группировки одинаковых ошибок. Это помогает быстро находить конкретную ошибку в логах.

## Как найти ошибку по Digest

### 1. В логах Docker

```bash
# Смотрим логи контейнера
docker compose logs -f app

# Ищем конкретный digest
docker compose logs app | grep "2991916274"

# Или с контекстом (строки до и после)
docker compose logs app | grep -A 20 -B 5 "2991916274"
```

### 2. В логах приложения

После улучшения логирования вы увидите:

```
[LAYOUT] Digest: 2991916274
[LAYOUT] Message: Cannot read properties of undefined (reading 'require')
[LAYOUT] Stack: Error: Cannot read properties of undefined (reading 'require')
    at /app/.next/server/chunks/123.js:45:123
    at getTopMatchesLeagues (/app/src/lib/leagues.ts:9:15)
    ...
[LAYOUT] Full error: [полный объект ошибки]
```

### 3. Поиск в коде

Digest генерируется автоматически Next.js на основе:

- Сообщения об ошибке
- Стека вызовов
- Контекста выполнения

**Важно:** Один и тот же digest означает одинаковую ошибку в одном и том же месте.

## Улучшенное логирование

Теперь в коде используется улучшенное логирование:

1. **`src/lib/error-logger.ts`** — утилита для детального логирования
2. **`src/lib/leagues.ts`** — добавлено детальное логирование ошибок
3. **Layout файлы** — логируют полный стек трейс

## Пример использования

```typescript
import { logErrorWithDigest } from '@/lib/error-logger'

try {
  // ваш код
} catch (error) {
  logErrorWithDigest(error as Error & { digest?: string }, 'MyFunction')
}
```

## Как посмотреть логи на продакшене

### Docker Compose

```bash
# Все логи
docker compose logs app

# Последние 100 строк
docker compose logs --tail=100 app

# Следить за логами в реальном времени
docker compose logs -f app

# Только ошибки
docker compose logs app | grep -i error

# Поиск по digest
docker compose logs app | grep "2991916274"
```

### PM2 (если используется)

```bash
# Все логи
pm2 logs

# Логи конкретного процесса
pm2 logs football-platform

# Только ошибки
pm2 logs --err

# Поиск по digest
pm2 logs | grep "2991916274"
```

## Типичные места ошибок

Если видите digest `2991916274` с ошибкой `Cannot read properties of undefined (reading 'require')`, проверьте:

1. ✅ **Импорты Payload config** — должны быть `import configPromise from '@payload-config'`
2. ✅ **Использование getPayload** — должно быть `await getPayload({ config: await configPromise })`
3. ✅ **Все места использования** — проверьте все файлы, где используется Payload

## Проверка всех мест

```bash
# Найти все места с getPayload
grep -r "getPayload" src/ --include="*.ts" --include="*.tsx"

# Найти все импорты config
grep -r "import.*config.*from" src/ --include="*.ts" --include="*.tsx"
```

## После исправления

После исправления ошибки:

1. Пересоберите Docker образ: `docker compose build --no-cache app`
2. Перезапустите контейнер: `docker compose up -d`
3. Проверьте логи: `docker compose logs -f app`
4. Убедитесь, что digest больше не появляется

## Полезные команды

```bash
# Пересборка без кеша
docker compose build --no-cache app

# Перезапуск
docker compose restart app

# Просмотр логов в реальном времени
docker compose logs -f app

# Проверка статуса
docker compose ps

# Вход в контейнер для отладки
docker compose exec app sh
```
