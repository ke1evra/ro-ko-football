'use client'

import * as React from 'react'
import Link from 'next/link'
import { TeamLogo } from '@/components/TeamLogo'
import { LiveIndicator } from '@/components/ui/live-indicator'
import { generateMatchUrlFromApiMatch, generateLegacyMatchUrl, generateLegacyFixtureUrl } from '@/lib/match-url-utils'

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

  // Извлекаем счёт из строки "2 - 1" в отдельные чис��а
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
  const time_status = match?.time_status
  const location = match?.location

  const result = {
    id: Number.isFinite(id) ? id : fixtureId!,
    fixtureId: Number.isFinite(fixtureId) ? fixtureId : undefined,
    date: match?.date, // Добавляем дату из API
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
            return (
              <li
                key={`${m.id}-${idx}`}
                className="border rounded p-3 hover:bg-accent/50 transition-colors relative"
              >
                {/* Пульсирующая точка в правом верхнем углу */}
                <LiveIndicator size="small" className="absolute top-2 right-2 z-10" />

                <Link href={href} className="block">
                  {/* Заголовок с лигой */}
                  <div className="flex items-center justify-between mb-2 pr-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <span>{m.compName || 'Лайв матч'}</span>
                    </div>
                  </div>

                  {/* Команды со счётом */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <TeamLogo teamId={m.home.id} teamName={m.home.name} size="small" />
                        </div>
                        <span className="truncate font-medium text-sm">{m.home.name}</span>
                      </div>
                      <div className="text-lg font-bold text-primary ml-2 flex-shrink-0">
                        {m.home.score !== undefined ? m.home.score : '—'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <TeamLogo teamId={m.away.id} teamName={m.away.name} size="small" />
                        </div>
                        <span className="truncate font-medium text-sm">{m.away.name}</span>
                      </div>
                      <div className="text-lg font-bold text-primary ml-2 flex-shrink-0">
                        {m.away.score !== undefined ? m.away.score : '—'}
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
