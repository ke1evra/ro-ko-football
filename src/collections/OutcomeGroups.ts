import { descriptions } from '@/lib/admin/descriptions'
import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const OutcomeGroups: CollectionConfig = {
  slug: 'outcome-groups',
  labels: {
    singular: 'Группа исходов',
    plural: 'Группы исходов',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
    description: descriptions.outcomeGroups,
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
        description: 'Название группы исходов (тоталы, форы, обе забьют и т.д.)',
      },
    },
    {
      name: 'outcomes',
      type: 'array',
      label: 'Исходы',
      admin: {
        description: 'Исходы, принадлежащие этой группе. Каждый исход - ��ростая строка.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Название исхода',
          },
        },
        {
          name: 'values',
          type: 'array',
          label: 'Значения',
          admin: {
            description:
              'Значения для этого исхода (например, 1.5, 2.0 для тоталов). Оставьте пустым для исходов без значений.',
          },
          fields: [
            {
              name: 'value',
              type: 'number',
              required: true,
              admin: {
                description: 'Числовое значение',
              },
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}

export default OutcomeGroups
