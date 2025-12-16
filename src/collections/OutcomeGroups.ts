import { descriptions } from '@/lib/admin/descriptions'
import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const OutcomeGroups: CollectionConfig = {
  slug: 'outcome-groups',
  labels: {
    singular: 'Группа исходов',
    plural: 'Группы исходов',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
    description:
      descriptions.outcomeGroups +
      '\n\n📚 Документация:\n' +
      '• Инструкция для админов: docs/ADMIN_OUTCOMES_GUIDE.md\n' +
      '• Техническая шпаргалка: docs/OUTCOME_GROUPS_CHEATSHEET.md',
  },
  access: {
    read: () => true,
    create: ({ req }) => isAdmin(req),
    update: ({ req }) => isAdmin(req),
    delete: ({ req }) => isAdmin(req),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Название группы исходов (тоталы, форы, обе забьют и т.д.)',
      },
    },
    {
      name: 'outcomes',
      type: 'array',
      label: 'Исходы',
      admin: {
        description:
          '📋 Массив исходов для этой группы. Каждый исход содержит название и массив условий для проверки.\n\n' +
          '💡 Примеры:\n' +
          '• П1: одно условие с outcomeValue=1\n' +
          '• ТБ 2.5: одно условие с calculationType=sum, value=2.5\n' +
          '• ОЗ + ТБ 2.5: два условия с conditionLogic=AND',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Название исхода (например: "ТБ 2.5", "П1", "ОЗ + ТБ 2.5")',
          },
        },
        {
          name: 'conditions',
          type: 'array',
          label: 'Условия',
          required: true,
          minRows: 1,
          admin: {
            description:
              '⚙️ Добавьте условия для проверки исхода:\n' +
              '1️⃣ Выберите оператор сравнения\n' +
              '2️⃣ Заполните нужные поля (они появятся автоматически)\n' +
              '3️⃣ Для комбинированных исходов добавьте второе условие',
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
              ],
              admin: {
                description:
                  'Оператор сравнения. ТБ → Больше (>), ТМ → Меньше (<). Для двойного шанса — "Принадлежность множеству".',
              },
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
                description:
                  '📊 Способ вычисления значения.\n\n' +
                  '**Выберите:**\n' +
                  '• sum - для ТБ/ТМ (сумма голов обеих команд)\n' +
                  '• min - для ОЗ (минимум голов обеих команд)\n' +
                  '• home - для ИТБ(1)/ИТМ(1) (голы хозяев)\n' +
                  '• away - для ИТБ(2)/ИТМ(2) (голы гостей)\n' +
                  '• difference - для фор (разница голов)',
                condition: (_, siblingData) => {
                  // Показываем если НЕ выбран оператор "in" (для двойного шанса)
                  // И НЕ выбран оператор "eq" (для исходов матча)
                  const operator = siblingData?.comparisonOperator
                  return operator !== 'in' && operator !== 'eq'
                },
              },
            },
            {
              name: 'value',
              type: 'number',
              admin: {
                description:
                  '🔢 Фиксированное значение для проверки условия.\n\n' +
                  '**ОЗ Да/Нет (calculationType=min):** укажите 1\n' +
                  '**Комбинированные исходы:** конкретное значение\n\n' +
                  '💡 Для ТБ/ТМ/ИТБ/ИТМ/Фор это поле НЕ показывается.\n' +
                  'Пользователь выберет значение из "Values" ниже.',
                condition: (_, siblingData) => {
                  // Показываем только для min (ОЗ) и max (ре��ко)
                  // НЕ показываем для sum (ТБ/ТМ), home (ИТБ1), away (ИТБ2), difference (Форы)
                  const showForTypes = ['min', 'max']
                  
                  return (
                    siblingData?.calculationType &&
                    showForTypes.includes(siblingData.calculationType) &&
                    !['between', 'in', 'even', 'odd'].includes(
                      siblingData?.comparisonOperator,
                    )
                  )
                },
              },
            },
            {
              name: 'outcomeValue',
              type: 'number',
              admin: {
                description: 'Значение исхода матча (1 = П1, 0 = Х, 2 = П2)',
                condition: (_, siblingData) =>
                  !siblingData?.calculationType &&
                  siblingData?.comparisonOperator === 'eq',
              },
            },
            {
              name: 'set',
              type: 'array',
              label: 'Множество значений',
              admin: {
                description:
                  'Для оператора "Принадлежность множеству". Пример: 1Х → [1, 0]',
                condition: (_, siblingData) =>
                  siblingData?.comparisonOperator === 'in',
              },
              fields: [{ name: 'value', type: 'number', required: true }],
            },
            {
              name: 'range',
              type: 'group',
              admin: {
                description: 'Для оператора "Диапазон (между)"',
                condition: (_, siblingData) =>
                  siblingData?.comparisonOperator === 'between',
              },
              fields: [
                {
                  name: 'lower',
                  type: 'number',
                  admin: { description: 'Нижняя граница (включительно)' },
                },
                {
                  name: 'upper',
                  type: 'number',
                  admin: { description: 'Верхняя граница (включительно)' },
                },
              ],
            },
          ],
        },
        {
          name: 'values',
          type: 'array',
          label: 'Значения для UI',
          admin: {
            description:
              '📊 Массив значений для выбора пользователем.\n\n' +
              '**Когда использовать:**\n' +
              '✅ Для исходов с линиями: ТБ, ТМ, ИТБ, ИТМ, Форы\n' +
              '❌ Для фиксированных: П1, Х, П2, ОЗ, 1Х, 12, Х2\n\n' +
              '**Пример для ТБ:**\n' +
              '• Добавьте значения: 0.5, 1.5, 2.5, 3.5, 4.5, 5.5\n' +
              '• НЕ заполняйте value в Conditions!\n' +
              '• Пользователь выберет "ТБ 2.5", система подставит 2.5 в условие\n\n' +
              '**Пример для П1:**\n' +
              '• Values оставьте пустым\n' +
              '• Заполните outcomeValue=1 в Conditions',
          },
          fields: [
            {
              name: 'value',
              type: 'number',
              required: true,
              admin: {
                description: 'Числовое значение (например, 2.5)',
              },
            },
          ],
        },
        {
          name: 'conditionLogic',
          type: 'select',
          options: [
            {
              label: 'И (AND) — все условия должны выполняться',
              value: 'AND',
            },
            {
              label: 'ИЛИ (OR) — хотя бы одно условие должно выполняться',
              value: 'OR',
            },
          ],
          defaultValue: 'AND',
          admin: {
            description:
              'Логика объединения условий. Показывается только если условий больше одного.',
            condition: (_, siblingData) =>
              Array.isArray(siblingData?.conditions) &&
              siblingData.conditions.length > 1,
          },
        },
      ],
    },
  ],
  timestamps: true,
}

export default OutcomeGroups
