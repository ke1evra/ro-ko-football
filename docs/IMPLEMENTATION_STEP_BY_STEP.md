# Пошаговый план реализации упрощённой системы прогнозов

## Финальное решение

✅ **Вариант 1: Всё в массиве conditions**
- Нет дублирования
- Единая структура
- Простой код
- Обратная совместимость через normalizeOutcome()

---

## Финальная структура данных

```typescript
interface OutcomeData {
  name: string
  
  // Массив условий (единственный способ)
  conditions: Array<{
    comparisonOperator: ComparisonOperator
    
    // Для исходов матча (П1, Х, П2, 1Х, 12, Х2)
    outcomeValue?: number
    set?: Array<{ value: number }>
    
    // Для обычных исходов (ТБ, ТМ, ИТБ, ИТМ, ОЗ)
    calculationType?: 'sum' | 'min' | 'max' | 'home' | 'away' | 'difference'
    value?: number
    
    // Для специальных операторов
    range?: { lower?: number; upper?: number }
    eventFilter?: { type: string; team?: string; period?: string }
  }>
  
  // Логика объединения (для комбинированных исходов)
  conditionLogic?: 'AND' | 'OR'  // По умолчанию AND
}
```

---

## Примеры всех типов исходов

### Простые исходы

```typescript
// П1
{
  name: "П1",
  conditions: [
    { comparisonOperator: "eq", outcomeValue: 1 }
  ]
}

// ТБ 2.5
{
  name: "ТБ 2.5",
  conditions: [
    { comparisonOperator: "gt", calculationType: "sum", value: 2.5 }
  ]
}

// ОЗ Да
{
  name: "ОЗ Да",
  conditions: [
    { comparisonOperator: "gte", calculationType: "min", value: 1 }
  ]
}

// 1Х
{
  name: "1Х",
  conditions: [
    { comparisonOperator: "in", set: [{ value: 1 }, { value: 0 }] }
  ]
}
```

### Комбинированные исходы

```typescript
// ОЗ + ТБ 2.5
{
  name: "ОЗ + ТБ 2.5",
  conditions: [
    { comparisonOperator: "gte", calculationType: "min", value: 1 },
    { comparisonOperator: "gt", calculationType: "sum", value: 2.5 }
  ],
  conditionLogic: "AND"
}

// ОЗ ИЛИ ТБ 2.5
{
  name: "ОЗ ИЛИ ТБ 2.5",
  conditions: [
    { comparisonOperator: "gte", calculationType: "min", value: 1 },
    { comparisonOperator: "gt", calculationType: "sum", value: 2.5 }
  ],
  conditionLogic: "OR"
}
```

---

## Этапы реализации

### ✅ Этап 0: Подготовка (СДЕЛАНО)

- [x] Создана документация с анализом
- [x] Принято решение: массив conditions
- [x] Определена финальная структура
- [x] Улучшен дропдаун statPath в Markets.ts

---

### 📝 Этап 1: Обновить OutcomeGroups.ts

**Файл:** `/src/collections/OutcomeGroups.ts`

**Что делаем:**

1. **Убрать старые поля на верхнем уровне outcomes:**
   - ❌ Удалить `scope`
   - ❌ Удалить `aggregation`
   - ❌ Удалить `values` (массив)
   - ❌ Удалить `outcomeValue` (на верхнем уровне)
   - ❌ Удалить `set` (на верхнем уровне)

2. **Оставить только:**
   - ✅ `name`
   - ✅ `comparisonOperator` (на верхнем уровне для обратной совместимости)
   - ✅ `conditions` (массив)
   - ✅ `conditionLogic`
   - ✅ Специальные поля: `range`, `eventFilter`

