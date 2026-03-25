# Итерация 1: Исправление ошибки импорта next/server

## Проблема

Ошибка при запуске проекта:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/ko/payload-starter/node_modules/next/server'
imported from /Users/ko/payload-starter/src/lib/http/livescore/logged-fetch.ts

Did you mean to import "next/server.js"?
```

## Причина

В современных версиях Next.js (с поддержкой ES модулей) требуется явно указывать расширение `.js` при импорте из пакетов.

## Решение

Обновлены импорты в двух файлах:

### 1. `/src/lib/http/livescore/logged-fetch.ts`

```typescript
// Было:
import { NextRequest } from 'next/server'

// Стало:
import { NextRequest } from 'next/server.js'
```

### 2. `/src/lib/http/livescore/customFetch.ts`

```typescript
// Было:
import { NextRequest } from 'next/server'

// Стало:
import { NextRequest } from 'next/server.js'
```

## Статус

✅ Исправлено. Проект должен запускаться без ошибок модуля.

## Файлы, затронутые изменением

- `src/lib/http/livescore/logged-fetch.ts`
- `src/lib/http/livescore/customFetch.ts`
