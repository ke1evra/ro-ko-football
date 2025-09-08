'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUser } from '@/lib/auth'

export async function createCommentAction({ postId, content, parentId }: { postId: string; content: string; parentId?: string }) {
  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const payload = await getPayload({ config: await configPromise })

  try {
    await payload.create({
      collection: 'comments',
      data: { post: postId, content, parent: parentId || undefined },
      user,
    })
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Не удалось создать комментарий' }
  }
}

export async function voteCommentAction({ commentId, value }: { commentId: string; value: -1 | 1 | 0 }) {
  const user = await getUser()
  if (!user) return { success: false, error: 'Необходима авторизация' }

  const payload = await getPayload({ config: await configPromise })

  try {
    // 0 — снять голос; 1 или -1 — поставить/переключить
    const existing = await payload.find({
      collection: 'commentVotes',
      where: { and: [{ comment: { equals: commentId } }, { user: { equals: user.id } }] },
      limit: 1,
    })

    if (value === 0) {
      if (existing.docs[0]) {
        await payload.delete({ collection: 'commentVotes', id: existing.docs[0].id as string })
      }
    } else if (existing.docs[0]) {
      // Обновляем, если значение меняется
      if (existing.docs[0].value !== value) {
        await payload.update({
          collection: 'commentVotes',
          id: existing.docs[0].id as string,
          data: { value },
          user,
        })
      }
    } else {
      // Не существует — создаём
      await payload.create({ collection: 'commentVotes', data: { comment: commentId, value }, user })
    }

    // Вернём свежие счётчики комментария
    const updated = await payload.findByID({ collection: 'comments', id: commentId })

    return {
      success: true,
      counters: { upvotes: (updated as any).upvotes || 0, downvotes: (updated as any).downvotes || 0, score: (updated as any).score || 0 },
    }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Не удалось проголосовать' }
  }
}
