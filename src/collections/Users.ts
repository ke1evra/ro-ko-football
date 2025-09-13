import type { CollectionConfig } from 'payload'
import type { User } from '@/payload-types'
import type { PayloadRequest } from 'payload'

const isAdmin = ({ req }: { req: PayloadRequest }): boolean => {
  const user = req.user as User | null
  return user?.role === 'admin'
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'username', 'name', 'role', 'rating'],
  },
  auth: true,
  access: {
    admin: isAdmin,
    read: () => true,
    update: ({ req, id }) => {
      const user = req.user as User | null
      if (!user) return false
      // Админ может менять любого, пользователь — только себя
      return user.role === 'admin' || user.id === id
    },
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
      ],
      required: true,
      defaultValue: 'user',
      admin: { position: 'sidebar' },
    },
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      unique: true,
      required: true,
      admin: { description: 'Уникальный идентификатор для публичного профиля' },
    },
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'О себе',
      admin: { placeholder: 'Короткая информация о себе' },
    },
    {
      name: 'avatar',
      type: 'relationship',
      relationTo: 'media',
      required: false,
      label: 'Аватар (Media)',
    },
    {
      name: 'avatarUrl',
      type: 'text',
      label: 'Аватар (внешний URL)',
      admin: { description: 'Если нет загруженного медиа, можно указать внешний URL' },
    },
    {
      type: 'group',
      name: 'links',
      label: 'Ссылки',
      fields: [
        { name: 'website', type: 'text', label: 'Сайт' },
        { name: 'twitter', type: 'text', label: 'X/Twitter' },
        { name: 'github', type: 'text', label: 'GitHub' },
      ],
    },
    {
      name: 'rating',
      type: 'number',
      defaultValue: 0,
      label: 'Рейтинг',
      admin: { position: 'sidebar', description: 'Редактирует только админ' },
      access: {
        update: ({ req }) => isAdmin({ req }),
      },
    },
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Has the user verified their email address',
        position: 'sidebar',
      },
    },
    {
      name: 'emailVerificationToken',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'emailVerificationExpires',
      type: 'date',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'passwordResetToken',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'passwordResetExpires',
      type: 'date',
      admin: {
        hidden: true,
      },
    },
  ],
}
