"use client"

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'


import { getLeaguePriorityClient } from '@/lib/highlight-competitions-client'
import type { Fixture } from '@/app/(frontend)/client/types/Fixture'

export type StripMatch = {
  id: number
  date: string
  time?: string
  home?: { id?: number; name?: string; logo?: string | null }
  away?: { id?: number; name?: string; logo?: string | null }
  competition?: { id?: number; name?: string | null }
  country?: { id?: number; name?: string | null }
}

function formatTime(date: string, time?: string) {
  try {
    if (time) return new Date(`${date}T${time}Z`).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return time || ''
  }
}

function normalizeFixture(fx: any): StripMatch | null {
  const id = Number(fx?.id)
  if (!Number.isFinite(id)) return null
  
  // Извлекаем данные из разных возможных форматов API
  const home = {
    id: Number(fx?.home_id || fx?.home?.id || 0),
    name: String(fx?.home_name || fx?.home?.name || 'Команда дома'),
    logo: fx?.home?.logo || fx?.home_logo || null,
  }
  
  const away = {
    id: Number(fx?.away_id || fx?.away?.id || 0),
    name: String(fx?.away_name || fx?.away?.name || 'Команда гостей'),
    logo: fx?.away?.logo || fx?.away_logo || null,
  }
  
  const competition = fx?.competition_id ? {
    id: Number(fx.competition_id),
    name: String(fx?.league?.name || fx?.competition?.name || 'Неизвестная лига'),
  } : undefined
  
  return {
    id,
    date: String(fx?.date || ''),
    time: typeof fx?.time === 'string' ? fx.time : undefined,
    home,
    away,
    competition,
    country: fx?.country || fx?.competition?.country || undefined,
  }
}

function sortByPriorityAndTime(a: StripMatch, b: StripMatch) {
  const wa = getLeaguePriorityClient(a.competition?.id || 0)
  const wb = getLeaguePriorityClient(b.competition?.id || 0)
  if (wa !== wb) return wa - wb
  const ta = new Date(`${a.date}T${a.time || '00:00'}Z`).getTime()
  const tb = new Date(`${b.date}T${b.time || '00:00'}Z`).getTime()
  return ta - tb
}

export function UpcomingMatchesStrip({ initial }: { initial: any[] }) {
  const [items, setItems] = React.useState<StripMatch[]>(() =>
    initial.map(normalizeFixture).filter(Boolean) as StripMatch[],
  )
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    async function refresh() {
      try {
        setIsLoading(true)
        const today = new Date().toISOString().split('T')[0]
        console.log('[UpcomingMatchesStrip] fetching fixtures for date:', today)
        
        // Добавляем таймаут для запроса
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 секунд таймаут
        
        const res = await fetch(`/api/fixtures?date=${today}&size=60`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        console.log('[UpcomingMatchesStrip] API response status:', res.status)
        if (!res.ok) {
          console.error('[UpcomingMatchesStrip] API error:', res.status, res.statusText)
          return
        }
        const data = await res.json()
        console.log('[UpcomingMatchesStrip] API response data:', data)
        const list: any[] = data.fixtures || data.data?.fixtures || []
        console.log('[UpcomingMatchesStrip] extracted fixtures list:', list.length, 'items')
        if (!mounted) return
        const normalized = list.map(normalizeFixture).filter(Boolean) as StripMatch[]
        console.log('[UpcomingMatchesStrip] normalized fixtures:', normalized.length, 'items')
        setItems(normalized)
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          console.warn('[UpcomingMatchesStrip] Request timed out')
        } else {
          console.error('[UpcomingMatchesStrip] fetch error:', e)
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    // Отложенная загрузка, чтобы не блокировать рендер
    setTimeout(refresh, 100)
    const t = setInterval(refresh, 120000)
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const todayItems = React.useMemo(() => items.filter((m) => String(m.date).startsWith(today)), [items, today])
  const sorted = React.useMemo(() => [...todayItems].sort(sortByPriorityAndTime).slice(0, 5), [todayItems])

  

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-3 py-2 min-w-max">
        {sorted.length > 0
          ? sorted.map((m) => (
              <Link key={m.id} href={`/fixtures/${m.id}`} className="flex-shrink-0">
                <div className="w-64 border rounded-lg p-3 hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] text-muted-foreground truncate">
                      {m.competition?.name || 'Неизвестная лига'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatTime(m.date, m.time)}
                    </div>
                  </div>
                  <div className="grid grid-cols-[24px_1fr] gap-2">
                    <div className="relative w-6 h-6 rounded bg-muted/60 overflow-hidden">
                      {m.home?.logo ? (
                        <Image src={m.home.logo} alt={m.home?.name || ''} fill className="object-contain" />
                      ) : null}
                    </div>
                    <div className="text-sm font-medium truncate">{m.home?.name}</div>
                    <div className="relative w-6 h-6 rounded bg-muted/60 overflow-hidden">
                      {m.away?.logo ? (
                        <Image src={m.away.logo} alt={m.away?.name || ''} fill className="object-contain" />
                      ) : null}
                    </div>
                    <div className="text-sm font-medium truncate">{m.away?.name}</div>
                  </div>
                </div>
              </Link>
            ))
          : isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-64 border rounded-lg p-3">
                  <div className="h-3 w-40 bg-muted animate-pulse rounded mb-2" />
                  <div className="grid grid-cols-[24px_1fr] gap-2">
                    <div className="w-6 h-6 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-36 animate-pulse" />
                    <div className="w-6 h-6 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-28 animate-pulse" />
                  </div>
                </div>
              ))
            : (
                <div className="w-64 border rounded-lg p-3 bg-muted/20">
                  <div className="text-[11px] text-muted-foreground mb-1">
                    Ближайшие матчи
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Нет матчей на сегодня из топ-лиг
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    АПЛ • Бундеслига • Серия А • Лига 1 • Ла Лига • РПЛ
                  </div>
                </div>
              )}
      </div>
    </div>
  )
}

export default UpcomingMatchesStrip
