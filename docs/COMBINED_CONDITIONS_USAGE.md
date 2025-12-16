# Использование комбинированных условий

## Обзор

Система теперь поддерживает **любое количество условий** с логическими операциями **AND** и **OR**.

---

## Структура данных

### OutcomeData (расширенный)

```typescript
interface OutcomeData {
  // Основное условие
  name: string
  comparisonOperator: ComparisonOperator
  scope?: 'both' | 'home' | 'away' | 'difference'
  aggregation?: 'auto' | 'sum' | 'difference' | 'min' | 'max' | 'parity' | 'direct'
  value?: number
  values?: Array<{ value: number }>
  
  // Дополнительные условия
  conditions?: Array<{
    comparisonOperator: ComparisonOperator
    scope?: 'both' | 'home' | 'away' | 'difference'
    aggregation: 'auto' | 'sum' | 'difference' | 'min' | 'max' | 'parity' | 'direct'
    value?: number
    values?: Array<{ value: number }>
    range?: { lower?: number; upper?: number }
    set?: Array<{ value: number | string }>
  }>
  
  // Логика объединения
  conditionLogic?: 'AND' | 'OR'  // По умолчанию 'AND'
}
```

---

## Примеры использования

### 1. ОЗ + ТБ 2.5 (Обе забьют И Тотал больше 2.5)

```json
{
  "name": "ОЗ + ТБ 2.5",
  "comparisonOperator": "gte",
  "scope": "both",
  "aggregation": "min",
  "values": [{ "value": 1 }],
  "conditions": [
    {
      "comparisonOperator": "gt",
      "scope": "both",
      "aggregation": "sum",
      "values": [{ "value": 2.5 }]
    }
  ],
  "conditionLogic": "AND"
}
```

**Логика:**
```
Условие 1: min(homeScore, awayScore) >= 1  (обе забили)
Условие 2: homeScore + awayScore > 2.5     (тотал больше)
Результат: Условие 1 AND Условие 2
```

**Примеры:**
- Матч 2:1 → min(2,1)=1 ✓ AND sum=3>2.5 ✓ → **ВЕРНО**
- Матч 3:0 → min(3,0)=0 ✗ AND sum=3>2.5 ✓ → **НЕВЕРНО**
- Матч 1:1 → min(1,1)=1 ✓ AND sum=2>2.5 ✗ → **НЕВЕРНО**

---

### 2. ОЗ + ТМ 3.5 (Обе забьют И Тотал меньше 3.5)

```json
{
  "name": "ОЗ + ТМ 3.5",
  "comparisonOperator": "gte",
  "scope": "both",
  "aggregation": "min",
  "values": [{ "value": 1 }],
  "conditions": [
    {
      "comparisonOperator": "lte",
      "scope": "both",
      "aggregation": "sum",
      "values": [{ "value": 3.5 }]
    }
  ],
  "conditionLogic": "AND"
}
```

**Логика:**
```
Условие 1: min(homeScore, awayScore) >= 1  (обе забили)
Условие 2: homeScore + awayScore <= 3.5    (тотал меньше)
Результат: Условие 1 AND Условие 2
```

**Примеры:**
- Матч 2:1 → min(2,1)=1 ✓ AND sum=3<=3.5 ✓ → **ВЕРНО**
- Матч 2:0 → min(2,0)=0 ✗ AND sum=2<=3.5 ✓ → **НЕВЕРНО**
- Матч 3:2 → min(3,2)=2 ✓ AND sum=5<=3.5 ✗ → **НЕВЕРНО**

---

### 3. П1 ИЛИ ТБ 2.5 (Победа первой ИЛИ Тотал больше 2.5)

```json
{
  "name": "П1 или ТБ 2.5",
  "comparisonOperator": "eq",
  "outcomeValue": 1,
  "conditions": [
    {
      "comparisonOperator": "gt",
      "scope": "both",
      "aggregation": "sum",
      "values": [{ "value": 2.5 }]
    }
  ],
  "conditionLogic": "OR"
}
```

**Логика:**
```
Условие 1: outcome = 1                     (победа первой)
Условие 2: homeScore + awayScore > 2.5     (тотал больше)
Результат: Условие 1 OR Условие 2
```

**Примеры:**
- Матч 2:1 → outcome=1 ✓ OR sum=3>2.5 ✓ → **ВЕРНО**
- Матч 3:0 → outcome=1 ✓ OR sum=3>2.5 ✓ → **ВЕРНО**
- Матч 0:2 → outcome=2 ✗ OR sum=2>2.5 ✗ → **НЕВЕРНО**
- Матч 1:2 → outcome=2 ✗ OR sum=3>2.5 ✓ → **ВЕРНО**

