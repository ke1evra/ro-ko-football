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
    description: descriptions.outcomeGroups,
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
      label: 'Правая часть (условие)',
      admin: {
        description:
          'Правая часть формулы: как сравниваем метрику и с чем. Выберите оператор (comparisonOperator) и задайте значение/набор/диапазон/фильтр.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Название исхода (например: "ТБ", "ТМ", "П1", "Х", "П2")',
          },
        },
        {
          name: 'comparisonOperator',
          type: 'select',
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
            { label: 'Событие произошло (из ленты событий)', value: 'exists' },
          ],
          admin: {
            description:
              'Оператор сравнения. ТБ → Больше (>), ТМ → Меньше (<). Для диапазонов используйте "Диапазон (между)" и задайте границы ниже. Для двойного шанса и схожих — "Принадлежность множеству".',
          },
        },
        {
          name: 'scope',
          type: 'select',
          options: [
            { label: 'Обе команды (сумма)', value: 'both' },
            { label: 'Хозяева', value: 'home' },
            { label: 'Гости', value: 'away' },
            { label: 'Разница (фора)', value: 'difference' },
          ],
          defaultValue: 'both',
          admin: {
            description:
              'Область применения статистики. both = сумма home+away, home/away = значение команды, difference = home-away (для фор).',
          },
        },
        {
          name: 'aggregation',
          type: 'select',
          options: [
            { label: 'По умолчанию (от scope)', value: 'auto' },
            { label: 'Сумма', value: 'sum' },
            { label: 'Разница', value: 'difference' },
            { label: 'Минимум (например, для ОЗ)', value: 'min' },
            { label: 'Максимум', value: 'max' },
            { label: 'Чёт/Нечёт (по модулю 2)', value: 'parity' },
            { label: 'Прямое значение (без агрегации)', value: 'direct' },
          ],
          defaultValue: 'auto',
          admin: {
            description:
              'Способ вычисления фактического значения. Переопределяет поведение по умолчанию. Для «Обе забьют» выберите «Минимум». Для чёт/нечёт — «Чёт/Нечёт».',
          },
        },
        {
          name: 'range',
          type: 'group',
          admin: {
            description: 'Параметры для оператора "Диапазон (между)"',
            condition: (_, siblingData) => siblingData?.comparisonOperator === 'between',
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
        {
          name: 'set',
          type: 'array',
          label: 'Множество допустимых значений',
          admin: {
            description: 'Для оператора "Принадлежность множеству". Пример: П1/Х → [1, 0].',
          },
          fields: [
            { name: 'value', type: 'number', required: true },
          ],
          hooks: {
            beforeChange: [({ value }) => value],
          },
        },
        {
          name: 'eventFilter',
          type: 'group',
          admin: {
            description:
              'Параметры для оператора "Событие произошло": выберите тип события из MatchStats.events (например: red_card, penalty).',
            condition: (_, siblingData) => siblingData?.comparisonOperator === 'exists',
          },
          fields: [
            {
              name: 'type',
              type: 'select',
              options: [
                { label: 'Гол', value: 'goal' },
                { label: 'Автогол', value: 'own_goal' },
                { label: 'Пенальти', value: 'penalty' },
                { label: 'Жёлтая карточка', value: 'yellow_card' },
                { label: 'Красная карточка', value: 'red_card' },
                { label: 'VAR', value: 'var' },
                { label: 'Замена', value: 'substitution' },
              ],
              required: true,
            },
            {
              name: 'team',
              type: 'select',
              options: [
                { label: 'Любая', value: 'any' },
                { label: 'Хозяева', value: 'home' },
                { label: 'Гости', value: 'away' },
              ],
              defaultValue: 'any',
            },
            {
              name: 'period',
              type: 'select',
              options: [
                { label: 'Любой', value: 'any' },
                { label: '1-й тайм', value: '1h' },
                { label: '2-й тайм', value: '2h' },
              ],
              defaultValue: 'any',
            },
          ],
        },
        {
          name: 'outcomeValue',
          type: 'number',
          admin: {
            description:
              'Значение исхода для сравнения (например, для "П1" = 1, для "Х" = 0, для "П2" = 2). Оставьте пустым, если используются динамические значения.',
          },
        },
        {
          name: 'values',
          type: 'array',
          label: 'Значения',
          admin: {
            description:
              'Значения для этого исхода (например, 1.5, 2.0 для тоталов). Остав��те пустым для исходов без значений.',
          },
          fields: [
            {
              name: 'value',
              type: 'number',
              required: true,
              admin: {
                description: 'Числовое значение',
              },
            },
          ],
        },
        {
          name: 'conditions',
          type: 'array',
          label: 'Дополнительные условия',
          admin: {
            description:
              'Для комбинированных прогнозов (ОЗ + ТБ, ОЗ + ТМ и т.д.). Добавьте дополнительные условия, которые должны выполняться одновременно с основным.',
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
                description: 'Оператор сравнения для дополнительного условия',
              },
            },
            {
              name: 'scope',
              type: 'select',
              options: [
                { label: 'Обе команды (сумма)', value: 'both' },
                { label: 'Хозяева', value: 'home' },
                { label: 'Гости', value: 'away' },
                { label: 'Разница (фора)', value: 'difference' },
              ],
              defaultValue: 'both',
              admin: {
                description: 'Область применения статистики для этого условия',
              },
            },
            {
              name: 'aggregation',
              type: 'select',
              required: true,
              options: [
                { label: 'По умолчанию (от scope)', value: 'auto' },
                { label: 'Сумма', value: 'sum' },
                { label: 'Разница', value: 'difference' },
                { label: 'Минимум (например, для ОЗ)', value: 'min' },
                { label: 'Максимум', value: 'max' },
                { label: 'Чёт/Нечёт (по модулю 2)', value: 'parity' },
                { label: 'Прямое значение (без агрегации)', value: 'direct' },
              ],
              defaultValue: 'auto',
              admin: {
                description: 'Способ вычисления для этого условия',
              },
            },
            {
              name: 'values',
              type: 'array',
              label: 'Значения',
              admin: {
                description: 'Значения для сравнения в этом условии',
              },
              fields: [
                {
                  name: 'value',
                  type: 'number',
                  required: true,
                },
              ],
            },
            {
              name: 'range',
              type: 'group',
              admin: {
                description: 'Параметры для оператора "Диапазон (между)"',
                condition: (_, siblingData) => siblingData?.comparisonOperator === 'between',
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
            {
              name: 'set',
              type: 'array',
              label: 'Множество значений',
              admin: {
                description: 'Для оператора "Принадлежность множеству"',
                condition: (_, siblingData) => siblingData?.comparisonOperator === 'in',
              },
              fields: [{ name: 'value', type: 'number', required: true }],
            },
          ],
        },
        {
          name: 'conditionLogic',
          type: 'select',
          options: [
            { label: 'И (AND) — все условия должны выполняться', value: 'AND' },
            { label: 'ИЛИ (OR) — хотя бы одно условие должно выполняться', value: 'OR' },
          ],
          defaultValue: 'AND',
          admin: {
            description:
              'Логика объединения основного условия с дополнительными. AND = все условия истинны, OR = хотя бы одно истинно.',
            condition: (_, siblingData) =>
              Array.isArray(siblingData?.conditions) && siblingData.conditions.length > 0,
          },
        },
      ],
    },
  ],
  timestamps: true,
}

export default OutcomeGroups
