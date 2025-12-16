# Настройка маппинга прогнозов через CMS

## Обзор

Вы создаёте маркеты и исходы вручную в админке Payload. Чтобы система могла автоматически проверять прогнозы, нужно настроить **метаданные маппинга** для каждого маркета.

## Как это работает

### 1. Создаёте маркет с настройками маппинга

В админке создаёте маркет "Жёлтые карточки" и указываете:

- **statPath**: `yellowCards` (путь к полю в MatchStats)
- **statType**: `numeric` (числовая статистика)
- **scope**: `both` (обе команды, сумма)

### 2. Создаёте группу исходов

Создаёте группу "Тоталы" с исходами:

**Исход "ТБ":**
- **name**: `ТБ`
- **comparisonOperator**: `gt` (больше)
- **values**: `[1.5, 2.5, 3.5, 4.5]`

**Исход "ТМ":**
- **name**: `ТМ`
- **comparisonOperator**: `lt` (меньше)
- **values**: `[1.5, 2.5, 3.5, 4.5]`

### 3. Пользователь выбирает прогноз

Пользователь выбирает:
- Маркет: "Жёлтые карточки"
- Исход: "ТБ"
- Значение: `1.5`

### 4. Система создаёт маппинг автоматически

```typescript
{
  predictedValue: 1.5,                    // Из выбранного значения
  statPath: 'yellowCards',                // Из маркета
  calculationType: 'sum',                 // Из scope: 'both'
  comparisonOperator: 'gt'                // Из исхода
}
```

### 5. После матча система проверяет

```typescript
// Получаем данные
const homeYC = matchStats.yellowCards.home  // 2
const awayYC = matchStats.yellowCards.away  // 1

// Считаем (calculationType: 'sum')
const actualValue = homeYC + awayYC  // 3

// Сравниваем (comparisonOperator: 'gt')
const result = actualValue > 1.5  // 3 > 1.5 = true → 'won'
```

## Примеры настройки маркетов

### Жёлтые карточки (обе команды)

```typescript
Маркет: "Жёлтые карточки"
├─ statPath: "yellowCards"
├─ statType: "numeric"
└─ scope: "both"

Группа исходов: "Тоталы"
├─ Исход "ТБ"
│  ├─ comparisonOperator: "gt"
│  └─ values: [1.5, 2.5, 3.5, 4.5, 5.5]
└─ Исход "ТМ"
   ├─ comparisonOperator: "lt"
   └─ values: [1.5, 2.5, 3.5, 4.5, 5.5]

Результат маппинга (ТБ 2.5):
{
  predictedValue: 2.5,
  statPath: 'yellowCards',
  calculationType: 'sum',        // home + away
  comparisonOperator: 'gt'
}
```

### Угловые хозяев

```typescript
Маркет: "Угловые хозяев"
├─ statPath: "corners"
├─ statType: "numeric"
└─ scope: "home"

Группа исходов: "Тоталы"
├─ Исход "ТБ"
│  ├─ comparisonOperator: "gt"
│  └─ values: [3.5, 4.5, 5.5, 6.5]
└─ Исход "ТМ"
   ├─ comparisonOperator: "lt"
   └─ values: [3.5, 4.5, 5.5, 6.5]

Результат маппинга (ТБ 4.5):
{
  predictedValue: 4.5,
  statPath: 'corners.home',      // Автоматически добавлено .home
  calculationType: 'direct',     // Прямое значение
  comparisonOperator: 'gt'
}
```

### Основной исход

```typescript
Маркет: "Основной исход"
├─ statPath: "outcome"
├─ statType: "outcome"
└─ scope: "both"

Группа исходов: "Основные исходы"
├─ Исход "П1"
│  ├─ comparisonOperator: "eq"
│  └─ outcomeValue: 1
├─ Исход "Х"
│  ├─ comparisonOperator: "eq"
│  └─ outcomeValue: 0
└─ Исход "П2"
   ├─ comparisonOperator: "eq"
   └─ outcomeValue: 2

Результат маппинга (П1):
{
  predictedValue: 1,
  statPath: 'outcome',
  calculationType: 'outcome',
  comparisonOperator: 'eq'
}
```

