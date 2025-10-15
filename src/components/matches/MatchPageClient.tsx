'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Activity,
  BarChart3,
  Users,
  Target,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TeamLogo } from '@/components/TeamLogo'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import PredictionModal from '@/components/predictions/PredictionModal'

interface MatchInfo {
  id: number
  home: { id?: number | string; name: string }
  away: { id?: number | string; name: string }
  competition?: { id: string; name: string }
  date?: string
  time?: string
  status?: string
  score?: string
}

interface MatchEvent {
  id: string
  minute: string
  type: string
  player: string
  team: string
  description?: string
}

interface MatchStats {
  [key: string]: {
    home: string | number
    away: string | number
  }
}

interface MatchEventsData {
  success: boolean
  data: {
    match: {
      id: string
      date: string
      time: string
      status: string
      location: string
      scores: {
        score: string
        ht_score: string
        ft_score: string
        et_score: string
        ps_score: string
      }
      home: { id: number; name: string }
      away: { id: number; name: string }
      competition: { id: string; name: string }
    }
    event: Array<{
      id: number
      player: { id: number; name: string }
      time: number
      event: string
      sort: number
      info: any
      is_home: boolean
      is_away: boolean
      label: string
    }>
  }
}

interface MatchStatsData {
  success: boolean
  data: {
    [key: string]: string // Формат "home_value:away_value"
  }
}

interface MatchPageClientProps {
  matchId: number
  initialMatchInfo: MatchInfo
}

// Утилиты для событий
const getEventIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'goal':
    case 'penalty':
      return '⚽'
    case 'yellow_card':
      return '🟨'
    case 'red_card':
      return '🟥'
    case 'substitution':
    case 'substitution_in':
    case 'substitution_out':
      return '🔄'
    case 'corner':
      return '📐'
    case 'offside':
      return '🚩'
    case 'goal_penalty':
      return '⚽'
    case 'missed_penalty':
      return '❌'
    default:
      return '📝'
  }
}

const getEventColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'goal':
    case 'penalty':
    case 'goal_penalty':
      return 'text-green-600'
    case 'yellow_card':
      return 'text-yellow-600'
    case 'red_card':
      return 'text-red-600'
    case 'substitution':
    case 'substitution_in':
    case 'substitution_out':
      return 'text-blue-600'
    case 'missed_penalty':
      return 'text-red-600'
    default:
      return 'text-muted-foreground'
  }
}

