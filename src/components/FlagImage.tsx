import React from 'react'
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

interface FlagImageProps {
  src?: string | null
  countryName?: string | null
  size?: 'small' | 'large'
  className?: string
}

export function FlagImage({ src, countryName, size = 'large', className }: FlagImageProps) {
  const fallbackEmoji = countryName ? COUNTRY_FLAG_EMOJI[countryName] || '⚽' : '⚽'

  if (!src) {
    return (
      <span className={size === 'large' ? 'text-xl' : 'text-sm'} aria-hidden>
        {fallbackEmoji}
      </span>
    )
  }

  return (
    // Используем стандартный img вместо Next.js Image для внешних URL
    // с CSS для обработки ошибок загрузки
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${countryName} flag`}
      className={`flag-image ${className || ''}`}
      loading="lazy"
    />
  )
}
