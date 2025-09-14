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
  const [imageLoaded, setImageLoaded] = useState(false)

  console.log(`CountryFlagImage: countryId=${countryId}, countryName=${countryName}, imageError=${imageError}, imageLoaded=${imageLoaded}`)

  // Если нет ID страны, показываем иконку
  if (!countryId) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded ${className}`}>
        <Flag className={`text-muted-foreground ${
          size === 'small' ? 'h-3 w-3' : 
          size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
        }`} />
      </div>
    )
  }

  // Если произошла ошибка загрузки, показываем первую букву
  if (imageError) {
    return (
      <div className={`flex items-center justify-center bg-red-100 rounded ${className}`}>
        {countryName ? (
          <span className={`font-semibold text-red-600 ${
            size === 'small' ? 'text-xs' : 
            size === 'large' ? 'text-sm' : 'text-xs'
          }`}>
            {countryName.charAt(0).toUpperCase()}
          </span>
        ) : (
          <Flag className={`text-red-600 ${
            size === 'small' ? 'h-3 w-3' : 
            size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
          }`} />
        )}
      </div>
    )
  }

  const sizeParam = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium'
  const flagUrl = `/api/countries/${countryId}/flag?size=${sizeParam}`

  return (
    <div className={`relative ${className}`}>
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-100 rounded">
          <span className="text-blue-600 text-xs">Loading...</span>
        </div>
      )}
      
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagUrl}
        alt={`Флаг ${countryName || 'страны'}`}
        className={`w-full h-full object-cover rounded ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => {
          console.log(`Флаг загружен для страны ${countryName} (ID: ${countryId})`)
          setImageLoaded(true)
        }}
        onError={(e) => {
          console.error(`Ошибка загрузки флага для страны ${countryName} (ID: ${countryId}):`, e)
          console.error(`URL флага: ${flagUrl}`)
          setImageError(true)
        }}
      />
    </div>
  )
}