// Человекочитаемое название события (RU)
const getEventLabel = (type: string): string => {
  const t = String(type || '').toLowerCase()
  const map: Record<string, string> = {
    goal: 'Гол',
    penalty: 'Пенальти',
    goal_penalty: 'Гол (пенальти)',
    missed_penalty: 'Нереализованный пенальти',
    yellow_card: 'Жёлтая карточка',
    red_card: 'Красная карто��ка',
    substitution: 'Замена',
    substitution_in: 'Выход на замену',
    substitution_out: 'Смена игрока',
    corner: 'Угловой',
    offside: 'Офсайд',
    var: 'VAR',
  }
  return map[t] || t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

// Утилита для русскоязычных названий статистики
const getStatsLabel = (key: string): string => {
  const statsLabels: Record<string, string> = {
    yellow_cards: 'Желтые карточки',
    red_cards: 'Красные карточки',
    substitutions: 'Замены',
    possesion: 'Владение мячом (%)',
    free_kicks: 'Штрафные удары',
    goal_kicks: 'Удары от ворот',
    throw_ins: 'Вбрасывания',
    offsides: 'Офсайды',
    corners: 'Угловые',
    shots_on_target: 'Удары в створ',
    shots_off_target: 'Удары мимо',
    attempts_on_goal: 'Попытки на ворота',
    saves: 'Сейвы',
    fauls: 'Фолы',
    treatments: 'Лечения',
    penalties: 'Пенальти',
    shots_blocked: 'Заблокированные удары',
    dangerous_attacks: 'Опасные атаки',
    attacks: 'Атаки',
  }

  return statsLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

// Компактные элеме��ты событий
function CompactEventRow({ event, homeName, awayName }: { event: MatchEvent; homeName: string; awayName: string }) {
  const isHome = event.team === homeName
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center justify-center rounded px-1.5 h-5 text-[10px] font-semibold bg-muted text-muted-foreground tabular-nums">
          {event.minute}'
        </span>
        <span className="text-base leading-none">{getEventIcon(event.type)}</span>
        <span className={`truncate text-sm ${getEventColor(event.type)}`}>{event.player}</span>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{isHome ? homeName : awayName}</span>
    </div>
  )
}

function EventChip({ event, homeName }: { event: MatchEvent; homeName: string }) {
  const isHome = event.team === homeName
  return (
    <div className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${isHome ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
      <span className="tabular-nums font-mono font-semibold">{event.minute}'</span>
      <span>{getEventIcon(event.type)}</span>
      <span className={`max-w-[140px] truncate ${getEventColor(event.type)}`}>{event.player}</span>
    </div>
  )
}

// Компонент для отображения статистики
function StatsItem({
  label,
  homeValue,
  awayValue,
  homeTeam,
  awayTeam,
}: {
  label: string
  homeValue: string | number
  awayValue: string | number
  homeTeam: string
  awayTeam: string
}) {
  const homeNum = typeof homeValue === 'number' ? homeValue : parseFloat(String(homeValue)) || 0
  const awayNum = typeof awayValue === 'number' ? awayValue : parseFloat(String(awayValue)) || 0
  const total = homeNum + awayNum

  const homePercent = total > 0 ? (homeNum / total) * 100 : 50
  const awayPercent = total > 0 ? (awayNum / total) * 100 : 50

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{homeValue}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{awayValue}</span>
      </div>
      <div className="flex h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="bg-blue-500 transition-all duration-300"
          style={{ width: `${homePercent}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-300"
          style={{ width: `${awayPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{homeTeam}</span>
        <span>{awayTeam}</span>
      </div>
    </div>
  )
}

export default function MatchPageClient({ matchId, initialMatchInfo }: MatchPageClientProps) {
  const [eventsData, setEventsData] = useState<MatchEventsData | null>(null)
  const [statsData, setStatsData] = useState<MatchStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false)
  const [eventsView, setEventsView] = useState<'timeline' | 'compact' | 'horizontal'>('timeline')

  const fetchMatchData = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log(`[MatchPageClient] Fetching data for match ${matchId}`)

      // Загружаем события и статистику параллельно
      const [eventsResponse, statsResponse] = await Promise.allSettled([
        fetch(`/api/matches/events?match_id=${matchId}`),
        fetch(`/api/matches/stats?match_id=${matchId}`),
      ])

      let hasData = false

      // Обрабатываем события
      if (eventsResponse.status === 'fulfilled' && eventsResponse.value.ok) {
        const eventsJson = await eventsResponse.value.json()
        console.log('[MatchPageClient] Events response:', eventsJson)
        if (eventsJson.success) {
          setEventsData(eventsJson)
          hasData = true
        }
      } else {
        console.error('[MatchPageClient] Events request failed:', eventsResponse)
      }

      // Обрабатываем статистику
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsJson = await statsResponse.value.json()
        console.log('[MatchPageClient] Stats response:', statsJson)
        if (statsJson.success) {
          setStatsData(statsJson)
          hasData = true
        }
      } else {
        console.error('[MatchPageClient] Stats request failed:', statsResponse)
      }

      // Если ни один запрос не удался
      if (!hasData) {
        setError('Не удалось загрузить данные матча')
      }
    } catch (err) {
      console.error('Ошибка загрузки данных матча:', err)
      setError('Произошла ошибка при загрузк�� данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatchData()
  }, [matchId])

  // Получаем актуальную информацию о матче
  const matchInfo = eventsData?.data?.match || initialMatchInfo
  const statusStr = String(matchInfo.status || '').toUpperCase()
  const isScheduled =
    !statusStr || statusStr.includes('NOT') || statusStr === 'NS' || statusStr.includes('SCHEDULED')

  // Преобразуем события в нужный формат (учитываем разные форматы ответа API)
  const events = (() => {
    const raw: any[] = Array.isArray((eventsData as any)?.data?.events)
      ? ((eventsData as any).data.events as any[])
      : Array.isArray((eventsData as any)?.data?.event)
        ? ((eventsData as any).data.event as any[])
        : []

    return raw.map((ev: any) => {
      const playerName = ev?.player?.name ?? ev?.player_name ?? ev?.player ?? ''
      const minuteVal = ev?.time ?? ev?.minute ?? ''
      const typeVal = ev?.event ?? ev?.type ?? ev?.label ?? 'event'
      const isHome =
        typeof ev?.is_home === 'boolean'
          ? ev.is_home
          : ev?.team === 'home' || ev?.side === 'home' || ev?.isHome === true

      return {
        id: String(ev?.id ?? `${typeVal}-${minuteVal}-${playerName}`),
        minute: String(minuteVal),
        type: String(typeVal),
        player: String(playerName),
        team: isHome ? matchInfo.home?.name || 'Дома' : matchInfo.away?.name || 'Гости',
        description: ev?.label,
      }
    })
  })()

  // Преобразуем статистику в нужный формат
  const stats = (() => {
    if (!statsData?.data) return {}
    // Livescore API оборачивает метрики внутрь data.stats
    const raw: Record<string, unknown> = (statsData.data as any).stats || (statsData.data as any)
    return Object.entries(raw).reduce((acc, [key, value]) => {
      const pair = String(value)
      const [homeValue, awayValue] = pair.includes(':') ? pair.split(':') : ['0', '0']
      acc[key] = { home: homeValue || '0', away: awayValue || '0' }
      return acc
    }, {} as MatchStats)
  })()

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Шапка матча */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">
                  {matchInfo.home.name} — {matchInfo.away.name}
                </h1>
                {matchInfo.competition?.name && (
                  <p className="text-muted-foreground">{matchInfo.competition.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(eventsData?.data?.match?.status || matchInfo.status) && (
                <Badge variant="secondary">
                  {eventsData?.data?.match?.status || matchInfo.status}
                </Badge>
              )}
              {isScheduled && (
                <Button variant="outline" size="sm" onClick={() => setIsPredictionModalOpen(true)}>
                  Прогноз
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
            {/* Команда дома */}
            <div className="flex items-center justify-center gap-3">
              <TeamLogo
                teamId={parseInt(String(matchInfo.home.id || '0'))}
                teamName={matchInfo.home.name}
                size="large"
              />
              <div className="text-center">
                <div className="font-semibold text-lg">{matchInfo.home.name}</div>
                <div className="text-sm text-muted-foreground">Дома</div>
              </div>
            </div>

            {/* Счет */}
            <div className="text-center">
              {eventsData?.data?.match?.scores?.score ||
              ('score' in matchInfo ? matchInfo.score : null) ? (
                <div className="space-y-2">
                  <div className="text-4xl font-bold font-mono">
                    {eventsData?.data?.match?.scores?.score ||
                      ('score' in matchInfo ? matchInfo.score : '')}
                  </div>
                  {eventsData?.data?.match?.scores && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {eventsData.data.match.scores.ht_score && (
                        <div>Перерыв: {eventsData.data.match.scores.ht_score}</div>
                      )}
                      {eventsData.data.match.scores.ft_score &&
                        eventsData.data.match.scores.ft_score !==
                          eventsData.data.match.scores.score && (
                          <div>Основное время: {eventsData.data.match.scores.ft_score}</div>
                        )}
                      {eventsData.data.match.scores.et_score && (
                        <div>Доп. время: {eventsData.data.match.scores.et_score}</div>
                      )}
                      {eventsData.data.match.scores.ps_score && (
                        <div>Пенальти: {eventsData.data.match.scores.ps_score}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">vs</div>
              )}
              {(eventsData?.data?.match?.date || matchInfo.date) && (
                <div className="text-sm text-muted-foreground mt-2">
                  {format(
                    new Date(eventsData?.data?.match?.date || matchInfo.date!),
                    'd MMMM yyyy',
                    { locale: ru },
                  )}
                  {(eventsData?.data?.match?.time || matchInfo.time) &&
                    ` в ${eventsData?.data?.match?.time || matchInfo.time}`}
                </div>
              )}
            </div>

            {/* Команда гостей */}
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <div className="font-semibold text-lg">{matchInfo.away.name}</div>
                <div className="text-sm text-muted-foreground">В гостях</div>
              </div>
              <TeamLogo
                teamId={parseInt(String(matchInfo.away.id || '0'))}
                teamName={matchInfo.away.name}
                size="large"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Контент матча */}
      {error ? (
        <Card>
          <CardContent className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchMatchData} variant="outline" size="sm">
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              События
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Статистика
            </TabsTrigger>
          </TabsList>

          {/* События матча */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    События матча
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant={eventsView === 'timeline' ? 'secondary' : 'outline'} size="xs" onClick={() => setEventsView('timeline')}>Лента</Button>
                    <Button variant={eventsView === 'compact' ? 'secondary' : 'outline'} size="xs" onClick={() => setEventsView('compact')}>Список</Button>
                    <Button variant={eventsView === 'horizontal' ? 'secondary' : 'outline'} size="xs" onClick={() => setEventsView('horizontal')}>Горизонтально</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {events && events.length > 0 ? (
                  eventsView === 'horizontal' ? (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {events
                        .sort((a, b) => parseInt(a.minute) - parseInt(b.minute))
                        .map((event) => (
                          <EventChip key={event.id} event={event} homeName={matchInfo.home?.name || 'Дома'} />
                        ))}
                    </div>
                  ) : eventsView === 'compact' ? (
                    <div className="divide-y">
                      {events
                        .sort((a, b) => parseInt(a.minute) - parseInt(b.minute))
                        .map((event) => (
                          <CompactEventRow key={event.id} event={event} homeName={matchInfo.home?.name || 'Дома'} awayName={matchInfo.away?.name || 'Гости'} />
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events
                        .sort((a, b) => parseInt(a.minute) - parseInt(b.minute))
                        .map((event) => {
                          const isHome = event.team === (matchInfo.home?.name || 'Дома')
                          const teamName = isHome ? (matchInfo.home?.name || 'Дома') : (matchInfo.away?.name || 'Гости')
                          const teamId = isHome ? parseInt(String(matchInfo.home?.id || '0')) : parseInt(String(matchInfo.away?.id || '0'))
                          return (
                            <div key={event.id} className="flex items-center">
                              {/* Левая сторона (домашние) */}
                              {isHome ? (
                                <div className="flex-1 pr-3">
                                  <div className="flex items-center gap-2 justify-end">
                                    <TeamLogo teamId={teamId} teamName={teamName} size="small" />
                                    <CountryFlagImage size="small" className="w-4 h-3" />
                                    <span className="truncate text-xs text-muted-foreground max-w-[140px]">{teamName}</span>
                                    <span className="text-muted-foreground">—</span>
                                    <span className={`truncate text-sm ${getEventColor(event.type)}`}>{event.player}</span>
                                    <span className="text-muted-foreground">—</span>
                                    <span className="font-semibold text-sm">{getEventLabel(event.type)}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 pr-3" />
                              )}

                              {/* Минута по центру */}
                              <div className="flex-shrink-0 mx-1">
                                <div className="bg-background border border-primary/50 rounded-full w-10 h-10 flex items-center justify-center">
                                  <span className="text-xs font-bold text-primary tabular-nums">{event.minute}'</span>
                                </div>
                              </div>

                              {/* Правая сторона (гости) */}
                              {!isHome ? (
                                <div className="flex-1 pl-3">
                                  <div className="flex items-center gap-2 justify-start">
                                    <span className="font-semibold text-sm">{getEventLabel(event.type)}</span>
                                    <span className="text-muted-foreground">—</span>
                                    <span className={`truncate text-sm ${getEventColor(event.type)}`}>{event.player}</span>
                                    <span className="text-muted-foreground">—</span>
                                    <TeamLogo teamId={teamId} teamName={teamName} size="small" />
                                    <CountryFlagImage size="small" className="w-4 h-3" />
                                    <span className="truncate text-xs text-muted-foreground max-w-[140px]">{teamName}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 pl-3" />
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>События матча не найдены</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Статистика матча */}
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Статистика матча
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && Object.keys(stats).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(stats).map(([key, stat]) => (
                      <StatsItem
                        key={key}
                        label={getStatsLabel(key)}
                        homeValue={stat.home}
                        awayValue={stat.away}
                        homeTeam={matchInfo.home?.name || 'Дома'}
                        awayTeam={matchInfo.away?.name || 'Гости'}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Статистика матча не найдена</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      {isScheduled && (
        <PredictionModal
          isOpen={isPredictionModalOpen}
          onClose={() => setIsPredictionModalOpen(false)}
          matchId={matchId}
          matchData={{
            home: { name: matchInfo.home.name },
            away: { name: matchInfo.away.name },
            competition: matchInfo.competition,
            date: matchInfo.date || '',
            time: matchInfo.time || '',
          }}
        />
      )}
    </div>
  )
}
