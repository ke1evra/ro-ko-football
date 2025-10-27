'use client'

import React from 'react'
import Image from 'next/image'
import { getTeamLogoUrl, getTeamLogoAlt, TEAM_FALLBACK_EMOJI } from '@/lib/team-logo-utils'

interface TeamLogoProps {
  teamId?: number | string | null
  teamName?: string | null
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function TeamLogo({ teamId, teamName, size = 'medium', className }: TeamLogoProps) {
  const [hasError, setHasError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  // Размеры в зависимости от пропа size
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  }

  const sizePixels = {
    small: 24,
    medium: 32,
    large: 48,
  }

  const emojiSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-xl',
  }

  // Если нет teamId, показываем fallback
  if (!teamId) {
    return (
      <div
        className={`${sizeClasses[size]} flex items-center justify-center bg-muted rounded ${className || ''}`}
      >
        <span className={emojiSizes[size]} aria-hidden title={teamName || 'Команда'}>
          {TEAM_FALLBACK_EMOJI}
        </span>
      </div>
    )
  }

  // Если произошла ошибка загрузки или еще загружается, показываем fallback
  if (hasError) {
    return (
      <div
        className={`${sizeClasses[size]} flex items-center justify-center bg-muted rounded ${className || ''}`}
      >
        <span className={emojiSizes[size]} aria-hidden title={teamName || 'Команда'}>
          {TEAM_FALLBACK_EMOJI}
        </span>
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} relative overflow-hidden rounded ${className || ''}`}>
      {isLoading && <div className="absolute inset-0 bg-muted animate-pulse rounded" />}
      <Image
        src={getTeamLogoUrl(teamId)}
        alt={getTeamLogoAlt(teamName || 'Команда')}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="w-full h-full object-contain"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
        unoptimized // Отключаем оптимизацию Next.js для статических файлов
      />
    </div>
  )
}
