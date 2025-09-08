import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'

// Простая утилита для генерации slug из заголовка
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, '') // латиница + кириллица, цифры, пробелы и тире
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function isAdmin(req: PayloadRequest): boolean {
  // user?.role задаётся в коллекции users
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishedAt', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => (isAdmin(req) ? true : { author: { equals: req.user?.id } }),
    delete: ({ req }) => (isAdmin(req) ? true : { author: { equals: req.user?.id } }),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        description: 'Автогенерируется из заголовка при сохранении',
      },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'featuredImage',
      type: 'relationship',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
      defaultValue: () => new Date().toISOString(),
    },
  ],
  hooks: {
    beforeValidate: [async ({ data, req }) => {
      if (!data) return data

      // Проставляем автора автоматически, если не админ и поле не задано
      if (!isAdmin(req!) && req?.user && !data.author) {
        data.author = req.user.id
      }

      // Генерация slug при отсутствии
      if (data.title && !data.slug) {
        data.slug = slugify(data.title)
      }

      // Страхуемся от слишком длинных slug
      if (data.slug && typeof data.slug === 'string') {
        data.slug = data.slug.slice(0, 160)
      }

      return data
    }],
  },
  timestamps: true,
}

export default Posts
