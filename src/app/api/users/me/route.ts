import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import type { User } from '@/payload-types'

export async function GET() {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: await configPromise })

    const { user } = await payload.auth({ headers })

    if (!user) {
      return Response.json({ user: null }, { status: 401 })
    }

    // Загружаем полные данные пользователя с аватаром
    const fullUser = (await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 2,
    })) as User | null

    return Response.json({ user: fullUser }, { status: 200 })
  } catch (error) {
    console.error('Error getting user:', error)
    return Response.json({ user: null }, { status: 401 })
  }
}
