import type { CollectionConfig } from 'payload'

const Seasons: CollectionConfig = {
  slug: 'seasons',
  admin: {
    useAsTitle: 'name',
    description: 'Сезоны футбольных лиг',
    group: 'Футбольные данные',
  },
  access: {
    read: () => true, // Доступно всем для чтения
    create: () => false, // Создание только через синхронизацию
    update: () => false, // Обновление только через синхронизацию
    delete: () => false, // Удаление только через синхронизацию
  },
  fields: [
    // Основная информация о сезоне
    {
      name: 'seasonId',
      type: 'number',
      required: true,
      unique: true,
      label: 'ID сезона',
      admin: {
        description: 'Уникальный ID сезона из LiveScore API',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Название сезона',
      admin: {
        description: 'Человеко-читаемое название сезона (2024/25, 2024, etc.)',
      },
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      label: 'Дата начала',
      admin: {
        description: 'Дата начала сезона',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      label: 'Дата окончания',
      admin: {
        description: 'Дата окончания сезона',
      },
    },
    {
      name: 'isCurrent',
      type: 'checkbox',
      required: true,
      label: 'Текущий сезон',
      admin: {
        description: 'Является ли этот сезон текущим активным сезоном',
      },
    },

    // Связь с лигой
    {
      name: 'league',
      type: 'relationship',
      required: true,
      relationTo: 'leagues',
      label: 'Лига',
      admin: {
        description: 'Лига, к которой относится сезон',
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
      fields: ['seasonId'],
      unique: true,
    },
    {
      fields: ['league'],
    },
    {
      fields: ['isCurrent'],
    },
    {
      fields: ['startDate'],
    },
    {
      fields: ['endDate'],
    },
    {
      fields: ['league', 'isCurrent'],
    },
  ],

  // Настройки коллекции
  timestamps: true,
  versions: false, // Не нужно версионирование для справочных данных
}

export default Seasons