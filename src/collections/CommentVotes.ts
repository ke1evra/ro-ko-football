import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'

function isAdmin(req: PayloadRequest): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const CommentVotes: CollectionConfig = {
  slug: 'commentVotes',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['comment', 'user', 'value', 'createdAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => (isAdmin(req) ? true : { user: { equals: req.user?.id } }),
    delete: ({ req }) => (isAdmin(req) ? true : { user: { equals: req.user?.id } }),
  },
  fields: [
    {
      name: 'comment',
      type: 'relationship',
      relationTo: 'comments',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'value',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        description: '1 — плюс, -1 — минус',
      },
      validate: (val: unknown) => {
        if (val === 1 || val === -1) return true
        return 'Значение должно быть 1 или -1'
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (!data) return data
        // Автопроставление пользователя
        if (!isAdmin(req!) && req?.user && !data.user) {
          data.user = req.user.id
        }
        
        // Защита: один голос на комментарий от пользователя (только при создании)
        if (operation === 'create' && req?.user && data.comment) {
          const payload = req.payload
          const existing = await payload.find({
            collection: 'commentVotes',
            where: {
              and: [
                { comment: { equals: data.comment } },
                { user: { equals: req.user.id } },
              ],
            },
            limit: 1,
          })
          if (existing.docs.length > 0) {
            throw new Error('Уже есть голос для этого комментария')
          }
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        try {
          const payload = req.payload
          const commentId = (doc.comment as any)?.id || (doc.comment as any)

          let upDelta = 0
          let downDelta = 0

          if (operation === 'create') {
            if (doc.value === 1) upDelta = 1
            if (doc.value === -1) downDelta = 1
          }

          if (operation === 'update') {
            const prevVal = previousDoc?.value
            if (prevVal !== doc.value) {
              if (prevVal === 1) upDelta -= 1
              if (prevVal === -1) downDelta -= 1
              if (doc.value === 1) upDelta += 1
              if (doc.value === -1) downDelta += 1
            }
          }

          if (upDelta !== 0 || downDelta !== 0) {
            const comment = await payload.findByID({ collection: 'comments', id: commentId })
            const up = (comment as any).upvotes || 0
            const down = (comment as any).downvotes || 0
            const newUp = up + upDelta
            const newDown = down + downDelta
            const newScore = newUp - newDown

            await payload.update({
              collection: 'comments',
              id: commentId,
              data: { upvotes: newUp, downvotes: newDown, score: newScore },
            })
          }
        } catch (e) {
          console.error('Failed to update comment counters after vote change', e)
        }
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        try {
          const payload = req.payload
          const commentId = (doc.comment as any)?.id || (doc.comment as any)

          const comment = await payload.findByID({ collection: 'comments', id: commentId })
          const up = (comment as any).upvotes || 0
          const down = (comment as any).downvotes || 0

          const upDelta = doc.value === 1 ? -1 : 0
          const downDelta = doc.value === -1 ? -1 : 0

          const newUp = up + upDelta
          const newDown = down + downDelta
          const newScore = newUp - newDown

          await payload.update({
            collection: 'comments',
            id: commentId,
            data: { upvotes: newUp, downvotes: newDown, score: newScore },
          })
        } catch (e) {
          console.error('Failed to update comment counters after vote delete', e)
        }
      },
    ],
  },
  timestamps: true,
}

export default CommentVotes
