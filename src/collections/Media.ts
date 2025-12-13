import type { CollectionConfig } from 'payload'
import path from 'path'
import { descriptions } from '@/lib/admin/descriptions'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Медиафайл',
    plural: 'Медиафайлы',
  },
  admin: {
    description: descriptions.media,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Альтернативный текст',
      required: true,
      admin: {
        description:
          'Описание изображения для SEO и доступности (отображается если картинка не загрузилась)',
      },
    },
  ],
  upload: {
    staticDir: path.resolve(process.cwd(), 'media'),
    mimeTypes: ['image/*'], // Только изображения
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    crop: false, // Отключаем обрезку, сохраняем оригинальные пропорции
  },
}
