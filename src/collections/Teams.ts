import type { CollectionConfig } from 'payload'

const Teams: CollectionConfig = {
  slug: 'teams',
  admin: {
    useAsTitle: 'name',
    description: 'Футбольные команды',
    group: 'Футбольные данные',
  },
  access: {
    read: () => true, // Доступно всем для чтения
    create: () => false, // Создание только через синхронизацию
    update: () => false, // Обновление только через синхронизацию
    delete: () => false, // Удаление только через синхронизацию
  },
  fields: [
    // Основная информация о команде
    {
      name: 'teamId',
      type: 'number',
      required: true,
      unique: true,
      label: 'ID команды',
      admin: {
        description: 'Уникальный ID команды из LiveScore API',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Название команды',
      admin: {
        description: 'Полное название команды',
      },
    },

    // Страна
    {
      name: 'country',
      type: 'group',
      required: true,
      label: 'Страна',
      fields: [
        {
          name: 'id',
          type: 'number',
          required: true,
          label: 'ID страны',
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Название страны',
        },
      ],
    },

    // Логотип и стадион
    {
      name: 'logo',
      type: 'text',
      label: 'Логотип',
      admin: {
        description: 'URL логотипа команды',
      },
    },
    {
      name: 'stadium',
      type: 'text',
      label: 'Стадион',
      admin: {
        description: 'Домашний стадион команды',
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
      fields: ['teamId'],
      unique: true,
    },
    {
      fields: ['name'],
    },
    {
      fields: ['country.id'],
    },
    {
      fields: ['lastSyncAt'],
    },
  ],

  // Настройки коллекции
  timestamps: true,
  versions: false, // Не нужно версионирование для справочных данных
}

export default Teams