---

### 4. Тройное условие: ОЗ + ТБ 2.5 + ИТБ(1) 1.5

```json
{
  "name": "ОЗ + ТБ 2.5 + ИТБ(1) 1.5",
  "comparisonOperator": "gte",
  "scope": "both",
  "aggregation": "min",
  "values": [{ "value": 1 }],
  "conditions": [
    {
      "comparisonOperator": "gt",
      "scope": "both",
      "aggregation": "sum",
      "values": [{ "value": 2.5 }]
    },
    {
      "comparisonOperator": "gt",
      "scope": "home",
      "aggregation": "direct",
      "values": [{ "value": 1.5 }]
    }
  ],
  "conditionLogic": "AND"
}
```

**Логика:**
```
Условие 1: min(homeScore, awayScore) >= 1  (обе забили)
Условие 2: homeScore + awayScore > 2.5     (тотал больше)
Условие 3: homeScore > 1.5                 (хозяева забили больше 1.5)
Результат: Условие 1 AND Условие 2 AND Условие 3
```

**Примеры:**
- Матч 2:1 → min=1 ✓ AND sum=3>2.5 ✓ AND home=2>1.5 ✓ → **ВЕРНО**
- Матч 1:2 → min=1 ✓ AND sum=3>2.5 ✓ AND home=1>1.5 ✗ → **НЕВЕРНО**
- Матч 3:0 → min=0 ✗ AND sum=3>2.5 ✓ AND home=3>1.5 ✓ → **НЕВЕРНО**

---

### 5. Угловые: ТБ 9.5 ИЛИ Обе команды > 4

```json
{
  "name": "УГ ТБ 9.5 или обе > 4",
  "comparisonOperator": "gt",
  "scope": "both",
  "aggregation": "sum",
  "values": [{ "value": 9.5 }],
  "conditions": [
    {
      "comparisonOperator": "gt",
      "scope": "both",
      "aggregation": "min",
      "values": [{ "value": 4 }]
    }
  ],
  "conditionLogic": "OR"
}
```

**Логика:**
```
Условие 1: corners.home + corners.away > 9.5       (сумма угловых больше 9.5)
Условие 2: min(corners.home, corners.away) > 4    (обе команды > 4 угловых)
Результат: Условие 1 OR Условие 2
```

**Примеры:**
- Угловые 6:5 → sum=11>9.5 ✓ OR min=5>4 ✓ → **ВЕРНО**
- Угловые 8:2 → sum=10>9.5 ✓ OR min=2>4 ✗ → **ВЕРНО**
- Угловые 5:5 → sum=10>9.5 ✓ OR min=5>4 ✓ → **ВЕРНО**
- Угловые 4:4 → sum=8>9.5 ✗ OR min=4>4 ✗ → **НЕВЕРНО**

---

## API функции

### evaluateOutcome()

Основная функция для оценки исходов с комбинированными условиями.

```typescript
function evaluateOutcome(
  match: any,
  matchStats: any,
  market: MarketData,
  outcome: OutcomeData,
): boolean | null
```

**Параметры:**
- `match` — данные матча (homeScore, awayScore)
- `matchStats` — статистика матча (corners, yellowCards и т.д.)
- `market` — данные маркета из CMS
- `outcome` — данные исхода с условиями

**Возвращает:**
- `true` — прогноз верен
- `false` — прогноз неверен
- `null` — невозможно определить (нет данных)

**Пример использования:**

```typescript
import { evaluateOutcome } from '@/lib/prediction-mapping-from-cms'

const market = {
  name: 'Голы',
  mappingConfig: {
    statPath: 'goals',
    statType: 'goals',
  },
}

const outcome = {
  name: 'ОЗ + ТБ 2.5',
  comparisonOperator: 'gte',
  scope: 'both',
  aggregation: 'min',
  values: [{ value: 1 }],
  conditions: [
    {
      comparisonOperator: 'gt',
      scope: 'both',
      aggregation: 'sum',
      values: [{ value: 2.5 }],
    },
  ],
  conditionLogic: 'AND',
}

const match = {
  homeScore: 2,
  awayScore: 1,
}

const result = evaluateOutcome(match, {}, market, outcome)
// result = true (обе забили И тотал > 2.5)
```

---

## Payload CMS интерфейс

### Создание комбинированного исхода

1. **Основное условие** — заполняется как обычно:
   - `name` — название исхода
   - `comparisonOperator` — оператор сравнения
   - `scope` — область применения
   - `aggregation` — способ вычисления
   - `values` — значения для сравнения

2. **Дополнительные условия** — массив `conditions`:
   - Нажмите "Add Дополнительные условия"
   - Заполните каждое условие аналогично основному
   - Можно добавить любое количество условий

