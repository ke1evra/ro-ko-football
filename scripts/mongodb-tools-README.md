# 🛠️ Инструменты для диагностики и исправления MongoDB

## Описание скриптов

### 1. `diagnose-mongodb.sh` - Диагностика проблем

Собирает полную информацию о состоянии MongoDB и системы.

**Использование:**

```bash
bash scripts/diagnose-mongodb.sh
```

**Что проверяет:**

- ✅ Статус MongoDB
- ✅ Использование памяти (RAM и swap)
- ✅ Использование диска
- ✅ Наличие OOM killer событий
- ✅ Ошибки в логах
- ✅ Конфигурацию MongoDB
- ✅ Количество подключений
- ✅ Версию MongoDB

**Вывод:**

- Детальная информация о системе
- Рекомендации по исправлению проблем

---

### 2. `fix-mongodb.sh` - Автоматическое исп��авление

Автоматически исправляет типичные проблемы с MongoDB.

**Использование:**

```bash
sudo bash scripts/fix-mongodb.sh
```

**⚠️ Требует права root!**

**Что делает:**

- ✅ Останавливает MongoDB
- ✅ Создаёт backup конфигурации
- ✅ Настраивает ограничение памяти (cacheSizeGB: 0.5)
- ✅ Ограничивает количество подключений (100)
- ✅ Создаёт swap файл (2GB) если отсутствует
- ✅ Настраивает автоперезапуск
- ✅ Очищает старые логи
- ✅ Проверяет права доступа
- ✅ Запускает MongoDB
- ✅ Создаёт индексы для оптимизации

**Backup файлы:**

- `/etc/mongod.conf.backup.YYYYMMDD_HHMMSS`
- `/var/log/mongodb/mongod.log.backup.YYYYMMDD_HHMMSS`

---

### 3. `monitor-mongodb.sh` - Мониторинг

Постоянно мониторит состояние MongoDB и автоматически перезапускает при падении.

**Использование:**

#### Разовый запуск:

```bash
bash scripts/monitor-mongodb.sh
```

#### Автоматический запуск через crontab:

```bash
# Открыть crontab
crontab -e

# Добавить строку (проверка каждые 5 минут):
*/5 * * * * /root/ro-ko-football/scripts/monitor-mongodb.sh >> /var/log/mongodb-monitor.log 2>&1
```

**Что проверяет:**

- ✅ Статус MongoDB (автоперезапуск при падении)
- ✅ Использование памяти MongoDB
- ✅ Использование памяти системы
- ✅ Использование диска
- ✅ Количество подключений
- ✅ Ошибки в логах
- ✅ Использование swap
- ✅ Размер лога MongoDB

**Логи:**

- `/var/log/mongodb-monitor.log`

**Просмотр логов:**

```bash
# Последние 50 строк
tail -n 50 /var/log/mongodb-monitor.log

# В реальном времени
tail -f /var/log/mongodb-monitor.log

# Поиск ошибок
grep "WARNING\|CRITICAL" /var/log/mongodb-monitor.log
```

---

## 🚀 Быстрый старт

### Сценарий 1: MongoDB упал, нужно быстро восстановить

```bash
# 1. Диагностика
bash scripts/diagnose-mongodb.sh

# 2. Автоматическое исправление
sudo bash scripts/fix-mongodb.sh

# 3. Пров��рка
systemctl status mongod
```

### Сценарий 2: Настройка мониторинга

```bash
# 1. Сделать скрип�� исполняемым
chmod +x scripts/monitor-mongodb.sh

# 2. Тестовый запуск
bash scripts/monitor-mongodb.sh

# 3. Добавить в crontab
crontab -e
# Добавить: */5 * * * * /root/ro-ko-football/scripts/monitor-mongodb.sh >> /var/log/mongodb-monitor.log 2>&1

# 4. Проверить что crontab работает
crontab -l
```

### Сценарий 3: Регулярная проверка

```bash
# Каждый день в 9:00 утра
0 9 * * * bash /root/ro-ko-football/scripts/diagnose-mongodb.sh > /var/log/mongodb-daily-check.log 2>&1
```

---

## 📊 Интерпретация результатов

### Диагностика (diagnose-mongodb.sh)

#### ✅ Всё хорошо:

```
✅ MongoDB запущен
✅ Swap настроен
✅ Нет записей об убитых процессах
✅ Автоперезапуск настроен
```

#### ⚠️ Требуется внимание:

```
⚠️ Мало памяти (1024MB). Рекомендуется минимум 2GB
⚠️ Swap не настроен
⚠️ cacheSizeGB не настроен
⚠️ Автоперезапуск не настроен
```

#### 🔴 Критические проблемы:

```
× MongoDB не запущен
killed process (mongod)
Out of memory
```

### Мониторинг (monitor-mongodb.sh)

#### ✅ Нормальная работа:

