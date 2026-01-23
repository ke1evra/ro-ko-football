# 📖 Руководство по созданию исходов

## 🎯 Что такое исход?

**Исход** - это вариант прогноза, который может выбрать пользователь.

Примеры: "П1", "ТБ 2.5", "ОЗ Да", "1Х"

---

## 📋 Типы исходов

### 1️⃣ Исходы матча (П1, Х, П2)

Пользователь прогнозирует победителя матча.

#### П1 - Победа хозяев

```
1. Name: П1
2. Add Condition:
   • Comparison Operator: Равно (=)
   • Outcome Value: 1
```

#### Х - Ничья

```
1. Name: Х
2. Add Condition:
   • Comparison Operator: Равно (=)
   • Outcome Value: 0
```

#### П2 - Победа гостей

```
1. Name: П2
2. Add Condition:
   • Comparison Operator: Равно (=)
   • Outcome Value: 2
```

---

### 2️⃣ Двойной шанс (1Х, 12, Х2)

Пользователь прогнозирует два возможных исхода из трёх.

#### 1Х - Победа хозяев или ничья

```
1. Name: 1Х
2. Add Condition:
   • Comparison Operator: Принадлежность множеству (in)
   • Set:
     - Add Set → Value: 1
     - Add Set → Value: 0
```

#### 12 - Победа любой команды

```
1. Name: 12
2. Add Condition:
   • Comparison Operator: Принадлежность множеству (in)
   • Set:
     - Add Set → Value: 1
     - Add Set → Value: 2
```

#### Х2 - Ничья или победа гостей

```
1. Name: Х2
2. Add Condition:
   • Comparison Operator: Принадлежность множеству (in)
   • Set:
     - Add Set → Value: 0
     - Add Set → Value: 2
```

---

### 3️⃣ Тоталы (ТБ, ТМ)

Пользователь прогнозирует общее количество голов и выбирает линию.

#### ТБ - Тотал больше

```
1. Name: ТБ
2. Add Condition:
   • Comparison Operator: Больше (>)
   • Calculation Type: Сумма обеих команд (sum)
   • Value: (НЕ заполнять!)
3. Values (на уровне исхода):
   • Add Value → Value: 0.5
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
   • Add Value → Value: 4.5
   • Add Value → Value: 5.5
```

**Результат:** Пользователь увидит "ТБ 0.5", "ТБ 1.5", "ТБ 2.5" и т.д.

#### ТМ - Тотал меньше

```
1. Name: ТМ
2. Add Condition:
   • Comparison Operator: Меньше (<)
   • Calculation Type: Сумма обеих команд (sum)
   • Value: (НЕ заполнять!)
3. Values (на уровне исхода):
   • Add Value → Value: 0.5
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
   • Add Value → Value: 4.5
   • Add Value → Value: 5.5
```

---

### 4️⃣ Индивидуальные тоталы (ИТБ, ИТМ)

Пользователь прогнозирует голы одной команды и выбирает линию.

#### ИТБ(1) - Индивидуальный тотал хозяев ��ольше

```
1. Name: ИТБ(1)
2. Add Condition:
   • Comparison Operator: Больше (>)
   • Calculation Type: Только хозяева (home)
   • Value: (НЕ заполнять!)
3. Values (на уровне исхода):
   • Add Value → Value: 0.5
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
```

#### ИТМ(1) - Индивидуальный тотал хозяев меньше

```
1. Name: ИТМ(1)
2. Add Condition:
   • Comparison Operator: Меньше (<)
   • Calculation Type: Только хозяева (home)
   • Value: (НЕ заполнять!)
3. Values (на уровне исхода):
   • Add Value → Value: 0.5
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
```

#### ИТБ(2) - Индивидуальный тотал гостей больше

```
1. Name: ИТБ(2)
2. Add Condition:
   • Comparison Operator: Больше (>)
   • Calculation Type: Только гости (away)
   • Value: (НЕ заполнять!)
3. Values (на уровне исхода):
   • Add Value → Value: 0.5
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
```

#### ИТМ(2) - Индивидуальный тотал гостей меньше

```
1. Name: ИТМ(2)
2. Add Condition:
   • Comparison Operator: Меньше (<)
   • Calculation Type: Только гости (away)
   • Value: (НЕ заполнять!)
3. Values (на уровне исхода):
   • Add Value → Value: 0.5
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
```

---

### 5️⃣ Форы (Ф1, Ф2)

Пользователь прогнозирует победу команды с учётом форы и выбирает линию.

#### Ф1 - Фора первой команды

