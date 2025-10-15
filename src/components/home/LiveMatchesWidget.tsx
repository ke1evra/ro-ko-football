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
  timeStatus: string | null
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

type LiveItem = {
  id: number
  fixtureId?: number
  date?: string
  time?: string
  compName?: string
  home: {
    name: string
    id?: number | string
    score?: number
  }
  away: {
    name: string
    id?: number | string
    score?: number
  }
  status?: string
  time_status?: string | null
  location?: string
  scores?: {
    score?: string
    ht_score?: string
    ft_score?: string
  }
}

function normalize(match: any): LiveItem | null {
  const id = Number(match?.id)
  const fixtureId = Number(match?.fixture_id ?? match?.fixtureId)
  if (!Number.isFinite(id) && !Number.isFinite(fixtureId)) return null

  console.log(`[LiveMatchesWidget] Обрабатываем лайв матч ${id}:`, {
    id: match?.id,
    fixture_id: match?.fixture_id,
    date: match?.date,
    home: { id: match?.home?.id, name: match?.home?.name },
    away: { id: match?.away?.id, name: match?.away?.name },
  })

  // Извлекаем информацию о командах
  const homeName = match?.home?.name || 'Команда дома'
  const awayName = match?.away?.name || 'Команда гостей'
  const homeId = match?.home?.id
  const awayId = match?.away?.id

  // Извлекаем счёт из строки "2 - 1" в отдельные числа
  const scoreString = match?.scores?.score || ''
  let homeScore: number | undefined
  let awayScore: number | undefined

  console.log(`[LiveMatchesWidget] Исходный счёт для матча ${id}:`, scoreString)

  if (scoreString && typeof scoreString === 'string') {
    const scoreParts = scoreString.split(' - ').map((s) => s.trim())
    if (scoreParts.length === 2) {
      homeScore = parseInt(scoreParts[0]) || 0
      awayScore = parseInt(scoreParts[1]) || 0
      console.log(`[LiveMatchesWidget] Разобранный счёт: ${homeScore} - ${awayScore}`)
    }
  }

  const compName = match?.competition?.name || match?.league?.name
  const status = match?.status
  const time_status = match?.time_status != null ? String(match?.time_status) : null
  const location = match?.location

  const result = {
    id: Number.isFinite(id) ? id : fixtureId!,
    fixtureId: Number.isFinite(fixtureId) ? fixtureId : undefined,
    date: match?.date,
    time: match?.time,
    compName,
    home: {
      name: homeName,
      id: homeId,
      score: homeScore,
    },
    away: {
      name: awayName,
      id: awayId,
      score: awayScore,
    },
    status,
    time_status: time_status ?? null,
    location,
    scores: match?.scores,
  }

  console.log(`[LiveMatchesWidget] Финальный результат для матча ${id}:`, {
    id: result.id,
    fixtureId: result.fixtureId,
    date: result.date,
    homeId: result.home.id,
    awayId: result.away.id,
  })

  return result
}

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

