# Правильный подход к маппингу прогнозов

## Проблема

Вы создаёте маркеты и исходы **вручную** в админке Payload:
- Маркет: "Жёлтые карточки"
- Группа исходов: "Тоталы"
- Исход: "ТБ"
- Значение: 1.5

Система не знает автоматически, что "Жёлтые карточки" связаны с `matchStats.yellowCards`.

## Решение

Добавить **метаданные маппинга** в сами маркеты и исходы через админку.

## Что было добавлено

### 1. В коллекцию Markets

Новая группа полей `mappingConfig`:

```typescript
{
  name: 'mappingConfig',
  type: 'group',
  fields: [
    {
      name: 'statPath',
      type: 'text',
      // Например: "yellowCards", "corners", "fouls"
    },
    {
      name: 'statType',
      type: 'select',
      options: ['none', 'numeric', 'outcome', 'goals']
    },
    {
      name: 'scope',
      type: 'select',
      options: ['both', 'home', 'away', 'difference']
    }
  ]
}
```

### 2. В коллекцию OutcomeGroups

Новые поля в массиве `outcomes`:

```typescript
{
  name: 'comparisonOperator',
  type: 'select',
  options: ['gt', 'gte', 'lt', 'lte', 'eq', 'neq']
},
{
  name: 'outcomeValue',
  type: 'number',
  // Для фиксированных значений (П1=1, Х=0, П2=2)
}
```

### 3. Утилита для создания маппингов

**Файл**: `src/lib/prediction-mapping-from-cms.ts`

**Функция**: `createMappingFromCMS(market, outcome)`

Преобразует данные из CMS в маппинг для проверки прогноза.

## Как это работает

### Шаг 1: Настройка в админке

#### Создать маркет "Жёлтые карточки"

```
Название: "Жёлтые карточки"

Настройки маппинга:
├─ statPath: "yellowCards"
├─ statType: "numeric"
└─ scope: "both"
```

#### Создать группу исходов "Тоталы"

```
Название: "Тоталы"

Исходы:
├─ Исход "ТБ"
│  ├─ comparisonOperator: "gt"
│  └─ values: [1.5, 2.5, 3.5, 4.5, 5.5]
└─ Исход "ТМ"
   ├─ comparisonOperator: "lt"
   └─ values: [1.5, 2.5, 3.5, 4.5, 5.5]
```

#### Связать маркет с группой

В маркете "Жёлтые карточки" выбрать группу "Тоталы".

### Шаг 2: Пользователь выбирает прогноз

Пользователь в форме выбирает:
- Маркет: "Жёлтые карточки"
- Исход: "ТБ"
- Значение: 2.5
- Коэффициент: 1.85

### Шаг 3: Система создаёт маппинг

```typescript
import { createMappingFromCMS } from '@/lib/prediction-mapping-from-cms'

const market = {
  name: 'Жёлтые карточки',
  mappingConfig: {
    statPath: 'yellowCards',
    statType: 'numeric',
    scope: 'both'
  }
}

const outcome = {
  name: 'ТБ',
  comparisonOperator: 'gt',
  value: 2.5
}

const mapping = createMappingFromCMS(market, outcome)
// Результат:
// {
//   predictedValue: 2.5,
//   statPath: 'yellowCards',
//   calculationType: 'sum',
//   comparisonOperator: 'gt'
// }
```

### Шаг 4: Сохранение в PredictionStats

```typescript
{
  details: [
    {
      event: 'Жёлтые карточки ТБ 2.5',
      coefficient: 1.85,
      result: 'undecided',
      mapping: {
        predictedValue: 2.5,
        statPath: 'yellowCards',
        calculationType: 'sum',
        comparisonOperator: 'gt'
      }
    }
  ]
}
```

### Шаг 5: Проверка после матча

```typescript
// Получаем данные
const homeYC = matchStats.yellowCards.home  // 2
const awayYC = matchStats.yellowCards.away  // 1

// Считаем (calculationType: 'sum')
const actualValue = homeYC + awayYC  // 3

// Сравниваем (comparisonOperator: 'gt')
const result = actualValue > 2.5  // 3 > 2.5 = true

// Сохраняем
{
  event: 'Жёлтые карточки ТБ 2.5',
  result: 'won',
  mapping: {
    predictedValue: 2.5,
    actualValue: 3,
    statPath: 'yellowCards',
    calculationType: 'sum',
    comparisonOperator: 'gt'
  }
}
```

## Примеры настройки

### Пример 1: Угловые (обе команды)

**Маркет:**
```
Название: "Угловые"
statPath: "corners"
statType: "numeric"
scope: "both"
```

