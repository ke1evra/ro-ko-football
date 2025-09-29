'use client'

import * as React from 'react'
import Link from 'next/link'

import {
  getLeaguePriorityClient,
  isPriorityLeagueClient,
  initializeLeaguesCache,
} from '@/lib/highlight-competitions-client'
import { TeamLogo } from '@/components/TeamLogo'
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
    if (time)
      return new Date(`${date}T${time}Z`).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return time || ''
  }
}

function formatDateLabel(date: string): string {
  try {
    const matchDate = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    // Сравниваем только даты, игнорируя время
    const matchDateStr = matchDate.toDateString()
    const todayStr = today.toDateString()
    const tomorrowStr = tomorrow.toDateString()
    
    if (matchDateStr === todayStr) {
      return 'Сегодня'
    } else if (matchDateStr === tomorrowStr) {
      return 'Завтра'
    } else {
      return matchDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
      })
    }
  } catch {
    return date
  }
}

function normalizeFixture(fx: any): StripMatch | null {
  const rawId = fx?.id ?? fx?.fixtureId ?? fx?.fixture_id
  const id = Number(rawId)
  if (!Number.isFinite(id)) return null

  // Извлекаем данные из разных возможных форматов API
  const home = {
    id: Number(fx?.home_id || fx?.home?.id || fx?.homeTeam?.id || 0),
    name: String(
      fx?.home_name || fx?.home?.name || fx?.homeTeam?.name || fx?.homeName || 'Команда дома',
    ),
    logo: fx?.home?.logo || fx?.home_logo || fx?.homeTeam?.logo || null,
  }

  const away = {
    id: Number(fx?.away_id || fx?.away?.id || fx?.awayTeam?.id || 0),
    name: String(
      fx?.away_name || fx?.away?.name || fx?.awayTeam?.name || fx?.awayName || 'Команда гостей',
    ),
    logo: fx?.away?.logo || fx?.away_logo || fx?.awayTeam?.logo || null,
  }

  const compId = fx?.competition_id || fx?.competition?.id || fx?.league?.id || fx?.competitionId
  const competition = compId
    ? {
        id: Number(compId),
        name: String(
          fx?.league?.name || fx?.competition?.name || fx?.compName || 'Неизвестная лига',
        ),
      }
    : undefined

  const date = fx?.date || fx?.fixture_date || fx?.fixtureDate || fx?.match_date || ''
  const time =
    typeof fx?.time === 'string'
      ? fx.time
      : typeof fx?.fixture_time === 'string'
        ? fx.fixture_time
        : typeof fx?.fixtureTime === 'string'
          ? fx.fixtureTime
          : undefined

  return {
    id,
    date: String(date),
    time,
    home,
    away,
    competition,
    country: fx?.country || fx?.competition?.country || fx?.league?.country || undefined,
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
  const [items, setItems] = React.useState<StripMatch[]>(
    () => initial.map(normalizeFixture).filter(Boolean) as StripMatch[],
  )
  const [isLoading, setIsLoading] = React.useState(false)
  const [apiResponse, setApiResponse] = React.useState<any>(null)

  React.useEffect(() => {
    // Инициализируем кэш лиг при загрузке компонента
    initializeLeaguesCache()
    
    let mounted = true
    async function refresh() {
      try {
        setIsLoading(true)
        console.log('[UpcomingMatchesStrip] fetching fixtures for 7-day range')

        // Добавляем таймаут для запроса
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 секунд таймаут

        // Используем новый API с диапазоном 7 дней
        const res = await fetch('/api/fixtures?size=60', {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        console.log('[UpcomingMatchesStrip] API response status:', res.status)
        if (!res.ok) {
          console.error('[UpcomingMatchesStrip] API error:', res.status, res.statusText)
          return
        }
        const data = await res.json()
        console.log('[UpcomingMatchesStrip] API response data:', data)

        // Сохраняем сырой ответ для отладки
        if (mounted) setApiResponse(data)

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

  // Фильтруем только будущие матчи и сортируем по приоритету лиг и времени
  const futureMatches = React.useMemo(() => {
    const now = Date.now()
    console.log('[UpcomingMatchesStrip] Current time:', new Date(now).toISOString())

    return items.filter((m) => {
      const matchTime = new Date(`${m.date}T${m.time || '00:00'}Z`).getTime()
      const isFuture = matchTime > now
      console.log(
        `[UpcomingMatchesStrip] Match ${m.id} (${m.home?.name} vs ${m.away?.name}): ${m.date}T${m.time || '00:00'}Z -> ${new Date(matchTime).toISOString()} -> Future: ${isFuture}`,
      )
      return isFuture
    })
  }, [items])

  const priorityMatches = React.useMemo(() => {
    const priority = futureMatches.filter((m) => {
      const isPriority = isPriorityLeagueClient(m.competition?.id || 0)
      console.log(
        `[UpcomingMatchesStrip] Match ${m.id} (${m.competition?.name}, ID: ${m.competition?.id}): Priority = ${isPriority}`,
      )
      return isPriority
    })
    console.log(
      `[UpcomingMatchesStrip] Priority matches: ${priority.length}, Future matches: ${futureMatches.length}`,
    )
    return priority
  }, [futureMatches])

  const sorted = React.useMemo(() => {
    const arr = priorityMatches.length > 0 ? priorityMatches : futureMatches
    console.log(
      `[UpcomingMatchesStrip] Using ${priorityMatches.length > 0 ? 'priority' : 'all future'} matches (${arr.length} total)`,
    )
    const sortedArr = [...arr].sort(sortByPriorityAndTime)
    console.log(
      `[UpcomingMatchesStrip] Final sorted matches:`,
      sortedArr.map((m) => `${m.id}: ${m.home?.name} vs ${m.away?.name} (${m.competition?.name})`),
    )
    return sortedArr
  }, [futureMatches, priorityMatches])

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <div className="flex gap-3 py-2 min-w-max">
          {sorted.length > 0 ? (
            sorted.map((m) => (
              <Link key={m.id} href={`/fixtures/${m.id}`} className="flex-shrink-0">
                <div className="w-64 border rounded-lg p-3 hover:bg-accent transition-colors relative">
                  {/* Мини-плашка с датой */}
                  <div className="absolute -top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-medium rounded-full">
                    {formatDateLabel(m.date)}
                  </div>
                  
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <div className="text-[11px] text-muted-foreground truncate">
                      {m.competition?.name || 'Неизвестная лига'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatTime(m.date, m.time)}
                    </div>
                  </div>
                  <div className="grid grid-cols-[24px_1fr] gap-2">
                    <TeamLogo teamId={m.home?.id} teamName={m.home?.name} size="small" />
                    <div className="text-sm font-medium truncate">{m.home?.name}</div>
                    <TeamLogo teamId={m.away?.id} teamName={m.away?.name} size="small" />
                    <div className="text-sm font-medium truncate">{m.away?.name}</div>
                  </div>
                </div>
              </Link>
            ))
          ) : isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
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
          ) : (
            <div className="w-64 border rounded-lg p-3 bg-muted/20">
              <div className="text-[11px] text-muted-foreground mb-1">Ближайшие матчи</div>
              <div className="text-sm text-muted-foreground">
                Нет матчей в ближайшие 7 дней из приоритетных лиг
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Настройте лиги в админке CMS
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UpcomingMatchesStrip
