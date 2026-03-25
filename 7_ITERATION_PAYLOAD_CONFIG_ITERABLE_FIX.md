# Итерация 7: Исправление проблемы с итерацией коллекций в Payload

## Проблема
Скрипт `sync-fixtures` падал с ошибкой:
```
TypeError: this.config.collections is not iterable
at BasePayload.init (/Users/ko/payload-starter/node_modules/.pnpm/payload@3.70.0_graphql@16.11.0_typescript@5.7.3/node_modules/payload/src/index.ts:787:42)
```

## Причина
При передаче секрета в конфиг Payload через spread-оператор (`{ ...config, secret: process.env.PAYLOAD_SECRET }`) происходила потеря структуры конфига, что приводило к тому, что `collections` становился неитерируемым.

## Решение
Исправить передачу конфига в `getPayload`:

```typescript
// Было (неправильно):
const configWithSecret = { ...config, secret: process.env.PAYLOAD_SECRET }
const payload = await getPayload({ config: configWithSecret })

// Стало (правильно):
const payload = await getPayload({
  config: {
    ...config,
    secret: process.env.PAYLOAD_SECRET
  }
})
```

## Статус
✅ Завершено. Скрипт `sync:fixtures` теперь работает корректно.

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
# ...
```

## Примечание
Проблема была в том, что при spread-операторе терялась ссылка на оригинальный объект конфига, что приводило к потере итерируемости коллекций. Правильный подход - передавать конфиг как объект с явным spread-оператором внутри вызова `getPayload`.
