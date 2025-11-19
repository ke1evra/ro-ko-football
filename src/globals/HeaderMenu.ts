import type { GlobalConfig } from 'payload'
import type { User } from '@/payload-types'

export const HeaderMenu: GlobalConfig = {
  slug: 'header-menu',
  label: 'Header Menu',
  access: {
    read: () => true,
    update: ({ req }) => {
      const user = req.user as User | null | undefined
      return Boolean(user?.role === 'admin')
    },
  },
  fields: [
    {
      name: 'items',
      label: 'Пункты меню',
      type: 'array',
      minRows: 0,
      labels: {
        singular: 'Пункт',
        plural: 'Пункты',
      },
      fields: [
        {
          name: 'label',
          label: 'Текст',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          label: 'Ссылка',
          type: 'text',
          required: true,
          admin: {
            description:
              'Абсолютный или относительный URL (например, /leagues или https://example.com)',
          },
        },
      ],
    },
  ],
}