3. **Обновить структуру `conditions`:**
   ```typescript
   {
     name: 'conditions',
     type: 'array',
     label: 'Условия',
     admin: {
       description: 'Массив условий для этого исхода. Для простых исходов — одно условие, для комбинированных — несколько.'
     },
     fields: [
       {
         name: 'comparisonOperator',
         type: 'select',
         required: true,
         options: [
           { label: 'Больше (>)', value: 'gt' },
           { label: 'Больше или равно (≥)', value: 'gte' },
           { label: 'Меньше (<)', value: 'lt' },
           { label: 'Меньше или равно (≤)', value: 'lte' },
           { label: 'Равно (=)', value: 'eq' },
           { label: 'Не равно (≠)', value: 'neq' },
           { label: 'Диапазон (между)', value: 'between' },
           { label: 'Принадлежность множеству (любой из)', value: 'in' },
           { label: 'Чётное', value: 'even' },
           { label: 'Нечётное', value: 'odd' },
         ]
       },
       {
         name: 'calculationType',
         type: 'select',
         options: [
           { label: 'Сумма обеих команд (ТБ/ТМ)', value: 'sum' },
           { label: 'Минимум обеих команд (ОЗ)', value: 'min' },
           { label: 'Максимум обеих команд', value: 'max' },
           { label: 'Только хозяева (ИТБ(1)/ИТМ(1))', value: 'home' },
           { label: 'Только гости (ИТБ(2)/ИТМ(2))', value: 'away' },
           { label: 'Разница (фора)', value: 'difference' },
         ],
         admin: {
           description: 'Способ вычисления значения. Используется для обычных исходов (ТБ, ТМ, ОЗ, ИТБ, ИТМ).',
           condition: (_, siblingData) => !siblingData?.outcomeValue && !siblingData?.set
         }
       },
       {
         name: 'value',
         type: 'number',
         admin: {
           description: 'Значение для сравнения (например, 2.5 для ТБ 2.5)',
           condition: (_, siblingData) => 
             siblingData?.calculationType && 
             !['between', 'in', 'even', 'odd'].includes(siblingData?.comparisonOperator)
         }
       },
       {
         name: 'outcomeValue',
         type: 'number',
         admin: {
           description: 'Значение исхода матча (1 = П1, 0 = Х, 2 = П2)',
           condition: (_, siblingData) => 
             !siblingData?.calculationType && 
             siblingData?.comparisonOperator === 'eq'
         }
       },
       {
         name: 'set',
         type: 'array',
         label: 'Множество значений',
         admin: {
           description: 'Для оператора "Принадлежность множеству". Пример: 1Х → [1, 0]',
           condition: (_, siblingData) => siblingData?.comparisonOperator === 'in'
         },
         fields: [
           { name: 'value', type: 'number', required: true }
         ]
       },
       {
         name: 'range',
         type: 'group',
         admin: {
           description: 'Для оператора "Диапазон (между)"',
           condition: (_, siblingData) => siblingData?.comparisonOperator === 'between'
         },
         fields: [
           { name: 'lower', type: 'number' },
           { name: 'upper', type: 'number' }
         ]
       }
     ]
   }
   ```

4. **Обновить `conditionLogic`:**
   ```typescript
   {
     name: 'conditionLogic',
     type: 'select',
     options: [
       { label: 'И (AND) — все условия должны выполняться', value: 'AND' },
       { label: 'ИЛИ (OR) — хотя бы одно условие должно выполняться', value: 'OR' },
     ],
     defaultValue: 'AND',
     admin: {
       description: 'Логика объединения условий. Показывается только если условий больше одного.',
       condition: (_, siblingData) => 
         Array.isArray(siblingData?.conditions) && siblingData.conditions.length > 1
     }
   }
   ```

**Результат:**
- ✅ Чистая структура без дублирования
- ✅ Условная видимость полей
- ✅ Админ видит только нужные поля

---

### 📝 Этап 2: Обновить prediction-mapping-from-cms.ts

**Файл:** `/src/lib/prediction-mapping-from-cms.ts`

**Что делаем:**

1. **Обновить интерфейс `OutcomeData`:**
   ```typescript
   export interface OutcomeData {
     name: string
     
     // Массив условий
     conditions?: Array<{
       comparisonOperator: ComparisonOperator
       
       // Для исходов матча
       outcomeValue?: number
       set?: Array<number | { value: number }>
       
       // Для обычных исходов
       calculationType?: 'sum' | 'min' | 'max' | 'home' | 'away' | 'difference'
       value?: number
       
       // Для специальных операторов
       range?: { lower?: number; upper?: number }
       eventFilter?: {
         type: 'goal' | 'own_goal' | 'penalty' | 'yellow_card' | 'red_card' | 'var' | 'substitution'
         team?: 'any' | 'home' | 'away'
         period?: 'any' | '1h' | '2h'
       }
     }>
     
     conditionLogic?: 'AND' | 'OR'
     
     // Старые поля (deprecated, для обратной совместимости)
     comparisonOperator?: ComparisonOperator
     outcomeValue?: number
     value?: number
     set?: Array<number | { value: number }>
     scope?: 'both' | 'home' | 'away' | 'difference'
     aggregation?: 'auto' | 'sum' | 'difference' | 'min' | 'max' | 'parity' | 'direct'
     values?: Array<{ value: number }>
   }
   ```

