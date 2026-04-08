'use client'

import * as React from 'react'
import Link from 'next/link'
import { TeamLogo } from '@/components/TeamLogo'
import { LiveIndicator } from '@/components/ui/live-indicator'
import {
  generateMatchUrlFromApiMatch,
  generateLegacyMatchUrl,
  generateLegacyFixtureUrl,
} from '@/lib/match-url-utils'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { type LiveItem, normalize } from './live-matches-utils'

// Функция для перевода статусов матча на русский язык
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'NOT STARTED': 'Не начался',
    'IN PLAY': 'Идёт игра',
    'HALF TIME BREAK': 'Перерыв',
    'HALF TIME': 'Перерыв',
    'ADDED TIME': 'Доп. время',
    FINISHED: 'Завершён',
    'FULL TIME': 'Основное время',
    'EXTRA TIME': 'Дополнительное время',
    'PENALTY SHOOTOUT': 'Пенальти',
    POSTPONED: 'Отложен',
    CANCELLED: 'Отменён',
    SUSPENDED: 'Приостановлен',
    'INSUFFICIENT DATA': 'Нет данных',
  }

  return statusMap[status] || status
}

// Компонент для динамического таймера матча
function MatchTimer({
  timeStatus,
  status,
  matchDate,
  matchTime,
}: {
  timeStatus: string | null | undefined
  status?: string
  matchDate?: string
  matchTime?: string
}) {
  const [currentTime, setCurrentTime] = React.useState(new Date())

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Функция для расчета времени матча
  const calculateMatchTime = (): string => {
    if (!matchDate || !matchTime) {
      // Если нет данных о времени матча, используем статичные данные из API
      if (!timeStatus) return ''

      // Специальные статусы
      const specialStatuses: Record<string, string> = {
        HT: 'Перерыв',
        FT: 'Завершён',
        AET: 'После доп. времени',
        AP: 'После пенальти',
      }

      if (specialStatuses[timeStatus]) {
        return specialStatuses[timeStatus]
      }

      // Если это число (минуты), добавляем информацию
      const minutes = parseInt(timeStatus)
      if (!isNaN(minutes)) {
        if (minutes <= 45) {
          const remaining = 45 - minutes
          return `${minutes}' (${remaining} мин до перерыва)`
        } else {
          const remaining = 90 - minutes
          return `${minutes}' (${remaining} мин до конца)`
        }
      }

      // Если содержит +, это доп. время
      if (timeStatus.includes('+')) {
        return `${timeStatus}' (доп. время)`
      }

      return timeStatus
    }

    try {
      const matchStart = new Date(`${matchDate}T${matchTime}`)
      const now = currentTime
      const diffMs = now.getTime() - matchStart.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))

      // Специальные статусы
      if (status === 'FINISHED' || status === 'FULL TIME' || timeStatus === 'FT') {
        if (diffMinutes > 90) {
          const endedMinutesAgo = diffMinutes - 90
          return `Закончился ${endedMinutesAgo} мин назад`
        }
        return 'Только что закончился'
      }

      if (status === 'HALF TIME' || status === 'HALF TIME BREAK' || timeStatus === 'HT') {
        return 'Перерыв'
      }

      if (status === 'NOT STARTED' && diffMinutes < 0) {
        const minutesToStart = Math.abs(diffMinutes)
        return `Начнется через ${minutesToStart} мин`
      }

      // Если матч идет
      if (status === 'IN PLAY' || status === 'ADDED TIME') {
        if (diffMinutes <= 45) {
          // Первый тайм
          const remaining = 45 - diffMinutes
          return `${diffMinutes}' (${remaining} мин до перерыва)`
        } else if (diffMinutes <= 60) {
          // Перерыв (15 минут)
          return 'Перерыв'
        } else if (diffMinutes <= 105) {
          // Второй тайм
          const secondHalfMinutes = diffMinutes - 60
          const remaining = 45 - secondHalfMinutes
          return `${45 + secondHalfMinutes}' (${remaining} мин до конца)`
        } else {
          // Дополнительное время
          const extraMinutes = diffMinutes - 105
          return `90+${extraMinutes}' (доп. время)`
        }
      }

      return ''
    } catch (error) {
      console.error('Ошибка расчета времени матча:', error)
      return ''
    }
  }

  const timerText = calculateMatchTime()

  if (!timerText) return null

  return (
    <div className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">{timerText}</div>
  )
}

