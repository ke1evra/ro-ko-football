'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TeamLogo } from '@/components/TeamLogo'

type SimpleFixture = {
  id: number
  date: string
  time?: string
  home: string
  away: string
  homeId?: number
  awayId?: number
  competitionName?: string
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

export default function UpcomingAllMatchesWidget() {
  const [items, setItems] = React.useState<SimpleFixture[]>([])
  const [visible, setVisible] = React.useState(5)
  const [loading, setLoading] = React.useState(false)
  const [apiResponse, setApiResponse] = React.useState<any>(null)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const controller = new AbortController()
        const to = setTimeout(() => controller.abort(), 7000)
        // Используем новый API с диапазоном 7 дней для приоритетных лиг
        const res = await fetch('/api/fixtures?size=100', { signal: controller.signal })
        clearTimeout(to)
        if (!res.ok) return
        const data = await res.json()

        // Сохраняем сырой ответ для отладки
        if (mounted) setApiResponse(data)

        const fixtures = (data?.fixtures || []) as any[]
        const normalized: SimpleFixture[] = fixtures
          .map((fx: any) => ({
            id: Number(fx?.id ?? fx?.fixtureId ?? fx?.fixture_id),
            date: String(fx?.date ?? fx?.fixture_date ?? fx?.fixtureDate ?? ''),
            time:
              typeof fx?.time === 'string'
                ? fx.time
                : typeof fx?.fixture_time === 'string'
                  ? fx.fixture_time
                  : undefined,
            home: (fx?.home?.name ||
              fx?.homeTeam?.name ||
              fx?.home_name ||
              fx?.homeName ||
              'Команда дома') as string,
            away: (fx?.away?.name ||
              fx?.awayTeam?.name ||
              fx?.away_name ||
              fx?.awayName ||
              'Команда гостей') as string,
            homeId:
              Number(fx?.home?.id || fx?.homeTeam?.id || fx?.home_id || fx?.homeId || 0) ||
              undefined,
            awayId:
              Number(fx?.away?.id || fx?.awayTeam?.id || fx?.away_id || fx?.awayId || 0) ||
              undefined,
            competitionName: (fx?.competition?.name || fx?.league?.name || fx?.compName) as
              | string
              | undefined,
          }))
          .filter((m) => Number.isFinite(m.id))

        // Сортируем по дате и времени (ближайшие первыми)
        const withTime = normalized.map((m) => {
          const tsVal = new Date(`${m.date}T${m.time || '00:00'}Z`).getTime()
          const ts = Number.isFinite(tsVal) ? tsVal : Number.MAX_SAFE_INTEGER
          return { ...m, ts }
        }) as (SimpleFixture & { ts: number })[]

        // Фильтруем только будущие матчи и сортируем по времени
        const now = Date.now()
        const futureMatches = withTime.filter((m) => m.ts > now).sort((a, b) => a.ts - b.ts)

        if (mounted) setItems(futureMatches)
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
        <div className="text-sm text-muted-foreground">
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
