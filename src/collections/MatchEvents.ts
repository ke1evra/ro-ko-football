import type { CollectionConfig } from 'payload'

const MatchEvents: CollectionConfig = {
  slug: 'matchEvents',
  admin: {
    useAsTitle: 'type',
    description: 'События матчей (голы, карточки, замены)',
    group: 'Футбольные данные',
  },
  access: {
    read: () => true, // Доступно всем для чтения
    create: () => false, // Создание только через синхронизацию
    update: () => false, // Обновление только через синхронизацию
    delete: () => false, // Удаление только через синхронизацию
  },
  fields: [
    // Связь с матчем
    {
      name: 'match',
      type: 'relationship',
      required: true,
      relationTo: 'matches',
      label: 'Матч',
      admin: {
        description: 'Матч, к которому относится событие',
      },
    },

    // Время события
    {
      name: 'minute',
      type: 'number',
      required: true,
      label: 'Минута',
      admin: {
        description: 'Минута матча, когда произошло событие',
      },
    },

    // Тип события
    {
      name: 'type',
      type: 'select',
      required: true,
      label: 'Тип события',
      options: [
        { label: 'Гол', value: 'goal' },
        { label: 'Жёлтая карточка', value: 'yellow' },
        { label: 'Красная карточка', value: 'red' },
        { label: 'Замена', value: 'substitution' },
        { label: 'Автогол', value: 'own_goal' },
        { label: 'Пенальти', value: 'penalty' },
        { label: 'VAR', value: 'var' },
        { label: 'Другое', value: 'other' },
      ],
      admin: {
        description: 'Тип произошедшего события',
      },
    },

    // Команда
    {
      name: 'team',
      type: 'select',
      required: true,
      label: 'Команда',
      options: [
        { label: 'Хозяева', value: 'home' },
        { label: 'Гости', value: 'away' },
      ],
      admin: {
        description: 'Команда, которая совершила действие',
      },
    },

    // Информация об игроке
    {
      name: 'player',
      type: 'group',
      label: 'Игрок',
      fields: [
        {
          name: 'id',
          type: 'number',
          label: 'ID игрока',
        },
        {
          name: 'name',
          type: 'text',
          label: 'Имя игрока',
        },
      ],
    },

    // Дополнительная информация для разных типов событий
    {
      name: 'assistPlayer',
      type: 'text',
      label: 'Ассистент',
      admin: {
        description: 'Игрок, отдавший голевую передачу',
        condition: (data) => data?.type === 'goal',
      },
    },
    {
      name: 'playerOut',
      type: 'text',
      label: 'Ушёл с поля',
      admin: {
        description: 'Игрок, которого заменили',
        condition: (data) => data?.type === 'substitution',
      },
    },
    {
      name: 'playerIn',
      type: 'text',
      label: 'Вышел на поле',
      admin: {
        description: 'Игрок, который вышел на замену',
        condition: (data) => data?.type === 'substitution',
      },
    },

    // Описание события
    {
      name: 'description',
      type: 'text',
      label: 'Описание',
      admin: {
        description: 'Дополнительное описание события',
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
      fields: ['match'],
    },
    {
      fields: ['match', 'minute'],
    },
    {
      fields: ['type'],
    },
    {
      fields: ['team'],
    },
    {
      fields: ['lastSyncAt'],
    },
    {
      fields: ['match', 'type'],
    },
  ],

  // Настройки коллекции
  timestamps: true,
  versions: false, // Не нужно версионирование для событий матчей
}

export default MatchEvents
