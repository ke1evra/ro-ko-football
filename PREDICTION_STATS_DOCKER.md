# 📊 Docker Compose для расчета статистики прогнозов

## Описание

Автоматический расчет статистики прогнозов в фоновом режиме через Docker Compose.

## Файлы

- `docker-compose.prediction-stats.yml` - конфигурация для расчета статистики

## Как работает

Контейнер использует легкий `Dockerfile.worker` (без сборки Next.js) и запускает скрипт `calculate-all.mjs` в режиме loop с интервалом 10 минут (600000 мс).

Скрипт:

1. Находит все прогнозы в коллекции `posts` с типом `prediction`
2. Проверяет, есть ли уже статистика для каждого прогноза
3. Если статистики нет и все матчи завершены - рассчитывает и сохраняет
4. Ждет 10 минут и повторяет

## Запуск

### Локально (разработка)

```bash
# Запуск
docker compose -f docker-compose.prediction-stats.yml up -d

# Просмотр логов
docker compose -f docker-compose.prediction-stats.yml logs -f

# Остановка
docker compose -f docker-compose.prediction-stats.yml down
```

### На продакшене

```bash
# На сервере
cd /path/to/project

# Запуск
docker compose -f docker-compose.prediction-stats.yml up -d

# Проверка статуса
docker compose -f docker-compose.prediction-stats.yml ps

# Логи
docker compose -f docker-compose.prediction-stats.yml logs -f prediction_stats_calculator
```

## Ручной запуск (без Docker)

Если нужно запустить расчет вручную без Docker:

```bash
# Однократный расчет
pnpm run predictions:stats:calc

# Расчет с пересчетом существующей статистики
pnpm run predictions:stats:calc:force

# Запуск в loop режиме (постоянная работа)
pnpm run predictions:stats:calc:loop
```

## Настройка интервала

По умолчанию интервал между расчетами - 10 минут (600000 мс).

Чтобы изменить интервал, отредактируйте `docker-compose.prediction-stats.yml`:

```yaml
command: pnpm predictions:stats:calc:loop --interval=300000 # 5 минут
```

Ил�� в `package.json`:

```json
"predictions:stats:calc:loop": "tsx scripts/prediction-stats/calculate-all.mjs --loop --interval=300000"
```

## Мониторинг

### Проверка работы

```bash
# Логи контейнера
docker compose -f docker-compose.prediction-stats.yml logs --tail=100 -f

# Проверка в MongoDB
mongosh 'mongodb://syncadmin:syncadminsyncadmin123qQ!@127.0.0.1:27017/payload?authSource=admin' \
  --eval 'db.predictionstats.countDocuments()'
```

### Что должно быть в логах

```
[LOOP] Запуск в режиме постоянной работы с интервалом 600 сек

[LOOP] === Итерация 1 ===
🚀 Запуск массового подсчёта статистики прогнозов...

📊 Найдено прогнозов: 5

🔄 Обработка 6941805dbf951662b3afabaa (Прогноз на матч...)...
   Результат: 1/1 (100.0%)
   ROI: 200.0%

==================================================
📈 ИТОГИ:
==================================================
Всего прогнозов: 5
Обработано: 1
Создано новых: 1
Обновлено: 0
Пропущено: 4
Ошибок: 0
==================================================

[LOOP] Ожидание 600 сек до следующей итерации...
```

## Интеграция с импортом матчей

Рекомендуется запускать оба контейнера одновременно:

```bash
# Импорт матчей
docker compose -f docker-compose.matches-import-forward.yml up -d

# Расчет статистики
docker compose -f docker-compose.prediction-stats.yml up -d
```

Логика работы:

1. `matches-import-forward` импортирует новые матчи каждые 10 минут
2. `prediction-stats` проверяет завершенные матчи и рассчитывает статистику каждые 10 минут

## Остановка всех фоновых процессов

```bash
# Остановить импорт матчей
docker compose -f docker-compose.matches-import-forward.yml down

# Остановить расчет статистики
docker compose -f docker-compose.prediction-stats.yml down

# Или все сразу
docker compose -f docker-compose.matches-import-forward.yml down && \
docker compose -f docker-compose.prediction-stats.yml down
```

## Troubleshooting

### Статистика не рассчитывается

1. Проверьте, что контейнер запущен:

   ```bash
   docker compose -f docker-compose.prediction-stats.yml ps
   ```

2. Проверьте логи на ошибки:

   ```bash
   docker compose -f docker-compose.prediction-stats.yml logs --tail=50
   ```

3. Проверьте, что матчи завершены:

   ```bash
   mongosh 'mongodb://...' --eval 'db.matches.find({status: "finished"}).count()'
   ```

4. Проверьте, что прогнозы существуют:
   ```bash
   mongosh 'mongodb://...' --eval 'db.posts.find({postType: "prediction"}).count()'
   ```

### Контейнер постоянно перезапускается

Проверьте переменные окружения в `.env`:

- `DATABASE_URI` - должен быть корректным
- `PAYLOAD_SECRET` - должен быть задан

### Нужно пересчитать всю статистику

```bash
# Остановить контейнер
docker compose -f docker-compose.prediction-stats.yml down

# Запустить пересчет вручную
pnpm run predictions:stats:recalc

# Запустить контейнер снова
docker compose -f docker-compose.prediction-stats.yml up -d
```

## PM2 альтернатива

Если не используете Docker, можно запустить через PM2:

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'prediction-stats',
      script: 'pnpm',
      args: 'run predictions:stats:calc:loop',
      cwd: '/path/to/project',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
```

```bash
pm2 start ecosystem.config.cjs --only prediction-stats
pm2 logs prediction-stats
```

## Рекомендации

1. **Интервал**: 10 минут оптимально для большинства случаев
2. **Мониторинг**: Настройте алерты на ошибки в логах
3. **Backup**: Делайте бэкап БД перед массовым пересчетом
4. **Нагрузка**: При большом количестве прогнозов увеличьте интервал

## См. также

- `WORKERS.md` - общая документация по фоновым процессам
- `docs/PREDICTION_STATS_CALCULATION.md` - алгоритм расчета статистики
- `scripts/prediction-stats/README.md` - документация по скриптам
