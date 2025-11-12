'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
// tabs удалены
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
import ComparativeTeamAnalysis from '@/components/fixtures/ComparativeTeamAnalysis'
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

// Маппинг статусов матча на русские названия
const statusToRu = (status?: string | null): string => {
  if (!status) return 'Неизвестно'
  const s = String(status).toUpperCase()
  switch (s) {
    case 'FT':
    case 'FINISHED':
      return 'Завершён'
    case 'HT':
      return 'Перерыв'
    case 'NS':
    case 'SCHEDULED':
    case 'NOT_STARTED':
      return 'Запланирован'
    case 'LIVE':
    case 'IN_PLAY':
      return 'Идёт'
    case 'AET':
      return 'Доп. время'
    case 'PEN':
    case 'AP':
      return 'Пенальти'
    case 'PST':
      return 'Приостановлен'
    case 'CANC':
      return 'Отменён'
    case 'ABD':
      return 'Прерван'
    case 'AWD':
      return 'Присуждён'
    case 'WO':
      return 'Техническое поражение'
    default:
      return 'Неизвестно'
  }
}

// Цветовая дифференциация статусов
const statusColor = (
  status?: string | null,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!status) return 'secondary'
  const s = String(status).toUpperCase()
  switch (s) {
    case 'FT':
    case 'FINISHED':
      return 'default' // зелёный для завершённого
    case 'HT':
      return 'secondary' // жёлтый для перерыва
    case 'NS':
    case 'SCHEDULED':
    case 'NOT_STARTED':
      return 'outline' // серый для запланированного
    case 'LIVE':
    case 'IN_PLAY':
      return 'destructive' // красный для live
    case 'AET':
    case 'PEN':
    case 'AP':
      return 'secondary'
    case 'PST':
      return 'secondary'
    case 'CANC':
    case 'ABD':
      return 'destructive'
    case 'AWD':
    case 'WO':
      return 'secondary'
    default:
      return 'secondary'
  }
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
    red_card: 'Красная карточка',
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
    // Базовые
    possession: 'Владение мячом',
    possesion: 'Владение мячом',
    shots_total: 'Всего ударов',
    shots_on_target: 'Удары в створ',
    shots_off_target: 'Удары мимо',
    shots_blocked: 'Ударов заблокировано',
    goals: 'Голы',
    corners: 'Угловые',
    offsides: 'Офсайды',
    throw_ins: 'Вбрасывания',
    free_kicks: 'Штрафные',
    passes: 'Передачи',
    long_passes: 'Длинные передачи',
    final_third_passes: 'Передачи в последней трети',
    crosses: 'Навесы',
    fouls: 'Фолы',
    fauls: 'Фолы',
    tackles: 'Отборы',
    duels_won: 'Выиграно дуэлей',
    clearances: 'Выносы',
    interceptions: 'Перехваты',
    yellow_cards: 'Желтые карточки',
    red_cards: 'Красные карточки',
    saves: 'Сэйвы вратаря',

    // xG метрики
    xg: 'Ожидаемые голы (xG)',
    xa: 'Ожидаемые ассисты (xA)',
    xgot: 'xG в створ (xGOT)',
    xgot_after_shots_on_target: 'xGOT после ударов в створ',
    goals_prevented: 'Предотвращённые голы',

    // Продвинутые удары и моменты
    big_chances: 'Голевые моменты',
    shots_inside_box: 'Удары из пределов штрафной',
    shots_outside_box: 'Удары из-за штрафной',
    hit_woodwork: 'Попадание в штангу',

    // Продвинутые действия с мячом
    touches_in_opposition_box: 'Касания мяча в штрафной соперника',
    successful_through_balls: 'Успешные передачи в разрез',

    // Прочее из API
    substitutions: 'Замены',
    goal_kicks: 'Удары от ворот',
    attempts_on_goal: 'Попытки на ворота',
    treatments: 'Лечения',
    penalties: 'Пенальти',
    dangerous_attacks: 'Опасные атаки',
    attacks: 'Атаки',
    // Ошибки
    errors_leading_to_shot: 'Ошибки, приведшие к удару',
    errors_leading_to_goal: 'Ошибки, приведшие к голу',
  }

  return statsLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

