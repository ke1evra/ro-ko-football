/**
 * Компонент для отображения статуса обновления данных и кнопки обновления
 * Использует shadcn компоненты
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { usePolling } from '@/hooks/usePolling'
import type { StandingsResponse } from '@/lib/live-score-api/dto'

interface DataRefreshStatusProps {
  league: string
  season: string
  view?: string
  round?: string
  initialData?: StandingsResponse
  onDataUpdate?: (data: StandingsResponse) => void
}

export default function DataRefreshStatus({
  league,
  season,
  view = 'all',
  round,
  initialData,
  onDataUpdate,
}: DataRefreshStatusProps) {
  const [nextRefresh, setNextRefresh] = useState<number>(60)
  const lastFetchTimeRef = useRef<Date>(new Date())

  // Функция для получения данных
  const fetchStandings = async (): Promise<StandingsResponse> => {
    const url = `/api/standings/${league}/${season}?view=${view}${round ? `&round=${round}` : ''}`
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Failed to fetch standings: ${response.status}`)
    }

    return response.json()
  }

  // Используем хук поллинга
  const { data, loading, error, lastUpdated, refresh } = usePolling(fetchStandings, {
    interval: 60000, // 1 минута
    enabled: true,
    immediate: false, // Не загружаем сразу, так как у нас есть initialData
  })

  // Обновляем родительский компонент при получении новых данных
  useEffect(() => {
    if (data && onDataUpdate) {
      onDataUpdate(data)
    }
  }, [data, onDataUpdate])

  // Обновляем время последнего запроса
  useEffect(() => {
    if (lastUpdated) {
      lastFetchTimeRef.current = lastUpdated
    }
  }, [lastUpdated])

  // Основной таймер - обновляется каждую секунду
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - lastFetchTimeRef.current.getTime()) / 1000)
      const remaining = Math.max(0, 60 - elapsed)
      setNextRefresh(remaining)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleRefresh = () => {
    refresh()
    lastFetchTimeRef.current = new Date()
    setNextRefresh(60)
  }

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return 'Обновление...'
    return `${seconds}с`
  }

  const getStatusBadge = () => {
    if (loading) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Обновление
        </Badge>
      )
    }

    if (error) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Ошибка
        </Badge>
      )
    }

    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Актуально
      </Badge>
    )
  }

  const currentData = data || initialData
  const displayLastUpdated =
    lastUpdated || (currentData?.lastUpdated ? new Date(currentData.lastUpdated) : null)

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-3">
        {getStatusBadge()}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {displayLastUpdated ? (
              <>
                Обновлено:{' '}
                {displayLastUpdated.toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            ) : (
              'Загрузка...'
            )}
          </span>
        </div>

        {!loading && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Следующее обновление через {formatTime(nextRefresh)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {currentData?.source && (
          <Badge variant={currentData.source === 'database' ? 'secondary' : 'default'}>
            {currentData.source === 'database' ? 'БД' : 'Live'}
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>
    </div>
  )
}