### Фора по голам

```typescript
Маркет: "Фора"
├─ statPath: "goals"
├─ statType: "goals"
└─ scope: "difference"

Группа исходов: "Фора хозяев"
├─ Исход "Ф1"
│  ├─ comparisonOperator: "gt"
│  └─ values: [-2.5, -1.5, -0.5, 0.5, 1.5]
└─ Исход "Ф2"
   ├─ comparisonOperator: "lt"
   └─ values: [-2.5, -1.5, -0.5, 0.5, 1.5]

Результат маппинга (Ф1 -1.5):
{
  predictedValue: -1.5,
  statPath: 'goals',
  calculationType: 'difference',  // home - away
  comparisonOperator: 'gt'
}
```

## Пошаговая инструкция

### Шаг 1: Создать маркет

1. Перейти в админку → **Рынки ставок**
2. Нажать **Create New**
3. Заполнить:
   - **Название**: `Жёлтые карточки`
   - **Настройки маппинга**:
     - **statPath**: `yellowCards`
     - **statType**: `Числовая статистика`
     - **scope**: `Обе команды (сумма)`
4. Сохранить

### Шаг 2: Создать группу исходов

1. Перейти в админку → **Группы исходов**
2. Нажать **Create New**
3. Заполнить:
   - **Название**: `Тоталы`
   - **Исходы**:
     - Исход 1:
       - **Название**: `ТБ`
       - **Оператор сравнения**: `Больше (>)`
       - **Значения**: `1.5, 2.5, 3.5, 4.5, 5.5`
     - Исход 2:
       - **Название**: `ТМ`
       - **Оператор сравнения**: `Меньше (<)`
       - **Значения**: `1.5, 2.5, 3.5, 4.5, 5.5`
4. Сохранить

### Шаг 3: Связать маркет с группой

1. Вернуться к маркету "Жёлтые карточки"
2. В поле **Группы исходов** выбрать "Тоталы"
3. Сохранить

### Шаг 4: Проверить

Теперь пользователь может выбрать:
- Маркет: "Жёлтые карточки"
- Исход: "ТБ"
- Значение: "2.5"

Система автоматически создаст маппинг:
```typescript
{
  predictedValue: 2.5,
  statPath: 'yellowCards',
  calculationType: 'sum',
  comparisonOperator: 'gt'
}
```

## Доступные статистики

### Числовые (statType: numeric)

| Название | statPath | Описание |
|----------|----------|----------|
| Угловые | `corners` | Угловые удары |
| Жёлтые карточки | `yellowCards` | Жёлтые карточки |
| Красные карточки | `redCards` | Красные карточки |
| Фолы | `fouls` | Фолы |
| Удары | `shots` | Все удары |
| Удары в створ | `shotsOnTarget` | Удары в створ ворот |
| Удары мимо | `shotsOffTarget` | Удары мимо створа |
| Заблокированные | `shotsBlocked` | Заблокированные удары |
| Офсайды | `offsides` | ��фсайды |
| Сейвы | `saves` | Сейвы вратаря |
| Передачи | `passes` | Все передачи |
| Точные передачи | `passesAccurate` | Точные передачи |
| Атаки | `attacks` | Атаки |
| Опасные атаки | `dangerousAttacks` | Опасные атаки |

### Специальные

| Название | statType | statPath | Описание |
|----------|----------|----------|----------|
| Исход матча | `outcome` | `outcome` | П1/Х/П2 |
| Голы | `goals` | `goals` | Голы (из Match) |

## Операторы сравнения

| Оператор | Значение | Использование |
|----------|----------|---------------|
| Больше (>) | `gt` | ТБ (тотал больше) |
| Больше или равно (≥) | `gte` | Редко используется |
| Меньше (<) | `lt` | ТМ (тотал меньше) |
| Меньше или равно (≤) | `lte` | Редко используется |
| Равно (=) | `eq` | Исходы (П1/Х/П2) |
| Не равно (≠) | `neq` | Редко используется |

## Scope (область применения)