```
1. Name: Ф1
2. Add Condition:
   • Comparison Operator: Больше (>)
   • Calculation Type: Разница (difference)
   • Value: (НЕ заполнять!)
3. Values (на уровне исхода):
   • Add Value → Value: -2.5
   • Add Value → Value: -2
   • Add Value → Value: -1.5
   • Add Value → Value: -1
   • Add Value → Value: -0.5
   • Add Value → Value: 0
   • Add Value → Value: 0.5
   • Add Value → Value: 1
   • Add Value → Value: 1.5
   • Add Value → Value: 2
   • Add Value → Value: 2.5
```

**Резул��тат:** Пользователь выберет "Ф1(-1.5)", "Ф1(0)", "Ф1(+1.5)" и т.д.

**Как работает:** Разница голов (хозяева - гости) > выбранное значение

**Примеры:**

- Ф1(-1.5): хозяева должны выиграть с разницей > 1.5 (т.е. минимум 2 гола)
- Ф1(0): хозяева не должны проиграть
- Ф1(+1.5): хозяева могут проиграть, но не более чем на 1 гол

#### Ф2 - Фора второй команды

```
1. Name: Ф2
2. Add Condition:
   • Comparison Operator: Меньше (<)
   • Calculation Type: Разница (difference)
   • Value: (НЕ заполнять!)
3. Values (на уровне исхода):
   • Add Value → Value: -2.5
   • Add Value → Value: -2
   • Add Value → Value: -1.5
   • Add Value → Value: -1
   • Add Value → Value: -0.5
   • Add Value → Value: 0
   • Add Value → Value: 0.5
   • Add Value → Value: 1
   • Add Value → Value: 1.5
   • Add Value → Value: 2
   • Add Value → Value: 2.5
```

**Результат:** Пользователь выберет "Ф2(-1.5)", "Ф2(0)", "Ф2(+1.5)" и т.д.

**Как работает:** Разница голов (хозяева - гости) < выбранное значение

**Примеры:**

- Ф2(-1.5): гости должны выиграть с разницей > 1.5 (т.е. минимум 2 гола)
- Ф2(0): гости не должны проиграть
- Ф2(+1.5): гости могут проиграть, но не более чем на 1 гол

---

### 6️⃣ Обе забьют (ОЗ)

Пользователь прогнозирует, забьют ли обе команды.

#### ОЗ Да - Обе команды забьют

```
1. Name: ОЗ Да
2. Add Condition:
   • Comparison Operator: Больше или равно (≥)
   • Calculation Type: Минимум обеих команд (min)
   • Value: 1
```

**Почему 1?** Проверяем, что минимум голов обеих команд >= 1 (обе забили хотя бы по 1 голу).

#### ОЗ Нет - Хотя бы одна не забьёт

```
1. Name: ОЗ Нет
2. Add Condition:
   • Comparison Operator: Меньше (<)
   • Calculation Type: Минимум обеих команд (min)
   • Value: 1
```

**Почему 1?** Проверяем, что минимум голов обеих команд < 1 (хотя бы одна не забила).

---

### 6️⃣ Комбинированные исходы

Пользователь прогнозирует выполнение нескольких условий одновременно.

#### ОЗ + ТБ - Обе забьют И тотал больше

```
1. Name: ОЗ + ТБ
2. Add Condition (первое):
   • Comparison Operator: Больше или равно (≥)
   • Calculation Type: Минимум обеих команд (min)
   • Value: 1
3. Add Condition (второе):
   • Comparison Operator: Больше (>)
   • Calculation Type: Сумма обеих команд (sum)
   • Value: (НЕ заполнять!)
4. Condition Logic: И (AND)
5. Values (на уровне исхода):
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
```

**Результат:** Пользователь выберет "ОЗ + ТБ 1.5", "ОЗ + ТБ 2.5", "ОЗ + ТБ 3.5"

**Логика:** ОБА условия должны выполниться (обе забили И тотал > выбранное значение).

#### ОЗ ИЛИ ТБ - Обе забьют ИЛИ тотал больше

```
1. Name: ОЗ ИЛИ ТБ
2. Add Condition (первое):
   • Comparison Operator: Больше или равно (≥)
   • Calculation Type: Минимум обеих команд (min)
   • Value: 1
3. Add Condition (второе):
   • Comparison Operator: Больше (>)
   • Calculation Type: Сумма обеих команд (sum)
   • Value: (НЕ заполнять!)
4. Condition Logic: ИЛИ (OR)
5. Values (на уровне исхода):
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
```

