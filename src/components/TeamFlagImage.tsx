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
  const [flagUrl, setFlagUrl] = React.useState<string | null>(fallbackSrc || null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    // Если нет teamId или это явно фиктивный ID (1, 2), не пытаемся загружать
    if (!teamId || teamId === 1 || teamId === 2 || teamId === '1' || teamId === '2') {
      setIsLoading(false)
      setHasError(true)
      return
    }

    setIsLoading(true)
    setHasError(false)

    // Используем URL API напрямую как источник изображения
    const flagApiUrl = `/api/flags/${teamId}`

    // Проверяем, что изображение загружается
    const img = new Image()
    img.onload = () => {
      setFlagUrl(flagApiUrl)
      setIsLoading(false)
      setHasError(false)
    }
    img.onerror = () => {
      // Логируем ошибку только для реальных ID команд (больше 10)
      if (Number(teamId) > 10) {
        console.error('Error loading team flag:', teamId)
      }
      setIsLoading(false)
      setHasError(true)
    }
    img.src = flagApiUrl
  }, [teamId])

  if (isLoading) {
    return (
      <div
        className={`${
          size === 'large' ? 'w-12 h-12' : 
          size === 'medium' ? 'w-8 h-8' : 'w-4 h-4'
        } bg-muted animate-pulse rounded ${className || ''}`}
      />
    )
  }

  // Если есть ошибка или нет URL, показываем fallback
  if (hasError || !flagUrl) {
    const fallbackEmoji = countryName ? COUNTRY_FLAG_EMOJI[countryName] || '⚽' : '⚽'
    
    return (
      <div
        className={`${
          size === 'large' ? 'w-12 h-12' : 
          size === 'medium' ? 'w-8 h-8' : 'w-4 h-4'
        } flex items-center justify-center bg-muted rounded ${className || ''}`}
      >
        <span 
          className={`${
            size === 'large' ? 'text-xl' : 
            size === 'medium' ? 'text-base' : 'text-sm'
          }`} 
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
      className={`${
        size === 'large' ? 'w-12 h-12' : 
        size === 'medium' ? 'w-8 h-8' : 'w-4 h-4'
      } overflow-hidden rounded ${className || ''}`}
    >
      <FlagImage 
        src={flagUrl} 
        countryName={countryName} 
        size={size === 'medium' ? 'large' : size} 
        className="w-full h-full object-cover"
      />
    </div>
  )
}