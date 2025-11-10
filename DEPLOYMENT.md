# Инструкция по развертыванию проекта

Этот документ описывает, как развернуть проект с помощью Docker на машине, где уже установлены все необходимые зависимости.

## Предварительные требования

1.  **Git**: Установлен и настроен.
2.  **Docker и Docker Compose**: Установлены и запущены.
3.  **База данных MongoDB**: Запущена и доступна для подключения.

## Шаги развертывания

### 1. Клонирование репозитория

```bash
git clone <URL_вашего_репозитория>
cd ro-ko-football
```

### 2. Создание `docker-compose.yml`

Создайте файл `docker-compose.yml` со следующей рабочей конфигурацией:

```bash
cat <<EOF > docker-compose.yml
name: appstack

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    network_mode: "host"
    env_file:
      - ./.env
    environment:
      DATABASE_URI: "mongodb://<user>:<password>@127.0.0.1:27017/<dbname>?authSource=admin"
      PAYLOAD_SECRET: ${PAYLOAD_SECRET}
      NODE_ENV: ${NODE_ENV}
      APP_URL: ${APP_URL}
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4g
        reservations:
          cpus: '1.0'
          memory: 2g
    restart: unless-stopped
EOF
```

### 3. Настройка файла `.env`

Скопируйте пример и установите значения для `PAYLOAD_SECRET`, `NODE_ENV` и `APP_URL`. **`DATABASE_URI` теперь настраивается в `docker-compose.yml`**.

```bash
cp .env.example .env
nano .env
```

### 4. Сборка и запуск контейнера

```bash
docker compose up --build -d
```

### 5. Проверка статуса

```bash
docker compose ps
docker compose logs --follow app
```

Приложение будет доступно по порту, указанному в `Dockerfile` (3100).
