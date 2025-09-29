'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'

interface CountryFlagImageProps {
  countryId?: number
  countryName?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function CountryFlagImage({
  countryId,
  countryName,
  size = 'medium',
  className = '',
}: CountryFlagImageProps) {
  const [imageError, setImageError] = useState(false)

  

  // Если нет ID страны, показываем иконку
  if (!countryId) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded ${className}`}>
        <Flag
          className={`text-muted-foreground ${
            size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
          }`}
        />
      </div>
    )
  }

  // Временно показываем fallback вместо загрузки изображения для отладки
  const showFallback = imageError

  if (showFallback) {
    return (
      <div className={`flex items-center justify-center bg-primary/10 border border-primary/20 rounded ${className}`}>
        {countryName ? (
          <span
            className={`font-bold text-primary ${
              size === 'small' ? 'text-[8px]' : size === 'large' ? 'text-sm' : 'text-xs'
            }`}
          >
            {countryName.charAt(0).toUpperCase()}
          </span>
        ) : (
          <Flag
            className={`text-primary ${
              size === 'small' ? 'h-2 w-2' : size === 'large' ? 'h-4 w-4' : 'h-3 w-3'
            }`}
          />
        )}
      </div>
    )
  }

  const sizeParam = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium'
  const flagUrl = `/api/countries/${countryId}/flag?size=${sizeParam}`

  

  return (
    <div className={`relative ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagUrl}
        alt={`Флаг ${countryName || 'страны'}`}
        className="w-full h-full object-cover rounded"
        onLoad={() => {}}
        onError={() => {
          setImageError(true)
        }}
      />
    </div>
  )
}
