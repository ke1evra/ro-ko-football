# 📊 Скрипты подсчёта статистики прогнозов

Набор скриптов для автоматического и ручного подсчёта результатов прогнозов.

> **⚡ Быстрый старт:**
>
> ```bash
> # Все скрипты запускаются с loader для TypeScript
> node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs
> ```
>
> Подробнее см. раздел "Список скриптов" ниже.

---

## 📋 Список скриптов

### 1. `calculate-all.mjs` - Массовый подсчёт

Рассчитывает статистику для всех прогнозов, у которых её ещё нет.

**Использование:**

```bash
# Обычный режим (пропускает существующую статистику)
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs

# Force режим (пересчитывает всё)
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs --force
```

**Когда использовать:**

- Первый запуск после внедрения системы
- Регулярный подсчёт новых прогнозов (cron)
- После импорта результатов матчей

---

### 2. `calculate-by-match.mjs` - По матчу

Рассчитывает статистику для всех прогнозов на конкретный матч.

**Использование:**

```bash
# По fixtureId
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-match.mjs 1825546

# С пересчётом существующей статистики
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-match.mjs 1825546 --force
```

**Когда использовать:**

- После завершения конкретного матча
- Webhook от API с результатами матча
- Проверка прогнозов на популярный матч

---

### 3. `calculate-by-user.mjs` - По пользователю

Рассчитывает статистику для всех прогнозов конкретного пользователя.

**Использование:**

```bash
# По userId
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-user.mjs 67890abcdef

# С пересчётом
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-user.mjs 67890abcdef --force
```

**Когда использовать:**

- Обновление профиля пользователя
- Запрос пользователя на пересчёт
- Проверка статистики конкретного каппера

---

### 4. `calculate-by-post.mjs` - По прогнозу

Рассчитывает статистику для одного конкретного прогноза с детальным выводом.

**Использование:**

```bash
# По postId
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-post.mjs 67890abcdef

# С пересчётом
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-post.mjs 67890abcdef --force
```

**Вывод:**

```
✅ СТАТИСТИКА РАССЧИТАНА
==================================================
Всего исходов: 3
Выиграло: 2
Проиграло: 1
Не определено: 0
Hit Rate: 66.7%
ROI: -100.0%
Очки: 2
==================================================

Детали:
  1. ✅ ТБ 2.5 @ 1.85
     Факт: 3, Ожидание: 2.5
  2. ✅ П1 @ 2.10
     Факт: 1, Ожидание: 1
  3. ❌ ОЗ @ 1.75
     Факт: 0, Ожидание: 1
```

**Когда использовать:**

- Отладка логики подсчёта
- Проверка конкретного прогноза
- Демонстрация работы системы

---

### 5. `recalculate-all.mjs` - Полный пересчёт

Пересчитывает ВСЮ существующую статистику (с подтверждением).

**Использование:**

```bash
# С подтверждением
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/recalculate-all.mjs

# Без подтверждения
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/recalculate-all.mjs --confirm
```

**Когда использовать:**

- После изменения логики подсчёта
- После исправления данных матчей
- После обновления условий в OutcomeGroups
- Миграция данных

⚠️ **ВНИМАНИЕ:** Это действие может занять продолжительное время!

---

## 🔧 Подготовка к запуску

### 1. Проверить подключение к БД

Убедитесь что в `.env` настроены:

```env
DATABASE_URI=mongodb://...
PAYLOAD_SECRET=...
```

### 2. Установить зависимости

```bash
npm install
# или
yarn install
```

Скрипты используют `@esbuild-kit/esm-loader` для загрузки TypeScript файлов на лету, поэтому сборка не требуется.

---

## ⏰ Автоматизация (Cron)

### Вариант 1: Системный cron

```bash
# Редактировать crontab
crontab -e

# Добавить задачу (каждый час)
0 * * * * cd /path/to/project && node scripts/prediction-stats/calculate-all.mjs >> /var/log/prediction-stats.log 2>&1
```

### Вариант 2: PM2

```bash
# Создать ecosystem файл
# ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'prediction-stats-cron',
      script: 'scripts/prediction-stats/calculate-all.mjs',
      cron_restart: '0 * * * *', // Каждый час
      autorestart: false,
      watch: false,
    }
  ]
}

# Запустить
pm2 start ecosystem.config.cjs
```

