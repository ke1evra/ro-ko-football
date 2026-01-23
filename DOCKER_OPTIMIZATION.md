# 🚀 Оптимизация Docker для воркеров

## Проблема

При использовании основного `Dockerfile` для воркеров происходит:

- Полная сборка Next.js (не нужна для воркеров)
- Копирование всего проекта (423MB+)
- Долгое время сборки (10+ минут)

## Решение

Создан отдельный `Dockerfile.worker` для воркеров:

- ✅ Без сборки Next.js
- ✅ Только установка зависимостей
- ✅ Копирование только необходимых файлов
- ✅ Быстрая сборка (~2-3 минуты)

## Файлы

### `Dockerfile.worker`

Легкий образ для воркеров (импорт матчей, расчет статистики)

### `.dockerignore`

Исключает ненужные файлы из контекста сборки:

- `node_modules/`
- `.next/`
- `db-backups/`
- `dump/`
- `docs/`
- и другие

## Использование

### Воркеры используют `Dockerfile.worker`:

```yaml
# docker-compose.prediction-stats.yml
services:
  prediction_stats_calculator:
    build:
      context: .
      dockerfile: Dockerfile.worker # ← Легкий образ
```

### Основное приложение использует `Dockerfile`:

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile # ← Полная сборка Next.js
```

## Сравнение

| Параметр         | Dockerfile          | Dockerfile.worker |
| ---------------- | ------------------- | ----------------- |
| Сборка Next.js   | ✅ Да               | ❌ Нет            |
| Время сборки     | ~10-15 мин          | ~2-3 мин          |
| Размер контекста | 423MB+              | ~50MB             |
| Размер образа    | ~500MB              | ~200MB            |
| Использование    | Основное приложение | Воркеры           |

## Первый запуск на сервере

При первом запуске воркеров на сервере произойдет сборка образа:

```bash
# Это нормально при первом запуске
docker compose -f docker-compose.prediction-stats.yml up -d

# Вывод:
# [+] Building 120.5s (12/12) FINISHED
# => [internal] load build definition from Dockerfile.worker
# => [internal] load .dockerignore
# => [base 1/1] FROM docker.io/library/node:22.12.0-alpine
# => [deps 2/3] COPY package.json pnpm-lock.yaml ./
# => [deps 3/3] RUN corepack enable pnpm && pnpm i --frozen-lockfile
# => [runner 5/7] COPY --from=deps /app/node_modules ./node_modules
# => [runner 6/7] COPY --chown=worker:nodejs package.json pnpm-lock.yaml ./
# => [runner 7/7] COPY --chown=worker:nodejs scripts ./scripts
# => exporting to image
```

### Последующие запуски будут мгновенными:

```bash
docker compose -f docker-compose.prediction-stats.yml up -d
# [+] Running 1/1
# ✔ Container prediction_stats_calculator  Started
```

## Пересборка образа

Если изменились зависимости или код:

```bash
# Пересобрать образ
docker compose -f docker-compose.prediction-stats.yml build

# Или пересобрать и запустить
docker compose -f docker-compose.prediction-stats.yml up -d --build
```

## Очистка старых образов

```bash
# Удалить неиспользуемые образы
docker image prune -a

# Удалить конкретный образ
docker rmi appstack-prediction-stats-prediction_stats_calculator
```

## Troubleshooting

### Сборка зависла на "transferring context"

**Причина**: Копируется слишком много файлов

**Решение**: Проверьте `.dockerignore`:

```bash
cat .dockerignore
```

Должны быть исключены:

- `node_modules/`
- `.next/`
- `db-backups/`
- `dump/`

### Ошибка "no space left on device"

**Причина**: Заполнен диск

**Решение**: Очистите Docker:

```bash
# Удалить все неиспользуемые данные
docker system prune -a --volumes

# Проверить место
df -h
```

### Долгая установка зависимостей

**Причина**: Медленное интернет-соединение или много зависимостей

**Решение**:

1. Используйте кеш Docker
2. Или соберите образ локально и загрузите на сервер:

   ```bash
   # Локально
   docker build -f Dockerfile.worker -t my-worker .
   docker save my-worker > worker.tar

   # На сервере
   docker load < worker.tar
   ```

## Рекомендации

1. **Первый запуск**: Запланируйте 5-10 минут на сборку образа
2. **Обновления**: При изменении кода пересобирайте образ
3. **Мониторинг**: Следите за размером образов (`docker images`)
4. **Очистка**: Регулярно удаляйте старые образы

## См. также

- `WORKERS.md` - документация по воркерам
- `PREDICTION_STATS_DOCKER.md` - документация по расчету статистики
- `QUICK_START_WORKERS.md` - быстрый старт
