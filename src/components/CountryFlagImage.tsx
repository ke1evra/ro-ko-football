'use client'

import React from 'react'
import { FlagImage } from './FlagImage'

interface CountryFlagImageProps {
  countryId?: number | string | null // ID страны из API Livescore
  countryCode?: string | null // Код страны (например, "AUS", "GER")
  countryName?: string | null
  fallbackSrc?: string | null // Fallback URL если есть
  size?: 'small' | 'large'
  className?: string
}

// Кэшируем список стран в пределах жизни вкладки
let countriesCache: { mapByName: Map<string, string> } | null = null

export function CountryFlagImage({
  countryId,
  countryCode,
  countryName,
  fallbackSrc,
  size = 'large',
  className,
}: CountryFlagImageProps) {
  const [flagUrl, setFlagUrl] = React.useState<string | null>(fallbackSrc || null)
  const [isLoading, setIsLoading] = React.useState(Boolean(countryId ?? countryCode ?? countryName))

  React.useEffect(() => {
    let mounted = true

    const setDone = () => {
      if (!mounted) return
      setIsLoading(false)
    }

    const setUrl = (url: string) => {
      if (!mounted) return
      setFlagUrl(url)
      setIsLoading(false)
    }

    const loadImage = (url: string) => {
      const img = new Image()
      img.onload = () => setUrl(url)
      img.onerror = () => setDone()
      img.src = url
    }

    const resolve = async () => {
      // 1) Если передали countryId — используем прямой API
      if (countryId) {
        loadImage(`/api/flags/country-id/${countryId}`)
        return
      }

      // 2) Иначе пробуем найти countryId по названию страны
      if (countryName) {
        try {
          if (!countriesCache) {
            const res = await fetch('/api/ls/countries', { cache: 'force-cache' })
            if (!res.ok) throw new Error('countries request failed')
            const json = await res.json()
            const arr: unknown[] = Array.isArray(json?.data?.country) ? json.data.country : []
            const m = new Map<string, string>()
            for (const it of arr) {
              const item = it as { id?: string | number; name?: string }
              const nm = (item.name || '').toString().trim().toLowerCase()
              const id = item.id != null ? String(item.id) : ''
              if (nm && id) m.set(nm, id)
            }
            countriesCache = { mapByName: m }
          }
          const key = countryName.trim().toLowerCase()
          const id = countriesCache.mapByName.get(key)
          if (id) {
            loadImage(`/api/flags/country-id/${id}`)
            return
          }
        } catch {
          // игнорируем и завершаем без флага
        }
      }

      // 3) Ничего не получилось — завершаем без флага
      setDone()
    }

    resolve()
    return () => {
      mounted = false
    }
  }, [countryId, countryName, countryCode])

  if (isLoading) {
    return (
      <div
        className={`${size === 'large' ? 'w-12 h-12' : 'w-3 h-3'} bg-muted animate-pulse rounded ${className || ''}`}
      />
    )
  }

  return <FlagImage src={flagUrl} countryName={countryName} size={size} className={className} />
}
