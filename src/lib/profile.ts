'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getUser } from './auth'

export type UpdateProfileInput = {
  name?: string
  username?: string
  bio?: string
  avatar?: string | null // id медиа
  avatarUrl?: string | null
  links?: {
    website?: string
    twitter?: string
    github?: string
  }
}

export async function updateProfile(
  data: UpdateProfileInput,
): Promise<{ success: boolean; error?: string }> {
  const authUser = await getUser()
  if (!authUser) return { success: false, error: 'UNAUTHORIZED' }

  // Нельзя менять роль и служебные поля
  const allowed: Record<string, unknown> = {}
  if (typeof data.name === 'string') allowed.name = data.name
  if (typeof data.username === 'string') allowed.username = data.username
  if (typeof data.bio === 'string') allowed.bio = data.bio
  if (typeof data.avatar === 'string' || data.avatar === null) allowed.avatar = data.avatar
  if (typeof data.avatarUrl === 'string' || data.avatarUrl === null)
    allowed.avatarUrl = data.avatarUrl
  if (data.links && typeof data.links === 'object') {
    const links: Record<string, string> = {}
    if (typeof data.links.website === 'string') links.website = data.links.website
    if (typeof data.links.twitter === 'string') links.twitter = data.links.twitter
    if (typeof data.links.github === 'string') links.github = data.links.github
    allowed.links = links
  }

  try {
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id: authUser.id,
      data: allowed,
    })
    return { success: true }
  } catch (e) {
    console.error('updateProfile error', e)
    return { success: false, error: 'UPDATE_FAILED' }
  }
}
