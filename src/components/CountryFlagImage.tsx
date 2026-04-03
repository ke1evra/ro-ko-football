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

  const sizeParam = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium'
  const flagUrl = `/api/countries/${countryId}/flag?size=${sizeParam}`

  return (
    <div className={`relative ${className}`}>
      {/* Используем API URL напрямую - fallback будет показан браузером при ошибке */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagUrl}
        alt={`Флаг ${countryName || 'страны'}`}
        className="w-full h-full object-cover rounded"
      />
    </div>
  )
}
