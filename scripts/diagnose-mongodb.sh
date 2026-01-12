#!/bin/bash

# Скрипт диагностики проблем с MongoDB
# Использование: bash scripts/diagnose-mongodb.sh

echo "=========================================="
echo "🔍 Диагностика MongoDB"
echo "=========================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Проверка статуса MongoDB
echo "1️⃣  Статус MongoDB:"
echo "---"
systemctl status mongod --no-pager | head -20
echo ""

# 2. Проверка памяти
echo "2️⃣  Использование памяти:"
echo "---"
free -h
echo ""
echo "Процессы по использованию памяти:"
ps aux --sort=-%mem | head -10
echo ""

# 3. Проверка диска
echo "3️⃣  Использование диска:"
echo "---"
df -h | grep -E "Filesystem|/dev/"
echo ""
echo "Размер данных MongoDB:"
du -sh /var/lib/mongodb/* 2>/dev/null || echo "Нет доступа к /var/lib/mongodb"
echo ""

# 4. Проверка swap
echo "4️⃣  Swap:"
echo "---"
swapon --show
if [ $? -ne 0 ]; then
    echo -e "${RED}⚠️  Swap не настроен!${NC}"
else
    echo -e "${GREEN}✅ Swap настроен${NC}"
fi
echo ""

# 5. Проверка OOM killer
echo "5️⃣  Проверка OOM killer (последние убитые процессы):"
echo "---"
dmesg | grep -i "killed process" | tail -5
if [ $? -ne 0 ]; then
    echo -e "${GREEN}✅ Нет записей об убитых процессах${NC}"
fi
echo ""

# 6. Последние ошибки MongoDB
echo "6️⃣  Последние ошибки MongoDB:"
echo "---"
journalctl -u mongod -n 50 --no-pager | grep -i "error\|fatal\|abort\|signal" | tail -10
echo ""

# 7. Логи MongoDB
echo "7️⃣  Последние записи в логе MongoDB:"
echo "---"
tail -n 20 /var/log/mongodb/mongod.log 2>/dev/null || echo "Нет доступа к /var/log/mongodb/mongod.log"
echo ""

# 8. Конфигурация MongoDB
echo "8️⃣  Конфигурация MongoDB (cacheSizeGB):"
echo "---"
grep -A 5 "wiredTiger" /etc/mongod.conf 2>/dev/null || echo "Не найдено настроек wiredTiger"
echo ""

# 9. Версия MongoDB
echo "9️⃣  Версия MongoDB:"
echo "---"
mongod --version 2>/dev/null | head -1 || echo "Не удалось получить версию"
echo ""

# 10. Подключения (если MongoDB запущен)
echo "🔟 Подключения к MongoDB:"
echo "---"
if systemctl is-active --quiet mongod; then
    mongosh --quiet --eval "db.serverStatus().connections" 2>/dev/null || echo "Не удалось подключиться к MongoDB"
else
    echo -e "${RED}⚠️  MongoDB не запущен${NC}"
fi
echo ""

# Рекомендации
echo "=========================================="
echo "📋 Рекомендации:"
echo "=========================================="

# Проверка памяти
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 2048 ]; then
    echo -e "${YELLOW}⚠️  Мало памяти (${TOTAL_MEM}MB). Рекомендуется минимум 2GB${NC}"
    echo "   Решение: добавить swap или увеличить RAM"
fi

# Проверка swap
if ! swapon --show &>/dev/null; then
    echo -e "${YELLOW}⚠️  Swap не настроен${NC}"
    echo "   Решение: sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
fi

# Проверка cacheSizeGB
if ! grep -q "cacheSizeGB" /etc/mongod.conf 2>/dev/null; then
    echo -e "${YELLOW}⚠️  cacheSizeGB не настроен в /etc/mongod.conf${NC}"
    echo "   Решение: добавить в /etc/mongod.conf:"
    echo "   storage:"
    echo "     wiredTiger:"
    echo "       engineConfig:"
    echo "         cacheSizeGB: 0.5"
fi

# Проверка автоперезапуска
RESTART_POLICY=$(systemctl show mongod -p Restart --value)
if [ "$RESTART_POLICY" != "always" ]; then
    echo -e "${YELLOW}⚠️  Автоперезапуск не настроен${NC}"
    echo "   Решение: sudo systemctl edit mongod"
    echo "   Добавить: [Service]"
    echo "            Restart=always"
    echo "            RestartSec=10"
fi

echo ""
echo "=========================================="
echo "✅ Диагностика завершена"
echo "=========================================="
echo ""
echo "Для подробной информации см. MONGODB_CRASH_FIX.md"