**Результат:** Пользователь выберет "ОЗ ИЛИ ТБ 1.5", "ОЗ ИЛИ ТБ 2.5", "ОЗ ИЛИ ТБ 3.5"

**Логика:** Достаточно ОДНОГО условия (обе забили ИЛИ тотал > выбранное значение).

#### 1Х + ТБ - Двойной шанс И тотал больше

```
1. Name: 1Х + ТБ
2. Add Condition (первое):
   • Comparison Operator: Принадлежность множеству (in)
   • Set:
     - Add Set → Value: 1
     - Add Set → Value: 0
3. Add Condition (второе):
   • Comparison Operator: Больше (>)
   • Calculation Type: Сумма обеих команд (sum)
   • Value: (НЕ заполнять!)
4. Condition Logic: И (AND)
5. Values (на уровне исхода):
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
```

**Результат:** Пользователь выберет "1Х + ТБ 1.5", "1Х + ТБ 2.5", "1Х + ТБ 3.5"

**Логика:** ОБА условия должны выполниться (П1 или Х) И (тотал > выбранное значение).

#### П1 + ТБ - Победа хозяев И тотал больше

```
1. Name: П1 + ТБ
2. Add Condition (первое):
   • Comparison Operator: Равно (=)
   • Outcome Value: 1
3. Add Condition (второе):
   • Comparison Operator: Больше (>)
   • Calculation Type: Сумма обеих команд (sum)
   • Value: (НЕ заполнять!)
4. Condition Logic: И (AND)
5. Values (на уровне исхода):
   • Add Value → Value: 1.5
   • Add Value → Value: 2.5
   • Add Value → Value: 3.5
```

**Результат:** Пользователь выберет "П1 + ТБ 1.5", "П1 + ТБ 2.5", "П1 + ТБ 3.5"

**Логика:** ОБА услов��я должны выполниться (П1) И (тотал > выбранное значение).

#### П1 + ОЗ - Победа хозяев И обе забьют

```
1. Name: П1 + ОЗ
2. Add Condition (первое):
   • Comparison Operator: Равно (=)
   • Outcome Value: 1
3. Add Condition (второе):
   • Comparison Operator: Больше или равно (≥)
   • Calculation Type: Минимум обеих команд (min)
   • Value: 1
4. Condition Logic: И (AND)
```

**Логика:** ОБА условия должны выполниться (П1) И (обе забили).

---

## 💡 Важные правила

### Правило 1: Value в Conditions vs Values на уровне исхода

**Для исходов с линиями (ТБ, ТМ, ИТБ, ИТМ, Форы):**

- ❌ НЕ заполняйте поле Value в Conditions
- ✅ Заполните массив Values на уровне исхода
- Пользователь выберет конкретное значение из списка

**Для фиксированных исходов (П1, Х, П2, ОЗ):**

- ✅ Заполните Value или Outcome Value в Conditions
- ❌ НЕ заполняйте массив Values

**Для комбинированных с тоталами (ОЗ + ТБ, П1 + ТБ):**

- ✅ Для ОЗ: заполните Value: 1 в первом условии
- ❌ Для ТБ: НЕ заполняйте Value во втором условии
- ✅ Заполните массив Values на уровне исхода

### Правило 2: Какие поля появятся?

Поля появляются **автоматически** в зависимости от выбранного оператора:

| Оператор                          | Появятся поля        |
| --------------------------------- | -------------------- |
| **Равно (=)**                     | Outcome Value        |
| **Больше (>), Меньше (<)**        | Calculation Type     |
| **Принадлежность множеству (in)** | Set                  |
| **Диапазон (между)**              | Range (Lower, Upper) |
| **Чётное, Нечётное**              | Calculation Type     |

### Правило 3: Calculation Type

Выбирайте в зависимости от типа исхода:

| Тип               | Calculation Type           |
| ----------------- | -------------------------- |
| **ТБ/ТМ**         | Сумма обеих команд (sum)   |
| **ОЗ**            | Минимум обеих команд (min) |
| **ИТБ(1)/ИТМ(1)** | Только хозяева (home)      |
| **ИТБ(2)/ИТМ(2)** | Только гости (away)        |
| **Форы**          | Разница (difference)       |

---

## ⚠️ Частые ошибки

### Ошибка 1: Заполнили Value в Conditions для ТБ/ТМ

```
❌ НЕПРАВИЛЬНО:
Name: ТБ
Conditions:
  • Calculation Type: sum
  • Value: 2.5  ← НЕ НАДО!
Values:
  • 2.5
```

**Почему неправильно?** Пользователь должен выбрать значение из Values.

