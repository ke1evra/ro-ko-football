import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const Markets: CollectionConfig = {
  slug: 'bet-markets',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => isAdmin(req),
    update: ({ req }) => isAdmin(req),
    delete: ({ req }) => isAdmin(req),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Название маркета (основные исходы, ЖК, КК, фолы, ауты и т.д.)',
      },
    },
    {
      name: 'groups',
      type: 'relationship',
      relationTo: 'outcome-groups',
      hasMany: true,
      required: false,
      admin: {
        description: 'Выберите группы исходов для этого маркета',
        sortOptions: 'name',
      },
    },
  ],
  timestamps: true,
}

export default Markets
