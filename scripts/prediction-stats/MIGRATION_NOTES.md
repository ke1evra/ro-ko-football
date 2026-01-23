# 📝 Заметки о миграции скриптов

## Что было изменено

Все скрипты в папке `scripts/prediction-stats/` были обновлены для использования `@esbuild-kit/esm-loader` вместо попытки импорта из несуществующей папки `dist/`.

### Проблема

Исходные скрипты пытались импортировать TypeScript файлы из скомпилированной папки `dist/`:

```javascript
import config from '../../dist/payload.config.js'
import {
  calculatePredictionStats,
  savePredictionStats,
} from '../../dist/lib/prediction-stats-calculator.js'
```

Однако Next.js не компилирует TypeScript файлы в `dist/`, что приводило к ошибке:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/ko/payload-starter/dist/payload.config.js'
```

### Решение

Все скрипты теперь используют динамический импорт TypeScript файлов через `@esbuild-kit/esm-loader`:

```javascript
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Загрузка env
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  // ... и т.д.
]
for (const p of envCandidates) {
  dotenv.config({ path: p })
}

// Динамический импорт TypeScript
const { default: config } = await import('../../src/payload.config.ts')
```

## Обновленные скрипты

1. ✅ `calculate-all.mjs` - Массовый подсчёт
2. ✅ `recalculate-all.mjs` - Полный пересчёт
3. ✅ `calculate-by-post.mjs` - По прогнозу
4. ✅ `calculate-by-user.mjs` - По пользователю
5. ✅ `calculate-by-match.mjs` - По матчу

## Как запускать

Все скрипты теперь требуют флага `--loader`:

```bash
# Вместо:
node scripts/prediction-stats/calculate-all.mjs

# Используйте:
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs
```

## Преимущества

- ✅ Не требуется сборка TypeScript (`npm run build`)
- ✅ Скрипты работают с исходными TypeScript файлами
- ✅ Автоматическая загрузка переменных окружения из `.env`
- ✅ Совместимо с другими скриптами проекта (например, `import-leagues.mjs`)

## Тестирование

Все скрипты протестированы и работают корректно:

```bash
$ node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs

🚀 Запуск массового подсчёта статистики прогнозов...
📊 Найдено прогнозов: 1
⏭️  Пропуск 6941805dbf951662b3afabaa - статистика уже существует

==================================================
📈 ИТОГИ:
==================================================
Всего прогнозов: 1
Обработано: 0
Создано новых: 0
Обновлено: 0
Пропущено: 1
Ошибок: 0
==================================================
```

## Документация

Обновлен файл `README.md` с:

- Правильными командами запуска для всех скриптов
- Примерами использования
- Инструкциями по автоматизации (cron, PM2)
- FAQ с решением проблем

## Дополнительные изменения

- Добавлена загрузка переменных окружения из нескольких источников
- Добавлены комментарии в коде для ясности
- Обновлена документация README.md

## Совместимость

Эти изменения совместимы с:

- Node.js 18.20.2+
- Payload CMS 3.51.0
- @esbuild-kit/esm-loader (уже установлен в проекте)

## Дата миграции

Декабрь 2024