```
✅ ПРАВИЛЬНО:
Name: ТБ
Conditions:
  • Calculation Type: sum
  • Value: (оставить пустым)
Values (на уровне исхода):
  • 0.5, 1.5, 2.5, 3.5...
```

### Ошибка 2: Не выбрали Calculation Type

```
❌ НЕПРАВИЛЬНО:
Name: ТБ
Conditions:
  • Comparison Operator: Больше (>)
  (Calculation Type не выбран)
```

**Почему неправильно?** Система не знает, что считать (сумму, минимум, разницу?).

```
✅ ПРАВИЛЬНО:
Name: ТБ
Conditions:
  • Comparison Operator: Больше (>)
  • Calculation Type: Сумма обеих команд (sum)
```

### Ошибка 3: Для П1 выбрали Calculation Type

```
❌ НЕПРАВИЛЬНО:
Name: П1
Conditions:
  • Comparison Operator: Равно (=)
  • Calculation Type: sum  ← НЕ НАДО!
```

**Почему неправильно?** Для исходов матча использ��ется Outcome Value, а не Calculation Type.

```
✅ ПРАВИЛЬНО:
Name: П1
Conditions:
  • Comparison Operator: Равно (=)
  • Outcome Value: 1
```

---

## 📊 Сводная таблица

| Тип исхода  | Name    | Operator | Calculation Type | Value в Conditions       | Values на уровне исхода | Set    |
| ----------- | ------- | -------- | ---------------- | ------------------------ | ----------------------- | ------ |
| **П1**      | П1      | =        | -                | outcomeValue: 1          | -                       | -      |
| **Х**       | Х       | =        | -                | outcomeValue: 0          | -                       | -      |
| **П2**      | П2      | =        | -                | outcomeValue: 2          | -                       | -      |
| **ТБ**      | ТБ      | >        | sum              | (пусто)                  | [0.5, 1.5, 2.5...]      | -      |
| **ТМ**      | ТМ      | <        | sum              | (пусто)                  | [0.5, 1.5, 2.5...]      | -      |
| **ИТБ(1)**  | ИТБ(1)  | >        | home             | (пусто)                  | [0.5, 1.5, 2.5...]      | -      |
| **ИТМ(1)**  | ИТМ(1)  | <        | home             | (пусто)                  | [0.5, 1.5, 2.5...]      | -      |
| **ИТБ(2)**  | ИТБ(2)  | >        | away             | (пусто)                  | [0.5, 1.5, 2.5...]      | -      |
| **ИТМ(2)**  | ИТМ(2)  | <        | away             | (пусто)                  | [0.5, 1.5, 2.5...]      | -      |
| **ОЗ Да**   | ОЗ Да   | ≥        | min              | 1                        | -                       | -      |
| **ОЗ Нет**  | ОЗ Нет  | <        | min              | 1                        | -                       | -      |
| **1Х**      | 1Х      | in       | -                | -                        | -                       | [1, 0] |
| **12**      | 12      | in       | -                | -                        | -                       | [1, 2] |
| **Х2**      | Х2      | in       | -                | -                        | -                       | [0, 2] |
| **ОЗ + ТБ** | ОЗ + ТБ | ≥ + >    | min + sum        | 1 + (пусто)              | [1.5, 2.5, 3.5...]      | -      |
| **П1 + ТБ** | П1 + ТБ | = + >    | - + sum          | outcomeValue:1 + (пусто) | [1.5, 2.5, 3.5...]      | -      |

---

## 🚀 Быстрый старт

### Шаг 1: Создайте первую группу

1. Откройте **Outcome Groups**
2. Нажмите **Create New**
3. Введите название: **"Основные исходы"**
4. Нажмите **Add Outcome**
5. Следуйте инструкции для П1 (см. выше)
6. Повторите для Х и П2
7. Нажмите **Save**

### Шаг 2: Создайте вторую группу

1. Нажмите **Create New**
2. Введите название: **"Тоталы голов"**
3. Создайте ТБ и ТМ (см. выше)
4. Нажмите **Save**

### Шаг 3: Привяжите к маркету

1. Откройте **Markets**
2. Найдите маркет **"Голы"**
3. В поле **Groups** добавьте обе группы
4. Нажмите **Save**

**Готово!** Пользователи могут делать прогнозы.

---

## 📞 Нужна помощь?

- **Техническая документация:** `docs/OUTCOME_GROUPS_CHEATSHEET.md`
- **Примеры структур данных:** `docs/BETTING_TYPES_FIELDS.md`
- **Вопросы по настройке:** Обратитесь к разработчику
