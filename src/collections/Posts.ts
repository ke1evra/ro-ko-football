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
        { label: 'Обычный пост', value: 'regular' },
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
      type: 'richText',
      required: false,
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
          label: 'События (структурированные)',
          admin: {
            description: 'Рекомендуется: структурированное хранение событий с энумами',
          },
          fields: [
            {
              name: 'market',
              type: 'select',
              required: true,
              options: [
                { label: 'Основные исходы', value: 'main' },
                { label: 'Двойной шанс', value: 'doubleChance' },
                { label: 'Обе забьют', value: 'btts' },
                { label: 'Тотал', value: 'total' },
                { label: 'Исход (статистика)', value: 'statOutcome' },
                { label: 'Двойной шанс (статистика)', value: 'statDoubleChance' },
                { label: 'Индивидуальный тотал', value: 'teamTotal' },
                { label: 'Фора', value: 'handicap' },
                { label: 'Комбо', value: 'combo' },
              ],
            },
            {
              name: 'scope',
              type: 'select',
              options: [
                { label: 'Полный матч', value: 'ft' },
                { label: '1-й тайм', value: '1h' },
                { label: '2-й тайм', value: '2h' },
              ],
              admin: { description: 'Область применения (для голов и основных рынков)' },
            },
            {
              name: 'stat',
              type: 'select',
              options: [
                { label: 'Голы', value: 'goals' },
                { label: 'Угловые', value: 'corners' },
                { label: 'ЖК', value: 'yellowCards' },
                { label: 'КК', value: 'redCards' },
                { label: 'Фолы', value: 'fouls' },
                { label: 'Ауты', value: 'throw_ins' },
                { label: 'От ворот', value: 'goal_kicks' },
                { label: 'Удары в створ', value: 'shotsOnTarget' },
                { label: 'Удары', value: 'shots' },
                { label: 'Сейвы', value: 'saves' },
                { label: 'Офсайды', value: 'offsides' },
                { label: 'Замены', value: 'substitutions' },
              ],
              admin: { description: 'Показатель (для статистических рынков)' },
            },
            {
              name: 'outcome',
              type: 'select',
              options: [
                { label: 'П1', value: 'P1' },
                { label: 'Х', value: 'X' },
                { label: 'П2', value: 'P2' },
              ],
              admin: { description: 'Для market=main' },
            },
            {
              name: 'dc',
              type: 'select',
              options: [
                { label: '1X', value: '1X' },
                { label: '12', value: '12' },
                { label: 'X2', value: 'X2' },
              ],
              admin: { description: 'Для market=doubleChance/statDoubleChance' },
            },
            {
              name: 'btts',
              type: 'select',
              options: [
                { label: 'Да', value: 'yes' },
                { label: 'Нет', value: 'no' },
              ],
              admin: { description: 'Для market=btts' },
            },
            {
              name: 'kind',
              type: 'select',
              options: [
                { label: 'ТБ (over)', value: 'over' },
                { label: 'ТМ (under)', value: 'under' },
              ],
              admin: { description: 'Для тоталов: market=total/teamTotal/combo' },
            },
            {
              name: 'line',
              type: 'number',
              admin: { description: 'Линия (если требуется рынком)' },
            },
            {
              name: 'team',
              type: 'select',
              options: [
                { label: 'Хозяева', value: 'home' },
                { label: 'Гости', value: 'away' },
              ],
              admin: { description: 'Для ИТ/фор' },
            },
            // Комбо-поля: "1X и ТБ/ТМ <линия>" (по голам)
            {
              name: 'comboDc',
              type: 'select',
              options: [
                { label: '1X', value: '1X' },
                { label: 'X2', value: 'X2' },
              ],
              admin: { description: 'Для market=combo' },
            },
            {
              name: 'comboKind',
              type: 'select',
              options: [
                { label: 'ТБ (over)', value: 'over' },
                { label: 'ТМ (under)', value: 'under' },
              ],
              admin: { description: 'Для market=combo' },
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
            {
              name: 'label',
              type: 'text',
              admin: { description: 'Человекочитаемое представление события (опционально)' },
            },
          ],
        },
        {
          name: 'matchInfo',
          type: 'group',
          admin: {
            description: 'Информация о матче на момент создания прогноза',
          },
          fields: [
            {
              name: 'home',
              type: 'text',
              admin: {
                description: 'Название команды хозяев',
              },
            },
            {
              name: 'away',
              type: 'text',
              admin: {
                description: 'Название команды гостей',
              },
            },
            {
              name: 'competition',
              type: 'text',
              admin: {
                description: 'Название турнира/лиги',
              },
            },
            {
              name: 'date',
              type: 'text',
              admin: {
                description: 'Дата матча',
              },
            },
            {
              name: 'time',
              type: 'text',
              admin: {
                description: 'Время матча',
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
