"use client"

import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LocalDateTime } from '@/components/LocalDateTime'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { getLeaguePriorityClient, initializeLeaguesCache } from '@/lib/highlight-competitions-client'

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

function getCompetitionWeight(competitionId?: number): number {
  if (!competitionId) return 9999
  return getLeaguePriorityClient(competitionId)
}

export default function WeekFixturesGrouped({ matches }: { matches: UpcomingMatch[] }) {
  // Инициализируем кэш лиг при загрузке компонента
  useEffect(() => {
    initializeLeaguesCache()
  }, [])

  const grouped = useMemo(() => {
    const byDate = new Map<string, Map<string, { competition?: { id: number; name: string }; matches: UpcomingMatch[] }>>()
    for (const m of matches) {
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
  const [visibleDates, setVisibleDates] = useState(Math.min(3, dateKeys.length))

  if (matches.length === 0) {
    return <div className="text-sm text-muted-foreground">Нет ближайших матчей</div>
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
                  const wa = getCompetitionWeight(a[1].competition?.id)
                  const wb = getCompetitionWeight(b[1].competition?.id)
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
                            <div className="text-sm font-semibold truncate text-right">{m.home_team.name}</div>
                            <div className="text-[11px] text-muted-foreground text-center">vs</div>
                            <div className="text-sm font-semibold truncate text-left">{m.away_team.name}</div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                            {m.round ? (
                              <Badge variant="secondary" className="text-[10px]">Тур {m.round}</Badge>
                            ) : null}
                            {m.group_id ? (
                              <Badge variant="secondary" className="text-[10px]">Группа {m.group_id}</Badge>
                            ) : null}
                            {m.location ? (
                              <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{m.location}</span>
                              </span>
                            ) : null}
                            {m.odds?.pre && (m.odds.pre['1'] || m.odds.pre.X || m.odds.pre['2']) ? (
                              <span className="inline-flex items-center gap-1">
                                Коэф:
                                {m.odds.pre['1'] != null ? <span>1 {m.odds.pre['1']}</span> : null}
                                {m.odds.pre.X != null ? <span>X {m.odds.pre.X}</span> : null}
                                {m.odds.pre['2'] != null ? <span>2 {m.odds.pre['2']}</span> : null}
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
          <Button variant="outline" size="sm" onClick={() => setVisibleDates((n) => Math.min(n + 3, dateKeys.length))}>
            Загрузить ещё
          </Button>
        </div>
      ) : null}
    </div>
  )
}
