import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'
import { descriptions } from '@/lib/admin/descriptions'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: {
    singular: 'Комментарий',
    plural: 'Комментарии',
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['post', 'author', 'createdAt'],
    description: descriptions.comments,
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => (isAdmin(req) ? true : { author: { equals: req.user?.id } }),
    delete: ({ req }) => (isAdmin(req) ? true : { author: { equals: req.user?.id } }),
  },
  fields: [
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      label: 'Публикация',
      required: true,
      admin: {
        description: 'Публикация, к которой относится комментарий',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'comments',
      label: 'Родительский комментарий',
      required: false,
      admin: {
        description: 'Если это ответ на другой комментарий, укажите родительский комментарий',
      },
    },
    {
      name: 'content',
      type: 'textarea',
      label: 'Текст комментария',
      required: true,
      admin: {
        description: 'Содержание комментария (обычный текст)',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Автор',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Пользователь, написавший комментарий',
      },
    },
    {
      name: 'upvotes',
      type: 'number',
      label: 'Положительные голоса',
      required: true,
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Количество положительных оценок (автоматически)',
      },
    },
    {
      name: 'downvotes',
      type: 'number',
      label: 'Отрицательные голоса',
      required: true,
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Количество отрицательных оценок (автоматически)',
      },
    },
    {
      name: 'score',
      type: 'number',
      label: 'Рейтинг',
      required: true,
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Итоговый рейтинг (upvotes - downvotes)',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) return data
        if (!isAdmin(req!) && req?.user && !data.author) {
          data.author = req.user.id
        }
        return data
      },
    ],
  },
  timestamps: true,
}

export default Comments