export default function LiveMatchesWidget() {
  const [items, setItems] = React.useState<LiveItem[]>([])
  const [visible, setVisible] = React.useState(5)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(true)
  const [nextRefreshAt, setNextRefreshAt] = React.useState<number>(Date.now() + 60000)

  const load = React.useCallback(async (nextPage: number) => {
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
        // убираем дубли по id
        const map = new Map<number, LiveItem>()
        ;[...prev, ...normalized].forEach((it) => map.set(it.id, it))
        return Array.from(map.values())
      })
      setPage(nextPage)
    } catch (e) {
      console.error('[LiveMatchesWidget] load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleManualRefresh = React.useCallback(() => {
    void load(1)
    setNextRefreshAt(Date.now() + 60000)
  }, [load])

  React.useEffect(() => {
    // первая загрузка
    void load(1)
    setNextRefreshAt(Date.now() + 60000)
    const poll = setInterval(() => {
      void load(1)
      setNextRefreshAt(Date.now() + 60000)
    }, 60000) // обновляем из источника ��аз в минуту
    return () => clearInterval(poll)
  }, [load])

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
              time: m.time,
              score: m.scores?.score,
            })),
            null,
            2,
          )}
        </div>
      )}
      {loading && items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Загрузка…</div>
      ) : visibleItems.length === 0 ? (
        <div className="text-sm text-muted-foreground">Сейчас нет лайв‑матчей</div>
      ) : (
        <ul className="space-y-3">
          {visibleItems.map((m, idx) => {
            // Генерируем новый URL для matches-v2
            let href = '#'
            try {
              // Пробуем сгенерировать новый URL
              const matchData = {
                home: { name: m.home.name, id: m.home.id },
                away: { name: m.away.name, id: m.away.id },
                date: m.date || new Date().toISOString(), // используем дату из API или текущую
                fixture_id: m.fixtureId,
                id: m.id,
              }
              console.log(`[LiveMatchesWidget] Генерация URL для матча ${m.id}:`, matchData)
              href = generateMatchUrlFromApiMatch(matchData)
              console.log(`[LiveMatchesWidget] Сгенерирован URL:`, href)
            } catch (error) {
              console.error(`[LiveMatchesWidget] Ошибка генерации URL для матча ${m.id}:`, error)
              // Fallback на старый формат
              if (m.id && !m.fixtureId) {
                href = generateLegacyMatchUrl(m.id)
              } else if (m.fixtureId) {
                href = generateLegacyFixtureUrl(m.fixtureId)
              }
            }
            const sUp = String(m.status || '').toUpperCase()
            const tsUp = String(m.time_status || '').toUpperCase()
            const timeStr = String(m.time || '').trim()
            const finished =
              sUp.includes('FINISH') ||
              sUp === 'FULL TIME' ||
              tsUp === 'FT' ||
              timeStr.toUpperCase() === 'FT'
            const timeIsMinute = /^\d+(\+\d+)?$/.test(timeStr)
            const startedByTime =
              timeIsMinute || ['HT', 'AET', 'AP'].includes(timeStr.toUpperCase())
            const startedByStatus =
              sUp.includes('IN PLAY') ||
              sUp.includes('ADDED TIME') ||
              sUp.includes('1ST') ||
              sUp.includes('2ND') ||
              sUp.includes('LIVE') ||
              sUp.includes('EXTRA TIME') ||
              sUp.includes('HALF TIME')
            const startedByTS = /^\d+(\+\d+)?$/.test(tsUp) || ['HT', 'AET', 'AP'].includes(tsUp)
            const started = (startedByTime || startedByStatus || startedByTS) && !finished

            return (
              <li
                key={`${m.id}-${idx}`}
                className="border rounded p-3 hover:bg-accent/50 transition-colors relative"
              >
                <Link href={href} className="block">
                  {/* Заголовок с лигой */}
                  <div className="flex items-center justify-between mb-2 pr-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <LiveMinuteBadge
                        timeStatus={m.time_status}
                        status={m.status}
                        date={m.date}
                        time={m.time}
                      />
                      <span>{m.compName || 'Лайв матч'}</span>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="flex items-center"></div>
                    <div className="flex flex-col">
                      {/* Команды со счётом */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              <TeamLogo teamId={m.home.id} teamName={m.home.name} size="small" />
                            </div>
                            <span className="truncate font-medium text-sm">{m.home.name}</span>
                          </div>
                          {started ? (
                            <div className="text-lg font-bold text-primary ml-2 flex-shrink-0">
                              {typeof m.home.score === 'number' ? m.home.score : '—'}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              <TeamLogo teamId={m.away.id} teamName={m.away.name} size="small" />
                            </div>
                            <span className="truncate font-medium text-sm">{m.away.name}</span>
                          </div>
                          {started ? (
                            <div className="text-lg font-bold text-primary ml-2 flex-shrink-0">
                              {typeof m.away.score === 'number' ? m.away.score : '—'}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Дополнительная информация */}
                  {(m.status || m.scores?.ht_score) && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {m.status && (
                            <span className="bg-muted px-2 py-1 rounded text-xs">
                              {translateStatus(m.status)}
                            </span>
                          )}
                          <MatchTimer timeStatus={m.time_status || null} status={m.status} />
                        </div>
                        {m.scores?.ht_score && <span>1-й тайм: {m.scores.ht_score}</span>}
                      </div>
                    </div>
                  )}
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
    </div>
  )
}
