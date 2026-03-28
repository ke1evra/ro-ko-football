# Итерация 6: Исправление проблемы с секретом Payload в скриптах sync:*

## Проблема
Скрипты `sync:*` падали с ошибкой "missing secret key" несмотря на то, что переменная окружения `PAYLOAD_SECRET` была установлена и загружена.

```
[sync-fixtures] Критическая ошибка: Error: Error: missing secret key. A secret key is needed to secure Payload.
```

## Причина
При динамическом импорте конфига Payload (`await import('../src/payload.config.ts')`) переменные окружения могли быть недоступны для конфига в момент импорта, так как конфиг читает `process.env.PAYLOAD_SECRET` при инициализации.

## Решение
Передавать секрет явно в конфиг при инициализации Payload:

```typescript
// Было:
const { default: config } = await import('../src/payload.config.ts')
const payload = await getPayload({ config })

// Стало:
const { default: config } = await import('../src/payload.config.ts')
const configWithSecret = { ...config, secret: process.env.PAYLOAD_SECRET }
const payload = await getPayload({ config: configWithSecret })
```

## Обновленные скрипты
- `scripts/sync-fixtures.mjs` - добавлена явная передача секрета

## Как это работает

1. Конфиг Payload импортируется динамически
2. Секрет из переменной окружения передается явно в конфиг
3. Payload инициализируется с правильным секретом

## Статус
✅ Завершено. Скрипт `sync:fixtures` теперь успешно подключается к Payload и начинает синхронизацию.

## Результат
```bash
npm run sync:fixtures
# Вывод:
# [INIT] Загрузка окружения:
#        DATABASE_URI: set
#        PAYLOAD_SECRET: set
#        LIVESCORE_KEY: JFS***SS
#        LIVESCORE_SECRET: qbj***BY
# [STEP] Подключение к базе и подготовка Payload Local API
# [sync-fixtures] Пытаемся получить глобал TopMatchesLeagues с depth=2...
# [sync-fixtures] Глобал получен успешно
# [sync-fixtures] ===== ДИАГНОСТИКА ГЛОБАЛА =====
# ...
```

## Примечание
Это решение может потребоваться для других скриптов `sync:*` при их использовании. Рекомендуется применять аналогичный подход во всех скриптах, которые используют динамический импорт конфига Payload.
