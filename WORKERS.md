# Worker Services

Отдельные worker-сервисы для периодических задач импорта матчей.

## Структура

- `docker-compose.yml` — основной сервис app
- `docker-compose.matches-import-forward.yml` — worker импорта матчей вперёд (новые матчи)
- `docker-compose.matches-import-backward.yml` — worker импорта матчей назад (история)

## Запуск

### Импорт матчей вперёд (новые матчи, интервал 10 минут)

```bash
docker compose -f docker-compose.matches-import-forward.yml up -d
```

### Импорт матчей назад (история)

```bash
docker compose -f docker-compose.matches-import-backward.yml up -d
```

### Оба worker'а одновременно

```bash
docker compose -f docker-compose.matches-import-forward.yml up -d
docker compose -f docker-compose.matches-import-backward.yml up -d
```

## Управление

### Просмотр логов

```bash
# Логи forward worker'а
docker compose -f docker-compose.matches-import-forward.yml logs -f

# Логи backward worker'а
docker compose -f docker-compose.matches-import-backward.yml logs -f
```

### Остановка

```bash
# Остановить forward worker
docker compose -f docker-compose.matches-import-forward.yml stop

# Остановить backward worker
docker compose -f docker-compose.matches-import-backward.yml stop

# Остановить оба
docker compose -f docker-compose.matches-import-forward.yml stop
docker compose -f docker-compose.matches-import-backward.yml stop
```

### Перезапуск

```bash
# Перезапустить forward worker
docker compose -f docker-compose.matches-import-forward.yml restart

# Перезапустить backward worker
docker compose -f docker-compose.matches-import-backward.yml restart
```

### Пересборка и запуск

```bash
# Forward worker
docker compose -f docker-compose.matches-import-forward.yml build && docker compose -f docker-compose.matches-import-forward.yml up -d

# Backward worker
docker compose -f docker-compose.matches-import-backward.yml build && docker compose -f docker-compose.matches-import-backward.yml up -d
```

### Удаление контейнеров

```bash
# Forward worker
docker compose -f docker-compose.matches-import-forward.yml down

# Backward worker
docker compose -f docker-compose.matches-import-backward.yml down
```

## Статус

### Список запущенных контейнеров

```bash
docker ps | grep matches_import
```

### Проверка статуса конкретного worker'а

```bash
docker ps -f name=matches_import_forward
docker ps -f name=matches_import_backward
```

## Переменные окружения

Все worker'ы используют переменные из `.env`:

- `PAYLOAD_SECRET` — секрет Payload
- `NODE_ENV` — окружение (production/development)
- `LIVESCORE_KEY` — ключ API LiveScore
- `LIVESCORE_SECRET` — секрет API LiveScore

Убедитесь, что `.env` заполнен перед запуском worker'ов.

## Зависимости

Worker'ы используют `network_mode: host` для доступа к:

- MongoDB (127.0.0.1:27017)
- Другим сервисам на хосте

Убедитесь, что MongoDB запущена и доступна перед запуском worker'ов.

## Команды

Worker'ы запускают следующие npm-скрипты:

- `matches:import:forward:loop` — импорт новых матчей с интервалом 10 минут
- `matches:import:backward:loop` — импорт истории матчей

Скрипты определены в `package.json`.
