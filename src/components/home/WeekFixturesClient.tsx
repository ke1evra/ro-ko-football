'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LocalDateTime } from '@/components/LocalDateTime'
import { Calendar, Clock, MapPin, AlertCircle, RefreshCw } from 'lucide-react'

export type UpcomingMatch = {
  id: number
  date: string
  time: string
  home_team: { id: number; name: string }
  away_team: { id: number; name: string }
  competition?: { id: number; name: string }
  location?: string | null
  round?: string
  group_id?: number | null
  odds?: {
    pre?: { '1'?: number; '2'?: number; X?: number }
    live?: { '1'?: number | null; '2'?: number | null; X?: number | null }
  }
  h2h?: string
}

export type LeaguePriority = {
  id: number
  name: string
  country?: string
  priority: number
  enabled: boolean
}

interface WeekFixturesClientProps {
  matches: UpcomingMatch[]
  /** Pre-fetched league priorities from server */
  leaguePriorities: LeaguePriority[]
  /** Initial number of visible dates (default: 3) */
  initialVisibleDates?: number
  /** Number of dates to show per "load more" click (default: 3) */
  pageSize?: number
  /** Error message if data failed to load on server */
  error?: string | null
  /** Whether initial load failed */
  hasError?: boolean
}

/**
 * Get competition weight based on pre-fetched priorities
 */
function getCompetitionWeight(competitionId: number, priorities: LeaguePriority[]): number {
  const league = priorities.find((p) => p.id === competitionId)
  return league?.priority ?? 999 // Low priority for non-priority leagues
}

export function WeekFixturesClient({
  matches,
  leaguePriorities,
  initialVisibleDates = 3,
  pageSize = 3,
  error,
  hasError,
}: WeekFixturesClientProps) {
  const [retrying, setRetrying] = useState(false)

  const grouped = useMemo(() => {
    // Filter future matches and sort by date/time
    const now = Date.now()
    const filteredMatches = matches
      .filter(m => {
        const matchTime = new Date(`${m.date}T${m.time || '00:00'}Z`).getTime()
        return matchTime > now
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}Z`).getTime()
        const dateB = new Date(`${b.date}T${b.time || '00:00'}Z`).getTime()
        return dateA - dateB
      })

    const byDate = new Map<
      string,
      Map<string, { competition?: { id: number; name: string }; matches: UpcomingMatch[] }>
    >()
    for (const m of filteredMatches) {
      const dateKey = m.date
      const leagueKey = m.competition ? `${m.competition.id}:${m.competition.name}` : '0:Прочее'
      let leagues = byDate.get(dateKey)
      if (!leagues) {
        leagues = new Map()
        byDate.set(dateKey, leagues)
      }
      let bucket = leagues.get(leagueKey)
      if (!bucket) {
        bucket = { competition: m.competition, matches: [] }
        leagues.set(leagueKey, bucket)
      }
      bucket.matches.push(m)
    }
    return byDate
  }, [matches])

  const dateKeys = useMemo(() => Array.from(grouped.keys()), [grouped])
  const [visibleDates, setVisibleDates] = useState(Math.min(initialVisibleDates, dateKeys.length))

  // Handle retry on client side
  const handleRetry = () => {
    setRetrying(true)
    window.location.reload()
  }

  // Error state - distinct from empty state
  if (hasError) {
    return (
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
    )
  }

  if (matches.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-4">Нет ближайших матчей</div>
  }

  return (
    <div className="space-y-4">
      {dateKeys.slice(0, visibleDates).map((dateKey) => {
        const leagues = grouped.get(dateKey)!
        return (
          <div key={dateKey} className="rounded-md border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-accent/30 text-sm">
              <Calendar className="h-3 w-3" />
              <LocalDateTime date={dateKey} utc showTime={false} />
            </div>

            <div className="divide-y">
              {Array.from(leagues.entries())
                .sort((a, b) => {
                  const wa = getCompetitionWeight(a[1].competition?.id || 0, leaguePriorities)
                  const wb = getCompetitionWeight(b[1].competition?.id || 0, leaguePriorities)
                  if (wa !== wb) return wa - wb
                  const an = a[1].competition?.name || ''
                  const bn = b[1].competition?.name || ''
                  return an.localeCompare(bn)
                })
                .map(([leagueKey, bucket]) => (
                  <div key={leagueKey}>
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {bucket.competition?.name || 'Прочие соревнования'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bucket.matches.length} матч(ей)
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        {bucket.matches.map((m) => (
                          <Link
                            key={m.id}
                            href={`/fixtures/${m.id}`}
                            className="group rounded-md border p-3 hover:bg-accent transition-colors"
                            aria-label={`${m.home_team.name} — ${m.away_team.name}`}
                          >
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <Clock className="h-3 w-3" />
                              <LocalDateTime date={m.date} time={m.time} utc showDate={false} />
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-semibold truncate text-right">
                                {m.home_team.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground text-center">
                                vs
                              </div>
                              <div className="text-sm font-semibold truncate text-left">
                                {m.away_team.name}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                              {m.round ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Тур {m.round}
                                </Badge>
                              ) : null}
                              {m.group_id ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Группа {m.group_id}
                                </Badge>
                              ) : null}
                              {m.location ? (
                                <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{m.location}</span>
                                </span>
                              ) : null}
                              {m.odds?.pre &&
                              (m.odds.pre['1'] || m.odds.pre.X || m.odds.pre['2']) ? (
                                <span className="inline-flex items-center gap-1">
                                  Коэф:
                                  {m.odds.pre['1'] != null ? (
                                    <span>1 {m.odds.pre['1']}</span>
                                  ) : null}
                                  {m.odds.pre.X != null ? <span>X {m.odds.pre.X}</span> : null}
                                  {m.odds.pre['2'] != null ? (
                                    <span>2 {m.odds.pre['2']}</span>
                                  ) : null}
                                </span>
                              ) : null}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )
      })}

      {visibleDates < dateKeys.length ? (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleDates((n) => Math.min(n + pageSize, dateKeys.length))}
          >
            Загрузить ещё
          </Button>
        </div>
      ) : null}
    </div>
  )
}