2. **Добавить функцию нормализации (обратная совместимость):**
   ```typescript
   /**
    * Нормализация исхода: конвертирует старую структуру в новую
    */
   function normalizeOutcome(outcome: OutcomeData): OutcomeData {
     // Если уже новая структура
     if (outcome.conditions && outcome.conditions.length > 0) {
       return outcome
     }
     
     // Конвертируем старую структуру
     const condition: any = {
       comparisonOperator: outcome.comparisonOperator || 'eq'
     }
     
     // Исход матча
     if (outcome.outcomeValue !== undefined) {
       condition.outcomeValue = outcome.outcomeValue
     }
     
     // Множество
     if (outcome.set) {
       condition.set = outcome.set
     }
     
     // Обычный исход
     if (outcome.scope || outcome.aggregation) {
       condition.calculationType = deriveCalculationTypeFromOld(
         outcome.scope || 'both',
         outcome.aggregation || 'auto'
       )
     }
     
     // Значение
     if (outcome.value !== undefined) {
       condition.value = outcome.value
     } else if (outcome.values && outcome.values.length > 0) {
       condition.value = outcome.values[0].value
     }
     
     // Диапазон
     if (outcome.range) {
       condition.range = outcome.range
     }
     
     // Фильтр событий
     if (outcome.eventFilter) {
       condition.eventFilter = outcome.eventFilter
     }
     
     return {
       name: outcome.name,
       conditions: [condition],
       conditionLogic: outcome.conditionLogic
     }
   }
   
   /**
    * Конвертация старых scope + aggregation в новый calculationType
    */
   function deriveCalculationTypeFromOld(
     scope: string,
     aggregation: string
   ): 'sum' | 'min' | 'max' | 'home' | 'away' | 'difference' {
     // Явное переопределение через aggregation
     if (aggregation === 'sum') return 'sum'
     if (aggregation === 'min') return 'min'
     if (aggregation === 'max') return 'max'
     if (aggregation === 'difference') return 'difference'
     
     // По scope
     if (scope === 'home') return 'home'
     if (scope === 'away') return 'away'
     if (scope === 'difference') return 'difference'
     
     // По умолчанию
     return 'sum'
   }
   ```

3. **Обновить `createMappingFromCMS`:**
   ```typescript
   export function createMappingFromCMS(
     market: MarketData,
     outcome: OutcomeData,
   ): PredictionMapping | null {
     // Нормализуем исход
     const normalized = normalizeOutcome(outcome)
     
     // Если нет условий — ошибка
     if (!normalized.conditions || normalized.conditions.length === 0) {
       return null
     }
     
     // Для простых исходов (одно условие) — создаём маппинг напрямую
     if (normalized.conditions.length === 1) {
       return createMappingFromCondition(market, normalized.conditions[0])
     }
     
     // Для комбинированных исходов — используем evaluateOutcome
     return null // Комбинированные обрабатываются через evaluateOutcome
   }
   ```

