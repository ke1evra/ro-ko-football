# 📊 Профиль пользователя со статистикой прогнозов

## Обзор

На странице профиля пользователя (`/profile`) добавлена полная статистика по прогнозам с двумя вкладками:

1. **Общая статистика** - агрегированные показатели по всем прогнозам
2. **Мои прогнозы** - список всех прогнозов пользователя с фильтрацией и сортировкой

---

## Компоненты

### 1. PredictionStatsCard

**Файл:** `src/components/profile/PredictionStatsCard.tsx`

Компонент для отображения общей статистики прогнозов.

**Показатели:**

- **Всего событий** - общее количество предсказанных событий
- **Выиграло** - количество и процент выигранных событий
- **Проиграло** - количество и процент проигранных событий
- **Hit Rate** - процент точности (выиграло / всего)
- **ROI** - средний ROI по всем прогнозам
- **Не определено** - события без результата (матч не окончен, нет данных)

**Визуализация:**

- Сетка с основными метриками
- Цветные бейджи для быстрого восприятия
- Прогресс-бар с распределением результатов

**Props:**

```typescript
interface PredictionStatsCardProps {
  stats: {
    total: number
    won: number
    lost: number
    undecided: number
    hitRate: number
    roi: number
  }
}
```

**Пример использования:**

```tsx
<PredictionStatsCard
  stats={{
    total: 50,
    won: 30,
    lost: 15,
    undecided: 5,
    hitRate: 0.6,
    roi: 0.12,
  }}
/>
```

---

### 2. UserPredictionsList

**Файл:** `src/components/profile/UserPredictionsList.tsx`

Компонент для отображения списка прогнозов пользователя.

**Функции:**

- Загрузка прогнозов с сервера
- Сортировка по дате (новые/старые) и качеству (лучшие/худшие)
- Отображение статуса (рассчитан/в ожидании)
- Показ статистики каждого прогноза (выиграло/всего, hit rate)
- Ссылки на полный текст прогноза

**Props:**

```typescript
interface UserPredictionsListProps {
  userId: string
}
```

**Сортировка:**

- `recent` - новые сначала (по умолчанию)
- `oldest` - старые сначала
- `best` - лучшие по hit rate
- `worst` - худшие по hit rate

**Пример использования:**

```tsx
<UserPredictionsList userId={user.id} />
```

---

## API маршруты

### 1. GET `/api/predictions/stats/[userId]`

Получить агрегированную статистику прогнозов пользователя.

**Параметры:**

- `userId` - ID пользователя (path parameter)

**Ответ:**

```json
{
  "success": true,
  "stats": {
    "total": 50,
    "won": 30,
    "lost": 15,
    "undecided": 5,
    "hitRate": 0.6,
    "roi": 0.12
  },
  "metadata": {
    "predictionsCount": 10,
    "settledCount": 8,
    "pendingCount": 2
  }
}
```

**Логика:**

1. Получить все записи `predictionStats` для пользователя
2. Агрегировать данные из поля `summary` каждой записи
3. Рассчитать средние значения:
   - `hitRate = won / total`
   - `roi = sum(roi) / predictionsCount`

---

### 2. GET `/api/predictions/user/[userId]`

Получить список прогнозов пользователя с опциональной сортировкой.

**Параметры:**

- `userId` - ID пользователя (path parameter)
- `sort` - тип сортировки (query parameter):
  - `recent` - новые сначала (по умолчанию)
  - `oldest` - старые сначала
  - `best` - лучшие по hit rate
  - `worst` - худшие по hit rate

**Ответ:**

```json
{
  "success": true,
  "predictions": [
    {
      "id": "post-id-1",
      "title": "Прогноз на матч...",
      "createdAt": "2024-12-17T10:00:00Z",
      "status": "settled",
      "summary": {
        "total": 3,
        "won": 2,
        "lost": 1,
        "undecided": 0,
        "hitRate": 0.667,
        "roi": 0.15
      }
    }
  ],
  "total": 10
}
```

**Логика:**

1. Получить все посты-прогнозы пользователя
2. Для каждого поста получить связанную статистику
3. Применить сортировку
4. Вернуть список с метаданными

---

## Интеграция на странице профиля

**Файл:** `src/app/(frontend)/(site)/profile/page.tsx`

На странице профиля добавлены две вкладки:

### Вкладка "Общая статистика"

- Компонент `PredictionStatsContainer` загружает статистику
- Отображает `PredictionStatsCard` с метриками

### Вкладка "Мои прогнозы"

