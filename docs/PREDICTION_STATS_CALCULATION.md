# 📊 Система подсчёта статистики прогнозов

## 🎯 Цель
Автоматический подсчёт результатов прогнозов на основе реальных данных матчей.

---

## 📋 Задействованные коллекции

### 1. **Posts** (прогнозы)
```typescript
{
  postType: 'prediction',
  prediction: {
    outcomes: [{
      fixtureId: number,                    // ID матча
      market: relationship → 'bet-markets', // Маркет
      outcomeGroup: relationship → 'outcome-groups', // Группа исходов
      marketName: string,                   // "Тоталы"
      outcomeName: string,                  // "ТБ"
      value: number | null,                 // 2.5
      coefficient: number,                  // 1.85
      matchInfo: {
        home, away, homeTeamId, awayTeamId,
        competition, date, time
      }
    }]
  }
}
```

### 2. **OutcomeGroups** (правила проверки)
```typescript
{
  name: "Тоталы",
  outcomes: [{
    name: "ТБ",
    conditions: [{
      comparisonOperator: 'gt',      // >
      calculationType: 'sum',        // сумма голов
      // value НЕ задано - берётся из prediction.outcomes[].value
    }],
    values: [                        // Доступные значения
      { value: 0.5 },
      { value: 1.5 },
      { value: 2.5 }
    ]
  }]
}
```

### 3. **Matches** (результаты матчей)
```typescript
{
  matchId: number,
  fixtureId: number,
  status: 'finished' | 'scheduled' | 'live',
  homeScore: number,
  awayScore: number,
  homeTeam: string,
  awayTeam: string,
  date: string,
  // ... другие поля
}
```

### 4. **PredictionStats** (результаты подсчёта)
```typescript
{
  post: relationship → 'posts',
  author: relationship → 'users',
  matchId: number,
  fixtureId: number,
  status: 'pending' | 'settled',
  evaluatedAt: Date,
  summary: {
    total: number,        // Всего исходов
    won: number,          // Выиграло
    lost: number,         // Проиграло
    undecided: number,    // Не определено
    hitRate: number,      // Процент попаданий (0..1)
    roi: number           // ROI по коэффициентам
  },
  details: [{
    event: string,        // "ТБ 2.5"
    coefficient: number,
    result: 'won' | 'lost' | 'undecided',
    reason?: string       // Причина если undecided
  }],
  scoring: {
    points: number,       // Начисленные очки
    breakdown: JSON       // Детализация
  }
}
```

---

## 🔄 Алгоритм подсчёта

### Шаг 1: Найти прогнозы для проверки
```typescript
// Найти все прогнозы с завершёнными матчами
const predictions = await payload.find({
  collection: 'posts',
  where: {
    postType: { equals: 'prediction' },
    'prediction.outcomes.fixtureId': { exists: true }
  },
  depth: 2 // Подтянуть relationships
})

// Для каждого прогноза проверить:
for (const post of predictions.docs) {
  const fixtureIds = post.prediction.outcomes.map(o => o.fixtureId)
  
  // Проверить есть ли уже статистика
  const existingStats = await payload.find({
    collection: 'predictionStats',
    where: { post: { equals: post.id } }
  })
  
  if (existingStats.totalDocs > 0) continue // Уже посчитано
  
  // Получить данные матчей
  const matches = await payload.find({
    collection: 'matches',
    where: {
      fixtureId: { in: fixtureIds },
      status: { equals: 'finished' }
    }
  })
  
  // Если все матчи завершены - считаем
  if (matches.totalDocs === fixtureIds.length) {
    await calculatePredictionStats(post, matches.docs)
  }
}
```

### Шаг 2: Проверить каждый исход
```typescript
async function calculatePredictionStats(post, matches) {
  const results = []
  
  for (const outcome of post.prediction.outcomes) {
    // Найти матч
    const match = matches.find(m => m.fixtureId === outcome.fixtureId)
    if (!match) {
      results.push({
        event: `${outcome.outcomeName} ${outcome.value || ''}`,
        coefficient: outcome.coefficient,
        result: 'undecided',
        reason: 'match_not_finished'
      })
      continue
    }
    
    // Получить группу исходов с условиями
    const outcomeGroup = await payload.findByID({
      collection: 'outcome-groups',
      id: outcome.outcomeGroup
    })
    
    // Найти конкретный исход в группе
    const outcomeDefinition = outcomeGroup.outcomes.find(
      o => o.name === outcome.outcomeName
    )
    
    if (!outcomeDefinition) {
      results.push({
        event: `${outcome.outcomeName} ${outcome.value || ''}`,
        coefficient: outcome.coefficient,
        result: 'undecided',
        reason: 'unsupported_event'
      })
      continue
    }
    
    // Проверить условия
    const isWon = checkConditions(
      outcomeDefinition.conditions,
      match,
      outcome.value, // Значение выбранное пользователем
      outcomeDefinition.conditionLogic || 'AND'
    )
    
    results.push({
      event: `${outcome.outcomeName} ${outcome.value || ''}`,
      coefficient: outcome.coefficient,
      result: isWon ? 'won' : 'lost'
    })
  }
  
  // Сохранить статистику
  await savePredictionStats(post, results)
}
```

