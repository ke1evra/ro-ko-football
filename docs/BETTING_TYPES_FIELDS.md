# Типы прогнозов: какие поля заполняем

## П1 (Победа первой команды)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "П1"
├─ comparisonOperator = "Равно (=)"
└─ outcomeValue = 1

❌ НЕ ЗАПОЛНЯЕМ:
├─ scope (игнорируется для исходов)
├─ aggregation (игнорируется для исходов)
├─ range (не нужен)
├─ set (не нужен)
├─ eventFilter (не нужен)
└─ values (не нужен)

ПОЧЕМУ: Исходы матча определяются через outcomeValue (1/0/2),
        а не через scope/aggregation
```

---

## Х (Ничья)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "Х"
├─ comparisonOperator = "Равно (=)"
└─ outcomeValue = 0

❌ НЕ ЗАПОЛНЯЕМ:
├─ scope
├─ aggregation
├─ range
├─ set
├─ eventFilter
└─ values

ПОЧЕМУ: Ничья — это исход матча (код 0), не требует других параметров
```

---

## П2 (Победа второй команды)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "П2"
├─ comparisonOperator = "Равно (=)"
└─ outcomeValue = 2

❌ НЕ ЗАПОЛНЯЕМ:
├─ scope
├─ aggregation
├─ range
├─ set
├─ eventFilter
└─ values

ПОЧЕМУ: П2 — это исход матча (код 2), не требует других параметров
```

---

## ТБ 2.5 (Тотал больше)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "ТБ 2.5"
├─ comparisonOperator = "Больше (>)"
├─ scope = "both" (обе команды)
├─ aggregation = "sum" (сумма голов)
└─ values = [2.5]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue (только для исходов)
├─ range (не нужен)
├─ set (не нужен)
└─ eventFilter (не нужен)

ПОЧЕМУ: Тотал — это сумма голов обеих команд (home + away > 2.5)
        Нужны scope и aggregation для вычисления суммы
```

---

## ТМ 2.5 (Тотал меньше)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "ТМ 2.5"
├─ comparisonOperator = "Меньше (<)"
├─ scope = "both" (обе команды)
├─ aggregation = "sum" (сумма голов)
└─ values = [2.5]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue
├─ range
├─ set
└─ eventFilter

ПОЧЕМУ: Тотал меньше — это сумма голов < 2.5
        Отличается только оператор (< вместо >)
```

---

## 1Х (Первая или ничья)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "1Х"
├─ comparisonOperator = "Принадлежность множеству (in)"
└─ set = [1, 0]

❌ НЕ ЗАПОЛНЯЕМ:
├─ scope (игнорируется)
├─ aggregation (игнорируется)
├─ outcomeValue (используется set)
├─ range (не нужен)
├─ eventFilter (не нужен)
└─ values (не нужен)

ПОЧЕМУ: 1Х — это "outcome = 1 ИЛИ outcome = 0"
        Используется оператор "in" (принадлежность множеству)
        set содержит коды исходов [1, 0]
```

---

## 12 (Первая или вторая)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "12"
├─ comparisonOperator = "Принадлежность множеству (in)"
└─ set = [1, 2]

❌ НЕ ЗАПОЛНЯЕМ:
├─ scope
├─ aggregation
├─ outcomeValue
├─ range
├─ eventFilter
└─ values

ПОЧЕМУ: 12 — это "outcome = 1 ИЛИ outcome = 2"
        set содержит коды [1, 2]
```

---

## Х2 (Ничья или вторая)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "Х2"
├─ comparisonOperator = "Принадлежность множеству (in)"
└─ set = [0, 2]

❌ НЕ ЗАПОЛНЯЕМ:
├─ scope
├─ aggregation
├─ outcomeValue
├─ range
├─ eventFilter
└─ values

ПОЧЕМУ: Х2 — это "outcome = 0 ИЛИ outcome = 2"
        set содержит коды [0, 2]
```

---

## ИТБ(1) 1.5 (Индивидуальный тотал первой команды больше)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "ИТБ(1) 1.5"
├─ comparisonOperator = "Больше (>)"
├─ scope = "home" (только хозяева)
├─ aggregation = "direct" (прямое значение)
└─ values = [1.5]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue (только для исходов)
├─ range (не нужен)
├─ set (не нужен)
└─ eventFilter (не нужен)

