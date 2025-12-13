import type { CollectionConfig, PayloadRequest } from 'payload'
import { descriptions } from '@/lib/admin/descriptions'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const MatchStats: CollectionConfig = {
  slug: 'matchStats',
  labels: {
    singular: 'Статистика матча',
    plural: 'Статистика матчей',
  },
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'match', 'lastSyncAt'],
    listSearchableFields: ['match'],
    group: 'Футбольные данные',
    description: descriptions.matchStats,
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
      name: 'matchId',
      type: 'number',
      required: true,
      unique: true,
      admin: {
        description: 'ID матча из внешнего API',
        position: 'sidebar',
      },
    },
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      required: true,
      admin: {
        description: 'Связь с матчем',
      },
    },
    {
      name: 'displayName',
      type: 'text',
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            return `Статистика матча ${data?.matchId || 'N/A'}`
          },
        ],
      },
    },
    // Общая статистика
    {
      name: 'possession',
      type: 'group',
      admin: { description: 'Владение мячом (%)' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'shots',
      type: 'group',
      admin: { description: 'Удары' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'shotsOnTarget',
      type: 'group',
      admin: { description: 'Удары в створ' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'shotsOffTarget',
      type: 'group',
      admin: { description: 'Удары мимо створа' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'shotsBlocked',
      type: 'group',
      admin: { description: 'Заблокирован��ые удары' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'corners',
      type: 'group',
      admin: { description: 'Угловые' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'offsides',
      type: 'group',
      admin: { description: 'Офсайды' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'fouls',
      type: 'group',
      admin: { description: 'Фолы' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'yellowCards',
      type: 'group',
      admin: { description: 'Жёлтые карточки' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'redCards',
      type: 'group',
      admin: { description: 'Красные карточки' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'saves',
      type: 'group',
      admin: { description: '��ейвы вратарей' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'passes',
      type: 'group',
      admin: { description: 'Передачи' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'passesAccurate',
      type: 'group',
      admin: { description: 'Точные передачи' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'passAccuracy',
      type: 'group',
      admin: { description: 'Точность передач (%)' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'attacks',
      type: 'group',
      admin: { description: 'Атаки' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    {
      name: 'dangerousAttacks',
      type: 'group',
      admin: { description: 'Опасные атаки' },
      fields: [
        { name: 'home', type: 'number' },
        { name: 'away', type: 'number' },
      ],
    },
    // Дополнительная стат��стика: сохраняем оригинальный JSON
    {
      name: 'additionalStats',
      type: 'json',
      admin: { description: 'Оригинальный ответ API статистики' },
    },
    // События матча
    {
      name: 'events',
      type: 'array',
      admin: { description: 'События матча (голы, карточки, замены)' },
      fields: [
        { name: 'minute', type: 'number', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Гол', value: 'goal' },
            { label: 'Автогол', value: 'own_goal' },
            { label: 'Пенальти', value: 'penalty' },
            { label: 'Жёлтая карточка', value: 'yellow_card' },
            { label: 'Красная карточка', value: 'red_card' },
            { label: 'Замена', value: 'substitution' },
            { label: 'VAR', value: 'var' },
            { label: 'Другое', value: 'other' },
          ],
        },
        {
          name: 'team',
          type: 'select',
          required: true,
          options: [
            { label: 'Хозяева', value: 'home' },
            { label: 'Гости', value: 'away' },
          ],
        },
        { name: 'player', type: 'text' },
        { name: 'assistPlayer', type: 'text' },
        { name: 'playerOut', type: 'text' },
        { name: 'playerIn', type: 'text' },
        { name: 'description', type: 'text' },
      ],
    },
    // Составы
    {
      name: 'lineups',
      type: 'group',
      admin: { description: 'Составы команд' },
      fields: [
        {
          name: 'home',
          type: 'group',
          fields: [
            { name: 'formation', type: 'text' },
            {
              name: 'startingXI',
              type: 'array',
              fields: [
                { name: 'number', type: 'number' },
                { name: 'name', type: 'text', required: true },
                { name: 'position', type: 'text' },
              ],
            },
            {
              name: 'substitutes',
              type: 'array',
              fields: [
                { name: 'number', type: 'number' },
                { name: 'name', type: 'text', required: true },
                { name: 'position', type: 'text' },
              ],
            },
          ],
        },
        {
          name: 'away',
          type: 'group',
          fields: [
            { name: 'formation', type: 'text' },
            {
              name: 'startingXI',
              type: 'array',
              fields: [
                { name: 'number', type: 'number' },
                { name: 'name', type: 'text', required: true },
                { name: 'position', type: 'text' },
              ],
            },
            {
              name: 'substitutes',
              type: 'array',
              fields: [
                { name: 'number', type: 'number' },
                { name: 'name', type: 'text', required: true },
                { name: 'position', type: 'text' },
              ],
            },
          ],
        },
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
        { label: 'Stats API', value: 'stats' },
        { label: 'Events API', value: 'events' },
        { label: 'Lineups API', value: 'lineups' },
        { label: 'Manual', value: 'manual' },
      ],
      admin: { description: 'Источник данных', position: 'sidebar' },
    },
    {
      name: 'dataQuality',
      type: 'select',
      defaultValue: 'partial',
      options: [
        { label: 'Полная', value: 'complete' },
        { label: 'Частичная', value: 'partial' },
        { label: 'Минимальная', value: 'minimal' },
        { label: 'Отсутствует', value: 'none' },
      ],
      admin: { description: 'Качество данных', position: 'sidebar' },
    },
  ],
  timestamps: true,
}

export default MatchStats
