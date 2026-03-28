import type { CollectionConfig } from 'payload'

const Countries: CollectionConfig = {
  slug: 'countries',
  admin: {
    useAsTitle: 'name',
    description: 'Страны для футбольных команд и лиг',
    group: 'Футбольные данные',
  },
  access: {
    read: () => true, // Доступно всем для чтения
    create: () => false, // Создание только через синхронизацию
    update: () => false, // Обновление только через синхронизацию
    delete: () => false, // Удаление только через синхронизацию
  },
  fields: [
    // Основная информация о стране
    {
      name: 'countryId',
      type: 'number',
      required: true,
      unique: true,
      label: 'ID страны',
      admin: {
        description: 'Уникальный ID страны из LiveScore API',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Название страны',
      admin: {
        description: 'Полное название страны',
      },
    },

    // Флаг и код
    {
      name: 'flag',
      type: 'text',
      label: 'Флаг',
      admin: {
        description: 'URL флага страны',
      },
    },
    {
      name: 'fifaCode',
      type: 'text',
      label: 'FIFA код',
      admin: {
        description: 'Трёхбуквенный код страны по FIFA (например: RUS, GER)',
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
      fields: ['name'],
    },
    {
      fields: ['fifaCode'],
    },
    {
      fields: ['lastSyncAt'],
    },
  ],

  // Настройки коллекции
  timestamps: true,
  versions: false, // Не нужно версионирование для справочных данных
}

export default Countries
