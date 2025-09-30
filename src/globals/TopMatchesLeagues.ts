import type { GlobalConfig } from 'payload'

export const TopMatchesLeagues: GlobalConfig = {
  slug: 'topMatchesLeagues',
  label: 'Лиги для топ матчей',
  admin: {
    description: 'Настройка лиг для виджета топ матчей на главной странице',
  },
  access: {
    read: () => true,
    update: ({ req }) => {
      const user: any = req.user
      return Boolean(user?.role === 'admin')
    },
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      label: 'Включить виджет топ матчей',
      defaultValue: true,
      admin: {
        description: 'Показывать ли виджет топ матчей на сайте',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок виджета',
      defaultValue: 'Топ матчи',
      admin: {
        description: 'Заголовок, который будет отображаться над виджетом',
      },
    },
    {
      name: 'maxMatches',
      type: 'number',
      label: 'Максимум матчей',
      defaultValue: 10,
      min: 1,
      max: 50,
      admin: {
        description: 'Максимальное количество матчей для показа в виджете',
      },
    },
    {
      name: 'leagues',
      type: 'array',
      label: 'Лиги',
      minRows: 1,
      admin: {
        description: 'Выберите лиги для отображения в виджете топ матчей',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'league',
          type: 'relationship',
          relationTo: 'leagues',
          required: true,
          admin: {
            description: 'Выберите лигу',
            sortOptions: 'name',
          },
        },
        {
          name: 'priority',
          type: 'number',
          label: 'Приоритет',
          defaultValue: 1,
          min: 1,
          max: 100,
          admin: {
            description: 'Приоритет лиги (меньше число = выше приоритет)',
          },
        },
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Включена',
          defaultValue: true,
          admin: {
            description: 'Показывать ли матчи из этой лиги',
          },
        },
      ],
    },
    {
      name: 'filterSettings',
      type: 'group',
      label: 'Настройки фильтрации',
      admin: {
        description: 'Дополнительные настройки для фильтрации матчей',
      },
      fields: [
        {
          name: 'showOnlyActive',
          type: 'checkbox',
          label: 'Только активные лиги',
          defaultValue: true,
          admin: {
            description: 'Показывать матчи только из активных лиг',
          },
        },
        {
          name: 'timeRange',
          type: 'select',
          label: 'Временной диапазон',
          defaultValue: 'today',
          options: [
            { label: 'Сегодня', value: 'today' },
            { label: 'Завтра', value: 'tomorrow' },
            { label: 'Эта неделя', value: 'week' },
            { label: 'Этот месяц', value: 'month' },
          ],
          admin: {
            description: 'В каком временном диапазоне искать матчи',
          },
        },
        {
          name: 'excludeFinished',
          type: 'checkbox',
          label: 'Исключить завершённые',
          defaultValue: false,
          admin: {
            description: 'Не показывать завершённые матчи',
          },
        },
      ],
    },
  ],
}