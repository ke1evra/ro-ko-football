'use client'

import React from 'react'
import { FlagImage } from './FlagImage'

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
  countryName?: string | null
  fallbackSrc?: string | null // Fallback URL если есть
  size?: 'small' | 'large'
  className?: string
}

export function TeamFlagImage({
  teamId,
  countryName,
  fallbackSrc,
  size = 'large',
  className,
}: TeamFlagImageProps) {
  const [flagUrl, setFlagUrl] = React.useState<string | null>(fallbackSrc || null)
  const [isLoading, setIsLoading] = React.useState(Boolean(teamId))

  React.useEffect(() => {
    if (!teamId) {
      setIsLoading(false)
      return
    }

    // Используем URL API напрямую как источник изображения
    const flagApiUrl = `/api/flags/${teamId}`

    // Проверяем, что изображение загружается
    const img = new Image()
    img.onload = () => {
      setFlagUrl(flagApiUrl)
      setIsLoading(false)
    }
    img.onerror = () => {
      console.error('Error loading team flag:', teamId)
      setIsLoading(false)
    }
    img.src = flagApiUrl
  }, [teamId])

  if (isLoading) {
    return (
      <div
        className={`${size === 'large' ? 'w-12 h-12' : 'w-3 h-3'} bg-muted animate-pulse rounded ${className || ''}`}
      />
    )
  }

  return <FlagImage src={flagUrl} countryName={countryName} size={size} className={className} />
}
