# 🔧 Решение проблем на сервере

## 🔴 Проблема 1: DATABASE_URI не загружается

### Симптомы
```
ERROR: Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"
```

### Причина
`.env` файл не загружается правильно или DATABASE_URI содержит неправильное значение.

### Решение

#### Шаг 1: Проверить .env файл
```bash
cd /root/ro-ko-football
cat .env | grep DATABASE_URI
```

Должно быть:
```
DATABASE_URI=mongodb://localhost:27017/your-database
# или
DATABASE_URI=mongodb+srv://user:password@cluster.mongodb.net/database
```

#### Шаг 2: Проверить что .env в корне проекта
```bash
ls -la /root/ro-ko-football/.env
```

#### Шаг 3: Если .env отсутствует, соз��ать
```bash
cd /root/ro-ko-football
nano .env
```

Добавить:
```env
DATABASE_URI=mongodb://localhost:27017/ro-ko-football
PAYLOAD_SECRET=your-secret-key-here
LIVESCORE_KEY=your-key
LIVESCORE_SECRET=your-secret
```

#### Шаг 4: Проверить права доступа
```bash
chmod 600 .env
```

---

## 🔴 Проблема 2: Cannot find module Users

### Симптомы
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/root/ro-ko-football/src/collections/Users'
```

### Причина
Node.js ESM требует явных расширений файлов в импортах, но TypeScript компилируется без них.

### Решение

#### Вариант 1: Использовать tsx (рекомендуется)

```bash
cd /root/ro-ko-football

# Установить tsx
pnpm add -D tsx

# Запускать скрипты через tsx
tsx scripts/prediction-stats/calculate-all.mjs
```

#### Вариант 2: Собрать проект

```bash
cd /root/ro-ko-football

# Собрать Next.js проект
pnpm build

# Запустить скрипты
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs
```

#### Вариант 3: Использовать правильный loader

```bash
# Вместо --loader используйте --import
node --import @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs
```

---

## 🔴 Проблема 3: ExperimentalWarning

### Симптомы
```
ExperimentalWarning: `--experimental-loader` may be removed in the future
```

### Решение

Обновить команды в package.json:

```json
{
  "scripts": {
    "matches:import:forward": "tsx scripts/import-matches-forward.mjs",
    "matches:import:backward": "tsx scripts/import-matches-backward.mjs",
    "predictions:stats:calc": "tsx scripts/prediction-stats/calculate-all.mjs"
  }
}
```

---

## ✅ Полное решение для сервера

### Шаг 1: Установить зависимости

```bash
cd /root/ro-ko-football
pnpm install
pnpm add -D tsx
```

### Шаг 2: Проверить .env

```bash
cat .env
```

Должен содержать:
```env
DATABASE_URI=mongodb://localhost:27017/ro-ko-football
PAYLOAD_SECRET=your-secret-here
LIVESCORE_KEY=your-key
LIVESCORE_SECRET=your-secret
NODE_ENV=production
```

### Шаг 3: Обновить package.json

```bash
nano package.json
```

Изменить скрипты:
```json
{
  "scripts": {
    "matches:import:forward": "tsx scripts/import-matches-forward.mjs",
    "matches:import:backward": "tsx scripts/import-matches-backward.mjs",
    "matches:import:forward:loop": "tsx scripts/import-matches-forward.mjs --loop --interval=600000",
    "matches:import:backward:loop": "tsx scripts/import-matches-backward.mjs --loop",
    "predictions:stats:calc": "tsx scripts/prediction-stats/calculate-all.mjs",
    "predictions:stats:calc:force": "tsx scripts/prediction-stats/calculate-all.mjs --force",
    "predictions:stats:recalc": "tsx scripts/prediction-stats/recalculate-all.mjs",
    "predictions:stats:by-match": "tsx scripts/prediction-stats/calculate-by-match.mjs",
    "predictions:stats:by-user": "tsx scripts/prediction-stats/calculate-by-user.mjs",
    "predictions:stats:by-post": "tsx scripts/prediction-stats/calculate-by-post.mjs"
  }
}
```

### Шаг 4: Запустить

```bash
# Тест
pnpm matches:import:forward --days=1

# Loop режим
pnpm matches:import:forward:loop
```

---

## 🐳 Альтернатива: Docker

Если проблемы продолжаются, используйте Docker:

### docker-compose.yml

```yaml
version: '3.8'

services:
  matches-import:
    build: .
    command: pnpm matches:import:forward:loop
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./scripts:/app/scripts
      - ./src:/app/src
    depends_on:
      - mongodb

  mongodb:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: ro-ko-football

volumes:
  mongodb_data:
```

### Запуск

```bash
docker-compose up -d matches-import
docker-compose logs -f matches-import
```

---

## 🔍 Отладка

### Проверить подключение к MongoDB

```bash
# Локально
mongosh mongodb://localhost:27017/ro-ko-football

# Удалённо
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/database"
```

### Проверить переменные окружения

```bash
cd /root/ro-ko-football
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URI)"
```

### Проверить что файлы на месте

```bash
ls -la /root/ro-ko-football/src/collections/
ls -la /root/ro-ko-football/scripts/prediction-stats/
```

### Проверить версию Node.js

```bash
node --version  # Должна быть >= 18.20.2
```

---

## 📋 Чек-лист перед запуском

- [ ] Node.js >= 18.20.2 установлен
- [ ] pnpm установлен
- [ ] Зависимости установлены (`pnpm install`)
- [ ] `.env` файл создан и заполнен
- [ ] DATABASE_URI правильный (начинается с `mongodb://` или `mongodb+srv://`)
- [ ] MongoDB запущен и доступен
- [ ] Файлы `src/collections/*.ts` существуют
- [ ] `tsx` установлен (`pnpm add -D tsx`)
- [ ] package.json обновлён с `tsx` вместо `--loader`

---

## 🚀 Быстрый старт на чистом сервере

```bash
# 1. Клонировать проект
cd /root
git clone <repo-url> ro-ko-football
cd ro-ko-football

# 2. Установить зависимости
pnpm install
pnpm add -D tsx

# 3. Создать .env
cp .env.example .env
nano .env  # Заполнить переменные

# 4. Проверить MongoDB
mongosh mongodb://localhost:27017/ro-ko-football

# 5. Тестовый запуск
pnpm matches:import:forward --days=1

# 6. Запустить в loop режиме
pnpm matches:import:forward:loop

# 7. Или через PM2
pm2 start ecosystem.config.cjs
pm2 logs
```

---

## 📞 Если ничего не помогает

1. Проверить логи:
```bash
pm2 logs
journalctl -u matches-import -f
docker-compose logs -f
```

2. Запустить с отладкой:
```bash
DEBUG=* pnpm matches:import:forward --days=1
```

3. Проверить права доступа:
```bash
ls -la /root/ro-ko-football
chmod -R 755 /root/ro-ko-football
```

4. Переустановить зависимости:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```