4. **Добавить `createMappingFromCondition`:**
   ```typescript
   /**
    * Создать маппинг из одного условия
    */
   function createMappingFromCondition(
     market: MarketData,
     condition: NonNullable<OutcomeData['conditions']>[0]
   ): PredictionMapping | null {
     const config = market.mappingConfig
     if (!config) return null
     
     const mapping: PredictionMapping = {
       comparisonOperator: condition.comparisonOperator
     }
     
     // Исход матча
     if (config.statType === 'outcome') {
       mapping.statPath = 'outcome'
       mapping.calculationType = 'outcome'
       
       if (condition.outcomeValue !== undefined) {
         mapping.predictedValue = condition.outcomeValue
       }
       if (condition.set) {
         mapping.setValues = condition.set.map(item => 
           typeof item === 'object' ? item.value : item
         )
       }
       
       return mapping
     }
     
     // Голы или числовая статистика
     const basePath = config.statPath || 'goals'
     
     // Определяем calculationType
     if (condition.calculationType) {
       mapping.calculationType = mapCalculationType(condition.calculationType)
       
       // Для home/away добавляем путь
       if (condition.calculationType === 'home') {
         mapping.statPath = `${basePath}.home`
       } else if (condition.calculationType === 'away') {
         mapping.statPath = `${basePath}.away`
       } else {
         mapping.statPath = basePath
       }
     } else {
       mapping.statPath = basePath
       mapping.calculationType = 'sum'
     }
     
     // Значение
     if (condition.value !== undefined) {
       mapping.predictedValue = condition.value
     }
     
     // Диапазон
     if (condition.range) {
       mapping.rangeLower = condition.range.lower
       mapping.rangeUpper = condition.range.upper
     }
     
     // Множество
     if (condition.set) {
       mapping.setValues = condition.set.map(item => 
         typeof item === 'object' ? item.value : item
       )
     }
     
     // Фильтр событий
     if (condition.eventFilter) {
       mapping.eventFilter = condition.eventFilter
     }
     
     return mapping
   }
   
   /**
    * Маппинг calculationType в CalculationType
    */
   function mapCalculationType(ct: string): CalculationType {
     switch (ct) {
       case 'sum': return 'sum'
       case 'min': return 'min'
       case 'max': return 'max'
       case 'home': return 'direct'
       case 'away': return 'direct'
       case 'difference': return 'difference'
       default: return 'sum'
     }
   }
   ```

5. **Обновить `evaluateOutcome`:**
   ```typescript
   /**
    * Оценка исхода с поддержкой комбинированных условий
    */
   export function evaluateOutcome(
     match: any,
     matchStats: any,
     market: MarketData,
     outcome: OutcomeData,
   ): boolean | null {
     // Нормализуем исход
     const normalized = normalizeOutcome(outcome)
     
     if (!normalized.conditions || normalized.conditions.length === 0) {
       return null
     }
     
     // Оцениваем все условия
     const results: (boolean | null)[] = []
     
     for (const condition of normalized.conditions) {
       const mapping = createMappingFromCondition(market, condition)
       if (!mapping) return null
       
       const result = evaluateMapping(match, matchStats, mapping)
       if (result === null) return null
       
       results.push(result)
     }
     
     // Если одно условие — возвращаем его
     if (results.length === 1) {
       return results[0]
     }
     
     // Применяем логику объединения
     const logic = normalized.conditionLogic || 'AND'
     
     if (logic === 'OR') {
       return results.some(r => r === true)
     } else {
       return results.every(r => r === true)
     }
   }
   ```

**Результат:**
- ✅ Поддержка новой структуры
- ✅ Обратная совместимость со старой
- ✅ Работа с комбинированными исходами

---

### 📝 Этап 3: Написать миграцию данных

**Файл:** `/scripts/migrate-outcomes-to-conditions.mjs`

**Что делаем:**