### Шаг 3: Проверка условий
```typescript
function checkConditions(
  conditions: Condition[],
  match: Match,
  userValue: number | null,
  logic: 'AND' | 'OR'
): boolean {
  const results = conditions.map(condition => 
    checkSingleCondition(condition, match, userValue)
  )
  
  return logic === 'AND' 
    ? results.every(r => r === true)
    : results.some(r => r === true)
}

function checkSingleCondition(
  condition: Condition,
  match: Match,
  userValue: number | null
): boolean {
  // 1. Вычислить значение из матча
  let actualValue: number
  
  switch (condition.calculationType) {
    case 'sum':
      actualValue = match.homeScore + match.awayScore
      break
    case 'min':
      actualValue = Math.min(match.homeScore, match.awayScore)
      break
    case 'max':
      actualValue = Math.max(match.homeScore, match.awayScore)
      break
    case 'home':
      actualValue = match.homeScore
      break
    case 'away':
      actualValue = match.awayScore
      break
    case 'difference':
      actualValue = match.homeScore - match.awayScore
      break
    default:
      // Для исходов матча (П1/Х/П2)
      if (condition.outcomeValue !== undefined) {
        const matchOutcome = getMatchOutcome(match)
        return matchOutcome === condition.outcomeValue
      }
      return false
  }
  
  // 2. Определить значение для сравнения
  const compareValue = userValue ?? condition.value
  
  if (compareValue === undefined) {
    console.error('No value to compare')
    return false
  }
  
  // 3. Применить оператор сравнения
  switch (condition.comparisonOperator) {
    case 'gt':
      return actualValue > compareValue
    case 'gte':
      return actualValue >= compareValue
    case 'lt':
      return actualValue < compareValue
    case 'lte':
      return actualValue <= compareValue
    case 'eq':
      return actualValue === compareValue
    case 'neq':
      return actualValue !== compareValue
    case 'between':
      return actualValue >= condition.range.lower && 
             actualValue <= condition.range.upper
    case 'in':
      return condition.set.some(s => s.value === actualValue)
    case 'even':
      return actualValue % 2 === 0
    case 'odd':
      return actualValue % 2 !== 0
    default:
      return false
  }
}

function getMatchOutcome(match: Match): number {
  if (match.homeScore > match.awayScore) return 1 // П1
  if (match.homeScore < match.awayScore) return 2 // П2
  return 0 // Х
}
```

### Шаг 4: Сохранение статистики
```typescript
async function savePredictionStats(post, results) {
  const won = results.filter(r => r.result === 'won').length
  const lost = results.filter(r => r.result === 'lost').length
  const undecided = results.filter(r => r.result === 'undecided').length
  const total = results.length
  
  const hitRate = total > 0 ? won / total : 0
  
  // Расчёт ROI (упрощённый)
  const roi = calculateROI(results)
  
  await payload.create({
    collection: 'predictionStats',
    data: {
      post: post.id,
      author: post.author,
      fixtureId: post.prediction.outcomes[0]?.fixtureId,
      status: 'settled',
      evaluatedAt: new Date().toISOString(),
      summary: {
        total,
        won,
        lost,
        undecided,
        hitRate,
        roi
      },
      details: results,
      scoring: {
        points: calculatePoints(results),
        breakdown: {}
      }
    }
  })
}

function calculateROI(results): number {
  // Для одиночных ставок: если выиграл - (коэф - 1), если проиграл - (-1)
  // Для экспрессов: если все выиграли - (произведение коэф - 1), иначе - (-1)
  
  const allWon = results.every(r => r.result === 'won')
  const anyUndecided = results.some(r => r.result === 'undecided')
  
  if (anyUndecided) return 0
  
  if (allWon) {
    const totalCoef = results.reduce((acc, r) => acc * r.coefficient, 1)
    return totalCoef - 1 // ROI в долях (0.85 = +85%)
  }
  
  return -1 // Проигрыш = -100%
}

function calculatePoints(results): number {
  // Простая система: 1 балл за каждый правильный исход
  return results.filter(r => r.result === 'won').length
}
```