ПОЧЕМУ: ИТБ(1) — это голы первой команды > 1.5
        scope = "home" берёт только homeScore
        aggregation = "direct" не агрегирует (берёт как есть)
```

---

## ИТБ(2) 0.5 (Индивидуальный тотал второй команды больше)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "ИТБ(2) 0.5"
├─ comparisonOperator = "Больше (>)"
├─ scope = "away" (только гости)
├─ aggregation = "direct" (прямое значение)
└─ values = [0.5]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue
├─ range
├─ set
└─ eventFilter

ПОЧЕМУ: ИТБ(2) — это голы второй команды > 0.5
        scope = "away" берёт только awayScore
        Отличается от ИТБ(1) только scope (away вместо home)
```

---

## ИТМ(1) 1.5 (Индивидуальный тотал первой команды меньше)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "ИТМ(1) 1.5"
├─ comparisonOperator = "Меньше (<)"
├─ scope = "home" (только хозяева)
├─ aggregation = "direct" (прямое значение)
└─ values = [1.5]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue
├─ range
├─ set
└─ eventFilter

ПОЧЕМУ: ИТМ(1) — это голы первой команды < 1.5
        Отличается от ИТБ(1) только оператором (< вместо >)
```

---

## ИТМ(2) 1.5 (Индивидуальный тотал второй команды меньше)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "ИТМ(2) 1.5"
├─ comparisonOperator = "Меньше (<)"
├─ scope = "away" (только гости)
├─ aggregation = "direct" (прямое значение)
└─ values = [1.5]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue
├─ range
├─ set
└─ eventFilter

ПОЧЕМУ: ИТМ(2) — это голы второй команды < 1.5
        Отличается от ИТБ(2) только оператором (< вместо >)
```

---

## ОЗ Да (Обе забьют — ДА)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "ОЗ Да"
├─ comparisonOperator = "Больше или равно (≥)"
├─ scope = "both" (обе команды)
├─ aggregation = "min" (минимум голов)
└─ values = [1]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue (только для исходов)
├─ range (не нужен)
├─ set (не нужен)
└─ eventFilter (не нужен)

ПОЧЕМУ: ОЗ Да — это "обе команды забили хотя бы по 1 голу"
        Проверяем: min(homeScore, awayScore) >= 1
        aggregation = "min" берёт минимум голов обеих команд
        Если минимум >= 1, значит обе забили (ДА)
```

---

## ОЗ Нет (Обе забьют — НЕТ)

```
✅ ЗАПОЛНЯЕМ:
├─ name = "ОЗ Нет"
├─ comparisonOperator = "Меньше (<)"
├─ scope = "both" (обе команды)
├─ aggregation = "min" (минимум голов)
└─ values = [1]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue (только для исходов)
├─ range (не нужен)
├─ set (не нужен)
└─ eventFilter (не нужен)

ПОЧЕМУ: ОЗ Нет — это "не обе команды забили"
        Проверяем: min(homeScore, awayScore) < 1
        Если минимум < 1, значит хотя бы одна не забила (НЕТ)

ГДЕ ИСПОЛЬЗУЕТСЯ MIN:
        В файле: src/lib/prediction-mapping-from-cms.ts
        Функция: deriveCalculation() — определяет calculationType
        Функция: computeActualValue() — вычисляет фактическое значение
        
        Логика:
        ├─ aggregation = "min" → calculationType = "min"
        ├─ statPath = "goals" (для голов)
        └─ Вычисление: Math.min(homeScore, awayScore)
        
        Пример вычисления:
        ├─ Матч: 2:1
        ├─ homeScore = 2, awayScore = 1
        ├─ min(2, 1) = 1
        ├─ Проверка: 1 < 1? НЕТ → Прогноз НЕВЕРЕН
        │
        ├─ Матч: 1:0
        ├─ homeScore = 1, awayScore = 0
        ├─ min(1, 0) = 0
        ├─ Проверка: 0 < 1? ДА → Прогноз ВЕРЕН (обе не забили)
```

---

## ОЗ + ТБ (Обе забьют + Тотал больше)

```
⚠️  ВНИМАНИЕ: Это комбинированный прогноз, требующий двух условий!