- Компонент `UserPredictionsList` загружает и отображает список
- Позволяет сортировать и фильтровать прогнозы

---

## Структура данных

### PredictionStats (коллекция)

```typescript
{
  id: string
  post: Relationship<Posts>
  author: Relationship<Users>
  status: 'pending' | 'settled'
  evaluatedAt: Date

  summary: {
    total: number // Всего событий
    won: number // Выиграло
    lost: number // Проиграло
    undecided: number // Не определено
    hitRate: number // 0..1
    roi: number // -1..∞
  }

  details: Array<{
    event: string
    coefficient: number
    result: 'won' | 'lost' | 'undecided'
    reason?: string
  }>

  scoring: {
    points: number
    breakdown: JSON
  }
}
```

---

## Примеры использования

### Получить статистику пользователя

```typescript
const response = await fetch(`/api/predictions/stats/${userId}`)
const data = await response.json()
console.log(data.stats.hitRate) // 0.6
```

### Получить прогнозы с сортировкой

```typescript
// Лучшие прогнозы
const response = await fetch(`/api/predictions/user/${userId}?sort=best`)
const data = await response.json()
console.log(data.predictions) // Отсортированы по hit rate (убывание)
```

### Использовать компоненты

```tsx
import { PredictionStatsCard } from '@/components/profile/PredictionStatsCard'
import { UserPredictionsList } from '@/components/profile/UserPredictionsList'

export function MyProfile({ userId }: { userId: string }) {
  return (
    <div className="space-y-8">
      <PredictionStatsCard stats={stats} />
      <UserPredictionsList userId={userId} />
    </div>
  )
}
```

---

## Стили и дизайн

Компоненты используют:

- **shadcn/ui** компоненты (Card, Badge, Button, Select, Tabs)
- **Tailwind CSS** для стилизации
- **date-fns** для форматирования дат (русская локаль)

Цветовая схема:

- 🟢 Зелёный - выигрыши, прибыль
- 🔴 Красный - проигрыши, убытки
- 🟡 Жёлтый - неопределённые результаты
- 🔵 Синий - нейтральные элементы

---

## Производительность

### Оптимизация

1. **Кэширование на клиенте** - данные загружаются один раз при монтировании компонента
2. **Ленивая загрузка** - статистика загружается только при переходе на вкладку
3. **Пагинация** - API возвращает до 1000 прогнозов (можно расширить)

### Возможные улучшения

- [ ] Добавить кэширование на уровне браузера (localStorage)
- [ ] Реализовать пагинацию для больших списков
- [ ] Добавить фильтрацию по датам
- [ ] Добавить экспорт статистики (CSV, PDF)
- [ ] Реализовать графики и диаграммы

---

## Тестирование

### Проверка компонентов

```bash
# Убедитесь что у пользователя есть прогнозы
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs

# Откройте страницу профиля
# http://localhost:3100/profile
```

### Проверка API

```bash
# Получить статистику
curl http://localhost:3100/api/predictions/stats/USER_ID

# Получить прогнозы
curl http://localhost:3100/api/predictions/user/USER_ID?sort=best
```

---

## Возможные проблемы

### Статистика не отображается

**Причины:**

1. Нет рассчитанной статистики - запустите скрипт подсчёта
2. Пользователь не авторизован - проверьте AuthContext
3. API маршрут не работает - проверьте консоль браузера

**Решение:**

```bash
# Пересчитать статистику
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs --force
```

### Прогнозы не загружаются

**Причины:**

1. Неверный userId
2. Нет прогнозов у пользователя
3. Ошибка в API маршруте

**Решение:**

- Проверьте консоль браузера на ошибки
- Проверьте сетевые запросы в DevTools
- Убедитесь что у пользователя есть посты с `postType: 'prediction'`

---

## Файлы

```
src/
├── components/profile/
│   ├── PredictionStatsCard.tsx      # Компонент статистики
│   └── UserPredictionsList.tsx      # Компонент списка прогнозов
├── app/api/predictions/
│   ├── stats/[userId]/route.ts      # API для статистики
│   └── user/[userId]/route.ts       # API для списка прогнозов
└── app/(frontend)/(site)/profile/
    └── page.tsx                      # Страница профиля (обновлена)
```

---

## Дополнительные ресурсы

- [Документация по скриптам подсчёта](./PREDICTION_STATS_CALCULATION.md)
- [Структура PredictionStats](../src/collections/PredictionStats.ts)
- [Структура Users](../src/collections/Users.ts)
