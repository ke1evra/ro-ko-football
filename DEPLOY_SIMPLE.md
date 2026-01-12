# Деплой воркеров на сервер

## На сервере выполни:

```bash
cd ~/ro-ko-football

# Останови воркеры
docker compose -f docker-compose.matches-import-forward.yml down
docker compose -f docker-compose.prediction-stats.yml down

# Удали старые образы
docker image prune -a -f

# Собери и запусти
docker compose -f docker-compose.matches-import-forward.yml up -d --build
docker compose -f docker-compose.prediction-stats.yml up -d --build

# Проверь логи
docker compose -f docker-compose.prediction-stats.yml logs -f
```

Всё. Сборка займет 2-3 минуты.
