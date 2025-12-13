import type { CollectionConfig } from 'payload'
import type { User } from '@/payload-types'
import type { PayloadRequest } from 'payload'
import { descriptions } from '@/lib/admin/descriptions'

const isAdmin = ({ req }: { req: PayloadRequest }): boolean => {
  const user = req.user as User | null
  return user?.role === 'admin'
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Пользователь',
    plural: 'Пользователи',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'username', 'name', 'role', 'rating'],
    description: descriptions.users,
  },
  auth: true,
  access: {
    admin: isAdmin,
    read: () => true,
    update: ({ req, id }) => {
      const user = req.user as User | null
      if (!user) return false
      return user.role === 'admin' || user.id === id
    },
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'Пользователь', value: 'user' },
      ],
      required: true,
      defaultValue: 'user',
      admin: {
        position: 'sidebar',
        description: 'Роль определяет уровень доступа в системе',
      },
    },
    {
      name: 'username',
      type: 'text',
      label: 'Имя пользователя',
      unique: true,
      required: false,
      admin: {
        description: 'Уникальный идентификатор для публичного профиля (используется в URL)',
      },
    },
    {
      name: 'name',
      type: 'text',
      label: 'Полное имя',
      admin: {
        description: 'Отображаемое имя пользователя на сайте',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'О себе',
      admin: {
        placeholder: 'Короткая информация о себе',
        description: 'Биография пользователя для публичного профиля',
      },
    },
    {
      name: 'avatar',
      type: 'relationship',
      relationTo: 'media',
      required: false,
      label: 'Аватар (загруженный файл)',
      admin: {
        description: 'Загрузите изображение профиля через медиабиблиотеку',
      },
    },
    {
      name: 'avatarUrl',
      type: 'text',
      label: 'Аватар (внешний URL)',
      admin: {
        description: 'Альтернатива загруженному файлу - укажите прямую ссылку на изображение',
      },
    },
    {
      type: 'group',
      name: 'links',
      label: 'Социальные сети',
      admin: {
        description: 'Ссылки на профили пользователя в социальных сетях',
      },
      fields: [
        {
          name: 'website',
          type: 'text',
          label: 'Личный сайт',
          admin: { placeholder: 'https://example.com' },
        },
        {
          name: 'twitter',
          type: 'text',
          label: 'X/Twitter',
          admin: { placeholder: 'https://twitter.com/username' },
        },
        {
          name: 'github',
          type: 'text',
          label: 'GitHub',
          admin: { placeholder: 'https://github.com/username' },
        },
      ],
    },
    {
      name: 'rating',
      type: 'number',
      defaultValue: 0,
      label: 'Рейтинг',
      admin: {
        position: 'sidebar',
        description:
          'Рейтинг пользователя на основе прогнозов (редактируется только администратором)',
      },
      access: {
        update: ({ req }) => isAdmin({ req }),
      },
    },
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
      label: 'Email подтверждён',
      admin: {
        description: 'Подтвердил ли пользователь свой email адрес',
        position: 'sidebar',
      },
    },
    {
      name: 'emailVerificationToken',
      type: 'text',
      label: 'Токен подтверждения email',
      admin: {
        hidden: true,
        description: 'Служебное поле для верификации email',
      },
    },
    {
      name: 'emailVerificationExpires',
      type: 'date',
      label: 'Срок действия токена',
      admin: {
        hidden: true,
        description: 'Дата истечения токена подтверждения email',
      },
    },
    {
      name: 'passwordResetToken',
      type: 'text',
      label: 'Токен сброса пароля',
      admin: {
        hidden: true,
        description: 'Служебное поле для восстановления пароля',
      },
    },
    {
      name: 'passwordResetExpires',
      type: 'date',
      label: 'Срок действия токена сброса',
      admin: {
        hidden: true,
        description: 'Дата истечения токена сброса пароля',
      },
    },
  ],
}
