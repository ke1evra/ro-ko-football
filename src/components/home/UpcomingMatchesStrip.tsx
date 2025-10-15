'use client'

import * as React from 'react'
import Link from 'next/link'

import {
  getLeaguePriorityClient,
  isPriorityLeagueClient,
  initializeLeaguesCache,
  getLeagueInfoClient,
} from '@/lib/highlight-competitions-client'
import { generateFixtureUrl } from '@/lib/match-urls'
import { TeamLogo } from '@/components/TeamLogo'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Button } from '@/components/ui/button'

export type StripMatch = {
  id: number
  date: string
  time?: string
  home?: { id?: number; name?: string; logo?: string | null }
  away?: { id?: number; name?: string; logo?: string | null }
  competition?: { id?: number; name?: string | null }
  country?: { id?: number; name?: string | null }
  odds?: {
    home?: number | string
    draw?: number | string
    away?: number | string
  }
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

    const matchDateStr = matchDate.toDateString()
    const todayStr = today.toDateString()
    const tomorrowStr = tomorrow.toDateString()

    if (matchDateStr === todayStr) return 'Сегодня'
    if (matchDateStr === tomorrowStr) return 'Завтра'

    return matchDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  } catch {
    return date
  }
}

function normalizeFixture(fx: any): StripMatch | null {
  const rawId = fx?.id ?? fx?.fixtureId ?? fx?.fixture_id
  const id = Number(rawId)
  if (!Number.isFinite(id)) return null

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

  const odds = fx?.odds || fx?.betting_odds || fx?.pre_odds || undefined
  let normalizedOdds = undefined
  if (odds) {
    if (odds.pre) {
      normalizedOdds = {
        home: odds.pre['1'] || odds.pre.home,
        draw: odds.pre['X'] || odds.pre.draw,
        away: odds.pre['2'] || odds.pre.away,
      }
    } else if (odds['1'] || odds.home) {
      normalizedOdds = {
        home: odds['1'] || odds.home,
        draw: odds['X'] || odds.draw,
        away: odds['2'] || odds.away,
      }
    }
  }

  const country = fx?.country || fx?.competition?.country || fx?.league?.country
  let normalizedCountry = undefined
  if (country) {
    if (typeof country === 'object') {
      normalizedCountry = {
        id: Number(country.id || country.country_id || 0),
        name: String(country.name || country.country_name || 'Неизвестная страна'),
      }
    } else if (typeof country === 'string') {
      normalizedCountry = { id: 0, name: country }
    }
  }

  const result = {
    id,
    date: String(date),
    time,
    home,
    away,
    competition,
    country: normalizedCountry,
    odds: normalizedOdds,
  }

  if (id && !normalizedCountry) {
    const testCountries = [
      { id: 42, name: 'Англия' },
      { id: 73, name: 'Испания' },
      { id: 54, name: 'Германия' },
      { id: 74, name: 'Италия' },
      { id: 75, name: 'Франция' },
    ]
    result.country = testCountries[id % testCountries.length]
  }

  if (id && !normalizedOdds) {
    result.odds = { home: '2.50', draw: '3.20', away: '2.80' }
  }

  return result
}

function sortByPriorityAndTime(a: StripMatch, b: StripMatch) {
  const wa = getLeaguePriorityClient(a.competition?.id || 0)
  const wb = getLeaguePriorityClient(b.competition?.id || 0)
  if (wa !== wb) return wa - wb
  const ta = new Date(`${a.date}T${a.time || '00:00'}Z`).getTime()
  const tb = new Date(`${b.date}T${b.time || '00:00'}Z`).getTime()
  return ta - tb
}

