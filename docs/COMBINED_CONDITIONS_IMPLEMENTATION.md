# Реализация поддержки комбинированных условий

## ✅ Выполнено

Система теперь поддерживает **любое количество условий** с логическими операциями **AND** и **OR**.

---

## Изменённые файлы

### 1. `/src/collections/OutcomeGroups.ts`

**Добавлено:**
- Поле `conditions` (массив дополнительных условий)
- Поле `conditionLogic` (AND/OR логика)

**Структура дополнительного условия:**
```typescript
{
  comparisonOperator: ComparisonOperator
  scope?: 'both' | 'home' | 'away' | 'difference'
  aggregation: 'auto' | 'sum' | 'difference' | 'min' | 'max' | 'parity' | 'direct'
  values?: Array<{ value: number }>
  range?: { lower?: number; upper?: number }
  set?: Array<{ value: number | string }>
}
```

---

### 2. `/src/lib/prediction-mapping-from-cms.ts`

**Добавлено:**

#### Интерфейс `OutcomeData`
```typescript
interface OutcomeData {
  // ... существующие поля
  
  // НОВОЕ: дополнительные условия
  conditions?: Array<{
    comparisonOperator: ComparisonOperator
    scope?: 'both' | 'home' | 'away' | 'difference'
    aggregation: 'auto' | 'sum' | 'difference' | 'min' | 'max' | 'parity' | 'direct'
    value?: number
    values?: Array<{ value: number }>
    range?: { lower?: number; upper?: number }
    set?: Array<{ value: number | string }>
  }>
  
  // НОВОЕ: логика объединения
  conditionLogic?: 'AND' | 'OR'
}
```

#### Функция `createMappingFromCondition()`
Создаёт маппинг из дополнительного условия.

```typescript
function createMappingFromCondition(
  market: MarketData,
  condition: NonNullable<OutcomeData['conditions']>[0],
): PredictionMapping | null
```

#### Функция `evaluateOutcome()`
Основная функция для оценки исходов с комбинированными условиями.

```typescript
export function evaluateOutcome(
  match: any,
  matchStats: any,
  market: MarketData,
  outcome: OutcomeData,
): boolean | null
```

**Логика:**
1. Оценивает основное условие
2. Оценивает все дополнительные условия
3. Применяет логику объединения (AND/OR)
4. Возвращает итоговый результат

---

## Созданные документы

### 1. `/docs/COMBINED_OUTCOMES_SUPPORT.md`
Анализ проблемы и решения для комбинированных исходов.

### 2. `/docs/COMBINED_CONDITIONS_USAGE.md`
Подробное руководство по использованию с примерами.

### 3. `/docs/COMBINED_CONDITIONS_IMPLEMENTATION.md`
Этот документ — резюме реализации.

---

## Примеры использования

### ОЗ + ТБ 2.5

**В Payload CMS:**

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

Логика объединения: "И (AND)"
```

**В коде:**

```typescript
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

const result = evaluateOutcome(match, matchStats, market, outcome)
```

---

## Поддерживаемые логические операции

### AND (И)
Все условия должны быть истинны.

```
Условие 1 AND Условие 2 AND Условие 3
```

**Примеры:**
- ОЗ + ТБ (обе забили И тотал больше)
- ОЗ + ТМ (обе забили И тотал меньше)
- П1 + ТБ (победа первой И тотал больше)

### OR (ИЛИ)
Хотя бы одно условие должно быть истинно.

```
Условие 1 OR Условие 2 OR Условие 3
```

**Примеры:**
- П1 ИЛИ ТБ (победа первой ИЛИ тотал больше)
- 1Х ИЛИ ТМ (первая или ничья ИЛИ тотал меньше)
- ОЗ ИЛИ ТБ (обе забили ИЛИ тотал больше)

---

## Преимущества реализации

### 1. Гибкость
- ✅ Любое количество условий
- ✅ Любые комбинации операторов
- ✅ Поддержка AND и OR логики
- ✅ Работает с любыми статистиками

### 2. Обратная совместимость
- ✅ Существующие исходы работают без изменений
- ✅ Поле `conditions` опционально
- ✅ Нет breaking changes

### 3. Расширяемость
- ✅ Легко добавить новые типы условий
- ✅ Можно добавить вложенные группы (в будущем)
- ✅ Можно добавить NOT логику (в будущем)

### 4. Производительность
- ✅ Ленивая оценка (short-circuit)
- ✅ Минимальные накладные расходы
- ✅ Эффективная обработка

---

## Тестирование

### Рекомендуемые тесты

```typescript
describe('Combined conditions', () => {
  describe('AND logic', () => {
    it('ОЗ + ТБ 2.5: обе забили И тотал > 2.5', () => {
      // Тест для матча 2:1 (должен пройти)
      // Тест для матча 3:0 (должен провалиться)
      // Тест для матча 1:1 (должен провалиться)
    })

    it('ОЗ + ТМ 3.5: обе забили И тотал <= 3.5', () => {
      // Тест для матча 2:1 (должен пройти)
      // Тест для матча 2:0 (должен провалиться)
      // Тест для матча 3:2 (должен провалиться)
    })
  })

  describe('OR logic', () => {
    it('П1 ИЛИ ТБ 2.5: победа первой ИЛИ тотал > 2.5', () => {
      // Тест для матча 2:1 (должен пройти)
      // Тест для матча 1:2 (должен пройти)
      // Тест для матча 0:2 (должен провалиться)
    })
  })

  describe('Multiple conditions', () => {
    it('ОЗ + ТБ 2.5 + ИТБ(1) 1.5: три условия с AND', () => {
      // Тест для матча 2:1 (должен пройти)
      // Тест для матча 1:2 (должен провалиться)
      // Тест для матча 3:0 (должен провалиться)
    })
  })
})
```

---

## Миграция

### Существующие данные
Никаких изменений не требуется. Исходы без поля `conditions` работают как раньше.

### Новые исходы
Используйте поле `conditions` для добавления дополнительных условий.

---

## Ограничения

### Текущие
- Только AND и OR на верхнем уровне
- Нет вложенных групп: `(A AND B) OR (C AND D)`
- Нет NOT логики: `NOT (A AND B)`

### Планируемые улучшения
- Вложенные группы условий
- NOT логика
- XOR логика
- Приоритеты операторов

---

## API

### evaluateOutcome()

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

**Использование:**

```typescript
import { evaluateOutcome } from '@/lib/prediction-mapping-from-cms'

const result = evaluateOutcome(match, matchStats, market, outcome)

if (result === true) {
  console.log('Прогноз верен')
} else if (result === false) {
  console.log('Прогноз неверен')
} else {
  console.log('Невозможно определить')
}
```

---

## Заключение

✅ **Реализация завершена**

Система теперь поддерживает:
- Любое количество условий
- AND и OR логику
- Все типы операторов
- Все типы статистик
- Обратную совместимость

Используйте `evaluateOutcome()` для оценки исходов с комбинированными условиями.

Подробные примеры см. в `/docs/COMBINED_CONDITIONS_USAGE.md`.
