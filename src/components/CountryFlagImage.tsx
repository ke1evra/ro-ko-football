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

  // Если произошла ошибка загрузки, показываем первую букву
  if (imageError) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded ${className}`}>
        {countryName ? (
          <span
            className={`font-semibold text-muted-foreground ${
              size === 'small' ? 'text-xs' : size === 'large' ? 'text-sm' : 'text-xs'
            }`}
          >
            {countryName.charAt(0).toUpperCase()}
          </span>
        ) : (
          <Flag
            className={`text-muted-foreground ${
              size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
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
        onError={() => {
          // Тихо обрабатываем ошибку - не логируем для турниров
          const isLikelyTournament =
            countryName &&
            (countryName.includes('Championship') ||
              countryName.includes('League') ||
              countryName.includes('Cup') ||
              countryName.includes('Nations') ||
              countryName.includes('Olympics'))

          if (!isLikelyTournament) {
            console.warn(`Не удалось ��агрузить флаг для ${countryName} (ID: ${countryId})`)
          }

          setImageError(true)
        }}
      />
    </div>
  )
}
