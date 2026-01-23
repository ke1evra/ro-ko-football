# 🔴 Решение проблемы падения MongoDB на проде

## ⚡ Быстрое решение (5 минут)

```bash
cd /root/ro-ko-football

# 1. Экстренная диагностика (опционально)
bash scripts/emergency-mongodb-check.sh

# 2. Автоматическое исправление
sudo bash scripts/fix-mongodb.sh

# 3. Настроить мониторинг
crontab -e
# Добавить: */5 * * * * /root/ro-ko-football/scripts/monitor-mongodb.sh >> /var/log/mongodb-monitor.log 2>&1
```

**Важно:** После исправления MongoDB будет ограничен 512MB памяти и не будет падать от OOM.

---

## Проблема

MongoDB периодически падает с ошибкой `SIGABRT` (signal=6):

```
× mongod.service - MongoDB Database Server
Active: failed (Result: core-dump) since Sat 2026-01-10 11:17:14 UTC
Process: 2303660 ExecStart=/usr/bin/mongod --config /etc/mongod.conf (code=dumped, signal=ABRT)
CPU: 15h 51min 37.641s
Memory peak: 203.3M
```

## Причины падения MongoDB с SIGABRT

### 1. **Нехватка памяти (OOM - Out of Memory)** ⚠️ ОСНОВНАЯ ПРИЧИНА

- MongoDB требует много RAM для кэша (по умолчанию 50% системной памяти)
- При нехватке памяти система убивает процесс через OOM killer
- Признаки из ваших логов:
  - `memory peak: 2.2G` (2 января) - превышение лимита
  - `memory peak: 203.3M` (10 января) - аномально мало
  - Периодические па��ения каждые 3-16 часов работы
  - `code=dumped, status=6/ABRT` - типичный признак OOM

### 2. **Проблемы с диском**

- Нехватка места на диске
- Проблемы с правами доступа к `/var/lib/mongodb`
- Повреждённые файлы данных

### 3. **К��нфликт версий или повреждённая установка**

- Несовместимость версий MongoDB
- Повреждённые бинарные файлы

### 4. **Слишком много подключений**

- Превышен лимит одновременных подключений
- Утечки соединений в приложении

## Анализ ваших логов

Из предоставленных логов видно:

**Падения:**

- 23 декабря: проработал 8ч 4мин → ABRT
- 2 января: проработал 2ч 53мин → ABRT (memory peak: 2.2G)
- 10 января: проработал 15ч 51мин → ABRT (memory peak: 203.3M)

**Проблема:** Нестабильное потребление памяти (от 203MB до 2.2GB) указывает на:

1. Отсутствие ограничения памяти (cacheSizeGB не настроен)
2. Вероятно, нет swap
3. OOM killer убивает процесс при нехватке RAM

## Диагностика

### Шаг 0: Экстренная проверка (новый скрипт)

```bash
bash scripts/emergency-mongodb-check.sh
```

Этот скрипт проверит:

- Записи OOM killer о MongoDB
- Наличие swap
- Конфигурацию cacheSizeGB
- Размер базы данных
- Assertion failures и коррупцию данных

### Шаг 1: Проверить логи MongoDB

```bash
# Полные логи с момента последнего запуска
journalctl -u mongod -n 500 --no-pager

# Логи MongoDB
tail -n 200 /var/log/mongodb/mongod.log

# Поиск ошибок OOM
dmesg | grep -i "out of memory"
dmesg | grep -i "killed process"
```

### Шаг 2: Проверить использование памяти

```bash
# Общая память системы
free -h

# Использование памяти процессами
ps aux --sort=-%mem | head -20

# Проверить swap
swapon --show
```

### Шаг 3: Проверить диск

```bash
# Свободное место
df -h

# Использование в директории MongoDB
du -sh /var/lib/mongodb/*

# Проверить права доступа
ls -la /var/lib/mongodb/
```

### Шаг 4: Проверить конфигурацию MongoDB

```bash
# Посмотреть конфигурацию
cat /etc/mongod.conf

# Проверить версию
mongod --version
```

### Шаг 5: Проверить количество подключений

```bash
# После запуска MongoDB
mongosh --eval "db.serverStatus().connections"
```

## Решения

### Решение 1: Ограничить использование памяти MongoDB

Отредактировать `/etc/mongod.conf`:

```yaml
# /etc/mongod.conf

storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  # Ограничить размер кэша (например, 512MB)
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.5

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# Ограничить количество подключений
net:
  maxIncomingConnections: 100
```

После изменений:

```bash
sudo systemctl restart mongod
sudo systemctl status mongod
```

### Решение 2: Добавить swap (если его нет)

```bash
# Проверить текущий swap
swapon --show

# Если swap отсутствует, создать файл подкачки 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Сделать постоянным
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Проверить
free -h
```

### Решение 3: Очистить логи и старые данные