```javascript
import { getPayload } from 'payload'
import config from '../src/payload.config.js'

/**
 * Миграция исходов: конвертация старой структуры в новую
 */
async function migrateOutcomes() {
  console.log('🚀 Начинаем миграцию исходов...')
  
  const payload = await getPayload({ config })
  
  // Получаем все outcome groups
  const groups = await payload.find({
    collection: 'outcome-groups',
    limit: 1000,
  })
  
  console.log(`📦 Найдено ${groups.docs.length} групп исходов`)
  
  let migratedCount = 0
  let skippedCount = 0
  
  for (const group of groups.docs) {
    if (!group.outcomes || group.outcomes.length === 0) {
      console.log(`⏭️  Пропускаем группу "${group.name}" (нет исходов)`)
      skippedCount++
      continue
    }
    
    const migratedOutcomes = group.outcomes.map(outcome => {
      // Если уже новая структура — пропускаем
      if (outcome.conditions && outcome.conditions.length > 0) {
        return outcome
      }
      
      // Конвертируем в новую структуру
      const condition = {
        comparisonOperator: outcome.comparisonOperator || 'eq'
      }
      
      // Исход матча
      if (outcome.outcomeValue !== undefined) {
        condition.outcomeValue = outcome.outcomeValue
      }
      
      // Множество
      if (outcome.set) {
        condition.set = outcome.set
      }
      
      // Обычный исход
      if (outcome.scope || outcome.aggregation) {
        condition.calculationType = deriveCalculationType(
          outcome.scope || 'both',
          outcome.aggregation || 'auto'
        )
      }
      
      // Значение
      if (outcome.value !== undefined) {
        condition.value = outcome.value
      } else if (outcome.values && outcome.values.length > 0) {
        condition.value = outcome.values[0].value
      }
      
      // Диапазон
      if (outcome.range) {
        condition.range = outcome.range
      }
      
      // Фильтр событий
      if (outcome.eventFilter) {
        condition.eventFilter = outcome.eventFilter
      }
      
      // Дополнительные условия (если есть)
      const additionalConditions = []
      if (outcome.conditions && outcome.conditions.length > 0) {
        for (const oldCondition of outcome.conditions) {
          const newCondition = {
            comparisonOperator: oldCondition.comparisonOperator
          }
          
          if (oldCondition.scope || oldCondition.aggregation) {
            newCondition.calculationType = deriveCalculationType(
              oldCondition.scope || 'both',
              oldCondition.aggregation || 'auto'
            )
          }
          
          if (oldCondition.value !== undefined) {
            newCondition.value = oldCondition.value
          } else if (oldCondition.values && oldCondition.values.length > 0) {
            newCondition.value = oldCondition.values[0].value
          }
          
          if (oldCondition.range) {
            newCondition.range = oldCondition.range
          }
          
          if (oldCondition.set) {
            newCondition.set = oldCondition.set
          }
          
          additionalConditions.push(newCondition)
        }
      }
      
      return {
        name: outcome.name,
        conditions: [condition, ...additionalConditions],
        conditionLogic: outcome.conditionLogic || 'AND'
      }
    })
    
    // Обновляем группу
    await payload.update({
      collection: 'outcome-groups',
      id: group.id,
      data: { outcomes: migratedOutcomes },
    })
    
    console.log(`✅ Мигрирована группа "${group.name}" (${group.outcomes.length} исходов)`)
    migratedCount++
  }
  
  console.log('\n📊 Итоги миграции:')
  console.log(`✅ Мигрировано: ${migratedCount} групп`)
  console.log(`⏭️  Пропущено: ${skippedCount} групп`)
  console.log('🎉 Миграция завершена!')
}

/**
 * Конвертация старых scope + aggregation в новый calculationType
 */
function deriveCalculationType(scope, aggregation) {
  // Явное переопределение через aggregation
  if (aggregation === 'sum') return 'sum'
  if (aggregation === 'min') return 'min'
  if (aggregation === 'max') return 'max'
  if (aggregation === 'difference') return 'difference'
  
  // По scope
  if (scope === 'home') return 'home'
  if (scope === 'away') return 'away'
  if (scope === 'difference') return 'difference'
  
  // По умолчанию
  return 'sum'
}

// Запуск
migrateOutcomes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Ошибка миграции:', err)
    process.exit(1)
  })
```

**Как запустить:**
```bash
node scripts/migrate-outcomes-to-conditions.mjs
```

**Результат:**
- ✅ Все старые исходы конвертированы в новую структуру
- ✅ Сохранены все данные
- ✅ Логи миграции

---

### 📝 Этап 4: Тестирование

**Что тестируем:**

1. **Создание исходов в Payload CMS:**
   - П1, Х, П2 (исходы матча)
   - ТБ, ТМ (тоталы)
   - ИТБ, ИТМ (индивидуальные тоталы)
   - ОЗ Да/Нет (обе забьют)
   - 1Х, 12, Х2 (двойной шанс)
   - ОЗ + ТБ (комбинированный)

2. **Оценка прогнозов:**
   - Простые исходы работают
   - Комбинированные AND работают
   - Комбинированные OR работают

3. **Обратная совместимость:**
   - Старые исходы читаются
   - Старые исходы оцениваются правильно

**Тестовые данные:**

