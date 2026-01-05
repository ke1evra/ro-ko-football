import Link from 'next/link'
import { UserAvatar } from '@/components/UserAvatar'
import type { User } from '@/payload-types'
import { cn } from '@/lib/utils'

interface UserAvatarLinkProps {
  user: User | null | undefined
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showName?: boolean
  nameClassName?: string
}

export function UserAvatarLink({
  user,
  size = 'md',
  className,
  showName = false,
  nameClassName,
}: UserAvatarLinkProps) {
  // Если нет пользователя, отображаем обычный аватар
  if (!user) {
    return <UserAvatar user={user} size={size} className={className} />
  }

  // Используем username если есть, иначе используем ID
  const profileIdentifier = user.username || user.id

  // Если нет ни username ни id, отображаем обычный аватар
  if (!profileIdentifier) {
    return <UserAvatar user={user} size={size} className={className} />
  }

  // Оборачиваем в ссылку на профиль
  return (
    <Link
      href={`/profile/${profileIdentifier}`}
      className={cn(
        'inline-flex items-center gap-2 hover:opacity-80 transition-opacity',
        className,
      )}
    >
      <UserAvatar user={user} size={size} />
      {showName && (
        <span className={cn('font-medium', nameClassName)}>
          {user.name || user.username || user.email}
        </span>
      )}
    </Link>
  )
}
