import { descriptions } from '@/lib/admin/descriptions'
import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const Markets: CollectionConfig = {
  slug: 'bet-markets',
  labels: {
    singular: 'Рынок ставок',
    plural: 'Рынки ставок',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
    description: descriptions.markets,
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
    // Метаданные для автоматического маппинга на статистику матча
    {
      name: 'mappingConfig',
      type: 'group',
      label: 'Левая часть (метрика)',
      admin: {
        description:
          'Левая часть формулы: откуда берём число. Укажите источник статистики (statPath) и тип (statType).',
      },
      fields: [
        {
          name: 'statPath',
          type: 'select',
          options: [
            { label: 'Не использует статистику', value: '' },
            { label: 'Исход матча (П1/Х/П2)', value: 'outcome' },
            { label: 'Голы', value: 'goals' },
            { label: 'Удары (всего)', value: 'shots' },
            { label: 'Удары в створ', value: 'shotsOnTarget' },
            { label: 'Уд��ры мимо створа', value: 'shotsOffTarget' },
            { label: 'Заблокированные удары', value: 'shotsBlocked' },
            { label: 'Угловые', value: 'corners' },
            { label: 'Офсайды', value: 'offsides' },
            { label: 'Фолы', value: 'fouls' },
            { label: 'Жёлтые карточки', value: 'yellowCards' },
            { label: 'Красные карточки', value: 'redCards' },
            { label: 'Атаки', value: 'attacks' },
            { label: 'Опасные атаки', value: 'dangerousAttacks' },
            { label: 'Передачи (всего)', value: 'passes' },
            { label: 'Точные передачи', value: 'passesAccurate' },
            { label: 'Точность передач (%)', value: 'passAccuracy' },
            { label: 'Владение мячом (%)', value: 'possession' },
            { label: 'Сейвы вратарей', value: 'saves' },
          ],
          admin: {
            description:
              'Выберите поле статистики из MatchStats. Это левая часть формулы для проверки прогноза.',
          },
        },
        {
          name: 'statType',
          type: 'select',
          options: [
            { label: 'Не использует статистику', value: 'none' },
            { label: 'Числовая статистика (угловые, карточки и т.д.)', value: 'numeric' },
            { label: 'Исход матча (П1/Х/П2)', value: 'outcome' },
            { label: 'Голы', value: 'goals' },
          ],
          defaultValue: 'none',
          admin: {
            description: 'Тип статистики для этого маркета',
          },
        },
      ],
    },
  ],
  timestamps: true,
}

export default Markets
