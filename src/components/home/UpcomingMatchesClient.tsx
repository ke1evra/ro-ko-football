'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TeamLogo } from '@/components/TeamLogo'
import { AlertCircle, RefreshCw } from 'lucide-react'

export type SimpleFixture = {
  id: number
  date: string
  time?: string
  home: string
  away: string
  homeId?: number
  awayId?: number
  competitionName?: string
}

interface UpcomingMatchesClientProps {
  initialMatches: SimpleFixture[]
  /** Starting number of visible items (default: 5) */
  initialVisible?: number
  /** Number of items to show per "show more" click (default: 5) */
  pageSize?: number
  /** Error message if data failed to load on server */
  error?: string | null
  /** Whether initial load failed */
  hasError?: boolean
}

function formatDay(date: string, time?: string) {
  try {
    return new Date(`${date}T${time || '00:00'}Z`).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return ''
  }
}

export function UpcomingMatchesClient({
  initialMatches,
  initialVisible = 5,
  pageSize = 5,
  error,
  hasError,
}: UpcomingMatchesClientProps) {
  const [visible, setVisible] = React.useState(initialVisible)
  const [retrying, setRetrying] = React.useState(false)

  const visibleItems = initialMatches.slice(0, visible)

  // Handle retry on client side
  const handleRetry = () => {
    setRetrying(true)
    window.location.reload()
  }

  return (
    <div className="space-y-3 text-sm">
      {/* Error state - distinct from empty state */}
      {hasError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Ошибка загрузки</span>
          </div>
          <p className="text-xs text-red-500 mb-3">
            {error || 'Не удалось загрузить матчи. Попробуйте обновить страницу.'}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            disabled={retrying}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            {retrying ? 'Обновление...' : 'Обновить'}
          </Button>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Нет матчей в ближайшие 7 дней из топ-лиг
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleItems.map((m) => (
            <li key={m.id} className="border rounded p-3 hover:bg-accent/50 transition-colors">
              <Link href={`/fixtures/${m.id}`} className="block">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground truncate">
                    {m.competitionName || 'Матч'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDay(m.date, m.time)} {m.time || ''}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamId={m.homeId} teamName={m.home} size="small" />
                    <span className="truncate font-medium text-sm">{m.home}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamLogo teamId={m.awayId} teamName={m.away} size="small" />
                    <span className="truncate font-medium text-sm">{m.away}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Show "Show more" button only when there are more items and no error */}
      {!hasError && initialMatches.length > visible && (
        <div className="pt-1">
          <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + pageSize)}>
            Показать ещё
          </Button>
        </div>
      )}
    </div>
  )
}
