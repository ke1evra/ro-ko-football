import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'

// Транслитерация (минимум для кириллицы) и нормализация в slug
function transliterate(input: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ь: '',
    ы: 'y',
    ъ: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }
  return input
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
}

function slugify(input: string): string {
  return transliterate(input)
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
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
    defaultColumns: ['title', 'postType', 'author', 'publishedAt', 'updatedAt'],
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
      name: 'postType',
      type: 'select',
      options: [
        { label: 'Обычный пос��', value: 'regular' },
        { label: 'Прогноз', value: 'prediction' },
      ],
      defaultValue: 'regular',
      required: true,
      admin: {
        position: 'sidebar',
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
    // Поля для прогнозов
    {
      name: 'matchId',
      type: 'number',
      admin: {
        condition: (data) => data.postType === 'prediction',
        description: 'ID матча из API для которого делается прогноз',
      },
    },
    {
      name: 'fixtureId',
      type: 'number',
      admin: {
        condition: (data) => data.postType === 'prediction',
        description: 'ID фикстуры из API для которого делается прогноз',
      },
    },
    {
      name: 'prediction',
      type: 'group',
      admin: {
        condition: (data) => data.postType === 'prediction',
      },
      fields: [
        {
          name: 'outcome',
          type: 'select',
          options: [
            { label: 'Победа хозяев', value: 'home' },
            { label: 'Ничья', value: 'draw' },
            { label: 'Победа гостей', value: 'away' },
          ],
          admin: {
            description: 'Прогноз исхода матча',
          },
        },
        {
          name: 'score',
          type: 'group',
          fields: [
            {
              name: 'home',
              type: 'number',
              min: 0,
              admin: {
                description: 'Голы хозяев',
              },
            },
            {
              name: 'away',
              type: 'number',
              min: 0,
              admin: {
                description: 'Голы гостей',
              },
            },
          ],
        },
        {
          name: 'fouls',
          type: 'group',
          fields: [
            {
              name: 'total',
              type: 'number',
              min: 0,
              admin: {
                description: 'Общее количество фолов',
              },
            },
            {
              name: 'overUnder',
              type: 'select',
              options: [
                { label: 'Больше 25.5', value: 'over' },
                { label: 'Меньше 25.5', value: 'under' },
              ],
            },
          ],
        },
        {
          name: 'corners',
          type: 'group',
          fields: [
            {
              name: 'total',
              type: 'number',
              min: 0,
              admin: {
                description: 'Общее количество угловых',
              },
            },
            {
              name: 'home',
              type: 'number',
              min: 0,
              admin: {
                description: 'Угловые хозяев',
              },
            },
            {
              name: 'away',
              type: 'number',
              min: 0,
              admin: {
                description: 'Угловые гостей',
              },
            },
          ],
        },
        {
          name: 'yellowCards',
          type: 'group',
          fields: [
            {
              name: 'total',
              type: 'number',
              min: 0,
              admin: {
                description: 'Общее количество желтых карточек',
              },
            },
            {
              name: 'home',
              type: 'number',
              min: 0,
              admin: {
                description: 'Желтые карточки хозяев',
              },
            },
            {
              name: 'away',
              type: 'number',
              min: 0,
              admin: {
                description: 'Желтые карточки гостей',
              },
            },
          ],
        },
        {
          name: 'events',
          type: 'array',
          admin: {
            description: 'Динамические события прогноза с коэффициентами',
          },
          fields: [
            {
              name: 'event',
              type: 'text',
              required: true,
              admin: {
                description: 'Название события (например, "П1", "ТБ 2.5", "УГ ТБ 8.5")',
              },
            },
            {
              name: 'coefficient',
              type: 'number',
              required: true,
              min: 1,
              admin: {
                description: 'Коэффициент на событие',
              },
            },
          ],
        },
      ],
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
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data

        // Проставляем автора автоматически, если не админ и поле не задано
        if (!isAdmin(req!) && req?.user && !data.author) {
          data.author = req.user.id
        }

        // Генерация и уникализация slug: при создании и при изменении title
        const titleChanged = Boolean(data.title && data.title !== (originalDoc as any)?.title)
        if ((operation === 'create' && data.title) || titleChanged) {
          const base = slugify(String(data.title))
          let candidate = base.slice(0, 160)

          const payload = req.payload
          const existing = await payload.find({
            collection: 'posts',
            where: { slug: { like: `${base}%` } },
            limit: 200,
            depth: 0,
          })
          const taken = new Set((existing.docs as any[]).map((d) => d.slug))

          // Если текущий документ уже имеет такой же slug (редактирование без реального конфликта) — оставляем
          if (!taken.has(candidate) || (originalDoc && (originalDoc as any).slug === candidate)) {
            data.slug = candidate
          } else {
            let i = 2
            while (i < 10000) {
              const next = `${base}-${i}`.slice(0, 160)
              if (!taken.has(next)) {
                candidate = next
                break
              }
              i += 1
            }
            data.slug = candidate
          }
        }

        // Страхуемся от слишком длинных slug
        if (data.slug && typeof data.slug === 'string') {
          data.slug = data.slug.slice(0, 160)
        }

        return data
      },
    ],
  },
  timestamps: true,
}

export default Posts