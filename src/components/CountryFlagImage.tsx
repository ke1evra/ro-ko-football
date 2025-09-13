'use client'

import React from 'react'
import { FlagImage } from './FlagImage'

interface CountryFlagImageProps {
  countryCode?: string | null // Код страны (например, "AUS", "GER")
  countryName?: string | null
  fallbackSrc?: string | null // Fallback URL если есть
  size?: 'small' | 'large'
  className?: string
}

export function CountryFlagImage({
  countryCode,
  countryName,
  fallbackSrc,
  size = 'large',
  className,
}: CountryFlagImageProps) {
  const [flagUrl, setFlagUrl] = React.useState<string | null>(fallbackSrc || null)
  const [isLoading, setIsLoading] = React.useState(Boolean(countryCode))

  React.useEffect(() => {
    if (!countryCode) {
      setIsLoading(false)
      return
    }

    // Извлекаем код страны из строки типа "AUS.png"
    const cleanCode = countryCode.replace('.png', '').toUpperCase()

    // Используем URL API напрямую как источник изображения
    const flagApiUrl = `/api/flags/country/${cleanCode}`

    // Проверяем, что изображение загружается
    const img = new Image()
    img.onload = () => {
      setFlagUrl(flagApiUrl)
      setIsLoading(false)
    }
    img.onerror = () => {
      console.error('Error loading country flag:', cleanCode)
      setIsLoading(false)
    }
    img.src = flagApiUrl
  }, [countryCode])

  if (isLoading) {
    return (
      <div
        className={`${size === 'large' ? 'w-12 h-12' : 'w-3 h-3'} bg-muted animate-pulse rounded ${className || ''}`}
      />
    )
  }

  return <FlagImage src={flagUrl} countryName={countryName} size={size} className={className} />
}