3. **Логика объединения** — поле `conditionLogic`:
   - `AND` — все условия должны быть истинны (по умолчанию)
   - `OR` — хотя бы одно условие должно быть истинно

### Пример в Payload CMS

**ОЗ + ТБ 2.5:**

```
Основное условие:
├─ name: "ОЗ + ТБ 2.5"
├─ comparisonOperator: "Больше или равно (≥)"
├─ scope: "Обе команды (сумма)"
├─ aggregation: "Минимум (например, для ОЗ)"
└─ values: [1]

Дополнительные условия:
└─ Условие 1:
   ├─ comparisonOperator: "Больше (>)"
   ├─ scope: "Обе команды (сумма)"
   ├─ aggregation: "Сумма"
   └─ values: [2.5]

Логика объединения: "И (AND) — все условия должны выполняться"
```

---

## Преимущества

### 1. Гибкость
- Любое количество условий
- Любые комбинации операторов
- Поддержка AND и OR логики

### 2. Расширяемость
- Легко добавить новые типы условий
- Можно комбинировать разные статистики
- Поддержка вложенных условий (в будущем)

### 3. Читаемость
- Явная структура данных
- Понятная логика объединения
- Легко отлаживать

### 4. Производительность
- Ленивая оценка (short-circuit evaluation)
- Кэширование вычислений (можно добавить)
- Минимальные накладные расходы

---

## Ограничения

### Текущие
- Только AND и OR на верхнем уровне
- Нет вложенных групп условий (пока)
- Нет поддержки NOT логики

### Планируемые улучшения
- Вложенные группы: `(A AND B) OR (C AND D)`
- NOT логика: `NOT (A AND B)`
- XOR логика: `A XOR B`
- Приоритеты операторов

---

## Миграция существующих данных

Существующие исходы **без дополнительных условий** работают как раньше:

```json
{
  "name": "ТБ 2.5",
  "comparisonOperator": "gt",
  "scope": "both",
  "aggregation": "sum",
  "values": [{ "value": 2.5 }]
  // conditions отсутствует — работает как одно условие
}
```

Никаких изменений в существующих данных не требуется.

---

## Тестирование

### Юнит-тесты

```typescript
import { evaluateOutcome } from '@/lib/prediction-mapping-from-cms'

describe('Combined conditions', () => {
  it('should evaluate AND logic correctly', () => {
    const market = { name: 'Голы', mappingConfig: { statType: 'goals' } }
    const outcome = {
      name: 'ОЗ + ТБ 2.5',
      comparisonOperator: 'gte',
      aggregation: 'min',
      values: [{ value: 1 }],
      conditions: [
        { comparisonOperator: 'gt', aggregation: 'sum', values: [{ value: 2.5 }] },
      ],
      conditionLogic: 'AND',
    }

    // Обе забили И тотал > 2.5
    expect(evaluateOutcome({ homeScore: 2, awayScore: 1 }, {}, market, outcome)).toBe(true)
    
    // Обе не забили
    expect(evaluateOutcome({ homeScore: 3, awayScore: 0 }, {}, market, outcome)).toBe(false)
    
    // Тотал <= 2.5
    expect(evaluateOutcome({ homeScore: 1, awayScore: 1 }, {}, market, outcome)).toBe(false)
  })

  it('should evaluate OR logic correctly', () => {
    const market = { name: 'Голы', mappingConfig: { statType: 'goals' } }
    const outcome = {
      name: 'П1 или ТБ 2.5',
      comparisonOperator: 'eq',
      outcomeValue: 1,
      conditions: [
        { comparisonOperator: 'gt', aggregation: 'sum', values: [{ value: 2.5 }] },
      ],
      conditionLogic: 'OR',
    }

    // П1 ИЛИ ТБ 2.5
    expect(evaluateOutcome({ homeScore: 2, awayScore: 1 }, {}, market, outcome)).toBe(true)
    expect(evaluateOutcome({ homeScore: 1, awayScore: 2 }, {}, market, outcome)).toBe(true)
    expect(evaluateOutcome({ homeScore: 0, awayScore: 2 }, {}, market, outcome)).toBe(false)
  })
})
```

---

## Заключение

Система теперь поддерживает **любые комбинированные условия** с полной логикой AND/OR.

Это позволяет создавать сложные прогнозы типа:
- ОЗ + ТБ
- ОЗ + ТМ
- П1 ИЛИ ТБ
- Тройные условия
- И любые другие комбинации

Используйте функцию `evaluateOutcome()` вместо `evaluateMapping()` для оценки исходов с комбинированными условиями.