✅ ЗАПОЛНЯЕМ:
├─ name = "ОЗ + ТБ 2.5"
├─ comparisonOperator = "Больше или равно (≥)"
├─ scope = "both" (обе команды)
├─ aggregation = "sum" (сумма голов)
└─ values = [2.5]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue (только для исходов)
├─ range (не нужен)
├─ set (не нужен)
└─ eventFilter (не нужен)

ЛОГИКА (требует двух проверок):
        Условие 1: min(homeScore, awayScore) >= 1  (обе забили)
        Условие 2: homeScore + awayScore > 2.5     (тотал больше)
        
        Результат: ОБА условия должны быть ИСТИННЫ одновременно

ТЕКУЩАЯ РЕАЛИЗАЦИЯ:
        aggregation = "sum" → вычисляет сумму голов
        comparisonOperator = ">=" → проверяет сумму >= 2.5
        
        ⚠️  ПРОБЛЕМА: Оператор >= не гарантирует, что обе забили!
        
        Пример:
        ├─ Матч: 3:0
        ├─ homeScore = 3, awayScore = 0
        ├─ sum = 3 >= 2.5? ДА ✓
        ├─ min(3, 0) = 0 >= 1? НЕТ ✗
        └─ Результат: НЕВЕРЕН (одна команда не забила)

РЕШЕНИЕ:
        Нужна система с поддержкой ДВУХ условий (AND логика):
        ├─ Условие 1: aggregation = "min", comparisonOperator = "gte", values = [1]
        └─ Условие 2: aggregation = "sum", comparisonOperator = "gt", values = [2.5]
        
        Или использовать отдельное поле для второго условия в OutcomeData
```

---

## ОЗ + ТМ (Обе забьют + Тотал меньше)

```
⚠️  ВНИМАНИЕ: Это комбинированный прогноз, требующий двух условий!

✅ ЗАПОЛНЯЕМ:
├─ name = "ОЗ + ТМ 3.5"
├─ comparisonOperator = "Меньше или равно (≤)"
├─ scope = "both" (обе команды)
├─ aggregation = "sum" (сумма голов)
└─ values = [3.5]

❌ НЕ ЗАПОЛНЯЕМ:
├─ outcomeValue (только для исходов)
├─ range (не нужен)
├─ set (не нужен)
└─ eventFilter (не нужен)

ЛО��ИКА (требует двух проверок):
        Условие 1: min(homeScore, awayScore) >= 1  (обе забили)
        Условие 2: homeScore + awayScore <= 3.5    (тотал меньше)
        
        Результат: ОБА условия должны быть ИСТИННЫ одновременно

ТЕКУЩАЯ РЕАЛИЗАЦИЯ:
        aggregation = "sum" → вычисляет сумму голов
        comparisonOperator = "<=" → проверяет сумму <= 3.5
        
        ⚠️  ПРОБЛЕМА: Оператор <= не гарантирует, что обе забили!
        
        Пример:
        ├─ Матч: 2:0
        ├─ homeScore = 2, awayScore = 0
        ├─ sum = 2 <= 3.5? ДА ✓
        ├─ min(2, 0) = 0 >= 1? НЕТ ✗
        └─ Результат: НЕВЕРЕН (одна команда не забила)

РЕШЕНИЕ:
        Нужна система с поддержкой ДВУХ условий (AND логика):
        ├─ Условие 1: aggregation = "min", comparisonOperator = "gte", values = [1]
        └─ Условие 2: aggregation = "sum", comparisonOperator = "lte", values = [3.5]
        
        Или использовать отдельное поле для второго условия в OutcomeData
