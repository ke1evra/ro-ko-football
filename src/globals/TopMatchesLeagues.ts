import type { GlobalConfig } from 'payload'

export const TopMatchesLeagues: GlobalConfig = {
  slug: 'topMatchesLeagues',
  label: 'Топ-лиги (главная страница)',
  admin: {
    description:
      '⚽ **Виджет топ-матчей на главной странице**\n\n' +
      '**Что здесь делать:**\n' +
      '• Настраивать список лиг для отображения на главной странице\n' +
      '• Управлять приоритетами лиг (какие показывать первыми)\n' +
      '• Настраивать фильтры и временные диапазоны\n\n' +
      '**Как настроить:**\n' +
      '1. Включите виджет (галочка "Включить виджет топ матчей")\n' +
      '2. Укажите заголовок виджета\n' +
      '3. Установите максимальное количество матчей\n' +
      '4. Добавьте лиги через "Add Leagues"\n' +
      '5. Для каждой лиги установите приоритет (меньше число = выше в списке)\n' +
      '6. Настройте фильтры (временной диапазон, только активные и т.д.)\n\n' +
      '**Приоритеты:**\n' +
      '• 1-10: Топовые лиги (АПЛ, Ла Лига, Бундеслига)\n' +
      '• 11-50: Второстепенные лиги\n' +
      '• 51+: Остальные лиги\n\n' +
      '⚠️ Доступно только администраторам',
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
