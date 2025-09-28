'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import PredictionButton from '@/components/predictions/PredictionButton'

type SimpleFixture = {
  id: number
  date: string
  time?: string
  home: string
  away: string
  competitionName?: string
}

function formatDay(date: string, time?: string) {
  try {
    return new Date(`${date}T${time || '00:00'}Z`).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

export default function UpcomingAllMatchesWidget() {
  const [items, setItems] = React.useState<SimpleFixture[]>([])
  const [visible, setVisible] = React.useState(5)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const today = new Date().toISOString().split('T')[0]
        const controller = new AbortController()
        const to = setTimeout(() => controller.abort(), 7000)
        const res = await fetch(`/api/fixtures?date=${today}&size=100&all=true`, { signal: controller.signal })
        clearTimeout(to)
        if (!res.ok) return
        const data = await res.json()
        const fixtures = (data?.fixtures || []) as any[]
        const normalized: SimpleFixture[] = fixtures
          .map((fx: any) => ({
            id: Number(fx?.id ?? fx?.fixtureId ?? fx?.fixture_id),
            date: String(fx?.date ?? fx?.fixture_date ?? fx?.fixtureDate ?? ''),
            time: typeof fx?.time === 'string' ? fx.time : (typeof fx?.fixture_time === 'string' ? fx.fixture_time : undefined),
            home: (fx?.home?.name || fx?.homeTeam?.name || fx?.home_name || fx?.homeName || 'Команда дома') as string,
            away: (fx?.away?.name || fx?.awayTeam?.name || fx?.away_name || fx?.awayName || 'Команда гостей') as string,
            competitionName: (fx?.competition?.name || fx?.league?.name || fx?.compName) as string | undefined,
          }))
          .filter((m) => Number.isFinite(m.id))

        const todayStr = new Date().toISOString().split('T')[0]
        const onlyToday = normalized.filter((m) => String(m.date).startsWith(todayStr))
        const withTime = onlyToday.map((m) => {
          const tsVal = new Date(`${m.date}T${m.time || '00:00'}Z`).getTime()
          const ts = Number.isFinite(tsVal) ? tsVal : Number.MAX_SAFE_INTEGER
          return { ...m, ts }
        }) as (SimpleFixture & { ts: number })[]
        withTime.sort((a, b) => a.ts - b.ts)
        if (mounted) setItems(withTime)
      } catch {
        // no-op
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const visibleItems = items.slice(0, visible)

  return (
    <div className="space-y-3 text-sm">
      {loading && items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Загрузка…</div>
      ) : visibleItems.length === 0 ? (
        <div className="text-sm text-muted-foreground">Нет ближайших матчей</div>
      ) : (
        <ul className="space-y-3">
          {visibleItems.map((m) => (
            <li key={m.id} className="border rounded p-2 hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/fixtures/${m.id}`} className="flex-1 min-w-0">
                  <div className="truncate font-medium">{m.home} — {m.away}</div>
                  <div className="text-muted-foreground truncate">{m.competitionName}</div>
                </Link>
                <div className="text-right text-muted-foreground">
                  <div>{formatDay(m.date, m.time)}</div>
                  <div className="text-xs">{m.time || '—'}</div>
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <PredictionButton fixtureId={m.id} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length > visible && (
        <div className="pt-1">
          <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + 5)}>
            Показать ещё
          </Button>
        </div>
      )}
    </div>
  )
}