---

## 🚀 Реализация

### Вариант 1: Cron Job (рекомендуется)
```typescript
// scripts/calculate-prediction-stats.mjs
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })
  
  console.log('🔍 Поиск прогнозов для проверки...')
  
  // Реализация алгоритма выше
  
  console.log('✅ Подсчёт завершён')
  process.exit(0)
}

main().catch(console.error)
```

**Запуск:**
```bash
# Вручную
node scripts/calculate-prediction-stats.mjs

# Cron (каждый час)
0 * * * * cd /path/to/project && node scripts/calculate-prediction-stats.mjs
```

### Вариант 2: API Endpoint
```typescript
// src/app/api/admin/calculate-stats/route.ts
export async function POST(req: Request) {
  // Проверка прав админа
  // Запуск подсчёта
  // Возврат результата
}
```

### Вариант 3: Background Worker (PM2)
```javascript
// workers/prediction-stats-calculator.js
setInterval(async () => {
  await calculateAllPredictionStats()
}, 60 * 60 * 1000) // Каждый час
```

---

## ✅ Реализовано

### Библиотека подсчёта
- ✅ `src/lib/prediction-stats-calculator.ts` - основная логика
- ✅ Функция `checkConditions()` - проверка условий
- ✅ Функция `checkSingleCondition()` - проверка одного условия
- ✅ Функция `calculateROI()` - расчёт ROI
- ✅ Функция `calculatePredictionStats()` - расчёт статистики прогноза
- ✅ Функция `savePredictionStats()` - сохранение в БД

### Скрипты
- ✅ `scripts/prediction-stats/calculate-all.mjs` - массовый подсчёт
- ✅ `scripts/prediction-stats/calculate-by-match.mjs` - по матчу
- ✅ `scripts/prediction-stats/calculate-by-user.mjs` - по пользователю
- ✅ `scripts/prediction-stats/calculate-by-post.mjs` - по прогнозу
- ✅ `scripts/prediction-stats/recalculate-all.mjs` - полный пересчёт
- ✅ `scripts/prediction-stats/README.md` - документация

### Использование
```bash
# Собрать TypeScript
npm run build

# Массовый подсчёт
node scripts/prediction-stats/calculate-all.mjs

# По конкретному матчу
node scripts/prediction-stats/calculate-by-match.mjs 1825546

# По пользователю
node scripts/prediction-stats/calculate-by-user.mjs <userId>

# По прогнозу (с детальным выводом)
node scripts/prediction-stats/calculate-by-post.mjs <postId>

# Полный пересчёт
node scripts/prediction-stats/recalculate-all.mjs
```

## 📝 TODO

- [ ] Настроить cron job для автоматического подсчёта
- [ ] Добавить тесты для проверки условий
- [ ] Создать API endpoint для ручного запуска
- [ ] Добавить прогресс-бар для длительных операций
- [ ] Реализовать параллельную обработку
- [ ] Интеграция с системой уведомлений

---

## 🧪 Тестовые кейсы

### Кейс 1: ТБ 2.5
```typescript
Прогноз: ТБ 2.5 @ 1.85
Результат матча: 2:1 (сумма = 3)
Условие: sum > 2.5
Проверка: 3 > 2.5 = true
Результат: WON ✅
```

### Кейс 2: П1
```typescript
Прогноз: П1 @ 2.10
Результат матча: 1:2
Условие: outcomeValue === 1
Проверка: getMatchOutcome(1:2) = 2, 2 === 1 = false
Результат: LOST ❌
```

### Кейс 3: ОЗ + ТБ 2.5 (комбинированный)
```typescript
Прогноз: ОЗ + ТБ 2.5 @ 3.50
Результат матча: 2:1
Условия:
  1. min(2, 1) >= 1 = true (ОЗ)
  2. sum(2, 1) > 2.5 = true (ТБ)
Logic: AND
Проверка: true AND true = true
Результат: WON ✅
```

---

## 🔐 Безопасность

- ✅ Только админы могут запускать подсчёт вручную
- ✅ Проверка существующей статистики (не пересчитывать)
- ✅ Транзакции при сохранении
- ✅ Логирование всех операций
- ✅ Обработка ошибок и откат изменений

---

## 📊 Метрики для отслеживания

- Количество обработанных прогнозов
- Количество ошибок
- Время выполнения
- Hit Rate по пользователям
- ROI по пользователям
- Популярные маркеты
