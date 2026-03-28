# 📋 Сводка по воркерам

## Что делают воркеры

### 1. Импорт матчей (matches-import-forward)

- **Что делает**: Импортирует новые матчи из API LiveScore
- **Интервал**: Каждые 10 минут
- **Файл**: `docker-compose.matches-import-forward.yml`
- **Команда**: `pnpm run matches:import:forward:loop`

### 2. Расчет статистики прогнозов (prediction-stats)

- **Что делает**: Рассчитывает результаты прогнозов на основе завершенных матчей
- **Интервал**: Каждые 10 минут
- **Файл**: `docker-compose.prediction-stats.yml`
- **Команда**: `pnpm run predictions:stats:calc:loop`

### 3. Импорт истории матчей (matches-import-backward)

- **Что делает**: Импортирует исторические матчи
- **Интервал**: Постоянно (пока не импортирует все)
- **Файл**: `docker-compose.matches-import-backward.yml`
- **Команда**: `pnpm run matches:import:backward:loop`

## Зависимости между воркерами

```
matches-import-forward → prediction-stats
       ↓                        ↓
   Матчи в БД          Статистика прогнозов
```

1. **matches-import-forward** импортирует матчи и их результаты
2. **prediction-stats** использует эти результаты для расчета статистики прогнозов

## Рекомендуемая конфигурация

### Для продакшена

Запустить оба воркера:

```bash
docker compose -f docker-compose.matches-import-forward.yml up -d
docker compose -f docker-compose.prediction-stats.yml up -d
```

### Для разработки

Запускать по необходимости:

```bash
# Только импорт матчей
pnpm run matches:import:forward

# Только расчет статистики
pnpm run predictions:stats:calc
```

## Мониторинг

### Проверка работы воркеров

```bash
# Статус контейнеров
docker ps | grep -E 'matches_import|prediction_stats'

# Логи
docker compose -f docker-compose.matches-import-forward.yml logs -f
docker compose -f docker-compose.prediction-stats.yml logs -f
```

### Проверка данных в БД

```bash
# Количество матчей
mongosh 'mongodb://...' --eval 'db.matches.countDocuments()'

# Количество завершенных матчей
mongosh 'mongodb://...' --eval 'db.matches.countDocuments({status: "finished"})'

# Количество прогнозов
mongosh 'mongodb://...' --eval 'db.posts.countDocuments({postType: "prediction"})'

# Количество статистики
mongosh 'mongodb://...' --eval 'db.predictionstats.countDocuments()'
```

## Частые проблемы

### Статистика не рассчитывается

**Причина**: Нет завершенных матчей или прогнозов
**Решение**:

1. Проверить, что импорт матчей работает
2. Проверить, что есть прогнозы в БД
3. Проверить логи воркера

### Воркер постоянно перезапускается

**Причина**: Ошибка подключения к БД или неверные env переменные
**Решение**:

1. Проверить `.env` файл
2. ��роверить, что MongoDB запущена
3. Проверить логи: `docker compose -f ... logs`

### Высокая нагрузка на БД

**Причина**: Слишком частый запуск воркеров
**Решение**: Увеличить интервал в `package.json` или docker-compose файле

## Документация

- `WORKERS.md` — полная документация
- `PREDICTION_STATS_DOCKER.md` — детали по расчету статистики
- `QUICK_START_WORKERS.md` — быстрый старт
- `docs/PREDICTION_STATS_CALCULATION.md` — алгоритм расчета
