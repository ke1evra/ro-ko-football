# PM2 Configuration для Football Platform

## Обзор

Конфигурация PM2 для запуска Next.js приложения с Payload CMS и MongoDB в продакшн окружении.

## Структура

- **football-platform** - основное Next.js приложение (кластерный режим)
- **football-worker** - фоновый воркер для периодических задач

## Установка PM2

```bash
# Глобальная установка PM2
npm install -g pm2

# Или через pnpm
pnpm add -g pm2
```

## Подготовка к запуску

1. **Сборка приложения**:

```bash
pnpm build
```

2. **Создание директорий**:

```bash
mkdir -p logs workers
```

3. **Настройка переменных окружения**:
   Убедитесь, что `.env` файл содержит все необходимые переменные:

```env
DATABASE_URI=mongodb://localhost:27017/payload
PAYLOAD_SECRET=your-secret-key-here
NODE_ENV=production
PORT=3000
```

## Команды управления

### Основные команды

```bash
# Запуск всех процессов
pnpm pm2:start

# Остановка всех процессов
pnpm pm2:stop

# Перезапуск всех процессов
pnpm pm2:restart

# Плавный перезапуск (zero-downtime)
pnpm pm2:reload

# Удаление всех процессов
pnpm pm2:delete

# Просмотр статуса
pnpm pm2:status

# Просмотр логов
pnpm pm2:logs

# Мониторинг в реальном времени
pnpm pm2:monit
```

### Управление отдельными процессами

```bash
# Запуск только основного приложения
pm2 start ecosystem.config.js --only football-platform

# Запуск только воркера
pm2 start ecosystem.config.js --only football-worker

# Перезапуск конкретного процесса
pm2 restart football-platform
pm2 restart football-worker

# Остановка конкретного процесса
pm2 stop football-platform
pm2 stop football-worker
```

## Мониторинг и логи

### Логи

Логи сохраняются в директории `./logs/`:

- `combined.log` - общие логи приложения
- `out.log` - stdout приложения
- `error.log` - ошибки приложения
- `worker-*.log` - логи фонового воркера

### Просмотр логов

```bash
# Все логи в реальном времени
pm2 logs

# Логи конкретного процесса
pm2 logs football-platform
pm2 logs football-worker

# Последние 100 строк
pm2 logs --lines 100

# Очистка логов
pm2 flush
```

### Мониторинг

```bash
# Веб-интерфейс мониторинга
pm2 monit

# Статус процессов
pm2 status

# Детальная информация
pm2 show football-platform
```

## Автозапуск при перезагрузке системы

```bash
# Сохранение текущих процессов
pm2 save

# Настройка автозапуска
pm2 startup

# Выполните команду, которую выведет pm2 startup
# Например: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username
```

## Фоновый воркер

Воркер выполняет следующие задачи каждые 5 минут:

- Обновление счётчиков голосов за комментарии
- Очистка устаревших токенов верификации email
- Очистка устаревших токенов сброса пароля

### Настройка воркера

Воркер автоматически запускается вместе с основным приложением. Для отключения воркера:

```bash
pm2 stop football-worker
pm2 delete football-worker
```

## Деплой (опционально)

Конфигурация включает настройки для автоматического деплоя:

```bash
# Настройка деплоя
pm2 deploy ecosystem.config.js production setup

# Деплой на продакшн
pm2 deploy ecosystem.config.js production

# Деплой на staging
pm2 deploy ecosystem.config.js staging
```

## Производительность

### Настройки кластера

- **Instances**: `max` - использует все доступные CPU ядра
- **Exec mode**: `cluster` - кластерный режим для лучшей производительности
- **Max memory restart**: `1G` - перезапуск при превышении 1GB памяти

### Оптимизация

- Логи ротируются автоматически
- Graceful shutdown для корректного завершения процессов
- Health checks для мониторинга состояния
- Автоматический перезапуск при сбоях

## Troubleshooting

### Проблемы с запуском

```bash
# Проверка статуса
pm2 status

# Просмотр ошибок
pm2 logs --err

# Перезапуск с очисткой
pm2 delete all
pnpm pm2:start
```

### Проблемы с памятью

```bash
# Мониторинг использования памяти
pm2 monit

# Принудительный перезапуск
pm2 restart all --update-env
```

### Проблемы с базой данных

```bash
# Проверка подключения к MongoDB
pm2 logs football-worker

# Перезапуск только воркера
pm2 restart football-worker
```

## Безопасность

- Все чувствительные данные хранятся в `.env` файле
- Логи не содержат секретных данных
- Graceful shutdown предотвращает потерю данных
- Автоматическая очистка устаревших токенов

## Требования

- Node.js 18.20.2+ или 20.9.0+
- PM2 5.0+
- MongoDB 7.0+
- pnpm 8.0+

## Поддержка

При возникновении проблем:

1. Проверьте логи: `pm2 logs`
2. Проверьте статус: `pm2 status`
3. Проверьте конфигурацию: `cat ecosystem.config.js`
4. Перезапустите процессы: `pm2 restart all`
