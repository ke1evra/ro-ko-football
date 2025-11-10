    # Полная инструкция по настройке сервера с нуля на Ubuntu

Этот гайд описывает все шаги для развертывания проекта на чистом сервере с Ubuntu, включая установку ПО, настройку базы данных и запуск приложения.

## Шаг 1: Подготовка сервера

### 1.1. Обновление системы

Подключитесь к вашему серверу по SSH и обновите списки пакетов и саму систему:

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 1.2. Установка базовых утилит

Установите `git` для работы с репозиторием и `curl` для загрузки скриптов:

```bash
sudo apt-get install -y git curl
```

## Шаг 2: Установка Docker и Docker Compose

### 2.1. Установка Docker

Выполните официальный скрипт для установки Docker:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 2.2. Добавление пользователя в группу Docker

Чтобы управлять Docker без `sudo`, добавьте вашего пользователя в группу `docker`:

```bash
sudo usermod -aG docker $USER
```

**Важно**: После выполнения этой команды вам нужно выйти с сервера и зайти снова, чтобы изменения вступили в силу.

## Шаг 3: Установка и настройка MongoDB

### 3.1. Установка MongoDB

Выполните следующие команды для добавления репозитория MongoDB и установки сервера:

```bash
# Установка зависимостей
sudo apt-get install -y gnupg

# Импорт GPG ключа MongoDB
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg \
   --dearmor

# Добавление репозитория
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Обновление пакетов и установка
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### 3.2. Запуск и проверка статуса MongoDB

```bash
sudo systemctl start mongod
sudo systemctl enable mongod  # Для автозапуска при старте системы
sudo systemctl status mongod
```

### 3.3. Настройка доступа к MongoDB

По умолчанию MongoDB разрешает подключения только с `127.0.0.1`. Чтобы Docker-контейнер мог подключиться, нужно разрешить подключения со всех IP-адресов.

```bash
sudo nano /etc/mongod.conf
```

Найдите секцию `net` и измените `bindIp`:

```yaml
# было:
# bindIp: 127.0.0.1

# стало:
net:
  port: 27017
  bindIp: 0.0.0.0
```

Сохраните файл (`Ctrl+X`, затем `Y`, затем `Enter`) и перезапустите MongoDB:

```bash
sudo systemctl restart mongod
```

### 3.4. Создание пользователя в MongoDB

1.  Войдите в оболочку MongoDB:
    ```bash
    mongosh
    ```

2.  Переключитесь на базу данных `admin`:
    ```javascript
    use admin
    ```

3.  Создайте пользователя (замените `payload` и `your_strong_password` на свои значения):
    ```javascript
    db.createUser({
      user: "payload",
      pwd: "your_strong_password",
      roles: [{ role: "readWriteAnyDatabase", db: "admin" }]
    })
    ```

4.  Выйдите из оболочки `mongosh` (`Ctrl+D`).

## Шаг 4: Развертывание приложения

### 4.1. Клонирование репозитория

```bash
git clone <URL_вашего_репозитория>
cd payload-starter
```

### 4.2. Настройка файла `.env`

```bash
cp .env.example .env
nano .env
```

Заполните файл, используя данные, которые вы создали на предыдущих шагах:

```env
# Используйте 127.0.0.1, так как Docker на Linux может обращаться к хосту напрямую
DATABASE_URI="mongodb://payload:your_strong_password@127.0.0.1:27017/payload?authSource=admin"

# Сгенерируйте новый секрет
PAYLOAD_SECRET="$(openssl rand -hex 32)"

# Укажите IP-адрес или домен вашего сервера
APP_URL="http://<IP_адрес_сервера>:3100"
```

### 4.3. Сборка и запуск

```bash
docker compose up --build -d
```

## Шаг 5: Настройка файрвола

Чтобы ваше приложение было доступно извне, откройте порт 3100 в файрволе `ufw`:

```bash
sudo ufw allow 22/tcp   # Разрешить SSH (важно!)
sudo ufw allow 3100/tcp # Разрешить доступ к приложению
sudo ufw enable
```

Ваше приложение теперь должно быть доступно по адресу `http://<IP_адрес_сервера>:3100`.
