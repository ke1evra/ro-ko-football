'use client'

import React from 'react'

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
  const [hasError, setHasError] = React.useState(false)

  const handleError = () => {
    setHasError(true)
  }

  const fallbackEmoji = countryName ? COUNTRY_FLAG_EMOJI[countryName] || '⚽' : '⚽'

  if (!src || hasError) {
    return (
      <span className={size === 'large' ? 'text-xl' : 'text-sm'} aria-hidden>
        {fallbackEmoji}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${countryName} flag`}
      className={className}
      onError={handleError}
      onLoad={() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Флаг загружен:', src)
        }
      }}
    />
  )
}
