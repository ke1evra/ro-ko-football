# 🚀 Руководство по настройке профиля пользователя

## Быстрый старт

### 1. Убедитесь что статистика рассчитана

```bash
# Запустить подсчёт статистики для всех прогнозов
node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs
```

### 2. Откройте страницу профиля

```
http://localhost:3100/profile
```

### 3. Переключайтесь между вкладками

- **Общая статистика** - видите агрегированные метрики
- **Мои прогнозы** - видите список всех прогнозов

---

## Что отображается

### Вкладка "Общая статистика"

Карточка с метриками:

```
┌────────────────────────────────────────���┐
│ Статистика прогнозов                    │
├─────────────────────────────────────────┤
│ Всего событий: 50                       │
│ Выиграло: 30 (60%)                      │
│ Проиграло: 15 (30%)                     │
│ Hit Rate: 60.0%                         │
│ ROI: +12.0% (Прибыль)                   │
│ Не определено: 5 (10%)                  │
│                                         │
│ [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │
│ ● Выиграло ● Проиграло ● Не определено │
└─────────────────────────────────────────┘
```

**Метрики:**
- **Всего событий** - сумма всех событий из всех прогнозов
- **Выиграло** - количество выигранных событий
- **Проиграло** - количество проигранных событий
- **Hit Rate** - процент точности (выиграло / всего)
- **ROI** - средний ROI по всем прогнозам
- **Не определено** - события без результата

### Вкладка "Мои прогнозы"

Список прогнозов с сортировкой:

```
┌─────────────────────────────────────────┐
│ Прогнозы (10 прогнозов)    [Сортировка▼]│
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Прогноз на матч Ливерпуль - Манчес │ │
│ │ 2 дня назад          [Рассчитан]    │ │
│ │                      2/3 (66%)      │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Прогноз на матч Челси - Арсенал    │ │
│ │ 5 дней назад         [В ожидании]   │ │
│ │                      1/2 (50%)      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Сортировка:**
- **Новые сначала** - по дате создания (убывание)
- **Старые сначала** - по дате создания (возрастание)
- **Лучшие** - по hit rate (убывание)
- **Худшие** - по hit rate (возрастание)

---

## Архитектура

### Компоненты

```
ProfilePage (page.tsx)
├── PredictionStatsContainer
│   └── PredictionStatsCard
└── UserPredictionsList
```

### API маршруты

```
GET /api/predictions/stats/[userId]
    └── Возвращает агрегированную статистику

GET /api/predictions/user/[userId]?sort=recent|oldest|best|worst
    └── Возвращает список прогнозов
```

### Поток данных

```
ProfilePage
    ↓
useEffect (загрузка при монтировании)
    ↓
fetch(/api/predictions/stats/[userId])
    ↓
API маршрут
    ├── Получить все predictionStats для пользователя
    ├── Агрегировать данные
    └── Вернуть результат
    ↓
setState(stats)
    ↓
PredictionStatsCard (отображение)
```

---

## Интеграция с существующим кодом

### AuthContext

Компоненты используют `useAuth()` для получения текущего пользователя:

```typescript
const { user, isLoading, refreshUser } = useAuth()
```

### Payload CMS

API маршруты используют Payload Local API:

```typescript
const payload = await getPayload({ config })
const stats = await payload.find({
  collection: 'predictionStats',
  where: { author: { equals: userId } },
})
```

### shadcn/ui компоненты

Используются стандартные компоненты:
- `Card` - контейнер
- `Badge` - бейджи со статусом
- `Button` - кнопки
- `Select` - выпадающий список
- `Tabs` - вкладки

---

## Кастомизация

### Изменить метрики на карточке

**Файл:** `src/components/profile/PredictionStatsCard.tsx`

```typescript
// Добавить новую метрику
<div className="space-y-2">
  <p className="text-sm text-muted-foreground">Новая метрика</p>
  <p className="text-2xl font-bold">{stats.newMetric}</p>
