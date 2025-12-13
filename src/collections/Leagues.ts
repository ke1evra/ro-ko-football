import type { CollectionConfig, PayloadRequest } from 'payload'
import { descriptions } from '@/lib/admin/descriptions'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const Leagues: CollectionConfig = {
  slug: 'leagues',
  labels: {
    singular: 'Лига',
    plural: 'Лиги',
  },
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['name', 'competitionId', 'countryName', 'tier', 'active'],
    listSearchableFields: ['name', 'countryName'],
    group: 'Футбольные данные',
    description: descriptions.leagues,
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
      name: 'competitionId',
      type: 'number',
      required: true,
      unique: true,
      admin: {
        description: 'ID соревнования из внешнего API',
        position: 'sidebar',
      },
    },
    {
      name: 'externalId',
      type: 'text',
      required: false,
      admin: {
        description: 'Внешний идентификатор (если отличается от competitionId)',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Оригинальное название лиги из API',
      },
    },
    {
      name: 'customName',
      type: 'text',
      admin: {
        description: 'Пользовательское название лиги (переводы, сокращения и т.д.)',
        placeholder: 'Оставьте пустым для использования оригинального названи��',
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
            const name = data?.customName || data?.name || 'Без названия'
            if (data?.countryName) {
              return `${name} (${data.countryName})`
            }
            return name
          },
        ],
      },
    },
    {
      name: 'countryId',
      type: 'number',
      admin: {
        description: 'ID страны первого вхождения (если применимо)',
      },
    },
    {
      name: 'countryName',
      type: 'text',
      admin: {
        description: 'Название страны (первое вхождение из списка стран)',
      },
    },
    {
      name: 'isLeague',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'isCup',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'tier',
      type: 'number',
      admin: { position: 'sidebar', description: 'Дивизион (1 — высший)' },
    },
    {
      name: 'hasGroups',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'nationalTeamsOnly',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Только национальные сборные' },
    },
    {
      name: 'countries',
      type: 'array',
      admin: { description: 'Страны, относящиеся к соревнованию' },
      fields: [
        { name: 'id', type: 'number', required: true },
        { name: 'name', type: 'text', required: true },
      ],
    },
    {
      name: 'federations',
      type: 'array',
      admin: { description: 'Федерации, относящиеся к соревнованию' },
      fields: [
        { name: 'id', type: 'number', required: true },
        { name: 'name', type: 'text', required: true },
      ],
    },
    {
      name: 'season',
      type: 'group',
      admin: { description: 'Текущий сезон' },
      fields: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'text' },
        { name: 'start', type: 'date' },
        { name: 'end', type: 'date' },
      ],
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 999,
      admin: { position: 'sidebar', description: 'Меньше — выше приоритет' },
    },
  ],
  timestamps: true,
}

export default Leagues