// Re-export types from shared utility for backward compatibility
export { type LiveItem, normalize } from './live-matches-utils'

// Безопасный парсер времени начала матча
function parseDateMs(input?: string): number | null {
  if (!input) return null
  const s = String(input).trim()
  if (/^\d{13}$/.test(s)) return Number(s)
  if (/^\d{10}$/.test(s)) return Number(s) * 1000
  const withT = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(' ', 'T') : s
  let t = Date.parse(withT)
  if (!Number.isFinite(t)) t = Date.parse(withT + 'Z')
  return Number.isFinite(t) ? t : null
}

// Бейдж текущей минуты слева от логотипа команды
function LiveMinuteBadge({
  timeStatus,
  status,
  date,
  time,
}: {
  timeStatus?: string | null
  status?: string
  date?: string
  time?: string
}) {
  const [now, setNow] = React.useState(Date.now())

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const label = React.useMemo(() => {
    const up = (s?: string | null) => (s ? String(s).toUpperCase().trim() : '')
    const s = up(status)
    const ts = up(timeStatus)
    const tRaw = typeof time === 'string' ? time.trim() : ''
    const tU = tRaw.toUpperCase()

    // Завершён — не показываем
    const finished = s.includes('FINISH') || s === 'FULL TIME' || ts === 'FT' || tU === 'FT'
    if (finished) return ''

    // Определяем, начался ли матч
    const minuteLike = /^\d+(\+\d+)?$/.test(tRaw)
    const startedByTime = minuteLike || ['HT', 'AET', 'AP'].includes(tU)
    const startedByStatus =
      s.includes('IN PLAY') ||
      s.includes('ADDED TIME') ||
      s.includes('LIVE') ||
      s.includes('1ST') ||
      s.includes('2ND') ||
      s.includes('EXTRA TIME') ||
      s.includes('HALF TIME')
    const startedByTS = /^\d+(\+\d+)?$/.test(ts) || ['HT', 'AET', 'AP'].includes(ts)
    const started = startedByTime || startedByStatus || startedByTS
    if (!started) return ''

    // Перерыв — показываем 45'
    if (s.includes('HALF TIME') || ts === 'HT' || tU === 'HT') return "45'"

    // Используем live time (минуты/90+X)
    if (minuteLike) return `${tRaw}'`

    // В time_status может быть минуты/90+X
    if (ts) {
      if (/^\d+\+\d+$/.test(ts)) return `${ts}'`
      const n2 = parseInt(ts, 10)
      if (!Number.isNaN(n2)) return `${n2}'`
    }

    // Считаем по времени начала при лайв-статусах
    const isLiveByStatus =
      s.includes('IN PLAY') ||
      s.includes('ADDED TIME') ||
      s === 'LIVE' ||
      s.includes('1ST HALF') ||
      s.includes('FIRST HALF') ||
      s.includes('2ND HALF') ||
      s.includes('SECOND HALF') ||
      s.includes('EXTRA TIME') ||
      ts === '1H' ||
      ts === '2H' ||
      ts.includes('IN PLAY') ||
      ts.includes('LIVE') ||
      ts.includes('1ST HALF') ||
      ts.includes('FIRST HALF') ||
      ts.includes('2ND HALF') ||
      ts.includes('SECOND HALF') ||
      ts.includes('ADDED TIME') ||
      ts.includes('EXTRA TIME')

    if (date && isLiveByStatus) {
      const startMs = parseDateMs(date)
      if (!startMs) return ''
      const diffMin = Math.max(0, Math.floor((now - startMs) / 60000))
      if (diffMin <= 45) return `${Math.max(1, diffMin)}'`
      if (diffMin <= 60) return "45'"
      if (diffMin <= 105) return `${Math.max(46, diffMin - 15)}'`
      return `90+${diffMin - 105}'`
    }

    return ''
  }, [timeStatus, status, date, time, now])

  if (!label) return null

  return (
    <span className="inline-flex justify-center px-1 text-[11px] font-semibold text-red-600 tabular-nums animate-pulse">
      {label}
    </span>
  )
}