**Группа исходов:**
```
Название: "Тоталы"
├─ ТБ (gt): [7.5, 8.5, 9.5, 10.5, 11.5]
└─ ТМ (lt): [7.5, 8.5, 9.5, 10.5, 11.5]
```

**Результат (УГ ТБ 9.5):**
```typescript
{
  predictedValue: 9.5,
  statPath: 'corners',
  calculationType: 'sum',        // home + away
  comparisonOperator: 'gt'
}
```

### Пример 2: Угловые хозяев

**Маркет:**
```
Название: "Угловые хозяев"
statPath: "corners"
statType: "numeric"
scope: "home"
```

**Группа исходов:**
```
Название: "Тоталы"
├─ ТБ (gt): [3.5, 4.5, 5.5, 6.5]
└─ ТМ (lt): [3.5, 4.5, 5.5, 6.5]
```

**Результат (УГ хозяев ТБ 4.5):**
```typescript
{
  predictedValue: 4.5,
  statPath: 'corners.home',      // Автоматически добавлено .home
  calculationType: 'direct',
  comparisonOperator: 'gt'
}
```

### Пример 3: Основной исход

**Маркет:**
```
Название: "Основной исход"
statPath: "outcome"
statType: "outcome"
scope: "both"
```

**Группа исходов:**
```
Название: "Основные исходы"
├─ П1 (eq, outcomeValue: 1)
├─ Х (eq, outcomeValue: 0)
└─ П2 (eq, outcomeValue: 2)
```

**Результат (П1):**
```typescript
{
  predictedValue: 1,
  statPath: 'outcome',
  calculationType: 'outcome',
  comparisonOperator: 'eq'
}
```

### Пример 4: Фора по голам

**Маркет:**
```
Название: "Фора"
statPath: "goals"
statType: "goals"
scope: "difference"
```

**Группа исходов:**
```
Название: "Фора хозяев"
├─ Ф1 (gt): [-2.5, -1.5, -0.5, 0.5, 1.5]
└─ Ф2 (lt): [-2.5, -1.5, -0.5, 0.5, 1.5]
```

**Результат (Ф1 -1.5):**
```typescript
{
  predictedValue: -1.5,
  statPath: 'goals',
  calculationType: 'difference',  // home - away
  comparisonOperator: 'gt'
}
```

## Преимущества

### ✅ Гибкость

- Создаёте любые маркеты через админку
- Не нужно менять код для новых маркетов
- Легко добавлять новые статистики

### ✅ Прозрачность

- Видно, как маркет связан со статистикой
- Понятно, как будет проверяться прогноз
- Легко отладить

### ✅ Масштабируемость

- Один раз настроили маркет - работает для всех матчей
- Легко добавлять новые значения (1.5, 2.5, 3.5...)
- Можно создавать вариации (УГ хозяев, УГ гостей)

### ✅ Безопасность

- Валидация настроек маркета
- Валидация исхода
- Обработка ошибок

## Что делать дальше

### 1. Настроить базовые маркеты

Создать в админке:
- Угловые (обе команды)
- Жёлтые карточки (обе команды)
- Фолы (обе команды)
- Основной исход
- Голы (тоталы)

### 2. Интегрировать в форму прогноза

При выборе прогноза:
1. Получить данные маркета и исхода
2. Вызвать `createMappingFromCMS()`
3. Сохранить маппинг в прогнозе

### 3. Использовать при оценке

При оценке прогноза:
1. Извлечь маппинг из `PredictionStats.details[].mapping`
2. Использовать существующую функцию `evaluatePrediction()`
3. Сохранить результат

## Файлы

### Коллекции
- `src/collections/Markets.ts` - добавлено поле `mappingConfig`
- `src/collections/OutcomeGroups.ts` - добавлены поля `comparisonOperator` и `outcomeValue`

### Утилиты
- `src/lib/prediction-mapping-from-cms.ts` - создание маппингов из CMS
- `src/lib/prediction-mapping.ts` - базовые функции (без изменений)
- `src/lib/prediction-evaluator.ts` - оценка прогнозов (без изменений)

### Документация
- `docs/PREDICTION_MAPPING_CMS_SETUP.md` - подробная инструкция по настройке
- `docs/PREDICTION_MAPPING_CORRECT_APPROACH.md` - этот файл

## Резюме

**Проблема**: Маркеты создаются вручную, система не знает, как их проверять.

**Решение**: Добавить метаданные маппинга в маркеты и исходы.

**Результат**: 
1. Настраиваете маркет один раз в админке
2. Пользователь выбирает прогноз
3. Система автоматически создаёт маппинг
4. После матча система проверяет прогноз

**Всё настраивается через админку, без изменения кода!**
