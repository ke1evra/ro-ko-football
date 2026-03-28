# 📊 Скрипты подсчёта статистики прогнозов

## 🚀 Быстрый старт

```bash
# Рассчитать статистику для всех новых прогнозов
pnpm predictions:stats:calc

# Пересчитать всю статистику (с перезаписью)
pnpm predictions:stats:calc:force
```

---

## 📋 Доступные команды

### 1. Массовый подсчёт

```bash
# Рассчитать статистику для прогнозов без статистики
pnpm predictions:stats:calc

# Пересчитать всю статистику (игнорирует существующую)
pnpm predictions:stats:calc:force
```

**Когда использовать:**

- Первый запуск после внедрения системы
- Регулярный подсчёт новых прогнозов (cron)
- После импорта результатов матчей

---

### 2. Полный пересчёт

```bash
# Удалить всю статистику и пересчитать заново
pnpm predictions:stats:recalc
```

**⚠️ Внимание:** Удаляет ВСЮ существующую статистику!

**Когда использовать:**

- После изменения логики подсчёта
- При обнаружении ошибок в статистике
- Для полной синхронизации данных

---

### 3. По конкретному матчу

```bash
# Рассчитать статистику для всех прогнозов на матч
pnpm predictions:stats:by-match 1825546

# С пересчётом существующей статистики
pnpm predictions:stats:by-match 1825546 --force
```

**Параметры:**

- `fixtureId` - ID матча из API

**Когда использовать:**

- После завершения конкретного матча
- Webhook от API с результатами матча
- Проверка прогнозов на популярный матч

---

### 4. По пользователю

```bash
# Рассчитать статистику для всех прогнозов пользователя
pnpm predictions:stats:by-user 67890abcdef

# С пересчётом
pnpm predictions:stats:by-user 67890abcdef --force
```

**Параметры:**

- `userId` - ID пользователя из БД

**Когда использовать:**

- Обновление профиля пользователя
- Запрос пользователя на пересчёт
- Проверка статистики конкретного каппера

---

### 5. По конкретному прогнозу

```bash
# Рассчитать статистику для одного прогноза (с детальным выводом)
pnpm predictions:stats:by-post 6941805dbf951662b3afabaa

# С пересчётом
pnpm predictions:stats:by-post 6941805dbf951662b3afabaa --force
```

**Параметры:**

- `postId` - ID поста-прогноза из БД

**Когда использо��ать:**

- Отладка конкретного прогноза
- Проверка правильности подсчёта
- Демонстрация работы системы

---

## 🔄 Автоматизация

### Cron (Linux/Mac)

```bash
# Каждый час
0 * * * * cd /path/to/project && pnpm predictions:stats:calc

# Каждые 15 минут
*/15 * * * * cd /path/to/project && pnpm predictions:stats:calc

# Каждый день в 3:00
0 3 * * * cd /path/to/project && pnpm predictions:stats:calc
```

### PM2

```bash
# Создать файл ecosystem.config.cjs
pm2 start ecosystem.config.cjs

# Или напрямую
pm2 start "pnpm predictions:stats:calc" --name "prediction-stats" --cron "0 * * * *"
```

---

## 📊 Примеры использования

### Первый запуск

```bash
# 1. Убедитесь что есть прогнозы и завершённые матчи
# 2. Запустите массовый подсчёт
pnpm predictions:stats:calc

# 3. Проверьте результаты в админке или через API
curl http://localhost:3100/api/predictions/stats/USER_ID
```

### Регулярное обновление

```bash
# Добавьте в crontab
crontab -e

# Добавьте строку (каждый час)
0 * * * * cd /Users/ko/payload-starter && pnpm predictions:stats:calc >> /tmp/prediction-stats.log 2>&1
```

### Отладка

```bash
# Проверить конкретный прогноз с детальным выводом
pnpm predictions:stats:by-post POST_ID

# Пересчитать статистику для пользователя
pnpm predictions:stats:by-user USER_ID --force

# Пересчитать всё заново
pnpm predictions:stats:recalc
```

---

## 🐛 Решение проблем

### Ошибка: "Cannot find module"

```bash
# Убедитесь что установлены зависимости
pnpm install
```

### Ошибка: "Database connection failed"

```bash
# Проверьте .env файл
cat .env | grep DATABASE_URI

# Проверьте подключение к MongoDB
mongosh $DATABASE_URI
```

### Статистика не рассчитывается

```bash
# Проверьте что есть завершённые матчи
# В MongoDB:
db.matches.find({ status: 'finished' }).count()

# Проверьте что есть прогнозы
db.posts.find({ postType: 'prediction' }).count()

# Запустите с force
pnpm predictions:stats:calc:force
```

---

## 📚 Дополнительная документация

- [Полная документация по системе подсчёта](./PREDICTION_STATS_CALCULATION.md)
- [README скриптов](../scripts/prediction-stats/README.md)
- [Исправленные ошибки](./PREDICTION_STATS_ERRORS_FIXED.md)

---

## ✅ Чек-лист

Перед запуском убедитесь:

- [ ] Установлены зависимости (`pnpm install`)
- [ ] Настроен `.env` файл (DATABASE_URI, PAYLOAD_SECRET)
- [ ] Есть прогнозы в БД (`postType: 'prediction'`)
- [ ] Есть завершённые матчи (`status: 'finished'`)
- [ ] Настроены группы исходов (OutcomeGroups)
- [ ] Настроены маркеты (Markets)

---

## 🎯 Рекомендации

1. **Запускайте регулярно** - добавьте в cron для автоматического подсчёта
2. **Мониторьте логи** - проверяйте вывод скриптов на ошибки
3. **Используйте force осторожно** - пересчёт может занять время
4. **Тестируйте на одном прогнозе** - используйте `by-post` для отладки
5. **Делайте бэкапы** - перед полным пересчётом (`recalc`)