```bash
# Очистить старые логи
sudo truncate -s 0 /var/log/mongodb/mongod.log

# Проверить размер базы данных
mongosh --eval "db.stats(1024*1024)" payload

# Удалить старые данные (если нужно)
mongosh payload --eval "db.matches.deleteMany({createdAt: {\$lt: new Date('2025-01-01')}})"
```

### Решение 4: Исправить утечки подключений в приложении

Проверить код приложения на правильное закрытие соединений:

```typescript
// src/lib/payload-client.ts
import { getPayload } from 'payload'

let cachedPayload = null

export async function getPayloadClient() {
  if (cachedPayload) {
    return cachedPayload
  }

  cachedPayload = await getPayload({ config })
  return cachedPayload
}

// НЕ создавать новое подключение при каждом запросе!
```

### Решение 5: Настроить systemd для автоматического перезапуска

```bash
# Отредактировать systemd unit
sudo systemctl edit mongod

# Добавить:
[Service]
Restart=always
RestartSec=10
StartLimitInterval=0

# Применить
sudo systemctl daemon-reload
sudo systemctl restart mongod
```

### Решение 6: Мониторинг и алерты

Создать скрипт мониторинга `/root/monitor-mongodb.sh`:

```bash
#!/bin/bash

# Проверить статус MongoDB
if ! systemctl is-active --quiet mongod; then
    echo "MongoDB is down! Restarting..."
    systemctl start mongod

    # Отправить уведомление (опционально)
    # curl -X POST https://your-webhook-url -d "MongoDB crashed and restarted"
fi

# Проверить использование памяти
MEM_USAGE=$(ps aux | grep mongod | grep -v grep | awk '{print $4}')
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "MongoDB memory usage is high: ${MEM_USAGE}%"
fi

# Проверить свободное место на диске
DISK_USAGE=$(df -h /var/lib/mongodb | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "Disk usage is high: ${DISK_USAGE}%"
fi
```

Добавить в crontab:

```bash
# Запускать каждые 5 минут
crontab -e

# Добавить строку:
*/5 * * * * /root/monitor-mongodb.sh >> /var/log/mongodb-monitor.log 2>&1
```

### Решение 7: Оптимизировать запросы приложения

```bash
# Проверить медленные запросы
mongosh payload --eval "db.setProfilingLevel(1, { slowms: 100 })"

# Через некоторое время посмотреть
mongosh payload --eval "db.system.profile.find().limit(10).sort({ts:-1}).pretty()"

# Добавить индексы для часто используемых полей
mongosh payload --eval "db.matches.createIndex({fixtureId: 1})"
mongosh payload --eval "db.matches.createIndex({status: 1, date: -1})"
mongosh payload --eval "db.predictionStats.createIndex({matchId: 1})"
mongosh payload --eval "db.predictionStats.createIndex({userId: 1})"
```

## Рекомендуемый план действий

### Немедленно (для восстановления работы):

```bash
# 1. Запустить MongoDB
sudo systemctl start mongod
sudo systemctl status mongod

# 2. Проверить логи
journalctl -u mongod -n 100 --no-pager
tail -n 50 /var/log/mongodb/mongod.log

# 3. Проверить память и диск
free -h
df -h
```

### В течение часа:

```bash
# 1. Ограничить память MongoDB (см. Решение 1)
sudo nano /etc/mongod.conf
# Добавить cacheSizeGB: 0.5
sudo systemctl restart mongod

# 2. Добавить swap если его нет (см. Решение 2)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. Настроить автоперезапуск (см. Решение 5)
sudo systemctl edit mongod
# Добавить Restart=always
sudo systemctl daemon-reload
```

### В течение дня:

```bash
# 1. Настроить мониторинг (см. Решение 6)
nano /root/monitor-mongodb.sh
chmod +x /root/monitor-mongodb.sh
crontab -e

# 2. Оптимизировать запросы (см. Решение 7)
mongosh payload --eval "db.matches.createIndex({fixtureId: 1})"

# 3. Проверить код на утечки подключений (см. Решение 4)
```

## Проверка после исправлений

```bash
# 1. Статус MongoDB
systemctl status mongod

# 2. Использование памяти
ps aux | grep mongod

# 3. Логи без ошибок
journalctl -u mongod -f

# 4. Подключения
mongosh --eval "db.serverStatus().connections"

# 5. Производительность
mongosh --eval "db.serverStatus().wiredTiger.cache"
```

## Инструменты диагностики

Созданы скрипты для упрощения работы:

- **scripts/diagnose-mongodb.sh** - Полная диагностика системы
- **scripts/fix-mongodb.sh** - Автоматическое исправление (требует sudo)
- **scripts/monitor-mongodb.sh** - Мониторинг с автоперезапуском

Документация: [scripts/mongodb-tools-README.md](./scripts/mongodb-tools-README.md)

## Дополнительные ресурсы

- [MongoDB Production Notes](https://docs.mongodb.com/manual/administration/production-notes/)
- [MongoDB Memory Usage](https://docs.mongodb.com/manual/faq/diagnostics/#memory-diagnostics)
- [Troubleshooting MongoDB](https://docs.mongodb.com/manual/reference/ulimit/)