function RefreshWidget({
  nextRefreshAt,
  onRefresh,
}: {
  nextRefreshAt: number
  onRefresh: () => void
}) {
  const [now, setNow] = React.useState(Date.now())
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [nextRefreshAt])
  const seconds = Math.max(0, Math.ceil((nextRefreshAt - now) / 1000))
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded border bg-background/80 backdrop-blur-sm  py-0.5 text-[10px] text-muted-foreground">
      <LiveIndicator size="small" />
      <button
        type="button"
        aria-label="Обновить"
        className="hover:text-foreground transition-colors"
        onClick={onRefresh}
      >
        ↻
      </button>
      <span className="tabular-nums">{`${mm}:${ss}`}</span>
    </div>
  )
}

interface LiveMatchesWidgetClientProps {
  /** Начальные данные с сервера (опционально) */
  initialItems?: LiveItem[]
  /** Error message if data failed to load on server */
  error?: string | null
  /** Whether initial load failed */
  hasError?: boolean
}

export default function LiveMatchesWidgetClient({
  initialItems = [],
  error: serverError,
  hasError: serverHasError,
}: LiveMatchesWidgetClientProps) {
  const [items, setItems] = React.useState<LiveItem[]>(initialItems)
  const [visible, setVisible] = React.useState(5)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(true)
  const [nextRefreshAt, setNextRefreshAt] = React.useState<number>(Date.now() + 60000)
  const [retrying, setRetrying] = React.useState(false)

  const load = React.useCallback(
    async (nextPage: number) => {
      try {
        setLoading(true)
        const controller = new AbortController()
        const to = setTimeout(() => controller.abort(), 8000)
        const url = `/api/fixtures?live=true&all=true&page=${nextPage}`
        console.log('[LiveMatchesWidget] Fetch:', url)
        const res = await fetch(url, {
          signal: controller.signal,
        })
        console.log('[LiveMatchesWidget] HTTP status:', res.status)
        clearTimeout(to)
        if (!res.ok) {
          console.error('[LiveMatchesWidget] Fetch failed:', res.status, res.statusText)
          return
        }
        let data: any
        try {
          data = await res.json()
        } catch (e) {
          console.error('[LiveMatchesWidget] JSON parse error:', e)
          throw e
        }
        console.log('[LiveMatchesWidget] API JSON:', data)
        if (Array.isArray(data?.matches)) {
          console.log(
            '[LiveMatchesWidget] Matches sample:',
            data.matches.slice(0, 5).map((m: any) => ({
              id: m?.id,
              fixture_id: m?.fixture_id,
              status: m?.status,
              time_status: m?.time_status,
              date: m?.date,
              time: m?.time,
              score: m?.scores?.score,
            })),
          )
        }
        const raw = (data?.matches || []) as any[]
        const normalized = raw.map(normalize).filter(Boolean) as LiveItem[]
        if (normalized.length === 0) {
          setHasMore(false)
        }
        setItems((prev) => {
          // Если есть начальные данные и это первая страница, используем их как базу
          const base = nextPage === 1 && initialItems.length > 0 ? initialItems : prev
          // убираем дубли по id
          const map = new Map<number, LiveItem>()
          ;[...base, ...normalized].forEach((it) => map.set(it.id, it))
          return Array.from(map.values())
        })
        setPage(nextPage)
      } catch (e) {
        console.error('[LiveMatchesWidget] load error:', e)
      } finally {
        setLoading(false)
      }
    },
    [initialItems.length],
  )

  const handleManualRefresh = React.useCallback(() => {
    void load(1)
    setNextRefreshAt(Date.now() + 60000)
  }, [load])

  // Handle retry on client side
  const handleRetry = React.useCallback(() => {
    setRetrying(true)
    window.location.reload()
  }, [])

  React.useEffect(() => {
    // первая загрузка только если нет начальных данных
    if (initialItems.length === 0) {
      void load(1)
    }
    setNextRefreshAt(Date.now() + 60000)
    const poll = setInterval(() => {
      void load(1)
      setNextRefreshAt(Date.now() + 60000)
    }, 60000) // обновляем из источника раз в минуту
    return () => clearInterval(poll)
  }, [load, initialItems.length])

  const visibleItems = items.slice(0, visible)

  const [isDebug, setIsDebug] = React.useState(false)
  React.useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      setIsDebug(sp.get('debugLive') === '1')
    } catch {
      // no-op
    }
  }, [])

  return (
    <div className="relative space-y-3 text-sm">
      {/* Глобальный мини‑виджет обновления для всего виджета */}

      {isDebug && (
        <div className="rounded border p-2 text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
          {JSON.stringify(
            items.slice(0, 8).map((m) => ({
              id: m.id,
              status: m.status,
              time_status: m.time_status,
              date: m.date,
              score: m.scores?.score,
            })),
            null,
            2,
          )}
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">Загрузка...</div>
      )}

      {/* Error state - distinct from empty state */}
      {serverHasError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Ошибка загрузки</span>
          </div>
          <p className="text-xs text-red-500 mb-3">
            {serverError || 'Не удалось загрузить матчи. Попробуйте обновить страницу.'}
          </p>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            {retrying ? 'Обновление...' : 'Обновить'}
          </button>
        </div>
      )}

      {items.length === 0 && !loading && !serverHasError && (
        <div className="text-center py-4 text-muted-foreground text-sm">Нет активных матчей</div>
      )}

      {visibleItems.map((m) => {
        const matchData = {
          id: m.id,
          fixtureId: m.fixtureId,
          date: m.date,
          time: m.time,
          home: { id: m.home.id, name: m.home.name },
          away: { id: m.away.id, name: m.away.name },
          status: m.status,
          time_status: m.time_status,
          scores: m.scores,
          competition: { name: m.compName },
        }

        let href = ''
        try {
          href = generateMatchUrlFromApiMatch(matchData)
        } catch {
          // Fallback на старый формат
          try {
            href = generateLegacyFixtureUrl(m.fixtureId || m.id)
          } catch {
            href = `/matches/${m.id}`
          }
        }

        const statusText = m.status ? translateStatus(m.status) : null
        const isFinished =
          m.status === 'FINISHED' ||
          m.status === 'FULL TIME' ||
          m.time_status === 'FT' ||
          (m.time_status && /^(FT|FULL TIME)$/i.test(m.time_status))

        return (
          <div
            key={m.id}
            className="relative border rounded-lg p-3 bg-card hover:bg-accent transition-colors"
          >
            {/* Мини-таймер обновления для каждого матча */}
            <RefreshWidget nextRefreshAt={nextRefreshAt} onRefresh={handleManualRefresh} />

            {/* Бейдж лиги */}
            {m.compName && (
              <div className="text-[11px] text-muted-foreground mb-2 pr-16">
                {m.compName}
                {m.location ? ` • ${m.location}` : ''}
              </div>
            )}

            {/* Команды */}
            <Link href={href} className="block">
              <div className="space-y-2">
                {/* Домашняя */}
                <div className="flex items-center gap-2">
                  <LiveMinuteBadge
                    timeStatus={m.time_status}
                    status={m.status}
                    date={m.date}
                    time={m.time}
                  />
                  <TeamLogo
                    teamId={typeof m.home.id === 'number' ? m.home.id : undefined}
                    teamName={m.home.name}
                    size="small"
                  />
                  <div className="flex-1 text-sm font-medium truncate">{m.home.name}</div>
                  <div className="text-lg font-bold text-primary tabular-nums ml-2">
                    {typeof m.home.score === 'number' ? m.home.score : '—'}
                  </div>
                </div>

                {/* Гостевая */}
                <div className="flex items-center gap-2">
                  <LiveMinuteBadge
                    timeStatus={m.time_status}
                    status={m.status}
                    date={m.date}
                    time={m.time}
                  />
                  <TeamLogo
                    teamId={typeof m.away.id === 'number' ? m.away.id : undefined}
                    teamName={m.away.name}
                    size="small"
                  />
                  <div className="flex-1 text-sm font-medium truncate">{m.away.name}</div>
                  <div className="text-lg font-bold text-primary tabular-nums ml-2">
                    {typeof m.away.score === 'number' ? m.away.score : '—'}
                  </div>
                </div>
              </div>
            </Link>

            {/* Статус и таймер */}
            <div className="flex items-center gap-2 mt-2">
              {isFinished ? (
                <div className="text-xs text-muted-foreground">
                  {statusText || 'Завершён'}
                  {m.scores?.ht_score && <span className="ml-2">(тайм: {m.scores.ht_score})</span>}
                </div>
              ) : (
                <>
                  <MatchTimer
                    timeStatus={m.time_status}
                    status={m.status}
                    matchDate={m.date}
                    matchTime={m.time}
                  />
                  {statusText && statusText !== 'Идёт игра' && (
                    <span className="text-xs text-muted-foreground">{statusText}</span>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}

      {hasMore && (
        <button
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setVisible((v) => v + 5)}
        >
          Показать ещё ({items.length - visible} осталось)
        </button>
      )}
    </div>
  )
}
