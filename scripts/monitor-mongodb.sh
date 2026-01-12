#!/bin/bash

# Скрипт мониторинга MongoDB
# Добавить в crontab: */5 * * * * /root/ro-ko-football/scripts/monitor-mongodb.sh >> /var/log/mongodb-monitor.log 2>&1

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/log/mongodb-monitor.log"

# Функция логирования
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# 1. Проверить статус MongoDB
if ! systemctl is-active --quiet mongod; then
    log "🔴 CRITICAL: MongoDB не запущен! Попытка перезапуска..."
    
    systemctl start mongod
    sleep 5
    
    if systemctl is-active --quiet mongod; then
        log "✅ MongoDB успешно перезапущен"
        
        # Отправить уведомление (опционально)
        # curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
        #   -d "chat_id=<CHAT_ID>" \
        #   -d "text=🔴 MongoDB был перезапущен на сервере $(hostname)"
    else
        log "❌ CRITICAL: Не удалось перезапустить MongoDB!"
        
        # Собрать диагностическую информацию
        log "Последние ошибки:"
        journalctl -u mongod -n 20 --no-pager >> "$LOG_FILE"
    fi
else
    log "✅ MongoDB работает"
fi

# 2. Проверить использование памяти MongoDB
MEM_USAGE=$(ps aux | grep mongod | grep -v grep | awk '{print $4}' | head -1)

if [ -n "$MEM_USAGE" ]; then
    MEM_USAGE_INT=$(echo "$MEM_USAGE" | cut -d. -f1)
    
    if [ "$MEM_USAGE_INT" -gt 80 ]; then
        log "⚠️  WARNING: Высокое использование памяти MongoDB: ${MEM_USAGE}%"
    else
        log "✅ Использование памяти MongoDB: ${MEM_USAGE}%"
    fi
fi

# 3. Проверить использование памяти системы
TOTAL_MEM=$(free | grep Mem | awk '{print $2}')
USED_MEM=$(free | grep Mem | awk '{print $3}')
MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))

if [ "$MEM_PERCENT" -gt 90 ]; then
    log "⚠️  WARNING: Высокое использование памяти системы: ${MEM_PERCENT}%"
    
    # Показать топ процессов по памяти
    log "Топ процессов по памяти:"
    ps aux --sort=-%mem | head -6 >> "$LOG_FILE"
elif [ "$MEM_PERCENT" -gt 80 ]; then
    log "⚠️  Использование памяти системы: ${MEM_PERCENT}%"
else
    log "✅ Использование памяти системы: ${MEM_PERCENT}%"
fi

# 4. Проверить использование диска
DISK_USAGE=$(df -h /var/lib/mongodb | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -gt 90 ]; then
    log "🔴 CRITICAL: Критически мало места на диске: ${DISK_USAGE}%"
    
    # Показать размер данных MongoDB
    log "Размер данных MongoDB:"
    du -sh /var/lib/mongodb/* 2>/dev/null >> "$LOG_FILE"
elif [ "$DISK_USAGE" -gt 80 ]; then
    log "⚠️  WARNING: Мало места на диске: ${DISK_USAGE}%"
else
    log "✅ Использование диска: ${DISK_USAGE}%"
fi

# 5. Проверить количество подключений
if systemctl is-active --quiet mongod; then
    CONNECTIONS=$(mongosh --quiet --eval "db.serverStatus().connections.current" 2>/dev/null)
    
    if [ -n "$CONNECTIONS" ]; then
        if [ "$CONNECTIONS" -gt 80 ]; then
            log "⚠️  WARNING: Много подключений к MongoDB: $CONNECTIONS"
        else
            log "✅ Подключений к MongoDB: $CONNECTIONS"
        fi
    fi
fi

# 6. Проверить наличие ошибок в логах
ERROR_COUNT=$(journalctl -u mongod --since "5 minutes ago" | grep -i "error\|fatal\|abort" | wc -l)

if [ "$ERROR_COUNT" -gt 0 ]; then
    log "⚠️  WARNING: Обнаружено $ERROR_COUNT ошибок в логах за последние 5 минут"
    
    # Показать последние ошибки
    log "Последние ошибки:"
    journalctl -u mongod --since "5 minutes ago" | grep -i "error\|fatal\|abort" | tail -5 >> "$LOG_FILE"
fi

# 7. Проверить swap
SWAP_TOTAL=$(free -m | grep Swap | awk '{print $2}')
SWAP_USED=$(free -m | grep Swap | awk '{print $3}')

if [ "$SWAP_TOTAL" -eq 0 ]; then
    log "⚠️  WARNING: Swap не настроен"
elif [ "$SWAP_USED" -gt 0 ]; then
    SWAP_PERCENT=$((SWAP_USED * 100 / SWAP_TOTAL))
    
    if [ "$SWAP_PERCENT" -gt 50 ]; then
        log "⚠️  WARNING: Высокое использование swap: ${SWAP_PERCENT}% (${SWAP_USED}MB из ${SWAP_TOTAL}MB)"
    else
        log "✅ Использование swap: ${SWAP_PERCENT}% (${SWAP_USED}MB из ${SWAP_TOTAL}MB)"
    fi
else
    log "✅ Swap настроен (${SWAP_TOTAL}MB), не используется"
fi

# 8. Проверить размер лога MongoDB
if [ -f /var/log/mongodb/mongod.log ]; then
    LOG_SIZE=$(du -m /var/log/mongodb/mongod.log | cut -f1)
    
    if [ "$LOG_SIZE" -gt 1000 ]; then
        log "⚠️  WARNING: Большой размер лога MongoDB: ${LOG_SIZE}MB"
        log "Рекомендуется ротация логов"
    fi
fi

# Разделитель для читаемости
echo "----------------------------------------" >> "$LOG_FILE"

# Очистка старых логов (оставить последние 1000 строк)
if [ -f "$LOG_FILE" ]; then
    LOG_LINES=$(wc -l < "$LOG_FILE")
    
    if [ "$LOG_LINES" -gt 10000 ]; then
        tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
        mv "${LOG_FILE}.tmp" "$LOG_FILE"
    fi
fi
