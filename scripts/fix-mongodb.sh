#!/bin/bash

# Скрипт автоматического исправления проблем с MongoDB
# Использование: sudo bash scripts/fix-mongodb.sh

echo "=========================================="
echo "🔧 Автоматическое исправление MongoDB"
echo "=========================================="
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с правами root: sudo bash scripts/fix-mongodb.sh"
    exit 1
fi

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Остановить MongoDB
echo "1️⃣  Остановка MongoDB..."
systemctl stop mongod
sleep 2
echo -e "${GREEN}✅ MongoDB остановлен${NC}"
echo ""

# 2. Создать backup конфигурации
echo "2️⃣  Создание backup конфигурации..."
cp /etc/mongod.conf /etc/mongod.conf.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✅ Backup создан${NC}"
echo ""

# 3. Настроить ограничение памяти
echo "3️⃣  Настройка ограничения памяти (cacheSizeGB: 0.5)..."

# Проверить, есть ли уже настройка
if grep -q "cacheSizeGB" /etc/mongod.conf; then
    echo "   cacheSizeGB уже настроен, пропускаем..."
else
    # Добавить настройку после секции storage
    sed -i '/^storage:/a\  wiredTiger:\n    engineConfig:\n      cacheSizeGB: 0.5' /etc/mongod.conf
    echo -e "${GREEN}✅ cacheSizeGB настроен${NC}"
fi
echo ""

# 4. Ограничить количество подключений
echo "4️⃣  Ограничение количества подключений (maxIncomingConnections: 100)..."

if grep -q "maxIncomingConnections" /etc/mongod.conf; then
    echo "   maxIncomingConnections уже настроен, пропускаем..."
else
    # Добавить в секцию net
    sed -i '/^net:/a\  maxIncomingConnections: 100' /etc/mongod.conf
    echo -e "${GREEN}✅ maxIncomingConnections настроен${NC}"
fi
echo ""

# 5. Настроить swap (если отсутствует)
echo "5️⃣  Проверка и настройка swap..."

if swapon --show | grep -q "/swapfile"; then
    echo "   Swap уже настроен, пропускаем..."
else
    echo "   Создание swap файла 2GB..."
    
    # Создать swap файл
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Добавить в fstab если ещё нет
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    
    echo -e "${GREEN}✅ Swap настроен (2GB)${NC}"
fi
echo ""

# 6. Настроить автоперезапуск
echo "6️⃣  Настройка автоперезапуска..."

mkdir -p /etc/systemd/system/mongod.service.d/
cat > /etc/systemd/system/mongod.service.d/restart.conf <<EOF
[Service]
Restart=always
RestartSec=10
StartLimitInterval=0
EOF

systemctl daemon-reload
echo -e "${GREEN}✅ Автоперезапуск настроен${NC}"
echo ""

# 7. Очистить старые логи
echo "7️⃣  Очистка старых логов..."

if [ -f /var/log/mongodb/mongod.log ]; then
    LOG_SIZE=$(du -h /var/log/mongodb/mongod.log | cut -f1)
    echo "   Текущий размер лога: $LOG_SIZE"
    
    # Создать backup лога
    cp /var/log/mongodb/mongod.log /var/log/mongodb/mongod.log.backup.$(date +%Y%m%d_%H%M%S)
    
    # Очистить лог
    truncate -s 0 /var/log/mongodb/mongod.log
    echo -e "${GREEN}✅ Логи очищены (backup создан)${NC}"
else
    echo "   Лог файл не найден, пропускаем..."
fi
echo ""

# 8. Проверить права доступа
echo "8️⃣  Проверка прав доступа..."

chown -R mongodb:mongodb /var/lib/mongodb
chown -R mongodb:mongodb /var/log/mongodb
echo -e "${GREEN}✅ Права доступа проверены${NC}"
echo ""

# 9. Запустить MongoDB
echo "9️⃣  Запуск MongoDB..."

systemctl start mongod
sleep 3

if systemctl is-active --quiet mongod; then
    echo -e "${GREEN}✅ MongoDB успешно запущен${NC}"
else
    echo "❌ Не удалось запустить MongoDB"
    echo "Проверьте логи: journalctl -u mongod -n 50"
    exit 1
fi
echo ""

# 10. Проверить статус
echo "🔟 Проверка статуса..."
systemctl status mongod --no-pager | head -15
echo ""

# 11. Создать индексы для оптимизации
echo "1️⃣1️⃣  Создание индексов для оптимизации..."

mongosh payload --quiet --eval "
try {
  db.matches.createIndex({fixtureId: 1}, {background: true});
  db.matches.createIndex({status: 1, date: -1}, {background: true});
  db.predictionStats.createIndex({matchId: 1}, {background: true});
  db.predictionStats.createIndex({userId: 1}, {background: true});
  print('✅ Индексы созданы');
} catch(e) {
  print('⚠️  Ошибка создания индексов: ' + e);
}
" 2>/dev/null || echo "⚠️  Не удалось создать индексы (возможно, база недоступна)"

echo ""

# Итоговая информация
echo "=========================================="
echo "📊 Итоговая информация:"
echo "=========================================="
echo ""

echo "Память:"
free -h | grep -E "Mem|Swap"
echo ""

echo "Диск:"
df -h | grep -E "Filesystem|/dev/" | head -2
echo ""

echo "MongoDB статус:"
systemctl is-active mongod && echo "✅ Запущен" || echo "❌ Не запущен"
echo ""

echo "Подключения:"
mongosh --quiet --eval "db.serverStatus().connections" 2>/dev/null || echo "Не удалось получить информацию"
echo ""

echo "=========================================="
echo "✅ Исправление завершено!"
echo "=========================================="
echo ""
echo "Рекомендации:"
echo "1. Мониторьте логи: journalctl -u mongod -f"
echo "2. Проверяйте память: free -h"
echo "3. Настройте мониторинг (см. MONGODB_CRASH_FIX.md)"
echo ""
echo "Backup файлы:"
echo "- /etc/mongod.conf.backup.*"
echo "- /var/log/mongodb/mongod.log.backup.*"
