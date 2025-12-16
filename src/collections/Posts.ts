import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'
import { descriptions } from '@/lib/admin/descriptions'

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
  labels: {
    singular: 'Публикация',
    plural: 'Публикации',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'postType', 'author', 'publishedAt', 'updatedAt'],
    description: descriptions.posts,
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
      label: 'Заголовок',
      required: true,
      admin: {
        description: 'Название публикации (используется для генерации URL)',
      },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL (slug)',
      unique: true,
      admin: {
        description:
          'Автоматически генерируется из заголовка при сохранении (с транслитерацией кириллицы)',
        readOnly: true,
      },
    },
    {
      name: 'postType',
      type: 'select',
      label: 'Тип публикации',
      options: [
        { label: 'Обычный пост', value: 'regular' },
        { label: 'Прогноз на матч', value: 'prediction' },
      ],
      defaultValue: 'regular',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Определяет структуру и отображение публикации',
      },
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Содержание',
      required: false,
      admin: {
        description: 'Основной текст публикации (поддерживает форматирование)',
      },
    },
    {
      name: 'featuredImage',
      type: 'relationship',
      relationTo: 'media',
      label: 'Обложка',
      required: false,
      admin: {
        description: 'Главное изображение публикации (отображается в превью)',
      },
    },
    // Поля для прогнозов (отображаются только когда postType = prediction)
    {
      name: 'prediction',
      type: 'group',
      admin: {
        condition: (data) => data.postType === 'prediction',
      },
      fields: [
        {
          name: 'outcomes',
          type: 'array',
          label: 'Исходы прогноза',
          admin: {
            description: 'Новая структура: исходы с привязкой к CMS маркетам',
          },
          fields: [
            {
              name: 'fixtureId',
              type: 'number',
              label: 'ID фикстуры',
              admin: {
                description: 'ID матча из API для связи со статистикой',
              },
            },
            {
              name: 'market',
              type: 'relationship',
              relationTo: 'bet-markets',
              label: 'Маркет',
              required: true,
              admin: {
                description: 'Связь с маркетом (автоматически подтягивается при depth > 0)',
              },
            },
            {
              name: 'outcomeGroup',
              type: 'relationship',
              relationTo: 'outcome-groups',
              label: 'Группа исходов',
              required: true,
              admin: {
                description: 'Связь с группой исходов (содержит conditions для подсчёта)',
              },
            },
            {
              name: 'marketName',
              type: 'text',
              label: 'Название маркета (копия)',
              required: true,
              admin: {
                description: 'Текстовая копия для отображения (на случай удаления маркета)',
              },
            },
            {
              name: 'outcomeName',
              type: 'text',
              label: 'Название исхода (копия)',
              required: true,
              admin: {
                description: 'Текстовая копия для отображения',
              },
            },
            {
              name: 'value',
              type: 'number',
              label: 'Значение (для линий)',
              admin: {
                description: 'Например: 2.5 для "ТБ 2.5"',
              },
            },
            {
              name: 'coefficient',
              type: 'number',
              label: 'Коэффициент',
              required: true,
              min: 1,
              admin: {
                description: 'Коэффициент ставки',
              },
            },
            {
              name: 'matchInfo',
              type: 'group',
              label: 'Информация о матче',
              admin: {
                description: 'Данные матча на момент создания прогноза',
              },
              fields: [
                {
                  name: 'home',
                  type: 'text',
                  label: 'Хозяева',
                },
                {
                  name: 'homeTeamId',
                  type: 'number',
                  label: 'ID команды хозяев',
                  admin: {
                    description: 'ID команды из API для генерации URL',
                  },
                },
                {
                  name: 'away',
                  type: 'text',
                  label: 'Гости',
                },
                {
                  name: 'awayTeamId',
                  type: 'number',
                  label: 'ID команды гостей',
                  admin: {
                    description: 'ID команды из API для генерации URL',
                  },
                },
                {
                  name: 'competition',
                  type: 'text',
                  label: 'Турнир',
                },
                {
                  name: 'date',
                  type: 'text',
                  label: 'Дата',
                },
                {
                  name: 'time',
                  type: 'text',
                  label: 'Время',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Автор',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Пользователь, создавший публикацию (автоматически заполняется при создании)',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Дата публикации',
      admin: {
        position: 'sidebar',
        description: 'Дата и время создания публикации',
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

        // Генерация и уникализация slug: при создании, при изменении title, или если slug не задан
        const titleChanged = Boolean(data.title && data.title !== (originalDoc as any)?.title)
        const needsSlug = operation === 'create' || titleChanged || !data.slug

        if (needsSlug && data.title) {
          const base = slugify(String(data.title))
          const candidate = base.slice(0, 150) // Базовый slug

          const payload = req.payload

          // Исключаем текущий документ из проверки (для случая редактирования)
          const currentDocId = (originalDoc as any)?.id

          // Функция для проверки уникальности slug
          const isSlugTaken = async (slug: string): Promise<boolean> => {
            const existing = await payload.find({
              collection: 'posts',
              where: { slug: { equals: slug } },
              limit: 1,
              depth: 0,
            })

            // Если найден документ, проверяем, не является ли он текущим редактируемым
            if (existing.docs.length > 0) {
              const foundDoc = existing.docs[0] as any
              return foundDoc.id !== currentDocId
            }

            return false
          }

          // Проверяем базовый slug
          if (!(await isSlugTaken(candidate))) {
            data.slug = candidate
          } else {
            // Если базовый slug занят, добавляем числовой суффикс
            let counter = 1
            let found = false

            while (counter <= 1000 && !found) {
              const testSlug = `${candidate}-${counter}`

              if (!(await isSlugTaken(testSlug))) {
                data.slug = testSlug
                found = true
              } else {
                counter++
              }
            }

            // Если не нашли свободный slug за 1000 попыток, добавляем timestamp
            if (!found) {
              data.slug = `${candidate}-${Date.now()}`
            }
          }
        }

        // Страхуемся от слишком длинных slug
        if (data.slug && typeof data.slug === 'string') {
          data.slug = data.slug.slice(0, 160)
        }

        // Миграция: если контент ещё строка (старое textarea), конвертируем в минимальный Lexical state
        if (typeof (data as any).content === 'string') {
          const text = String((data as any).content).trim()
          ;(data as any).content = {
            root: {
              type: 'root',
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
              children: text
                ? [
                    {
                      type: 'paragraph',
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                      version: 1,
                      children: [
                        {
                          type: 'text',
                          text,
                          detail: 0,
                          format: 0,
                          mode: 'normal',
                          style: '',
                          version: 1,
                        },
                      ],
                    },
                  ]
                : [],
            },
          }
        }

        return data
      },
    ],
  },
  timestamps: true,
}

export default Posts
