'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUser } from '@/lib/auth'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 160)
}

export async function createPostAction({ title, content }: { title: string; content: string }) {
  const user = await getUser()
  if (!user) return { success: false, error: 'Необходима авторизация' }

  const payload = await getPayload({ config: await configPromise })

  try {
    const created = await payload.create({
      collection: 'posts',
      data: {
        title,
        slug: slugify(title),
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
