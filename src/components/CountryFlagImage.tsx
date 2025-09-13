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
  className = '' 
}: CountryFlagImageProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  // Если нет ID страны или произошла ошибка загрузки, показываем иконку
  if (!countryId || imageError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Flag className={`text-muted-foreground ${
          size === 'small' ? 'h-3 w-3' : 
          size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
        }`} />
      </div>
    )
  }

  const sizeParam = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium'
  
  // Используем API для получения флага
  const flagUrl = `/api/countries/${countryId}/flag?size=${sizeParam}`

  return (
    <div className={`relative ${className}`}>
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <Flag className={`text-muted-foreground ${
            size === 'small' ? 'h-3 w-3' : 
            size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
          }`} />
        </div>
      )}
      
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagUrl}
        alt={`Флаг ${countryName || 'страны'}`}
        className={`${className} ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setImageLoading(false)}
        onError={() => {
          setImageError(true)
          setImageLoading(false)
        }}
      />
    </div>
  )
}