import type { GlobalConfig } from 'payload'
import type { User } from '@/payload-types'

export const HeaderMenu: GlobalConfig = {
  slug: 'header-menu',
  label: 'Меню в шапке',
  admin: {
    description:
      '🔗 **Настройка меню в шапке сайта**\n\n' +
      '**Что здесь делать:**\n' +
      '• Добавлять и редактировать пункты главного меню\n' +
      '• Настраивать навигацию по сайту\n' +
      '• Управлять порядком отображения пунктов\n\n' +
      '**Как использовать:**\n' +
      '1. Нажмите "Add Item" для добавления нового пункта\n' +
      '2. Укажите текст пункта меню\n' +
      '3. Введите URL (внутренний: /leagues или внешний: https://example.com)\n' +
      '4. Сохраните изменения\n\n' +
      '**Примеры URL:**\n' +
      '• Внутренние страницы: /leagues, /matches, /predictions\n' +
      '• Внешние ссылки: https://example.com\n\n' +
      '⚠️ Доступно только администраторам',
  },
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
