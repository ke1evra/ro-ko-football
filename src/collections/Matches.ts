import { descriptions } from '@/lib/admin/descriptions'
import type { CollectionConfig, PayloadRequest } from 'payload'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const Matches: CollectionConfig = {
  slug: 'matches',
  labels: {
    singular: 'Матч',
    plural: 'Матчи',
  },
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: [
      'displayName',
      'league',
      'competitionId',
      'status',
      'date',
      'homeScore',
      'awayScore',
    ],
    listSearchableFields: [
      'matchId',
      'competitionId',
      'homeTeam',
      'awayTeam',
      'competition',
      'country.name',
      'federation.name',
    ],
    group: 'Футбольные данные',
    description: descriptions.matches,
    pagination: {
      defaultLimit: 25,
      limits: [10, 25, 50, 100],
    },
  },
  access: {
    read: () => true,
    create: ({ req }) => isAdmin(req),
    update: ({ req }) => isAdmin(req),
    delete: ({ req }) => isAdmin(req),
  },
  fields: [
    // Идентификаторы
    {
      name: 'matchId',
      type: 'number',
      required: true,
      unique: true,
      admin: { description: 'ID матча из внешнего API', position: 'sidebar' },
    },
    {
      name: 'fixtureId',
      type: 'number',
      admin: {
        description: 'ID фикстуры из внешнего API (если отличается от matchId)',
        position: 'sidebar',
      },
    },
    {
      name: 'externalId',
      type: 'text',
      admin: { description: 'Дополнительный внешний идентификатор', position: 'sidebar' },
    },

    // Заголовок
    {
      name: 'displayName',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [
          ({ data }) => {
            const home = data?.homeTeam || 'Команда 1'
            const away = data?.awayTeam || 'Команда 2'
            const score =
              data?.status === 'finished' && data?.homeScore != null && data?.awayScore != null
                ? ` ${data.homeScore}:${data.awayScore}`
                : ''
            return `${home} - ${away}${score}`
          },
        ],
      },
    },

    // Дата/время и статусы
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: { description: 'Дата матча (ISO-8601, UTC)' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      options: [
        { label: 'Запланирован', value: 'scheduled' },
        { label: 'Идёт', value: 'live' },
        { label: 'Перерыв', value: 'halftime' },
        { label: 'Завершён', value: 'finished' },
        { label: 'Отменён', value: 'cancelled' },
        { label: 'Перенесён', value: 'postponed' },
        { label: 'Прерван', value: 'suspended' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'minute',
      type: 'number',
      admin: { description: 'Минута матча (для live)', position: 'sidebar' },
    },
    {
      name: 'period',
      type: 'select',
      options: [
        { label: 'Не начался', value: 'not_started' },
        { label: '1-й тайм', value: 'first_half' },
        { label: 'Перерыв', value: 'halftime' },
        { label: '2-й тайм', value: 'second_half' },
        { label: 'Доп. время', value: 'extra_time' },
        { label: 'Пенальти', value: 'penalties' },
        { label: 'Завершён', value: 'finished' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'time', type: 'text', admin: { description: 'Строка времени из API (например, FT)' } },
    {
      name: 'scheduled',
      type: 'text',
      admin: { description: 'Плановое время начала (например, 00:30)' },
    },
    {
      name: 'addedAt',
      type: 'date',
      admin: { description: 'Время добавления матча в провайдере' },
    },
    {
      name: 'lastChangedAt',
      type: 'date',
      admin: { description: 'Время последнего изменения в провайдере' },
    },

    // Команды
    {
      name: 'homeTeam',
      type: 'text',
      required: true,
      admin: { description: 'Название команды хозяев' },
    },
    {
      name: 'homeTeamId',
      type: 'number',
      admin: { description: 'ID команды хозяев из API', position: 'sidebar' },
    },
    { name: 'homeLogo', type: 'text', admin: { description: 'URL логотипа хозяев' } },
    {
      name: 'homeCountryId',
      type: 'number',
      admin: { description: 'Страна хозяев (ID)', position: 'sidebar' },
    },
    { name: 'homeStadium', type: 'text', admin: { description: 'Стадион хозяев (из API)' } },

    {
      name: 'awayTeam',
      type: 'text',
      required: true,
      admin: { description: 'Название команды гостей' },
    },
    {
      name: 'awayTeamId',
      type: 'number',
      admin: { description: 'ID команды гостей из API', position: 'sidebar' },
    },
    { name: 'awayLogo', type: 'text', admin: { description: 'URL логотипа гостей' } },
    {
      name: 'awayCountryId',
      type: 'number',
      admin: { description: 'Страна гостей (ID)', position: 'sidebar' },
    },
    { name: 'awayStadium', type: 'text', admin: { description: 'Стадион гостей (из API)' } },

    // Счёт (нормализованный)
    { name: 'homeScore', type: 'number', admin: { description: 'Голы хозяев' } },
    { name: 'awayScore', type: 'number', admin: { description: 'Голы гостей' } },
    { name: 'homeScoreHalftime', type: 'number', admin: { description: 'Голы хозяев к перерыву' } },
    { name: 'awayScoreHalftime', type: 'number', admin: { description: 'Голы гостей к перерыву' } },
    {
      name: 'homeScoreExtraTime',
      type: 'number',
      admin: { description: 'Голы хозяев в доп. время' },
    },
    {
      name: 'awayScoreExtraTime',
      type: 'number',
      admin: { description: 'Голы гостей в доп. время' },
    },
    {
      name: 'homeScorePenalties',
      type: 'number',
      admin: { description: 'Голы хозяев в серии пенальти' },
    },
    {
      name: 'awayScorePenalties',
      type: 'number',
      admin: { description: 'Голы гостей в серии пенальти' },
    },

    // Счёт (сырые строки из API)
    {
      name: 'scoresRaw',
      type: 'group',
      admin: { description: 'Исходные строковые значения счёта из API' },
      fields: [
        { name: 'score', type: 'text' },
        { name: 'htScore', type: 'text' },
        { name: 'ftScore', type: 'text' },
        { name: 'etScore', type: 'text' },
        { name: 'psScore', type: 'text' },
      ],
    },

    // Соревнование
    { name: 'competition', type: 'text', admin: { description: 'Название соревнования' } },
    { name: 'competitionId', type: 'number', admin: { description: 'ID соревнования из API' } },
    {
      name: 'competitionDetails',
      type: 'group',
      admin: { description: 'Доп. детали соревнования из API' },
      fields: [
        { name: 'isCup', type: 'checkbox', defaultValue: false },
        { name: 'isLeague', type: 'checkbox', defaultValue: false },
        { name: 'hasGroups', type: 'checkbox', defaultValue: false },
        { name: 'nationalTeamsOnly', type: 'checkbox', defaultValue: false },
        { name: 'active', type: 'checkbox', defaultValue: true },
        { name: 'tier', type: 'number' },
      ],
    },

    {
      name: 'federation',
      type: 'group',
      admin: { description: 'Федерация (если есть)' },
      fields: [
        { name: 'federationId', type: 'number' },
        { name: 'name', type: 'text' },
      ],
    },

    {
      name: 'country',
      type: 'group',
      admin: { description: 'Страна матча (если есть)' },
      fields: [
        { name: 'countryId', type: 'number' },
        { name: 'name', type: 'text' },
        { name: 'flag', type: 'text' },
        { name: 'fifaCode', type: 'text' },
        { name: 'uefaCode', type: 'text' },
        { name: 'isReal', type: 'checkbox' },
      ],
    },

    {
      name: 'groupId',
      type: 'number',
      admin: { description: 'Группа/подгруппа (если есть)', position: 'sidebar' },
    },

    {
      name: 'league',
      type: 'relationship',
      relationTo: 'leagues',
      admin: { description: 'Связь с лигой из нашей базы' },
    },

    {
      name: 'season',
      type: 'group',
      admin: { description: 'Информация о сезоне' },
      fields: [
        { name: 'seasonId', type: 'number' },
        { name: 'name', type: 'text' },
        { name: 'year', type: 'text' },
      ],
    },

    { name: 'round', type: 'text', admin: { description: 'Тур/раунд соревнования' } },

    // Локация
    { name: 'location', type: 'text', admin: { description: 'Локация из API (строка)' } },
    {
      name: 'venue',
      type: 'group',
      admin: { description: 'Информация о стадионе' },
      fields: [
        { name: 'name', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'country', type: 'text' },
      ],
    },
    { name: 'referee', type: 'text', admin: { description: 'Главный судья' } },

    // Итоги/исходы
    {
      name: 'outcomes',
      type: 'group',
      admin: { description: 'Исходы из API (строки: 1/X/2)' },
      fields: [
        { name: 'halfTime', type: 'text' },
        { name: 'fullTime', type: 'text' },
        { name: 'extraTime', type: 'text' },
        { name: 'penaltyShootout', type: 'text' },
      ],
    },

    // Коэффициенты
    {
      name: 'odds',
      type: 'group',
      admin: { description: 'Коэффициенты' },
      fields: [
        {
          name: 'pre',
          type: 'group',
          fields: [
            { name: 'home', type: 'number' },
            { name: 'draw', type: 'number' },
            { name: 'away', type: 'number' },
          ],
        },
        {
          name: 'live',
          type: 'group',
          fields: [
            { name: 'home', type: 'number' },
            { name: 'draw', type: 'number' },
            { name: 'away', type: 'number' },
          ],
        },
      ],
    },

    // Ссылки из API
    {
      name: 'urls',
      type: 'group',
      admin: { description: 'Ссылки на события/статистику/составы/Н2Н' },
      fields: [
        { name: 'events', type: 'text' },
        { name: 'statistics', type: 'text' },
        { name: 'lineups', type: 'text' },
        { name: 'head2head', type: 'text' },
      ],
    },

    // Метаданные синхронизации
    {
      name: 'lastSyncAt',
      type: 'date',
      admin: { description: 'Время последней синхронизации', position: 'sidebar' },
    },
    {
      name: 'syncSource',
      type: 'select',
      options: [
        { label: 'History API', value: 'history' },
        { label: 'Live API', value: 'live' },
        { label: 'Fixtures API', value: 'fixtures' },
        { label: 'Manual', value: 'manual' },
      ],
      admin: { description: 'Источник данных', position: 'sidebar' },
    },
    {
      name: 'hasStats',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Есть ли статистика матча', position: 'sidebar' },
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 999,
      admin: { description: 'Приоритет матча (меньше = выше)', position: 'sidebar' },
    },

    // Сырой ответ API (для отладки/полноты)
    { name: 'raw', type: 'json', admin: { description: 'Оригинальный объект матча из API' } },
  ],
  timestamps: true,
}

export default Matches
