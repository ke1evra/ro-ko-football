import type { CollectionConfig } from 'payload'

const Fixtures: CollectionConfig = {
  slug: 'fixtures',
  admin: {
    useAsTitle: 'fixtureId',
    description: 'Фикстуры матчей с коэффициентами и историей',
    group: 'Футбольные данные',
  },
  access: {
    read: () => true, // Доступно всем для чтения
    create: () => false, // Создание только через синхронизацию
    update: () => false, // Обновление только через синхронизацию
    delete: () => false, // Удаление только через синхронизацию
  },
  fields: [
    // Основная информация о фикстуре
    {
      name: 'fixtureId',
      type: 'number',
      required: true,
      unique: true,
      label: 'ID фикстуры',
      admin: {
        description: 'Уникальный ID фикстуры из LiveScore API',
      },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      label: 'Дата матча',
      admin: {
        description: 'Дата проведения матча',
      },
    },
    {
      name: 'time',
      type: 'text',
      label: 'Время матча',
      admin: {
        description: 'Время начала матча (HH:MM)',
      },
    },

    // Информация о командах
    {
      name: 'homeTeam',
      type: 'group',
      required: true,
      label: 'Домашняя команда',
      fields: [
        {
          name: 'id',
          type: 'number',
          required: true,
          label: 'ID команды',
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Название команды',
        },
        {
          name: 'logo',
          type: 'text',
          label: 'Логотип',
          admin: {
            description: 'URL логотипа команды',
          },
        },
      ],
    },
    {
      name: 'awayTeam',
      type: 'group',
      required: true,
      label: 'Гостевая команда',
      fields: [
        {
          name: 'id',
          type: 'number',
          required: true,
          label: 'ID команды',
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Название команды',
        },
        {
          name: 'logo',
          type: 'text',
          label: 'Логотип',
          admin: {
            description: 'URL логотипа команды',
          },
        },
      ],
    },

    // Информация о соревновании
    {
      name: 'competition',
      type: 'group',
      required: true,
      label: 'Соревнование',
      fields: [
        {
          name: 'id',
          type: 'number',
          required: true,
          label: 'ID соревнования',
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Название соревнования',
        },
      ],
    },
    {
      name: 'league',
      type: 'relationship',
      required: true,
      relationTo: 'leagues',
      label: 'Лига',
      admin: {
        description: 'Связь с коллекцией лиг',
      },
    },

    // Статус матча
    {
      name: 'status',
      type: 'select',
      required: true,
      label: 'Статус матча',
      options: [
        { label: 'Запланирован', value: 'scheduled' },
        { label: 'Идёт', value: 'live' },
        { label: 'Завершён', value: 'finished' },
        { label: 'Отложен', value: 'postponed' },
        { label: 'Отменён', value: 'cancelled' },
      ],
      admin: {
        description: 'Текущий статус матча',
      },
    },

    // Дополнительная информация
    {
      name: 'round',
      type: 'text',
      label: 'Раунд',
      admin: {
        description: 'Раунд/тур соревнования',
      },
    },
    {
      name: 'group',
      type: 'text',
      label: 'Группа',
      admin: {
        description: 'Группа (для турниров с группами)',
      },
    },
    {
      name: 'venue',
      type: 'group',
      label: 'Стадион',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Название стадиона',
        },
        {
          name: 'city',
          type: 'text',
          label: 'Город',
        },
        {
          name: 'country',
          type: 'text',
          label: 'Страна',
        },
      ],
    },

    // Коэффициенты (текущие)
    {
      name: 'odds',
      type: 'group',
      label: 'Коэффициенты',
      fields: [
        {
          name: 'pre',
          type: 'group',
          label: 'Предматчевые',
          fields: [
            {
              name: 'home',
              type: 'number',
              label: 'П1',
              admin: {
                description: 'Коэффициент на победу хозяев',
                step: 0.01,
              },
            },
            {
              name: 'draw',
              type: 'number',
              label: 'X',
              admin: {
                description: 'Коэффициент на ничью',
                step: 0.01,
              },
            },
            {
              name: 'away',
              type: 'number',
              label: 'П2',
              admin: {
                description: 'Коэффициент на победу гостей',
                step: 0.01,
              },
            },
          ],
        },
        {
          name: 'live',
          type: 'group',
          label: 'Live',
          fields: [
            {
              name: 'home',
              type: 'number',
              label: 'П1',
              admin: {
                description: 'Live коэффициент на победу хозяев',
                step: 0.01,
              },
            },
            {
              name: 'draw',
              type: 'number',
              label: 'X',
              admin: {
                description: 'Live коэффициент на ничью',
                step: 0.01,
              },
            },
            {
              name: 'away',
              type: 'number',
              label: 'П2',
              admin: {
                description: 'Live коэффициент на победу гостей',
                step: 0.01,
              },
            },
          ],
        },
      ],
    },

    // История коэффициентов (ВСТРОЕННЫЙ МАССИВ)
    {
      name: 'oddsHistory',
      type: 'array',
      label: 'История коэффициентов',
      admin: {
        description: 'Полная история изменения коэффициентов',
      },
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          required: true,
          label: 'Время',
          admin: {
            description: 'Когда были зафиксированы коэффициенты',
          },
        },
        {
          name: 'odds',
          type: 'group',
          required: true,
          label: 'Коэффициенты',
          fields: [
            {
              name: 'pre',
              type: 'group',
              label: 'Предматчевые',
              fields: [
                {
                  name: 'home',
                  type: 'number',
                  label: 'П1',
                  admin: { step: 0.01 },
                },
                {
                  name: 'draw',
                  type: 'number',
                  label: 'X',
                  admin: { step: 0.01 },
                },
                {
                  name: 'away',
                  type: 'number',
                  label: 'П2',
                  admin: { step: 0.01 },
                },
              ],
            },
            {
              name: 'live',
              type: 'group',
              label: 'Live',
              fields: [
                {
                  name: 'home',
                  type: 'number',
                  label: 'П1',
                  admin: { step: 0.01 },
                },
                {
                  name: 'draw',
                  type: 'number',
                  label: 'X',
                  admin: { step: 0.01 },
                },
                {
                  name: 'away',
                  type: 'number',
                  label: 'П2',
                  admin: { step: 0.01 },
                },
              ],
            },
          ],
        },
        {
          name: 'source',
          type: 'select',
          required: true,
          label: 'Источник',
          options: [
            { label: 'API', value: 'api' },
            { label: 'Ручной ввод', value: 'manual' },
          ],
          admin: {
            description: 'Откуда получены коэффициенты',
          },
        },
      ],
    },

    // Связь с реальным матчем (когда фикстура становится матчем)
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      label: 'Связанный матч',
      admin: {
        description: 'Связь с реальным матчем из коллекции Matches',
      },
    },

    // Метаданные синхронизации
    {
      name: 'lastSyncAt',
      type: 'date',
      required: true,
      label: 'Последняя синхронизация',
      admin: {
        description: 'Когда данные последний раз синхронизировались с API',
      },
    },
    {
      name: 'syncSource',
      type: 'select',
      required: true,
      label: 'Источник синхронизации',
      options: [
        { label: 'Фикстуры', value: 'fixtures' },
        { label: 'Live матчи', value: 'live' },
        { label: 'Ручной ввод', value: 'manual' },
      ],
      admin: {
        description: 'Откуда получены данные',
      },
    },
  ],

  // Индексы для быстрого поиска
  indexes: [
    {
      fields: ['league'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['date'],
    },
    {
      fields: ['lastSyncAt'],
    },
    {
      fields: ['fixtureId', 'date'],
    },
  ],

  // Настройки коллекции
  timestamps: true,
  versions: false, // Не нужно версионирование для кэшированных данных
}

export default Fixtures