// Карта алиасов и порядок метрик для упорядочивания статистики
const ORDERED_STATS_KEYS: string[] = [
  // Сводка
  'xg',
  'possession',
  'shots_total',
  'shots_on_target',
  'big_chances',
  'corners',
  'passes',
  'yellow_cards',
  // Детализация
  'xgot',
  'shots_off_target',
  'shots_blocked',
  'shots_inside_box',
  'shots_outside_box',
  'hit_woodwork',
  'goals',
  'big_chances',
  'corners',
  'touches_in_opposition_box',
  'successful_through_balls',
  'offsides',
  'free_kicks',
  'passes',
  'long_passes',
  'final_third_passes',
  'crosses',
  'xa',
  'throw_ins',
  'fouls',
  'tackles',
  'duels_won',
  'clearances',
  'interceptions',
  'errors_leading_to_shot',
  'errors_leading_to_goal',
  'saves',
  'xgot_after_shots_on_target',
  'goals_prevented',
]

const STAT_ALIASES: Record<string, string[]> = {
  xg: ['xg', 'expected_goals', 'exp_goals'],
  xa: ['xa', 'expected_assists', 'exp_assists'],
  xgot: ['xgot', 'xg_on_target', 'post_shot_xg', 'psxg'],
  xgot_after_shots_on_target: ['xgot_after_shots_on_target', 'psxg_on_target'],
  goals_prevented: ['goals_prevented', 'prevented_goals'],

  possession: ['possession', 'possesion', 'ball_possession', 'possession_percent'],
  shots_total: ['shots_total', 'shots', 'total_shots', 'attempts_on_goal', 'shots_total_attempts'],
  shots_on_target: ['shots_on_target', 'on_target', 'shots_ongoal'],
  shots_off_target: ['shots_off_target', 'off_target'],
  shots_blocked: ['shots_blocked', 'blocked_shots'],
  shots_inside_box: ['shots_insidebox', 'shots_inside_box', 'shots_in_box'],
  shots_outside_box: ['shots_outsidebox', 'shots_outside_box', 'shots_out_box'],
  hit_woodwork: ['hit_woodwork', 'woodwork', 'hit_post'],
  goals: ['goals', 'goals_scored', 'scored', 'goals_for'],
  big_chances: ['big_chances', 'goal_chances', 'big_scoring_chances'],
  corners: ['corners', 'corner_kicks'],
  passes: ['passes', 'total_passes', 'passes_total'],
  yellow_cards: ['yellow_cards'],
  offsides: ['offsides', 'offside'],
  throw_ins: ['throw_ins', 'throw_in'],
  free_kicks: ['free_kicks', 'freekicks'],
  long_passes: ['long_passes', 'long_balls'],
  final_third_passes: ['passes_in_final_third', 'final_third_passes', 'passes_third'],
  crosses: ['crosses'],
  fouls: ['fouls', 'fauls'],
  tackles: ['tackles'],
  duels_won: ['duels_won', 'won_duels'],
  clearances: ['clearances'],
  interceptions: ['interceptions'],
  errors_leading_to_shot: ['errors_leading_to_shot'],
  errors_leading_to_goal: ['errors_leading_to_goal'],
  saves: ['saves', 'goalkeeper_saves'],
}

