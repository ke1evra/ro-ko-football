# Настройка переменных окружения

## 🔧 Обзор

Проект использует переменные окружения для конфигурации базы данных, API ключей и других настроек. Для удобства настройки предоставлены несколько способов создания `.env` файла.

## 📋 Доступные команды

### Простое копирование
```bash
pnpm env:setup
```
Создаёт `.env` файл путём копирования `.env.example`. После этого нужно вручную отредактировать значения.

### Интерактивная настройка
```bash
pnpm env:setup:interactive
```
Запускает интерактивный мастер настройки с подсказками для каждой переменной.

### Принудительная перезапись
```bash
pnpm env:setup:force
```
Перезаписывает существующий `.env` файл (используйте осторожно).

## 🔑 Переменные окружения

### Обязательные переменные

#### `DATABASE_URI`
- **Описание**: Строка подключения к MongoDB
- **По умолчанию**: `mongodb://localhost:27017/payload`
- **Примеры**:
  - Локальная MongoDB: `mongodb://localhost:27017/payload`
  - MongoDB Atlas: `mongodb+srv://user:password@cluster.mongodb.net/payload`
  - Docker: `mongodb://mongodb:27017/payload`

#### `PAYLOAD_SECRET`
- **Описание**: Секретный ключ для шифрования JWT токенов
- **По умолчанию**: `your-secret-key-here`
- **Рекомендация**: Используйте случайную строку длиной 32+ символа
- **Генерация**: Интерактивный скрипт может сгенерировать автоматически

#### `NODE_ENV`
- **Описание**: Окружение приложения
- **Значения**: `development`, `production`, `staging`
- **По умолчанию**: `development`

### Опциональные переменные

#### Email конфигурация
- `RESEND_API_KEY` - API ключ для сервиса Resend
- `EMAIL_FROM` - Email адрес отправителя (по умолчанию: `noreply@yourdomain.com`)

#### Приложение
- `APP_URL` - Базовый URL приложения (по умолчанию: `http://localhost:3001`)
- `PORT` - Порт для запуска (по умолчанию: 3000)

#### LiveScore API
- `LIVESCORE_KEY` - API ключ для LiveScore
- `LIVESCORE_SECRET` - API секрет для LiveScore
- `LIVESCORE_API_BASE` - Базовый URL API (по умолчанию: `https://livescore-api.com/api-client`)

#### Cloudflare R2 (опционально)
- `R2_ACCESS_KEY_ID` - Access Key ID для Cloudflare R2
- `R2_SECRET_ACCESS_KEY` - Secret Access Key для Cloudflare R2
- `R2_BUCKET` - Имя bucket
- `R2_ENDPOINT` - Endpoint URL

#### Vercel Blob (опционально)
- `BLOB_READ_WRITE_TOKEN` - Токен для Vercel Blob Storage

## 🚀 Быстрый старт

### 1. Создание .env файла
```bash
# Простой способ
pnpm env:setup

# Или с интерактивной настройкой
pnpm env:setup:interactive
```

### 2. Редактирование .env
Откройте `.env` файл и настройте необходимые переменные:

```env
# Обязательно измените эти значения
DATABASE_URI=mongodb://localhost:27017/payload
PAYLOAD_SECRET=your-very-secure-secret-key-here

# Настройте при необходимости
EMAIL_FROM=your-email@yourdomain.com
RESEND_API_KEY=your-resend-api-key
```

### 3. Проверка конфигурации
```bash
pnpm production:check
```

## 🔒 Безопасность

### Важные рекомендации:
1. **Никогда не коммитьте `.env` файл** в git
2. **Используйте сильные секретные ключи** (32+ символа)
3. **Регулярно ротируйте API ключи** в продакшене
4. **Используйте разные секреты** для разных окружений

### Генерация безопасного PAYLOAD_SECRET:
```bash
# В Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Или используйте интерактивный скрипт
pnpm env:setup:interactive
```

## 🌍 Окружения

### Development
```env
NODE_ENV=development
DATABASE_URI=mongodb://localhost:27017/payload
APP_URL=http://localhost:3001
```

### Production
```env
NODE_ENV=production
DATABASE_URI=mongodb+srv://user:password@cluster.mongodb.net/payload
APP_URL=https://yourdomain.com
```

### Docker
```env
NODE_ENV=production
DATABASE_URI=mongodb://mongodb:27017/payload
APP_URL=http://localhost:3000
```

## 🛠️ Troubleshooting

### Проблема: "DATABASE_URI не задан"
**Решение**: Убедитесь, что `.env` файл существует и содержит `DATABASE_URI`

### Проблема: "Не удается подключиться к MongoDB"
**Решения**:
1. Проверьте, что MongoDB запущен
2. Проверьте правильность строки подключения
3. Для Docker: убедитесь, что контейнер MongoDB запущен

### Проблема: "PAYLOAD_SECRET слишком короткий"
**Решение**: Используйте секрет длиной минимум 32 символа

### Проблема: ".env файл уже существует"
**Решение**: Используйте `pnpm env:setup:force` для перезаписи

## 📚 Дополнительные ресурсы

- [Документация Payload CMS](https://payloadcms.com/docs)
- [MongoDB Connection String](https://docs.mongodb.com/manual/reference/connection-string/)
- [Resend API Documentation](https://resend.com/docs)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

## 🔧 Расширенная настройка

Для добавления новых переменных окружения:

1. Добавьте переменн��ю в `.env.example`
2. Обновите скрипт `scripts/setup-env.js`
3. Добавьте проверку в `scripts/production-check.js`
4. Обновите эту документацию