</div>
```

### Изменить сортировку

**Файл:** `src/app/api/predictions/user/[userId]/route.ts`

```typescript
// Добавить новый тип сортировки
if (sort === 'custom') {
  sorted = predictionsWithStats.sort((a, b) => {
    // Ваша логика сортировки
  })
}
```

### Изменить стили

Используйте Tailwind CSS классы:

```typescript
// Изменить цвет выигрышей
<p className="text-2xl font-bold text-blue-600">{stats.won}</p>
```

---

## Отладка

### Проверить данные в консоли браузера

```javascript
// Открыть DevTools (F12)
// Перейти на вкладку "Network"
// Посмотреть запросы к /api/predictions/stats/...
// Посмотреть ответы в "Response" табе
```

### Проверить данные в базе

```bash
# Подключиться к MongoDB
mongosh

# Выбрать базу
use payload

# Посмотреть статистику
db.predictionstats.find({ author: ObjectId("...") })

# Посмотреть прогнозы
db.posts.find({ author: ObjectId("..."), postType: "prediction" })
```

### Логирование

Добавьте логи в компоненты:

```typescript
useEffect(() => {
  console.log('Загрузка статистики для пользователя:', userId)
  
  const fetchStats = async () => {
    console.log('Запрос к API...')
    const response = await fetch(`/api/predictions/stats/${userId}`)
    console.log('Ответ:', response)
    const data = await response.json()
    console.log('Данные:', data)
    setStats(data.stats)
  }
  
  fetchStats()
}, [userId])
```

---

## Производительность

### Оптимизация запросов

1. **Кэширование на клиенте**
   ```typescript
   const [cache, setCache] = useState({})
   
   if (cache[userId]) {
     setStats(cache[userId])
     return
   }
   ```

2. **Пагинация**
   ```typescript
   const [page, setPage] = useState(1)
   const limit = 20
   
   const response = await fetch(
     `/api/predictions/user/${userId}?page=${page}&limit=${limit}`
   )
   ```

3. **Фильтрация на сервере**
   ```typescript
   const { searchParams } = new URL(request.url)
   const status = searchParams.get('status') // 'settled' | 'pending'
   ```

---

## Тестирование

### Unit тесты

```typescript
// src/components/profile/__tests__/PredictionStatsCard.test.tsx
import { render, screen } from '@testing-library/react'
import { PredictionStatsCard } from '../PredictionStatsCard'

describe('PredictionStatsCard', () => {
  it('отображает статистику', () => {
    const stats = {
      total: 50,
      won: 30,
      lost: 15,
      undecided: 5,
      hitRate: 0.6,
      roi: 0.12,
    }
    
    render(<PredictionStatsCard stats={stats} />)
    
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })
})
```

### E2E тесты

```typescript
// e2e/profile.spec.ts
import { test, expect } from '@playwright/test'

test('профиль отображает статистику', async ({ page }) => {
  await page.goto('/profile')
  
  // Проверить что вкладки видны
  await expect(page.locator('text=Общая статистика')).toBeVisible()
  await expect(page.locator('text=Мои прогнозы')).toBeVisible()
  
  // Переключиться на вкладку статистики
  await page.click('text=Общая статистика')
  
  // Проверить что статистика загружена
  await expect(page.locator('text=Всего событий')).toBeVisible()
})
```

---

## Возможные улучшения

- [ ] Добавить графики (Chart.js, Recharts)
- [ ] Добавить фильтрацию по датам
- [ ] Добавить экспорт в CSV/PDF
- [ ] Добавить сравнение периодов
- [ ] Добавить рейтинг среди пользователей
- [ ] Добавить уведомления о новых результатах
- [ ] Добавить интеграцию с Telegram/Discord
- [ ] Добавить анализ по типам событий
- [ ] Добавить анализ по лигам/турнирам
- [ ] Добавить рекомендации по улучшению

---

## Часто задаваемые вопросы

### Q: Почему статистика не обновляется?
A: Статистика загружается один раз при открытии вкладки. Обновите страницу или переключитесь на другую вкладку и обратно.

### Q: Как добавить новую метрику?
A: Отредактируйте `PredictionStatsCard.tsx` и добавьте новый блок в сетку.

### Q: Как изменить сортировку по умолчанию?
A: Измените параметр `sort` в `UserPredictionsList.tsx`:
```typescript
const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'best' | 'worst'>('best')
```

### Q: Как скрыть вкладку "Мои прогнозы"?
A: Удалите `TabsContent` для вкладки "predictions" из `profile/page.tsx`.

---

## Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте консоль браузера на ошибки
2. Проверьте сетевые запросы в DevTools
3. Посмотрите логи сервера
4. Прочитайте документацию в `docs/USER_PROFILE_STATS.md`