| Scope | Значение | calculationType | statPath | Описание |
|-------|----------|-----------------|----------|----------|
| Обе команды (сумма) | `both` | `sum` | `stat` | home + away |
| Хозяева | `home` | `direct` | `stat.home` | Только хозяева |
| Гости | `away` | `direct` | `stat.away` | Только гости |
| Разница (фора) | `difference` | `difference` | `stat` | home - away |

## Примеры готовых маркетов

### 1. Угловые (обе команды)

```
Маркет: "Угловые"
├─ statPath: "corners"
├─ statType: "numeric"
└─ scope: "both"

Группа: "Тоталы"
├─ ТБ (gt): [7.5, 8.5, 9.5, 10.5, 11.5, 12.5]
└─ ТМ (lt): [7.5, 8.5, 9.5, 10.5, 11.5, 12.5]
```

### 2. Фолы (обе команды)

```
Маркет: "Фолы"
├─ statPath: "fouls"
├─ statType: "numeric"
└─ scope: "both"

Группа: "Тоталы"
├─ ТБ (gt): [20.5, 22.5, 24.5, 26.5, 28.5]
└─ ТМ (lt): [20.5, 22.5, 24.5, 26.5, 28.5]
```

### 3. Удары в створ хозяев

```
Маркет: "Удары в створ хозяев"
├─ statPath: "shotsOnTarget"
├─ statType: "numeric"
└─ scope: "home"

Группа: "Тоталы"
├─ ТБ (gt): [2.5, 3.5, 4.5, 5.5]
└─ ТМ (lt): [2.5, 3.5, 4.5, 5.5]
```

### 4. Основной исход

```
Маркет: "Основной исход"
├─ statPath: "outcome"
├─ statType: "outcome"
└─ scope: "both"

Группа: "Основные исходы"
├─ П1 (eq, outcomeValue: 1)
├─ Х (eq, outcomeValue: 0)
└─ П2 (eq, outcomeValue: 2)
```

## Частые вопросы

### Что если не указать настройки маппинга?

Маркет будет доступен для выбора, но прогнозы по нему не будут автоматически проверяться. В `PredictionStats.details[].mapping` будет `null`.

### Можно ли использовать один маркет для разных scope?

Да, создайте отдельные маркеты:
- "Угловые" (scope: both)
- "Угловые хозяев" (scope: home)
- "Угловые гостей" (scope: away)

### Как добавить новую статистику?

1. Убедитесь, что поле есть в `MatchStats`
2. Добавьте в список `getAvailableStats()` в `prediction-mapping-from-cms.ts`
3. Создайте маркет с этим `statPath`

### Что делать с маркетами без статистики?

Для маркетов, которые не могут быть авто��атически проверены (например, "Первый гол"), оставьте `statType: none`. Они будут доступны для выбора, но не будут проверяться автоматически.

## Интеграция с кодом

### Создание маппинга из выбранного прогноза

```typescript
import { createMappingFromCMS } from '@/lib/prediction-mapping-from-cms'

// Данные из выбора пользователя
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
  value: 2.5  // Выбранное пользователем значение
}

// Создаём маппинг
const mapping = createMappingFromCMS(market, outcome)
// {
//   predictedValue: 2.5,
//   statPath: 'yellowCards',
//   calculationType: 'sum',
//   comparisonOperator: 'gt'
// }
```

### Валидация перед созданием

```typescript
import { validateMarketForMapping, validateOutcomeForMapping } from '@/lib/prediction-mapping-from-cms'

const marketValidation = validateMarketForMapping(market)
if (!marketValidation.valid) {
  console.error('Ошибки маркета:', marketValidation.errors)
}

const outcomeValidation = validateOutcomeForMapping(outcome)
if (!outcomeValidation.valid) {
  console.error('Ошибки исхода:', outcomeValidation.errors)
}
```

## Резюме

1. **Создаёте маркет** с настройками маппинга (statPath, statType, scope)
2. **Создаёте группу исходов** с операторами сравнения и значениями
3. **Связываете** маркет с группой исходов
4. **Пользователь выбирает** прогноз
5. **Система автоматически создаёт** маппинг на основе настроек
6. **После матча** система проверяет прогноз по маппингу

Всё настраивается через админку, без изменения кода!
