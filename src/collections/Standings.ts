import type { CollectionConfig } from 'payload'

const Standings: CollectionConfig = {
  slug: 'standings',
  admin: {
    useAsTitle: 'position',
    description: 'Турнирные таблицы лиг',
    group: 'Футбольные данные',
  },
  access: {
    read: () => true, // Доступно всем для чтения
    create: () => false, // Создание только через синхронизацию
    update: () => false, // Обновление только через синхронизацию
    delete: () => false, // Удаление только через синхронизацию
  },
  fields: [
    // Связь с лигой и сезоном
    {
      name: 'league',
      type: 'relationship',
      required: true,
      relationTo: 'leagues',
      label: 'Лига',
      admin: {
        description: 'Лига, к которой относится таблица',
      },
    },
    {
      name: 'season',
      type: 'relationship',
      required: true,
      relationTo: 'seasons',
      label: 'Сезон',
      admin: {
        description: 'Сезон, к которому относится таблица',
      },
    },

    // Позиция в таблице
    {
      name: 'position',
      type: 'number',
      required: true,
      label: 'Позиция',
      admin: {
        description: 'Текущая позиция команды в таблице',
      },
    },

    // Информация о команде
    {
      name: 'team',
      type: 'group',
      required: true,
      label: 'Команда',
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
      ],
    },

    // Статистика матчей
    {
      name: 'played',
      type: 'number',
      required: true,
      label: 'Игр сыграно',
      admin: {
        description: 'Количество сыгранных матчей',
      },
    },
    {
      name: 'won',
      type: 'number',
      required: true,
      label: 'Побед',
      admin: {
        description: 'Количество побед',
      },
    },
    {
      name: 'drawn',
      type: 'number',
      required: true,
      label: 'Ничьих',
      admin: {
        description: 'Количество ничьих',
      },
    },
    {
      name: 'lost',
      type: 'number',
      required: true,
      label: 'Поражений',
      admin: {
        description: 'Количество поражений',
      },
    },

    // Голы
    {
      name: 'goalsFor',
      type: 'number',
      required: true,
      label: 'Забито',
      admin: {
        description: 'Количество забитых голов',
      },
    },
    {
      name: 'goalsAgainst',
      type: 'number',
      required: true,
      label: 'Пропущено',
      admin: {
        description: 'Количество пропущенных голов',
      },
    },

    // Очки и форма
    {
      name: 'points',
      type: 'number',
      required: true,
      label: 'Очки',
      admin: {
        description: 'Количество набранных очков',
      },
    },
    {
      name: 'form',
      type: 'text',
      label: 'Форма',
      admin: {
        description: 'Последние результаты (например: WWDLL)',
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
  ],

  // Индексы для быстрого поиска
  indexes: [
    {
      fields: ['league', 'season'],
    },
    {
      fields: ['league', 'season', 'position'],
    },
    {
      fields: ['position'],
    },
    {
      fields: ['lastSyncAt'],
    },
    {
      fields: ['team.id'],
    },
  ],

  // Настройки коллекции
  timestamps: true,
  versions: false, // Не нужно версионирование для кэшированных данных
}

export default Standings
