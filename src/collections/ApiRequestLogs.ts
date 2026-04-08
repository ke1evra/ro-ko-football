import type { CollectionConfig } from 'payload'

const ApiRequestLogs: CollectionConfig = {
  slug: 'apiRequestLogs',
  admin: {
    useAsTitle: 'endpoint',
    description: 'Логи всех запросов к LiveScore API с метриками кэширования',
    group: 'API & Кэширование',
  },
  access: {
    read: ({ req }) => {
      // Только админы могут видеть логи
      const user = req.user as any
      return Boolean(user?.roles?.includes('admin'))
    },
    create: () => false, // Создание только через код
    update: () => false, // Обновление только через код
    delete: () => false, // Удаление только через код
  },
  fields: [
    // Идентификация запроса
    {
      name: 'endpoint',
      type: 'text',
      required: true,
      label: 'Эндпоинт API',
      admin: {
        description: 'Эндпоинт LiveScore API (/matches/live.json, /fixtures/matches.json)',
      },
    },
    {
      name: 'params',
      type: 'json',
      label: 'Параметры запроса',
      admin: {
        description: 'Параметры, переданные в запрос',
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      label: 'Источник запроса',
      options: [
        { label: 'API Route', value: 'api-route' },
        { label: 'Страница', value: 'page' },
        { label: 'Скрипт', value: 'script' },
        { label: 'Компонент', value: 'component' },
        { label: 'Виджет', value: 'widget' },
      ],
      admin: {
        description: 'Откуда был сделан запрос',
      },
    },

    // Статус и время
    {
      name: 'statusCode',
      type: 'number',
      required: true,
      label: 'HTTP статус код',
      admin: {
        description: 'Статус код ответа от LiveScore API',
      },
    },
    {
      name: 'duration',
      type: 'number',
      required: true,
      label: 'Время выполнения (мс)',
      admin: {
        description: 'Общее время выполнения запроса в миллисекундах',
      },
    },

    // Детальное логирование кэширования
    {
      name: 'cacheLevel',
      type: 'select',
      required: true,
      label: 'Уровень кэша',
      options: [
        { label: 'Memory Cache', value: 'memory' },
        { label: 'Database Cache', value: 'database' },
        { label: 'LiveScore API', value: 'livescore' },
      ],
      admin: {
        description: 'Откуда были получены данные',
      },
    },

    // Статистика по уровням кэша
    {
      name: 'cacheStats',
      type: 'group',
      label: 'Статистика кэширования',
      fields: [
        // УРОВЕНЬ 1: In-Memory Cache
        {
          name: 'memoryCache',
          type: 'group',
          label: 'Memory Cache',
          fields: [
            {
              name: 'hit',
              type: 'checkbox',
              label: 'Попадание в кэш',
              admin: {
                description: 'Было ли попадание в in-memory кэш',
              },
            },
            {
              name: 'ttl',
              type: 'number',
              label: 'TTL (секунды)',
              admin: {
                description: 'Время жизни записи в кэше',
              },
            },
            {
              name: 'age',
              type: 'number',
              label: 'Возраст данных (секунды)',
              admin: {
                description: 'Как давно данные были помещены в кэш',
              },
            },
          ],
        },

        // УРОВЕНЬ 2: MongoDB (Payload)
        {
          name: 'database',
          type: 'group',
          label: 'Database Cache',
          fields: [
            {
              name: 'hit',
              type: 'checkbox',
              label: 'Попадание в БД',
              admin: {
                description: 'Были ли данные найдены в MongoDB',
              },
            },
            {
              name: 'lastSyncAt',
              type: 'date',
              label: 'Последняя синхронизация',
              admin: {
                description: 'Когда данные последний раз синхронизировались',
              },
            },
            {
              name: 'isStale',
              type: 'checkbox',
              label: 'Данные устарели',
              admin: {
                description: 'Устарели ли данные в БД',
              },
            },
            {
              name: 'staleSince',
              type: 'number',
              label: 'Устарели на (секунды)',
              admin: {
                description: 'Сколько времени прошло с момента устаревания',
              },
            },
          ],
        },

        // УРОВЕНЬ 3: LiveScore API
        {
          name: 'livescoreApi',
          type: 'group',
          label: 'LiveScore API',
          fields: [
            {
              name: 'called',
              type: 'checkbox',
              label: 'Был вызов API',
              admin: {
                description: 'Был ли сделан запрос к LiveScore API',
              },
            },
            {
              name: 'statusCode',
              type: 'number',
              label: 'HTTP статус API',
              admin: {
                description: 'Статус код ответа от LiveScore API',
              },
            },
            {
              name: 'duration',
              type: 'number',
              label: 'Время ответа API (мс)',
              admin: {
                description: 'Время ответа от LiveScore API',
              },
            },
            {
              name: 'cached',
              type: 'checkbox',
              label: 'Результат сохранён',
              admin: {
                description: 'Был ли результат сохранён в БД',
              },
            },
            {
              name: 'attempt',
              type: 'number',
              label: 'Номер попытки',
              admin: {
                description: 'Номер попытки при retry',
              },
            },
          ],
        },
      ],
    },

    // Итоговая статистика
    {
      name: 'summary',
      type: 'group',
      label: 'Итоговая статистика',
      fields: [
        {
          name: 'totalRequests',
          type: 'number',
          label: 'Всего запросов за период',
          admin: {
            description: 'Общее количество запросов за период времени',
          },
        },
        {
          name: 'cacheHits',
          type: 'number',
          label: 'Попаданий в кэш',
          admin: {
            description: 'Количество попаданий в кэш (память + БД)',
          },
        },
        {
          name: 'memoryHits',
          type: 'number',
          label: 'Попаданий в память',
          admin: {
            description: 'Количество попаданий в in-memory кэш',
          },
        },
        {
          name: 'databaseHits',
          type: 'number',
          label: 'Попаданий в БД',
          admin: {
            description: 'Количество попаданий в MongoDB',
          },
        },
        {
          name: 'livescoreApiCalls',
          type: 'number',
          label: 'Вызовов LiveScore API',
          admin: {
            description: 'Количество обращений к LiveScore API',
          },
        },
        {
          name: 'cacheHitRate',
          type: 'number',
          label: 'Эффективность кэша (%)',
          admin: {
            description: 'Процент попаданий в кэш (память + БД)',
          },
        },
        {
          name: 'avgDuration',
          type: 'number',
          label: 'Среднее время ответа (мс)',
          admin: {
            description: 'Среднее время выполнения запросов',
          },
        },
      ],
    },

    // Метаданные
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      label: 'Пользователь',
      admin: {
        description: 'Пользователь, сделавший запрос (если авторизован)',
      },
    },
    {
      name: 'ipAddress',
      type: 'text',
      label: 'IP адрес',
      admin: {
        description: 'IP адрес клиента',
      },
    },
    {
      name: 'userAgent',
      type: 'text',
      label: 'User Agent',
      admin: {
        description: 'User Agent браузера/клиента',
      },
    },
  ],

  // Индексы для быстрого поиска
  // Примечание: createdAt индексируется автоматически через timestamps: true
  indexes: [
    {
      fields: ['endpoint'],
    },
    {
      fields: ['cacheLevel'],
    },
    {
      fields: ['source'],
    },
    {
      fields: ['endpoint', 'createdAt'],
    },
  ],

  // Настройки коллекции
  timestamps: true, // Автоматическое управление createdAt
  versions: false, // Не нужно версионирование для логов
}

export default ApiRequestLogs
