import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { User, Media } from '@/payload-types'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  user: User | null | undefined
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0][0]?.toUpperCase() || '?'
  }
  if (email) {
    return email[0]?.toUpperCase() || '?'
  }
  return '?'
}

function correctMediaUrl(url: string): string {
  if (url.startsWith('/api/media/file/')) {
    const filename = url.replace('/api/media/file/', '')
    return `/media/${decodeURIComponent(filename)}`
  }
  return url
}

function getAvatarUrl(user: User | null | undefined): string | undefined {
  if (!user) return undefined

  // Провер��ем загруженный аватар через Media
  if (user.avatar && typeof user.avatar === 'object') {
    const mediaObj = user.avatar as Media

    // Проверяем thumbnail URL (более подходящий размер для аватара)
    if (mediaObj.thumbnailURL) {
      return correctMediaUrl(mediaObj.thumbnailURL)
    }

    // Основной URL изображения
    if (mediaObj.url) {
      return correctMediaUrl(mediaObj.url)
    }

    // Fallback: строим URL из filename
    if (mediaObj.filename) {
      return `/media/${mediaObj.filename}`
    }
  }

  // Проверяем внешний URL аватара
  if (user.avatarUrl) {
    return user.avatarUrl
  }

  return undefined
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-16 w-16',
} as const

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const avatarUrl = getAvatarUrl(user)
  const initials = getInitials(user?.name, user?.email)

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.name || 'Аватар пользователя'} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
