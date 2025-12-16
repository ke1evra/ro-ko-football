# Поддержка комбинированных исходов (ОЗ + ТБ, ОЗ + ТМ)

## Вопрос
Покрывает ли текущая архитектура комбинированные прогнозы, требующие **двух условий одновременно**?

## Ответ: НЕТ, не покрывает

Текущая архитектура поддерживает только **одно условие на исход**.

---

## Анализ текущей архитектуры

### 1. OutcomeGroups.ts (Payload CMS)

Структура исхода содержит **одно условие**:

```typescript
{
  name: string                    // "ОЗ + ТБ 2.5"
  comparisonOperator: string      // "gte", "lt", "gt", "lte" и т.д.
  scope: string                   // "both", "home", "away", "difference"
  aggregation: string             // "sum", "min", "direct", "max" и т.д.
  range?: { lower, upper }        // Для "between"
  set?: number[]                  // Для "in"
  eventFilter?: {...}             // Для "exists"
  outcomeValue?: number           // Для исходов (1/0/2)
  values?: number[]               // Для тоталов (2.5, 3.5 и т.д.)
}
```

**Вывод:** Нет полей для второго условия.

---

### 2. prediction-mapping-from-cms.ts (Логика оценки)

#### Функция `createMappingFromCMS()`

Создаёт **один** `PredictionMapping` из одного исхода:

```typescript
export function createMappingFromCMS(
  market: MarketData,
  outcome: OutcomeData,
): PredictionMapping | null {
  // ... создаёт ОДИН маппинг
  return mapping  // Один маппинг, одно условие
}
```

#### Функция `evaluateMapping()`

Проверяет **одно** условие:

```typescript
export function evaluateMapping(
  match: any,
  matchStats: any,
  mapping: PredictionMapping,
): boolean | null {
  // Вычисляет одно значение
  const actual = computeActualValue(match, matchStats, mapping)
  
  // Проверяет одно условие
  switch (op) {
    case 'gte': return actual >= expected
    case 'lt':  return actual < expected
    // ... и т.д.
  }
}
```

**Вывод:** Функция оценивает только одно условие.

---

## Проблема с текущей реализацией

### Пример: ОЗ + ТБ 2.5

**Требуется:**
```
Условие 1: min(homeScore, awayScore) >= 1  (обе забили)
Условие 2: homeScore + awayScore > 2.5     (тотал больше)
Результат: Условие 1 AND Условие 2
```

**Текущая реализация:**
```
aggregation = "sum"
comparisonOperator = ">="
values = [2.5]

Проверяет только: sum >= 2.5
НЕ проверяет: min >= 1
```

### Конкретный пример ошибки

Матч: **3:0**
- `homeScore = 3, awayScore = 0`
- `sum = 3 >= 2.5?` → **ДА** ✓
- `min(3, 0) = 0 >= 1?` → **НЕТ** ✗
- **Результат:** Прогноз считается ВЕРНЫМ, но на самом деле НЕВЕРЕН!

---

## Что ну��но для поддержки комбинированных исходов

### Вариант 1: Добавить второе условие в OutcomeData

```typescript
interface OutcomeData {
  // Первое условие (текущее)
  comparisonOperator?: ComparisonOperator
  scope?: string
  aggregation?: string
  values?: number[]
  
  // НОВОЕ: Второе условие
  secondaryCondition?: {
    comparisonOperator: ComparisonOperator
    scope?: string
    aggregation: string
    values?: number[]
  }
  
  // Логика объединения
  conditionLogic?: 'AND' | 'OR'  // По умолчанию AND
}
```

### Вариант 2: Использовать массив условий

```typescript
interface OutcomeData {
  name: string
  conditions: Array<{
    comparisonOperator: ComparisonOperator
    scope?: string
    aggregation: string
    values?: number[]
  }>
  conditionLogic?: 'AND' | 'OR'
}
```

### Вариант 3: Создать отдельный тип для комбинированных исходов

```typescript
interface CombinedOutcome {
  name: string
  conditions: PredictionMapping[]
  logic: 'AND' | 'OR'
}
```

---

## Изменения в коде

### 1. OutcomeGroups.ts

Добавить поле для второго условия:

```typescript
{
  name: 'secondaryCondition',
  type: 'group',
  admin: {
    description: 'Второе условие для комбинированных прогнозов (ОЗ + ТБ, ОЗ + ТМ)',
    condition: (_, siblingData) => {
      // Показывать только для комбинированных исходов
      return siblingData?.name?.includes('+')
    },
  },
  fields: [
    {
      name: 'comparisonOperator',
      type: 'select',
      options: [
        { label: 'Больше (>)', value: 'gt' },
        { label: 'Больше или равно (≥)', value: 'gte' },
        { label: 'Меньше (<)', value: 'lt' },
        { label: 'Меньше или равно (≤)', value: 'lte' },
        // ... остальные операторы
      ],
    },
    {
      name: 'aggregation',
      type: 'select',
      options: [
        { label: 'Сумма', value: 'sum' },
        { label: 'Минимум', value: 'min' },
        // ... остальные
      ],
    },
    {
      name: 'values',
      type: 'array',
      fields: [
        { name: 'value', type: 'number', required: true },
      ],
    },
  ],
}
```

### 2. prediction-mapping-from-cms.ts

Обновить функцию оценки:

```typescript
export function evaluateMapping(
  match: any,
  matchStats: any,
  mapping: PredictionMapping,
  secondaryMapping?: PredictionMapping,
): boolean | null {
  const primary = evaluateSingleMapping(match, matchStats, mapping)
  
  if (!secondaryMapping) {
    return primary
  }
  
  const secondary = evaluateSingleMapping(match, matchStats, secondaryMapping)
  
  // AND логика (по умолчанию для комбинированных)
  if (primary === null || secondary === null) return null
  return primary && secondary
}

function evaluateSingleMapping(
  match: any,
  matchStats: any,
  mapping: PredictionMapping,
): boolean | null {
  // Текущая логика evaluateMapping
  // ...
}
```

---

## Текущее состояние

| Функция | Поддержка |
|---------|-----------|
| Одно условие | ✅ Полная |
| Два условия (AND) | ❌ Не поддерживается |
| Два условия (OR) | ❌ Не поддерживается |
| Динамическое количество условий | ❌ Не поддерживается |

---

## Рекомендация

**Для MVP:** Использовать **Вариант 1** (добавить `secondaryCondition` в OutcomeData)

**Преимущества:**
- Минимальные изменения в коде
- Достаточно для ОЗ + ТБ и ОЗ + ТМ
- Легко расширить в будущем

**Сложность реализации:** Средняя (2-3 часа)

---

## Примеры после реализации

### ОЗ + ТБ 2.5

```
Первое условие:
├─ aggregation = "min"
├─ comparisonOperator = "gte"
└─ values = [1]

Второе условие:
├─ aggregation = "sum"
├─ comparisonOperator = "gt"
└─ values = [2.5]

Логика: Условие 1 AND Условие 2
```

### ОЗ + ТМ 3.5

```
Первое условие:
├─ aggregation = "min"
├─ comparisonOperator = "gte"
└─ values = [1]

Второе услови��:
├─ aggregation = "sum"
├─ comparisonOperator = "lte"
└─ values = [3.5]

Логика: Условие 1 AND Условие 2
```

---

## Заключение

**Текущая архитектура НЕ покрывает комбинированные исходы.**

Нужна реализация поддержки второго условия в OutcomeData и обновление логики оценки в prediction-mapping-from-cms.ts.