### Вариант 3: Node-cron в приложении

```typescript
// workers/prediction-stats-worker.js
import cron from 'node-cron'
import { exec } from 'child_process'

// Каждый час
cron.schedule('0 * * * *', () => {
  console.log('Running prediction stats calculation...')
  exec('node scripts/prediction-stats/calculate-all.mjs', (error, stdout, stderr) => {
    if (error) {
      console.error('Error:', error)
      return
    }
    console.log(stdout)
  })
})
```

---

## 🔍 Мониторинг и логирование

### Логи в файл

```bash
# Перенаправить вывод в файл
node scripts/prediction-stats/calculate-all.mjs > logs/stats-$(date +%Y%m%d-%H%M%S).log 2>&1
```

### Уведомления

```bash
# Отправить результат на email (Linux)
node scripts/prediction-stats/calculate-all.mjs | mail -s "Prediction Stats Report" admin@example.com

# Отправить в Telegram
node scripts/prediction-stats/calculate-all.mjs && curl -X POST \
  "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>&text=Stats calculated successfully"
```

---

## 🧪 Тестирование

### Тест на одном прогнозе

```bash
# Найти ID любого прогноза
node scripts/prediction-stats/calculate-by-post.mjs <postId>
```

### Тест на завершённом матче

```bash
# Найти fixtureId завершённого матча
node scripts/prediction-stats/calculate-by-match.mjs <fixtureId>
```

### Проверка логики

```bash
# Запустить с детальным выводом
DEBUG=* node scripts/prediction-stats/calculate-by-post.mjs <postId>
```

---

## 📊 Примеры использования

### Сценарий 1: Ежедневный подсчёт

```bash
#!/bin/bash
# daily-stats.sh

echo "=== Daily Prediction Stats Calculation ==="
echo "Started at: $(date)"

# Подсчитать новые
node scripts/prediction-stats/calculate-all.mjs

echo "Completed at: $(date)"
```

### Сценарий 2: После импорта матчей

```bash
#!/bin/bash
# after-matches-import.sh

# Импортировать матчи
node scripts/import-matches-forward.mjs

# Подсчитать статистику
node scripts/prediction-stats/calculate-all.mjs
```

### Сценарий 3: Webhook от API

```typescript
// API endpoint: /api/webhooks/match-finished
export async function POST(req: Request) {
  const { fixtureId } = await req.json()

  // Запустить подсчёт для этого матча
  exec(`node scripts/prediction-stats/calculate-by-match.mjs ${fixtureId}`)

  return Response.json({ success: true })
}
```

---

## ❓ FAQ

### Q: Что делать если скрипт падает с ошибкой?

A: Проверьте:

1. Подключение к БД (DATABASE_URI, PAYLOAD_SECRET в .env)
2. Наличие данных в коллекциях
3. Логи ошибок в консоли
4. Используется ли правильный loader: `node --loader @esbuild-kit/esm-loader`

### Q: Можно ли запускать несколько скриптов одновременно?

A: Да, но будьте осторожны с `recalculate-all.mjs` - он может создать большую нагрузку на БД.

### Q: Как часто запускать автоматический подсчёт?

A: Рекомендуется каждый час или после импорта результатов матч��й.

### Q: Что делать если изменилась логика подсчёта?

A: Запустите `recalculate-all.mjs` для пересчёта всей статистики.

### Q: Как проверить работу на тестовых данных?

A: Используйте `calculate-by-post.mjs` с конкретным прогнозом.

---

## 🔐 Безопасность

- ✅ Скрипты требуют доступ к БД (только для админов)
- ✅ Не удаляют данные, только создают/обновляют
- ✅ Логируют все операции
- ✅ Обрабатывают ошибки без падения

---

## 📝 TODO

- [ ] Добавить прогресс-бар для длительных операций
- [ ] Реализовать параллельную обработку (worker threads)
- [ ] Добавить dry-run режим
- [ ] Создать веб-интерфейс для запуска
- [ ] Интеграция с системой уведомлений
- [ ] Метрики производительности
