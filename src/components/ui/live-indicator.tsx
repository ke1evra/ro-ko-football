import { cn } from '@/lib/utils'

interface LiveIndicatorProps {
  className?: string
  size?: 'small' | 'medium' | 'large'
}

export function LiveIndicator({ className, size = 'medium' }: LiveIndicatorProps) {
  const sizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4',
  }

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Основная точка */}
      <div className={cn('bg-red-500 rounded-full', sizeClasses[size], 'animate-pulse')} />

      {/* Пульсирующие кольца */}
      <div className={cn('absolute bg-red-500/30 rounded-full animate-ping', sizeClasses[size])} />
      <div
        className={cn(
          'absolute bg-red-500/20 rounded-full animate-ping',
          size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-6 h-6' : 'w-4 h-4',
        )}
        style={{ animationDelay: '0.5s' }}
      />
    </div>
  )
}
