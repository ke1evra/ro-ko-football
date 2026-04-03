'use client'

import React, { useState } from 'react'
import Image from 'next/image'

// Fallback эмодзи флагов для основных стран
const COUNTRY_FLAG_EMOJI: Record<string, string> = {
  Англия: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Германия: '🇩🇪',
  Италия: '🇮🇹',
  Франция: '🇫🇷',
  Испания: '🇪🇸',
  Россия: '🇷🇺',
  Португалия: '🇵🇹',
  Бельгия: '🇧🇪',
  Норвегия: '🇳🇴',
  Швеция: '🇸🇪',
}

interface TeamFlagImageProps {
  teamId?: number | string | null
  teamName?: string | null
  countryName?: string | null
  fallbackSrc?: string | null // Fallback URL если есть
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function TeamFlagImage({
  teamId,
  teamName,
  countryName,
  fallbackSrc,
  size = 'large',
  className,
}: TeamFlagImageProps) {
  const [isLoading, setIsLoading] = useState(true)

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  }

  const emojiSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-xl',
  }

  // Определяем размер для FlagImage
  const flagImageSize = size === 'medium' ? 'large' : size

  // Определяем URL флага
  const flagUrl = fallbackSrc || (teamId && teamId !== 1 && teamId !== 2 && teamId !== '1' && teamId !== '2'
    ? `/api/flags/${teamId}`
    : null)

  const fallbackEmoji = countryName ? COUNTRY_FLAG_EMOJI[countryName] || '⚽' : '⚽'

  // Если нет валидного teamId или URL флага, показываем fallback
  if (!flagUrl) {
    return (
      <div
        className={`${sizeClasses[size]} flex items-center justify-center bg-muted rounded ${className || ''}`}
      >
        <span
          className={emojiSizes[size]}
          aria-hidden
          title={teamName || countryName || 'Команда'}
        >
          {fallbackEmoji}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} overflow-hidden rounded ${className || ''}`}
    >
      {isLoading && (
        <div className={`${sizeClasses[size]} bg-muted animate-pulse rounded`} />
      )}
      <Image
        src={flagUrl}
        alt={`Флаг ${teamName || countryName || 'команды'}`}
        width={size === 'large' ? 48 : size === 'medium' ? 32 : 16}
        height={size === 'large' ? 48 : size === 'medium' ? 32 : 16}
        className={`w-full h-full object-cover ${isLoading ? 'hidden' : ''}`}
        unoptimized
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
    </div>
  )
}