function normalizeKey(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function resolveOrderedStats(
  stats: MatchStats,
): Array<{ key: string; stat: { home: string | number; away: string | number } }> {
  if (!stats || Object.keys(stats).length === 0) return []

  // Нормализованный доступ к исходным ключам
  const normalized: Record<string, { home: string | number; away: string | number }> = {}
  for (const [k, v] of Object.entries(stats)) {
    normalized[normalizeKey(k)] = v
  }

  const getByCanon = (canon: string): { home: string | number; away: string | number } | null => {
    const aliases = STAT_ALIASES[canon] || [canon]
    for (const a of aliases) {
      const n = normalizeKey(a)
      if (normalized[n]) return normalized[n]
    }

    // Производная метрика: всего ударов = в створ + мимо + заблокировано
    if (canon === 'shots_total') {
      const on = getByCanon('shots_on_target')
      const off = getByCanon('shots_off_target')
      const bl = getByCanon('shots_blocked')
      if (on || off || bl) {
        const h =
          (parseFloat(String(on?.home ?? '0')) || 0) +
          (parseFloat(String(off?.home ?? '0')) || 0) +
          (parseFloat(String(bl?.home ?? '0')) || 0)
        const a =
          (parseFloat(String(on?.away ?? '0')) || 0) +
          (parseFloat(String(off?.away ?? '0')) || 0) +
          (parseFloat(String(bl?.away ?? '0')) || 0)
        if (h > 0 || a > 0) return { home: h, away: a }
      }
    }

    return null
  }

  // Дедупликация при сохранении первого появления
  const seen = new Set<string>()
  const result: Array<{ key: string; stat: { home: string | number; away: string | number } }> = []

  for (const key of ORDERED_STATS_KEYS) {
    if (seen.has(key)) continue
    const stat = getByCanon(key)
    if (stat) {
      seen.add(key)
      result.push({ key, stat })
    }
  }

  return result
}

// Компактные элеме��ты событий
function CompactEventRow({
  event,
  homeName,
  awayName,
}: {
  event: MatchEvent
  homeName: string
  awayName: string
}) {
  const isHome = event.team === homeName
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center justify-center rounded px-1.5 h-5 text-[10px] font-semibold bg-muted text-muted-foreground tabular-nums">
          {event.minute}
        </span>
        <span className="text-base leading-none">{getEventIcon(event.type)}</span>
        <span className={`truncate text-sm ${getEventColor(event.type)}`}>{event.player}</span>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
        {isHome ? homeName : awayName}
      </span>
    </div>
  )
}

function EventChip({ event, homeName }: { event: MatchEvent; homeName: string }) {
  const isHome = event.team === homeName
  return (
    <div
      className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${isHome ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}
    >
      <span className="tabular-nums font-mono font-semibold">{event.minute}</span>
      <span>{getEventIcon(event.type)}</span>
      <span className={`max-w-[140px] truncate ${getEventColor(event.type)}`}>{event.player}</span>
    </div>
  )
}

// Парсит минуту из строки вида "45", "45+2", "90+3"
function parseMinuteValue(minute?: string): number {
  if (!minute) return 0
  const s = String(minute).trim()
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s)
  const parts = s.split('+')
  const base = parseFloat(parts[0] || '0')
  const extra = parseFloat(parts[1] || '0')
  const val = (Number.isFinite(base) ? base : 0) + (Number.isFinite(extra) ? extra : 0)
  return Math.min(Math.max(val, 0), 90)
}

