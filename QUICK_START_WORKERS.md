# 🚀 Быстрый старт: Запуск всех воркеров

## Для продакшена (рекомендуется)

### 1. Запустить импорт матчей и расчет статистики

```bash
# Импорт новых матчей (каждые 10 минут)
docker compose -f docker-compose.matches-import-forward.yml up -d

# Расчет статистики прогнозов (каждые 10 минут)
docker compose -f docker-compose.prediction-stats.yml up -d
```

### 2. Проверить статус

```bash
# Список запущенных контейнеров
docker ps

# Логи импорта матчей
docker compose -f docker-compose.matches-import-forward.yml logs -f

# Логи расчета статистики
docker compose -f docker-compose.prediction-stats.yml logs -f
```

### 3. Проверить результаты

```bash
# Количество матчей в БД
mongosh 'mongodb://syncadmin:syncadminsyncadmin123qQ!@127.0.0.1:27017/payload?authSource=admin' \
  --eval 'db.matches.countDocuments()'

# Количество статистики прогнозов
mongosh 'mongodb://syncadmin:syncadminsyncadmin123qQ!@127.0.0.1:27017/payload?authSource=admin' \
  --eval 'db.predictionstats.countDocuments()'
```

## Для разработки (локально)

### Вариант 1: Через npm скрипты

```bash
# Однократный расчет статистики
pnpm run predictions:stats:calc

# Импорт матчей (однократно)
pnpm run matches:import:forward

# Расчет статистики в loop режиме
pnpm run predictions:stats:calc:loop
```

### Вариант 2: Через Docker

```bash
# Запустить все воркеры
docker compose -f docker-compose.matches-import-forward.yml up -d
docker compose -f docker-compose.prediction-stats.yml up -d

# Остановить все воркеры
docker compose -f docker-compose.matches-import-forward.yml down
docker compose -f docker-compose.prediction-stats.yml down
```

## Остановка всех воркеров

```bash
docker compose -f docker-compose.matches-import-forward.yml down
docker compose -f docker-compose.matches-import-backward.yml down
docker compose -f docker-compose.prediction-stats.yml down
```

## Troubleshooting

### Воркеры не запускаются

1. Проверьте, что MongoDB запущена:
   ```bash
   mongosh 'mongodb://syncadmin:syncadminsyncadmin123qQ!@127.0.0.1:27017/payload?authSource=admin' --eval 'db.version()'
   ```

2. Проверьте переменные окружения в `.env`:
   ```bash
   cat .env | grep -E 'DATABASE_URI|PAYLOAD_SECRET|LIVESCORE'
   ```

3. Проверьте логи контейнеров:
   ```bash
   docker compose -f docker-compose.prediction-stats.yml logs --tail=50
   ```

### Статистика не рассчитывается

1. Проверьте, что есть завершенные матчи:
   ```bash
   mongosh 'mongodb://...' --eval 'db.matches.find({status: "finished"}).count()'
   ```

2. Проверьте, что есть прогнозы:
   ```bash
   mongosh 'mongodb://...' --eval 'db.posts.find({postType: "prediction"}).count()'
   ```

3. Запустите расчет вручную с детальным выводом:
   ```bash
   pnpm run predictions:stats:by-post <postId>
   ```

## См. также

- `WORKERS.md` — полная документация по воркерам
- `PREDICTION_STATS_DOCKER.md` — детальная документация по расчету статистики
- `docs/PREDICTION_STATS_CALCULATION.md` — алгоритм расчета