```typescript
// Тест 1: П1
const test1 = {
  name: "П1",
  conditions: [
    { comparisonOperator: "eq", outcomeValue: 1 }
  ]
}

// Тест 2: ТБ 2.5
const test2 = {
  name: "ТБ 2.5",
  conditions: [
    { comparisonOperator: "gt", calculationType: "sum", value: 2.5 }
  ]
}

// Тест 3: ОЗ + ТБ 2.5
const test3 = {
  name: "ОЗ + ТБ 2.5",
  conditions: [
    { comparisonOperator: "gte", calculationType: "min", value: 1 },
    { comparisonOperator: "gt", calculationType: "sum", value: 2.5 }
  ],
  conditionLogic: "AND"
}

// Тест 4: Старая структура (обратная совместимость)
const test4 = {
  name: "ТБ 2.5 (старая)",
  comparisonOperator: "gt",
  scope: "both",
  aggregation: "sum",
  values: [{ value: 2.5 }]
}
```

---

### 📝 Этап 5: Документация

**Что обновляем:**

1. **BETTING_TYPES_FIELDS.md** — примеры всех 16 типов с новой структурой
2. **PREDICTION_MAPPING_CMS_SETUP.md** — инструкции по настройке
3. **README.md** — обновить описание системы

---

## Чек-лист выполнения

### Реализация
- [ ] **Этап 1:** Обновить OutcomeGroups.ts
  - [ ] Убрать старые поля (scope, aggregation, values)
  - [ ] Обновить структуру conditions
  - [ ] Настроить условную видимость полей
  - [ ] Обновить conditionLogic
- [ ] **Этап 2:** Обновить prediction-mapping-from-cms.ts
  - [ ] Обновить интерфейс OutcomeData
  - [ ] Добавить normalizeOutcome()
  - [ ] Добавить deriveCalculationTypeFromOld()
  - [ ] Обновить createMappingFromCMS()
  - [ ] Добавить createMappingFromCondition()
  - [ ] Добавить mapCalculationType()
  - [ ] Обновить evaluateOutcome()
- [ ] **Этап 3:** Написать миграцию
  - [ ] Создать migrate-outcomes-to-conditions.mjs
  - [ ] Протестировать на копии БД
  - [ ] Запустить на проде
- [ ] **Этап 4:** Тестирование
  - [ ] Создать тестовые исходы в CMS
  - [ ] Проверить оценку прогнозов
  - [ ] Проверить обратную совместимость
- [ ] **Этап 5:** Документация
  - [ ] Обновить BETTING_TYPES_FIELDS.md
  - [ ] Обновить PREDICTION_MAPPING_CMS_SETUP.md
  - [ ] Обновить README.md

### Деплой
- [ ] Бэкап БД
- [ ] Деплой кода
- [ ] Запуск миграции
- [ ] Проверка работоспособности
- [ ] Мониторинг ошибок

---

## Оценка времени

| Этап | Время |
|------|-------|
| Этап 1: OutcomeGroups.ts | 1-2 часа |
| Этап 2: prediction-mapping-from-cms.ts | 2-3 часа |
| Этап 3: Миграция | 1-2 часа |
| Этап 4: Тестирование | 2-3 часа |
| Этап 5: Документация | 1 час |
| Деплой | 1 час |
| **ИТОГО** | **8-12 часов (~1.5 дня)** |

---

## Важные замечания

1. **Обратная совместимость:**
   - Функция `normalizeOutcome()` обеспечивает работу со старыми данными
   - Миграция не обязательна сразу — можно запустить позже
   - Код работает с обеими структурами

2. **Условная видимость полей:**
   - Админ видит только нужные поля
   - `calculationType` показывается только для обычных исходов
   - `outcomeValue` показывается только для исходов матча
   - `set` показывается только для оператора "in"

3. **Валидация:**
   - Проверяем наличие хотя бы одного условия
   - Проверяем корректность полей в каждом условии
   - Проверяем логику объединения для комбинированных

4. **Тестирование:**
   - Обязательно протестировать все 16 типов исходов
   - Проверить комбинированные AND и OR
   - Проверить обратную совместимость

---

## Следующие шаги

После завершения реализации:

1. Запустить миграцию на проде
2. Мониторить ошибки
3. Собрать обратную связь от админов
4. При необходимости — доработать UI

---

## Контакты для вопросов

Если возникнут вопросы в процессе реализации, обращайтесь к этому документу и к файлам:
- `docs/FINAL_SYSTEM_DESIGN.md`
- `docs/CONDITIONS_STRUCTURE_COMPARISON.md`
- `docs/COMBINED_CONDITIONS_ANALYSIS.md`
- `docs/NESTED_CONDITIONS_ANALYSIS.md`