function MatchCard({ m }: { m: StripMatch }) {
  const matchUrl = generateFixtureUrl(
    m.home?.name || 'Команда дома',
    m.away?.name || 'Команда гостей',
    m.date,
    m.home?.id || 0,
    m.away?.id || 0,
    m.id,
  )

  return (
    <Link href={matchUrl} className="block">
      <div className="w-64 border rounded-lg p-3 bg-card hover:bg-accent transition-colors relative">
        <div className="absolute -top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-medium rounded-full">
          {formatDateLabel(m.date)}
        </div>

        <div className="flex items-center justify-between mb-2 mt-1">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            {m.country?.id && (
              <CountryFlagImage
                countryId={m.country.id}
                countryName={m.country.name || ''}
                size="small"
                className="w-3 h-3 rounded-sm object-cover flex-shrink-0"
              />
            )}
            {(() => {
              const leagueInfo = getLeagueInfoClient(m.competition?.id || 0)
              const compName = leagueInfo?.name || m.competition?.name || 'Неизвестная лига'
              return <span className="truncate">{compName}</span>
            })()}
          </div>
          <div className="text-[11px] text-muted-foreground">{formatTime(m.date, m.time)}</div>
        </div>

        <div className="grid grid-cols-[24px_1fr] gap-2 mb-2">
          <TeamLogo teamId={m.home?.id} teamName={m.home?.name} size="small" />
          <div className="text-sm font-medium truncate">{m.home?.name}</div>
          <TeamLogo teamId={m.away?.id} teamName={m.away?.name} size="small" />
          <div className="text-sm font-medium truncate">{m.away?.name}</div>
        </div>

        {m.odds && (m.odds.home || m.odds.draw || m.odds.away) && (
          <div className="flex justify-between items-center text-[10px] bg-muted/30 rounded px-2 py-1">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground"></span>
              <span className="font-medium">
                {m.odds.home ? Number(m.odds.home).toFixed(2) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">X</span>
              <span className="font-medium">
                {m.odds.draw ? Number(m.odds.draw).toFixed(2) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground"></span>
              <span className="font-medium">
                {m.odds.away ? Number(m.odds.away).toFixed(2) : '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

// Фазы: idle → fade → slide-pre → slide-run

type Phase = 'idle' | 'fade' | 'slide-pre' | 'slide-run'

export function UpcomingMatchesStrip({ initial }: { initial: any[] }) {
  const [items, setItems] = React.useState<StripMatch[]>(
    () => initial.map(normalizeFixture).filter(Boolean) as StripMatch[],
  )
  const [isLoading, setIsLoading] = React.useState(false)

  // Геометрия и тайминги
  const VISIBLE = 5
  const STEP = 4
  const SLOT_W = 256 // w-64
  const GAP = 12 // gap-3
  const STEP_PX = SLOT_W + GAP
  const VIEW_W = VISIBLE * SLOT_W + (VISIBLE - 1) * GAP

  const D_FADE = 150
  const D_SLIDE = 700
  const easing = 'cubic-bezier(0.22, 1, 0.36, 1)'

  // Пагинация и анимация
  const [pageStart, setPageStart] = React.useState(0)
  const [pendingStart, setPendingStart] = React.useState(0)
  const [direction, setDirection] = React.useState<'next' | 'prev'>('next')
  const [phase, setPhase] = React.useState<Phase>('idle')

  React.useEffect(() => {
    initializeLeaguesCache().then(() => setItems((prev) => [...prev]))

    let mounted = true
    async function refresh() {
      try {
        setIsLoading(true)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const res = await fetch('/api/fixtures?size=60', { signal: controller.signal })
        clearTimeout(timeoutId)
        if (!res.ok) return
        const data = await res.json()
        const list: any[] = data.fixtures || data.data?.fixtures || []
        if (!mounted) return
        const normalized = list.map(normalizeFixture).filter(Boolean) as StripMatch[]
        setItems(normalized)
        setPageStart(0)
      } catch {
        // noop
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    setTimeout(refresh, 100)
    const t = setInterval(refresh, 120000)
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [])

  // Данные
  const futureMatches = React.useMemo(() => {
    const now = Date.now()
    return items.filter((m) => new Date(`${m.date}T${m.time || '00:00'}Z`).getTime() > now)
  }, [items])

  const priorityMatches = React.useMemo(
    () => futureMatches.filter((m) => isPriorityLeagueClient(m.competition?.id || 0)),
    [futureMatches],
  )

  const sorted = React.useMemo(() => {
    const arr = priorityMatches.length > 0 ? priorityMatches : futureMatches
    return [...arr].sort(sortByPriorityAndTime)
  }, [futureMatches, priorityMatches])

  const maxStart = Math.max(0, sorted.length - VISIBLE)
  const canPrev = pageStart - STEP >= 0
  const canNext = pageStart + STEP <= maxStart

  const currentItems = React.useMemo(
    () => sorted.slice(pageStart, pageStart + VISIBLE),
    [sorted, pageStart],
  )

  const nextItems = React.useMemo(
    () => sorted.slice(pageStart + STEP, pageStart + STEP + VISIBLE),
    [sorted, pageStart],
  )

  const prevItems = React.useMemo(
    () => sorted.slice(pageStart - STEP, pageStart - STEP + VISIBLE),
    [sorted, pageStart],
  )

  // Построение трека из 9 элементов и смещений
  let trackItems: StripMatch[] = currentItems
  let trackTranslate = 0

  if (phase === 'slide-pre' || phase === 'slide-run') {
    if (direction === 'next') {
      // 5 старых + 4 новых (пропускаем якорь, берём элементы 1..4 следующей страницы)
      trackItems = currentItems.concat(nextItems.slice(1, STEP + 1))
      trackTranslate = phase === 'slide-run' ? -STEP * STEP_PX : 0
    } else {
      // 4 новых (последние 4 из предыдущей страницы) + 5 старых
      const prevFour = prevItems.slice(0, STEP)
      trackItems = prevFour.concat(currentItems)
      trackTranslate = phase === 'slide-run' ? 0 : -STEP * STEP_PX
    }
  }

  const disableButtons = phase !== 'idle'

  // Запуск анимации по фазам
  const startAnim = React.useCallback((dir: 'next' | 'prev', target: number) => {
    setDirection(dir)
    setPendingStart(target)
    setPhase('fade')

    window.setTimeout(() => {
      setPhase('slide-pre')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('slide-run'))
      })
    }, D_FADE)

    window.setTimeout(() => {
      setPageStart(target)
      setPhase('idle')
    }, D_FADE + D_SLIDE)
  }, [])

  const handleNext = () => {
    if (!canNext || disableButtons) return
    startAnim('next', Math.min(pageStart + STEP, maxStart))
  }

  const handlePrev = () => {
    if (!canPrev || disableButtons) return
    startAnim('prev', Math.max(0, pageStart - STEP))
  }

  return (
    <div className="w-full">
      <div className="relative">
        <div className="flex justify-end gap-2 mb-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            disabled={!canPrev || disableButtons}
            aria-label="Предыдущие матчи"
          >
            ‹
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={!canNext || disableButtons}
            aria-label="Следующие матчи"
          >
            ›
          </Button>
        </div>

        {sorted.length > 0 ? (
          <div className="relative overflow-hidden" style={{ width: VIEW_W }}>
            {/* Трек из 9 карточек */}
            <div
              className="flex gap-3 will-change-transform"
              style={{
                width:
                  phase === 'slide-pre' || phase === 'slide-run' ? VIEW_W + STEP * STEP_PX : VIEW_W,
                transform: `translate3d(${trackTranslate}px,0,0)`,
                transitionProperty: phase === 'slide-run' ? 'transform' : 'none',
                transitionDuration: phase === 'slide-run' ? `${D_SLIDE}ms` : '0ms',
                transitionTimingFunction: easing,
                pointerEvents: 'none',
              }}
            >
              {trackItems.map((m, i) => {
                // Полупрозрачность только для 5 старых
                const isOld = direction === 'next' ? i < VISIBLE : i >= STEP
                const itemOpacity =
                  phase === 'fade'
                    ? 0.5
                    : phase === 'slide-pre' || phase === 'slide-run'
                      ? isOld
                        ? 0.5
                        : 1
                      : 1
                return (
                  <div key={`${m.id}-${i}`} style={{ width: SLOT_W, opacity: itemOpacity }}>
                    <MatchCard m={m} />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="w-64 border rounded-lg p-3 bg-card">
            {isLoading ? (
              <>
                <div className="h-3 w-40 bg-muted animate-pulse rounded mb-2" />
                <div className="grid grid-cols-[24px_1fr] gap-2">
                  <div className="w-6 h-6 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-36 animate-pulse" />
                  <div className="w-6 h-6 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-28 animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] text-muted-foreground mb-1">Ближайшие матчи</div>
                <div className="text-sm text-muted-foreground">
                  Нет матчей в ближайшие 7 дней из приоритетных лиг
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Настройте лиги в админке CMS
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default UpcomingMatchesStrip