```
[2026-01-12 10:00:00] ✅ MongoDB работает
[2026-01-12 10:00:00] ✅ Использование памяти MongoDB: 45%
[2026-01-12 10:00:00] ✅ Использование памяти системы: 65%
[2026-01-12 10:00:00] ✅ Использование диска: 45%
[2026-01-12 10:00:00] ✅ Подключений к MongoDB: 12
```

#### ⚠️ Предупреждения:

```
[2026-01-12 10:00:00] ⚠️ WARNING: Высокое использование памяти MongoDB: 85%
[2026-01-12 10:00:00] ⚠️ WARNING: Мало места на диске: 85%
[2026-01-12 10:00:00] ⚠️ WARNING: Много подключений к MongoDB: 95
```

#### 🔴 Критические события:

```
[2026-01-12 10:00:00] 🔴 CRITICAL: MongoDB не запущен! Попытка перезапуска...
[2026-01-12 10:00:05] ✅ MongoDB успешно перезапущен
```

---

## 🔧 Ручные команды

### Проверка статуса

```bash
systemctl status mongod
```

### Просмотр логов

```bash
# Последние 100 строк
journalctl -u mongod -n 100 --no-pager

# В реальном времени
journalctl -u mongod -f

# Только ошибки
journalctl -u mongod | grep -i "error\|fatal"
```

### Проверка памяти

```bash
# Общая память
free -h

# Процессы по памяти
ps aux --sort=-%mem | head -10

# Память MongoDB
ps aux | grep mongod
```

### Проверка диска

```bash
# Общее использование
df -h

# Размер данных MongoDB
du -sh /var/lib/mongodb/*
```

### Проверка подключений

```bash
mongosh --eval "db.serverStatus().connections"
```

### Перезапуск MongoDB

```bash
sudo systemctl restart mongod
sudo systemctl status mongod
```

---

## 📞 Уведомления (опционально)

### Telegram уведомления

Отредактировать `monitor-mongodb.sh` и раскомментировать секцию с curl:

```bash
# Получить токен бота: @BotFather в Telegram
# Получить chat_id: отправить сообщение боту и открыть https://api.telegram.org/bot<TOKEN>/getUpdates

# В monitor-mongodb.sh найти и заменить:
curl -X POST "https://api.telegram.org/bot<ВАШ_ТОКЕН>/sendMessage" \
  -d "chat_id=<ВАШ_CHAT_ID>" \
  -d "text=🔴 MongoDB был перезапущен на сервере $(hostname)"
```

### Email уведомления

Установить `mailutils`:

```bash
sudo apt install mailutils
```

Добавить в `monitor-mongodb.sh`:

```bash
echo "MongoDB был перезапущен" | mail -s "MongoDB Alert" your@email.com
```

---

## 🧪 Тестирование

### Тест падения MongoDB

```bash
# Убить процесс MongoDB
sudo pkill -9 mongod

# Подождать 5 минут (интервал cron)
# Проверить что мониторинг перезапустил MongoDB
tail -f /var/log/mongodb-monitor.log
```

### Тест высокой нагрузки

```bash
# Создать много подключений
for i in {1..50}; do
  mongosh --eval "db.serverStatus()" &
done

# Проверить предупреждения в логе
tail -f /var/log/mongodb-monitor.log
```

---

## 📚 Дополнительные ресурсы

- [MONGODB_CRASH_FIX.md](../MONGODB_CRASH_FIX.md) - Подробное руководство по исправлению
- [MongoDB Production Notes](https://docs.mongodb.com/manual/administration/production-notes/)
- [MongoDB Monitoring](https://docs.mongodb.com/manual/administration/monitoring/)

---

## ❓ FAQ

### Q: Как часто запускать мониторинг?

**A:** Рекоме��дуется каждые 5 минут через crontab.

### Q: Нужны ли права root для всех скриптов?

**A:**

- `diagnose-mongodb.sh` - нет
- `fix-mongodb.sh` - да (sudo)
- `monitor-mongodb.sh` - нет, но для автоперезапуска нужны права

### Q: Что делать если fix-mongodb.sh не помог?

**A:**

1. Запустить `diagnose-mongodb.sh` и сохранить вывод
2. Проверить логи: `journalctl -u mongod -n 200`
3. См. подробное руководство в `MONGODB_CRASH_FIX.md`

### Q: Можно ли запускать скрипты на локальной машине?

**A:** Да, но они предназначены для production серверов.

### Q: Как удалить все изменения?

**A:**

```bash
# Восстановить конфигурацию из backup
sudo cp /etc/mongod.conf.backup.* /etc/mongod.conf

# Удалить swap (опционально)
sudo swapoff /swapfile
sudo rm /swapfile

# Удалить из fstab
sudo sed -i '/swapfile/d' /etc/fstab

# Перезапустить MongoDB
sudo systemctl restart mongod
```
