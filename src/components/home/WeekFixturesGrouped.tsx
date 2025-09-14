"use client"

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LocalDateTime } from '@/components/LocalDateTime'
import { Calendar, Clock, MapPin } from 'lucide-react'

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

export default function WeekFixturesGrouped({ matches }: { matches: UpcomingMatch[] }) {
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
          <div key={dateKey} className="rounded-md border">
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-accent/30 text-sm">
              <Calendar className="h-3 w-3" />
              <LocalDateTime date={dateKey} utc showTime={false} />
            </div>

            <div className="divide-y">
              {Array.from(leagues.entries()).map(([leagueKey, bucket]) => (
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

                  <div className="divide-y">
                    {bucket.matches.map((m) => (
                      <div key={m.id} className="px-3 py-2 text-sm flex flex-col gap-1 hover:bg-accent/20">
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <LocalDateTime date={m.date} time={m.time} utc showDate={false} />
                          </div>
                          <div className="flex items-center gap-2">
                            {m.round ? (
                              <Badge variant="secondary" className="text-2xs">Тур {m.round}</Badge>
                            ) : null}
                            {m.group_id ? (
                              <Badge variant="secondary" className="text-2xs">Группа {m.group_id}</Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 text-right truncate">
                            <Link href={`/teams/${m.home_team.id}`} className="font-semibold hover:text-primary">
                              {m.home_team.name}
                            </Link>
                          </div>
                          <div className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">VS</div>
                          <div className="flex-1 truncate">
                            <Link href={`/teams/${m.away_team.id}`} className="font-semibold hover:text-primary">
                              {m.away_team.name}
                            </Link>
                          </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {m.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[240px]">{m.location}</span>
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

                          {m.h2h ? (
                            <a href={m.h2h} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              H2H
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
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
