# Полная инструкция по настройке сервера с нуля на Ubuntu

Этот гайд описывает все шаги для развертывания проекта на чистом сервере с Ubuntu, включая установку ПО, настройку базы данных и запуск приложения.

## Шаг 1: Подготовка сервера

### 1.1. Обновление системы

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 1.2. Установка базовых утилит

```bash
sudo apt-get install -y git curl
```

## Шаг 2: Установка Docker и Docker Compose

### 2.1. Установка Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 2.2. Добавление пользователя в группу Docker

```bash
sudo usermod -aG docker $USER
```

**Важно**: После выполнения этой команды вам нужно выйти с сервера и зайти снова, чтобы изменения вступили в силу.

## Шаг 3: Установка и настройка MongoDB

### 3.1. Установка MongoDB (v7.0)

```bash
sudo apt-get install -y gnupg
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### 3.2. Запуск и проверка статуса MongoDB

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

### 3.3. Настройка доступа к MongoDB

```bash
sudo nano /etc/mongod.conf
```

Измените `bindIp` на `0.0.0.0`, чтобы разрешить внешние подключения:

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0
```

Перезапустите MongoDB:

```bash
sudo systemctl restart mongod
```

### 3.4. Создание пользователя в MongoDB

```bash
mongosh
use admin
db.createUser({
  user: "syncadmin",
  pwd: "syncadminsyncadmin123qQ!",
  roles: [{ role: "readWriteAnyDatabase", db: "admin" }]
})
exit
```

## Шаг 4: Развертывание приложения

### 4.1. Клонирование репозитория

```bash
git clone <URL_вашего_репозитория>
cd ro-ko-football
```

### 4.2. Создание `docker-compose.yml`

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
      DATABASE_URI: "mongodb://syncadmin:syncadminsyncadmin123qQ!@127.0.0.1:27017/payload?authSource=admin"
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

### 4.3. Настройка файла `.env`

Скопируйте пример и установите значения для `PAYLOAD_SECRET`, `NODE_ENV` и `APP_URL`.

```bash
cp .env.example .env
nano .env
```

### 4.4. Сборка и запуск

```bash
docker compose up --build -d
```

## Шаг 5: Настройка файрвола (UFW)

Откройте только необходимые порты.

```bash
sudo ufw allow 22/tcp      # Разрешить SSH (важно!)
sudo ufw allow 3100/tcp    # Разрешить доступ к приложению
sudo ufw allow http       # Для Caddy (Шаг 6)
sudo ufw allow https      # Для Caddy (Шаг 6)
sudo ufw enable
sudo ufw reload
```

## Шаг 6 (Опционально): Настройка веб-сервера Caddy

(Инструкции по установке и настройке Caddy остаются без изменений)

## Шаг 7: Выполнение скриптов внутри контейнера

Для выполнения любых команд и скриптов из `package.json` (например, импорта матчей) используйте специальный скрипт `exec.sh`.

1.  **Сделайте скрипт исполняемым (один раз):**
    ```bash
    chmod +x exec.sh
    ```

2.  **Запустите нужную команду:**
    ```bash
    ./exec.sh pnpm run matches:import:forward
    ```

    Или любую другую команду:
    ```bash
    ./exec.sh pnpm -v
    ```
