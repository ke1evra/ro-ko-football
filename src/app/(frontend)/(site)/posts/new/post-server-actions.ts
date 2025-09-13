'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUser } from '@/lib/auth'

// slug теперь генерируется на стороне Payload (см. коллекцию Posts)

export async function createPostAction({ title, content }: { title: string; content: string }) {
  const user = await getUser()
  if (!user) return { success: false, error: 'Необходима авторизация' }

  const payload = await getPayload({ config: await configPromise })

  try {
    const created = await payload.create({
      collection: 'posts',
      data: {
        title,
        content,
        author: user.id,
        publishedAt: new Date().toISOString(),
      },
      user,
    })

    return { success: true, slug: created.slug as string }
  } catch (e: any) {
    if (e?.message?.includes('duplicate key')) {
      return { success: false, error: 'Пост с таким slug уже существует' }
    }
    console.error(e)
    return { success: false, error: 'Не удалось создать пост' }
  }
}
