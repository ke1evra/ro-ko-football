import type { CollectionConfig, PayloadRequest } from 'payload'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const PredictionStats: CollectionConfig = {
  slug: 'predictionStats',
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['post', 'author', 'status', 'evaluatedAt'],
    listSearchableFields: ['post', 'author', 'matchId', 'fixtureId'],
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
    {
      name: 'displayName',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [
          ({ data }) => {
            const base = data?.post ? `Статистика прогноза` : 'Статистика прогноза'
            return base
          },
        ],
      },
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      admin: { description: 'Пост-прогноз, к которому относится статистика' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { description: 'Автор прогноза' },
    },
    {
      name: 'matchId',
      type: 'number',
      admin: { description: 'ID матча (из API)', position: 'sidebar' },
    },
    {
      name: 'fixtureId',
      type: 'number',
      admin: { description: 'ID фикстуры (из API)', position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'В ожидании', value: 'pending' },
        { label: 'Рассчитан', value: 'settled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'evaluatedAt',
      type: 'date',
      admin: { description: 'Время расчёта прогноза', position: 'sidebar' },
    },
    // Итоговая сводка по событиям
    {
      name: 'summary',
      type: 'group',
      admin: { description: 'Сводная статистика по событиям прогноза' },
      fields: [
        { name: 'total', type: 'number', admin: { description: 'Всего событий' } },
        { name: 'won', type: 'number', admin: { description: 'Выиграло' } },
        { name: 'lost', type: 'number', admin: { description: 'Проиграло' } },
        {
          name: 'undecided',
          type: 'number',
          admin: { description: 'Не определено (нет данных/матч не окончен)' },
        },
        { name: 'hitRate', type: 'number', admin: { description: 'Процент попаданий (0..1)' } },
        {
          name: 'roi',
          type: 'number',
          admin: { description: 'ROI по коэффициентам (если заданы), например 0.12 = +12%' },
        },
      ],
    },
    // Детализация по каждому событию
    {
      name: 'details',
      type: 'array',
      admin: { description: 'Результаты по отдельным событиям' },
      fields: [
        {
          name: 'event',
          type: 'text',
          required: true,
          admin: { description: 'Строка события (например, "ТБ 2.5", "УГ ТМ 9.5")' },
        },
        {
          name: 'coefficient',
          type: 'number',
          admin: { description: 'Коэффициент (если есть)', position: 'sidebar' },
        },
        {
          name: 'result',
          type: 'select',
          required: true,
          options: [
            { label: 'Выигрыш', value: 'won' },
            { label: 'Проигрыш', value: 'lost' },
            { label: 'Не определено', value: 'undecided' },
          ],
          admin: { description: 'Итог по событию' },
        },
        {
          name: 'reason',
          type: 'select',
          options: [
            { label: 'Неподдерживаемое событие', value: 'unsupported_event' },
            { label: 'Матч не окончен', value: 'match_not_finished' },
            { label: 'Нет счёта', value: 'no_score' },
            { label: 'Статистика недоступна', value: 'stat_unavailable' },
            { label: 'Иное', value: 'unreachable' },
          ],
          admin: { description: 'Причина, если результат не определён' },
        },
      ],
    },
    // Начисление очков согласно правилам MVP (CLAUDE): outcome=2, exact=5
    {
      name: 'scoring',
      type: 'group',
      admin: { description: 'Начисленные очки по прогнозу' },
      fields: [
        { name: 'points', type: 'number', defaultValue: 0, admin: { description: 'Сумма очков' } },
        { name: 'breakdown', type: 'json', admin: { description: 'Детализация расчёта (JSON)' } },
      ],
    },
  ],
  timestamps: true,
}

export default PredictionStats