```

---

## Сводная таб��ица

| Тип | name | comparisonOperator | scope | aggregation | outcomeValue | values | set |
|-----|------|-------------------|-------|-------------|--------------|--------|-----|
| **П1** | П1 | eq | — | — | 1 | — | — |
| **Х** | Х | eq | — | — | 0 | — | — |
| **П2** | П2 | eq | — | — | 2 | — | — |
| **ТБ 2.5** | ТБ 2.5 | gt | both | sum | — | 2.5 | — |
| **ТМ 2.5** | ТМ 2.5 | lt | both | sum | — | 2.5 | — |
| **1Х** | 1Х | in | — | — | — | — | [1,0] |
| **12** | 12 | in | — | — | — | — | [1,2] |
| **Х2** | Х2 | in | — | — | — | — | [0,2] |
| **ИТБ(1)** | ИТБ(1) 1.5 | gt | home | direct | — | 1.5 | — |
| **ИТБ(2)** | ИТБ(2) 0.5 | gt | away | direct | — | 0.5 | — |
| **ИТМ(1)** | ИТМ(1) 1.5 | lt | home | direct | — | 1.5 | — |
| **ИТМ(2)** | ИТМ(2) 1.5 | lt | away | direct | — | 1.5 | — |
| **ОЗ Да** | ОЗ Да | gte | both | min | — | 1 | — |
| **ОЗ Нет** | ОЗ Нет | lt | both | min | — | 1 | — |
| **ОЗ + ТБ** | ОЗ + ТБ 2.5 | gte | both | sum | — | 2.5 | — |
| **ОЗ + ТМ** | ОЗ + ТМ 3.5 | lte | both | sum | — | 3.5 | — |

---

## Правила заполнения

### Для исходов матча (П1, Х, П2):
```
✅ ВСЕГДА заполняем:
   - name
   - comparisonOperator = "eq"
   - outcomeValue = 1/0/2

❌ НИКОГДА не заполняем:
   - scope, aggregation, range, set, eventFilter, values
```

### Для тоталов (ТБ, ТМ):
```
✅ ВСЕГДА заполняем:
   - name
   - comparisonOperator = "gt" или "lt"
   - scope = "both"
   - aggregation = "sum"
   - values = [число]

❌ НИКОГДА не заполняем:
   - outcomeValue, range, set, eventFilter
```

### Для двойного шанса (1Х, 12, Х2):
```
✅ ВСЕГДА заполняем:
   - name
   - comparisonOperator = "in"
   - set = [коды]

❌ НИКОГДА не заполняем:
   - scope, aggregation, outcomeValue, range, eventFilter, values
```

### Для индивидуальных тоталов (ИТБ, ИТМ):
```
✅ ВСЕГДА заполняем:
   - name
   - comparisonOperator = "gt" или "lt"
   - scope = "home" или "away"
   - aggregation = "direct"
   - values = [число]

❌ НИКОГДА не заполняем:
   - outcomeValue, range, set, eventFilter
```

---

## Почему некоторые поля не заполняем?

| Поле | Когда не заполняем | Почему |
|------|-------------------|--------|
| **scope** | Для исходов и двойного шанса | Они определяются через коды (1/0/2), не через области |
| **aggregation** | Для исходов и двойного шанса | Они не требуют вычисления, только сравнение кодов |
| **outcomeValue** | Для тоталов и индивидуальных | Используются values вместо outcomeValue |
| **values** | Для исходов и двойного шанса | Используется outcomeValue или set вместо values |
| **range** | Для всех кроме диапазонов | Используется только для оператора "between" |
| **set** | Для всех кроме двойного шанса | Используется только для оператора "in" |
| **eventFilter** | Для всех кроме событий | Используется только для оператора "exists" |

---

## Быстрая справка

```
Исходы матча:      П1, Х, П2
                   → outcomeValue = 1/0/2

Общие тоталы:      ТБ, ТМ
                   → scope = "both", aggregation = "sum"

Двойной шанс:      1Х, 12, Х2
                   → comparisonOperator = "in", set = [коды]

Индивидуальные:    ИТБ(1), ИТБ(2), ИТМ(1), ИТМ(2)
                   → scope = "home"/"away", aggregation = "direct"

Обе забьют:        ОЗ Да, ОЗ Нет
                   → scope = "both", aggregation = "min"
                   → ОЗ Да: comparisonOperator = "gte", values = [1]
                   → ОЗ Нет: comparisonOperator = "lt", values = [1]

Комбинированные:   ОЗ + ТБ, ОЗ + ТМ
                   → scope = "both", aggregation = "sum"
                   → ОЗ + ТБ: comparisonOperator = "gte", values = [число]
                   → ОЗ + ТМ: comparisonOperator = "lte", values = [число]
```