// Кольцо минуты: два полуокружья (1-й тайм справа, 2-й тайм слева) с заполнением по времени
// Базовое кольцо по таймам и овертайму
function OvertimeMinuteRing({ minute }: { minute: number }) {
  const m = Math.max(0, minute)
  const strokeW = 4
  // прогресс 1-го тайма (0..45)
  const p1 = Math.min(1, m / 45)
  // прогресс 2-го тайма (46..90)
  const p2 = m <= 45 ? 0 : Math.min(1, (Math.min(m, 90) - 45) / 45)
  // овертайм (m>90): рисуем дополнительную голубую дугу поверх
  const ot = m > 90 ? Math.min(1, (m - 90) / 15) : 0 // нормализация 0..1 для 15' овертайма визуально

  return (
    <div className="relative w-10 h-10">
      <svg viewBox="0 0 40 40" className="absolute inset-0">
        {/* треки */}
        <path
          d="M20 2 A 18 18 0 0 1 20 38"
          fill="none"
          stroke="currentColor"
          className="text-muted-foreground"
          strokeOpacity={0.25}
          strokeWidth={strokeW}
          strokeLinecap="round"
          pathLength={50}
        />
        <path
          d="M20 38 A 18 18 0 0 1 20 2"
          fill="none"
          stroke="currentColor"
          className="text-muted-foreground"
          strokeOpacity={0.25}
          strokeWidth={strokeW}
          strokeLinecap="round"
          pathLength={50}
        />

        {/* 1-й тайм: правая полуокружность, оранжевый прогресс */}
        <path
          d="M20 2 A 18 18 0 0 1 20 38"
          fill="none"
          stroke="currentColor"
          className="text-orange-500"
          strokeWidth={strokeW}
          strokeLinecap="round"
          pathLength={50}
          strokeDasharray={`${50 * p1} ${50}`}
          strokeDashoffset={0}
        />
        {/* 2-й тайм: левая полуокружность, оранжевый прогресс */}
        <path
          d="M20 38 A 18 18 0 0 1 20 2"
          fill="none"
          stroke="currentColor"
          className="text-orange-500"
          strokeWidth={strokeW}
          strokeLinecap="round"
          pathLength={50}
          strokeDasharray={`${50 * p2} ${50}`}
          strokeDashoffset={0}
        />

        {/* Овертайм: поверх полных 90 рисуем голубую дугу на верхушке окружности */}
        {m > 90 && (
          <path
            d="M20 2 A 18 18 0 0 1 20 38"
            fill="none"
            stroke="currentColor"
            className="text-sky-500"
            strokeWidth={strokeW}
            strokeLinecap="round"
            pathLength={50}
            strokeDasharray={`${50 * Math.min(1, p1)} ${50}`}
            strokeDashoffset={0}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-primary tabular-nums">{m}</span>
      </div>
    </div>
  )
}

// Компонент для отображения статистики
function StatsItem({
  label,
  homeValue,
  awayValue,
}: {
  label: string
  homeValue: string | number
  awayValue: string | number
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
    </div>
  )
}

export default function MatchPageClient({ matchId, initialMatchInfo }: MatchPageClientProps) {
  const [eventsData, setEventsData] = useState<MatchEventsData | null>(null)
  const [statsData, setStatsData] = useState<MatchStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false)
  // оставляем только ленту событий

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
          <div className="flex justify-center items-center gap-3">
            <div className="text-xs text-muted-foreground text-small">
              <div>{matchInfo.competition?.name && <p>{matchInfo.competition.name}</p>}</div>
            </div>
            <span className="text-xs text-muted-foreground text-small opacity-30">—</span>
            {(eventsData?.data?.match?.date || matchInfo.date) && (
              <div className="text-xs text-muted-foreground text-small">
                {format(new Date(eventsData?.data?.match?.date || matchInfo.date!), 'd MMMM yyyy', {
                  locale: ru,
                })}
                {(eventsData?.data?.match?.time || matchInfo.time) &&
                  ` в ${eventsData?.data?.match?.time || matchInfo.time}`}
              </div>
            )}
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
                <div className="font-semibold text-2xl">{matchInfo.home.name}</div>
                <div className="text-sm text-muted-foreground">Дома</div>
              </div>
            </div>

            {/* Счет */}
            <div className="text-center">
              {eventsData?.data?.match?.scores?.score ||
              ('score' in matchInfo ? matchInfo.score : null) ? (
                <div className="space-y-2">
                  <div className="text-5xl font-bold font-mono">
                    {eventsData?.data?.match?.scores?.score ||
                      ('score' in matchInfo ? matchInfo.score : '')}
                  </div>
                  {eventsData?.data?.match?.scores && (
                    <i className="text-xs text-muted-foreground space-y-1 opacity-50">
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
                    </i>
                  )}
                </div>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">vs</div>
              )}
            </div>

            {/* Команда гостей */}
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <div className="font-semibold text-2xl">{matchInfo.away.name}</div>
                <div className="text-sm text-muted-foreground">В гостях</div>
              </div>
              <TeamLogo
                teamId={parseInt(String(matchInfo.away.id || '0'))}
                teamName={matchInfo.away.name}
                size="large"
              />
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-2">
              {(eventsData?.data?.match?.status || matchInfo.status) && (
                <Badge variant={statusColor(eventsData?.data?.match?.status || matchInfo.status)}>
                  {statusToRu(eventsData?.data?.match?.status || matchInfo.status)}
                </Badge>
              )}
              {isScheduled && (
                <Button variant="outline" size="sm" onClick={() => setIsPredictionModalOpen(true)}>
                  Прогноз
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Контент матча */}
      {error ? (
        <Card>
          <CardContent className="text-center py-8 space-y-4">
            <AlertCircle className="h-20 w-20 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchMatchData} variant="outline" size="sm">
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div
          className={`relative grid gap-4 ${events && events.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}
        >
          {/* Левая колонка: события (2/3) — рендерим только если есть события */}
          {events && events.length > 0 ? (
            <div className="lg:col-span-1 order-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      События матча
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events
                      .sort((a, b) => parseInt(a.minute) - parseInt(b.minute))
                      .map((event, idx, arr) => {
                        const isHome = event.team === (matchInfo.home?.name || 'Дома')
                        const minuteNum = (() => {
                          const m = parseMinuteValue(event.minute)
                          // если в исходных данных формат 90+2 — превращаем в 92 для подписи
                          return m
                        })()
                        const prevMinute = idx > 0 ? parseMinuteValue(arr[idx - 1].minute) : 0
                        const needHTLine = prevMinute < 45 && minuteNum >= 45
                        const needFTLine = prevMinute < 90 && minuteNum >= 90
                        const overtime = minuteNum > 90

                        return (
                          <div key={event.id} className="flex flex-col">
                            {/* Разделители таймов */}
                            {needHTLine && (
                              <div className="relative my-2">
                                <div className="h-px bg-muted" />
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 text-[10px] text-muted-foreground bg-background">
                                  2й тайм
                                </div>
                              </div>
                            )}
                            {needFTLine && (
                              <div className="relative my-2">
                                <div className="h-px bg-muted" />
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 text-[10px] text-muted-foreground bg-background">
                                  доп время
                                </div>
                              </div>
                            )}

                            <div className="flex items-center">
                              {/* Левая сторона (домашние) - без названий команд */}
                              {isHome ? (
                                <div className="flex-1 pr-3">
                                  <div className="flex items-center gap-2 justify-end">
                                    <span
                                      className={`truncate text-sm ${getEventColor(event.type)}`}
                                    >
                                      {event.player}
                                    </span>
                                    <span className="text-base leading-none">
                                      {getEventIcon(event.type)}
                                    </span>
                                    <span className="font-semibold text-sm">
                                      {getEventLabel(event.type)}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 pr-3" />
                              )}

                              {/* Минута по центру: кольцо таймов/овертайма */}
                              <div className="flex-shrink-0 mx-1">
                                <OvertimeMinuteRing minute={minuteNum} />
                              </div>

                              {/* Правая сторона (гости) - без названий команд */}
                              {!isHome ? (
                                <div className="flex-1 pl-3">
                                  <div className="flex items-center gap-2 justify-start">
                                    <span className="text-base leading-none">
                                      {getEventIcon(event.type)}
                                    </span>
                                    <span className="font-semibold text-sm">
                                      {getEventLabel(event.type)}
                                    </span>
                                    <span
                                      className={`truncate text-sm ${getEventColor(event.type)}`}
                                    >
                                      {event.player}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 pl-3" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Правая колонка: статистика (1/3, а если нет событий — на всю ширину) */}
          <div
            className={`${events && events.length > 0 ? 'lg:col-span-1' : 'lg:col-span-3'} order-2`}
          >
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Статистика матча
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && Object.keys(stats).length > 0 ? (
                  <div className="relative">
                    {/* Шапка названий команд */}
                    <div className="mb-2">
                      <div className="grid grid-cols-3 items-center">
                        <div className="text-xs text-left truncate pr-2">
                          {matchInfo.home?.name || 'Дома'}
                        </div>
                        <div className="text-xs text-center text-muted-foreground">Показатель</div>
                        <div className="text-xs text-right truncate pl-2">
                          {matchInfo.away?.name || 'Гости'}
                        </div>
                      </div>
                    </div>

                    {/* Список метрик с прокруткой */}
                    <div className="max-h-[70vh] overflow-auto pr-1">
                      <div className="space-y-6">
                        {(() => {
                          const ordered = resolveOrderedStats(stats)
                          if (ordered.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground">
                                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Статистика матча не найдена</p>
                              </div>
                            )
                          }
                          return ordered
                            .filter(({ stat }) => {
                              const hv = Number(String(stat.home).replace('%', ''))
                              const av = Number(String(stat.away).replace('%', ''))
                              const hvOk = Number.isFinite(hv)
                              const avOk = Number.isFinite(av)
                              if (!hvOk && !avOk) return false
                              return (hvOk ? hv : 0) !== 0 || (avOk ? av : 0) !== 0
                            })
                            .map(({ key, stat }) => (
                              <StatsItem
                                key={key}
                                label={getStatsLabel(key)}
                                homeValue={stat.home}
                                awayValue={stat.away}
                              />
                            ))
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Статистика матча не найдена</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Сравнительный анализ команд по прошедшим матчам */}
      <ComparativeTeamAnalysis
        home={{ id: parseInt(String(matchInfo.home.id || '0')), name: matchInfo.home.name }}
        away={{ id: parseInt(String(matchInfo.away.id || '0')), name: matchInfo.away.name }}
        limit={10}
      />

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
