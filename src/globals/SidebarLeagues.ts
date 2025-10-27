import type { GlobalConfig } from 'payload'

export const SidebarLeagues: GlobalConfig = {
  slug: 'sidebarLeagues',
  label: 'Лиги в сайдбаре',
  admin: {
    description: 'Настройка списка лиг для левого сайдбара сайта',
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
      label: 'Показывать лиги в сайдбаре',
      defaultValue: true,
      admin: {
        description: 'Включить/выключить отображение списка лиг в сайдбаре',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок секции',
      defaultValue: 'Лиги',
      admin: {
        description: 'Заголовок секции с лигами в сайдбаре',
      },
    },
    {
      name: 'maxItems',
      type: 'number',
      label: 'Максимум лиг',
      defaultValue: 15,
      min: 1,
      max: 50,
      admin: {
        description: 'Максимальное количество лиг для показа в сайдбаре',
      },
    },
    {
      name: 'showFlags',
      type: 'checkbox',
      label: 'Показывать флаги стран',
      defaultValue: true,
      admin: {
        description: 'Отображать флаги стран рядом с названиями лиг',
      },
    },
    {
      name: 'groupByCountry',
      type: 'checkbox',
      label: 'Группировать по странам',
      defaultValue: false,
      admin: {
        description: 'Группировать лиги по странам в сайдбаре',
      },
    },
    {
      name: 'leagues',
      type: 'array',
      label: 'Лиги',
      minRows: 1,
      admin: {
        description: 'Выберите лиги для отображения в сайдбаре',
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
          name: 'customName',
          type: 'text',
          label: 'Пользовательское название',
          admin: {
            description: 'Оставьте пустым для использования оригинального названия лиги',
          },
        },
        {
          name: 'priority',
          type: 'number',
          label: 'Порядок сортировки',
          defaultValue: 1,
          min: 1,
          max: 1000,
          admin: {
            description: 'Порядок отображения в сайдбаре (меньше число = выше в списке)',
          },
        },
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Включена',
          defaultValue: true,
          admin: {
            description: 'Показывать ли эту лигу в сайдбаре',
          },
        },
        {
          name: 'highlightColor',
          type: 'text',
          label: 'Цвет выделения',
          admin: {
            description: 'HEX-код цвета для выделения лиги (например, #ff0000)',
            placeholder: '#000000',
          },
        },
        {
          name: 'showMatchCount',
          type: 'checkbox',
          label: 'Показывать количество матчей',
          defaultValue: false,
          admin: {
            description: 'Отображать количество предстоящих матчей рядом с названием лиги',
          },
        },
      ],
    },
    {
      name: 'displaySettings',
      type: 'group',
      label: 'Настройки отображения',
      admin: {
        description: 'Дополнительные настройки внешнего вида сайдбара',
      },
      fields: [
        {
          name: 'showOnlyActive',
          type: 'checkbox',
          label: 'Только активные лиги',
          defaultValue: true,
          admin: {
            description: 'Показывать только активные лиги',
          },
        },
        {
          name: 'showTiers',
          type: 'checkbox',
          label: 'Показывать уровень лиги',
          defaultValue: false,
          admin: {
            description: 'Отображать уровень лиги (1-я лига, 2-я лига �� т.д.)',
          },
        },
        {
          name: 'compactMode',
          type: 'checkbox',
          label: 'Компактный режим',
          defaultValue: false,
          admin: {
            description: 'Более компактное отображение списка лиг',
          },
        },
        {
          name: 'showLogos',
          type: 'checkbox',
          label: 'Показывать логотипы лиг',
          defaultValue: false,
          admin: {
            description: 'Отображать логотипы лиг (если доступны)',
          },
        },
      ],
    },
  ],
}
