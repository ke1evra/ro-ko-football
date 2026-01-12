#!/bin/bash

# Экстренная проверка MongoDB после падения
# Использование: bash scripts/emergency-mongodb-check.sh

echo "=========================================="
echo "🚨 Экстренная диагностика MongoDB"
echo "=========================================="
echo ""

# 1. Проверка OOM killer
echo "1️⃣  Проверка OOM killer (последние убийства процессов):"
echo "---"
dmesg | grep -i "killed process" | grep -i mongo | tail -10
if [ $? -ne 0 ]; then
    echo "✅ Нет записей об убийстве MongoDB через OOM killer"
else
    echo "🔴 НАЙДЕНЫ записи об убийстве MongoDB!"
fi
echo ""

# 2. Проверка памяти
echo "2️⃣  Текущее состояние памяти:"
echo "---"
free -h
echo ""

# 3. Проверка swap
echo "3️⃣  Swap:"
echo "---"
swapon --show
if [ $? -ne 0 ]; then
    echo "🔴 SWAP НЕ НАСТРОЕН!"
fi
echo ""

# 4. Проверка конфигурации MongoDB
echo "4️⃣  Конфигурация MongoDB (cacheSizeGB):"
echo "---"
if grep -q "cacheSizeGB" /etc/mongod.conf 2>/dev/null; then
    grep -A 5 "wiredTiger" /etc/mongod.conf
    echo "✅ cacheSizeGB настроен"
else
    echo "🔴 cacheSizeGB НЕ НАСТРОЕН!"
fi
echo ""

# 5. Проверка размера базы данных
echo "5️⃣  Размер данных MongoDB:"
echo "---"
du -sh /var/lib/mongodb/* 2>/dev/null | head -10
echo ""
echo "Общий размер:"
du -sh /var/lib/mongodb 2>/dev/null
echo ""

# 6. Проверка логов на assertion failures
echo "6️⃣  Поиск assertion failures в логах:"
echo "---"
grep -i "assertion\|invariant\|fatal assertion" /var/log/mongodb/mongod.log 2>/dev/null | tail -5
if [ $? -ne 0 ]; then
    echo "✅ Assertion failures не найдены"
fi
echo ""

# 7. Проверка коррупции данных
echo "7️⃣  Проверка на кор��упцию данных:"
echo "---"
grep -i "corrupt\|damaged\|invalid" /var/log/mongodb/mongod.log 2>/dev/null | tail -5
if [ $? -ne 0 ]; then
    echo "✅ Признаков коррупции не найдено"
fi
echo ""

# 8. Последние ошибки перед падением
echo "8️⃣  Последние ошибки п��ред падением:"
echo "---"
journalctl -u mongod --since "2 days ago" | grep -i "error\|fatal\|abort" | tail -10
echo ""

# 9. Статистика падений
echo "9️⃣  Статистика падений MongoDB:"
echo "---"
journalctl -u mongod --no-pager | grep "core-dump" | wc -l
echo "падений найдено"
echo ""
echo "Даты падений:"
journalctl -u mongod --no-pager | grep "core-dump" | awk '{print $1, $2, $3}'
echo ""

# 10. Рекомендации
echo "=========================================="
echo "📋 РЕКОМЕНДАЦИИ:"
echo "=========================================="

# Проверка OOM
if dmesg | grep -i "killed process" | grep -i mongo >/dev/null 2>&1; then
    echo "🔴 КРИТИЧНО: MongoDB убивается OOM killer!"
    echo "   Решение: sudo bash scripts/fix-mongodb.sh"
    echo ""
fi

# Проверка swap
if ! swapon --show >/dev/null 2>&1; then
    echo "🔴 КРИТИЧНО: Swap не настроен!"
    echo "   Решение: sudo bash scripts/fix-mongodb.sh"
    echo ""
fi

# Проверка cacheSizeGB
if ! grep -q "cacheSizeGB" /etc/mongod.conf 2>/dev/null; then
    echo "🔴 КРИТИЧНО: cacheSizeGB не настроен!"
    echo "   Решение: sudo bash scripts/fix-mongodb.sh"
    echo ""
fi

# Проверка размера БД
DB_SIZE=$(du -sm /var/lib/mongodb 2>/dev/null | awk '{print $1}')
if [ -n "$DB_SIZE" ] && [ "$DB_SIZE" -gt 10000 ]; then
    echo "⚠️  База данных большая (${DB_SIZE}MB)"
    echo "   Рекомендуется: очистить старые данные"
    echo ""
fi

echo "=========================================="
echo "✅ Диагностика завершена"
echo "=========================================="
echo ""
echo "Для исправления запустите:"
echo "sudo bash scripts/fix-mongodb.sh"
