'use client'

import * as React from 'react'
import Link from 'next/link'
import { TeamLogo } from '@/components/TeamLogo'

type LiveItem = {
  id: number
  fixtureId?: number
  compName?: string
  home: string
  away: string
  homeId?: number | string
  awayId?: number | string
  score?: string
  time_status?: string | null
}

function normalize(match: any): LiveItem | null {
  const id = Number(match?.id)
  const fixtureId = Number(match?.fixture_id ?? match?.fixtureId)
  if (!Number.isFinite(id) && !Number.isFinite(fixtureId)) return null
  const home = (match?.home?.name ||
    match?.homeTeam?.name ||
    match?.home_name ||
    match?.homeName) as string | undefined
  const away = (match?.away?.name ||
    match?.awayTeam?.name ||
    match?.away_name ||
    match?.awayName) as string | undefined
  const homeId = (match?.home?.id ||
    match?.homeTeam?.id ||
    match?.home_id ||
    match?.homeId) as number | string | undefined
  const awayId = (match?.away?.id ||
    match?.awayTeam?.id ||
    match?.away_id ||
    match?.awayId) as number | string | undefined
  const compName = (match?.competition?.name || match?.league?.name || match?.compName) as
    | string
    | undefined
  const score = (match?.scores?.score || match?.score) as string | undefined
  const time_status = (match?.time_status || match?.status) as string | undefined
  return {
    id: Number.isFinite(id) ? id : fixtureId!,
    fixtureId: Number.isFinite(fixtureId) ? fixtureId : undefined,
    compName,
    home: home || 'Команда дома',
    away: away || 'Команда гостей',
    homeId,
    awayId,
    score,
    time_status: time_status ?? null,
  }
}

export default function LiveMatchesWidget() {
  const [items, setItems] = React.useState<LiveItem[]>([])
  const [visible, setVisible] = React.useState(5)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(true)

  const load = React.useCallback(async (nextPage: number) => {
    try {
      setLoading(true)
      const controller = new AbortController()
      const to = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(`/api/fixtures?live=true&all=true&page=${nextPage}`, {
        signal: controller.signal,
      })
      clearTimeout(to)
      if (!res.ok) return
      const data = await res.json()
      const raw = (data?.matches || []) as any[]
      const normalized = raw.map(normalize).filter(Boolean) as LiveItem[]
      if (normalized.length === 0) {
        setHasMore(false)
      }
      setItems((prev) => {
        // убираем дубли по id
        const map = new Map<number, LiveItem>()
        ;[...prev, ...normalized].forEach((it) => map.set(it.id, it))
        return Array.from(map.values())
      })
      setPage(nextPage)
    } catch {
      // no-op
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    // первая загрузка
    void load(1)
    const t = setInterval(() => void load(1), 60000) // обновляем из источника раз в минуту
    return () => clearInterval(t)
  }, [load])

  const visibleItems = items.slice(0, visible)

  return (
    <div className="space-y-3 text-sm">
      {loading && items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Загрузка…</div>
      ) : visibleItems.length === 0 ? (
        <div className="text-sm text-muted-foreground">Сейчас нет лайв‑матчей</div>
      ) : (
        <ul className="space-y-3">
          {visibleItems.map((m, idx) => {
            const href =
              m.id && !m.fixtureId
                ? `/matches/${m.id}`
                : m.fixtureId
                  ? `/fixtures/${m.fixtureId}`
                  : '#'
            return (
              <li
                key={`${m.id}-${idx}`}
                className="border rounded p-3 hover:bg-accent/50 transition-colors"
              >
                <Link href={href} className="block">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground truncate">
                      {m.compName || 'Лайв матч'}
                    </div>
                    <div className="text-xs font-semibold text-primary">
                      {m.score || m.time_status || 'LIVE'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TeamLogo 
                        teamId={m.homeId} 
                        teamName={m.home} 
                        size="small" 
                      />
                      <span className="truncate font-medium text-sm">{m.home}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TeamLogo 
                        teamId={m.awayId} 
                        teamName={m.away} 
                        size="small" 
                      />
                      <span className="truncate font-medium text-sm">{m.away}</span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {items.length > visible && (
        <div className="pt-1">
          <button
            type="button"
            className="inline-flex items-center rounded border px-3 py-1 text-xs hover:bg-accent"
            onClick={() => setVisible((v) => v + 5)}
            disabled={loading}
          >
            Показать ещё
          </button>
        </div>
      )}

      {/* Пагинация по API страницам */}
      {hasMore && (
        <div className="pt-1">
          <button
            type="button"
            className="inline-flex items-center rounded border px-3 py-1 text-xs hover:bg-accent"
            onClick={() => void load(page + 1)}
            disabled={loading}
          >
            Загрузить следующую страницу
          </button>
        </div>
      )}
    </div>
  )
}
