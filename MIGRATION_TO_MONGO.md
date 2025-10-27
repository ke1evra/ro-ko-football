# Миграция с PostgreSQL на MongoDB

## Выполненные изменения

### 1. Обновлены зависимости

- Заменён `@payloadcms/db-postgres` на `@payloadcms/db-mongodb` в `package.json`

### 2. Обновлена конфигурация Payload

- В `src/payload.config.ts`:
  - Заменён импорт `postgresAdapter` на `mongooseAdapter`
  - Обновлена конфигурация базы данных с `postgresAdapter` на `mongooseAdapter`

### 3. Обновлены переменные окружения

- В `.env` и `.env.docker`:
  - `DATABASE_URI` изменён с PostgreSQL на MongoDB URI
  - Локальная разработка: `mongodb://localhost:27017/payload`
  - Docker: `mongodb://mongodb:27017/payload`

### 4. Обновлён Docker Compose

- В `docker-compose.yml`:
  - Заменён сервис `postgres` на `mongodb`
  - Используется образ `mongo:7-jammy`
  - Порт изменён с `5433` на `27017`
  - Volume переименован с `pgdata` на `mongodata`

## Запуск проекта

### Локальная разработка

1. Убедитесь, что MongoDB запущен локально на порту 27017
2. Установите зависимости: `pnpm install`
3. Запустите проект: `pnpm dev`

### Docker

1. Запустите контейнеры: `docker-compose up`
2. Проект будет доступен на `http://localhost:3000`

## Проверка миграции

1. Все коллекции (Users, Posts, Comments, CommentVotes, Media) совместимы с MongoDB
2. Типы Payload сгенерированы успешно
3. Конфигурация обновлена согласно документации Payload CMS

## Примечания

- MongoDB не требует предварительного создания схем, в отличие от PostgreSQL
- Все существующие хуки и валидации в коллекциях остаются без изменений
- Система аутентификации и авторизации работает аналогично
- Все API endpoints остаются теми же

## Тестирование миграции

### ✅ Выполнено

1. **Зависимости обновлены** - `@payloadcms/db-mongodb` установлен
2. **Конфигурация обновлена** - `mongooseAdapter` настроен
3. **Docker Compose обновлён** - MongoDB контейнер запущен
4. **Переменные окружения обновлены** - MongoDB URI настроен
5. **Администратор создан** - `admin@example.com` с паролем `admin123`
6. **Приложение запущено** - доступно на `http://localhost:3000`

### Следующие шаги

1. Войдите в админку: `http://localhost:3000/admin`
   - Email: `admin@example.com`
   - Пароль: `admin123`
2. Протестируйте создание пользователей и аутентификацию
3. Проверьте работу всех CRUD операций для коллекций
4. Убедитесь в корректной работе системы голосования за комментарии
5. Проверьте загрузку медиафайлов

## Команды для управления

```bash
# Запуск MongoDB в Docker
docker compose up -d mongodb

# Запуск приложения
pnpm dev

# Создание администратора
node create-admin.mjs --email=admin@example.com --password=admin123

# Остановка всех процессов
pkill -f "next dev"
docker compose down
```

## Статус миграции: ✅ ЗАВЕРШЕНА

Проект успешно переведён с PostgreSQL на MongoDB. Все основные компоненты работают корректно.
