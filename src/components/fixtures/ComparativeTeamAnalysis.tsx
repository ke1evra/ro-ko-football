'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
  AlertCircle,
  Info,
  Table as TableIcon,
  BarChart3,
  ArrowRight,
  BarChart4,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
} from 'lucide-react'
import Link from 'next/link'
import { generateMatchUrl } from '@/lib/match-url-utils'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

type TeamSide = 'home' | 'away'
type StatMetric =
  | 'goals'
  | 'possession'
  | 'shots'
  | 'shotsOnTarget'
  | 'shotsOffTarget'
  | 'shotsBlocked'
  | 'corners'
  | 'offsides'
  | 'fouls'
  | 'yellowCards'
  | 'redCards'
  | 'saves'
  | 'passes'
  | 'passesAccurate'
  | 'passAccuracy'
  | 'attacks'
  | 'dangerousAttacks'
  | 'shotsInsideBox'
  | 'shotsOutsideBox'
  | 'hitWoodwork'
  | 'bigChances'
  | 'freeKicks'
  | 'longPasses'
  | 'finalThirdPasses'
  | 'crosses'
  | 'xa'
  | 'throwIns'
  | 'tackles'
  | 'duelsWon'
  | 'clearances'
  | 'interceptions'
  | 'errorsLeadingToShot'
  | 'errorsLeadingToGoal'
  | 'xgotAfterShotsOnTarget'
  | 'goalsPrevented'

interface TeamInfo {
  id: number
  name: string
}

interface MatchStatsData {
  possession?: { home: number; away: number }
  shots?: { home: number; away: number }
  shotsOnTarget?: { home: number; away: number }
  shotsOffTarget?: { home: number; away: number }
  shotsBlocked?: { home: number; away: number }
  corners?: { home: number; away: number }
  offsides?: { home: number; away: number }
  fouls?: { home: number; away: number }
  yellowCards?: { home: number; away: number }
  redCards?: { home: number; away: number }
  saves?: { home: number; away: number }
  passes?: { home: number; away: number }
  passesAccurate?: { home: number; away: number }
  passAccuracy?: { home: number; away: number }
  attacks?: { home: number; away: number }
  dangerousAttacks?: { home: number; away: number }
  additionalStats?: Record<string, unknown>
}

interface MatchRow {
  id: string
  matchId: string
  fixtureId: string
  date: string
  competition?: string
  season?: string
  round?: string
  homeName: string
  awayName: string
  homeTeamId: number
  awayTeamId: number
  homeScore: number
  awayScore: number
  gf: number
  ga: number
  total: number
  result: 'W' | 'D' | 'L'
  stats?: MatchStatsData
}

interface ComparativeTeamAnalysisProps {
  home: TeamInfo
  away: TeamInfo
  limit?: number
}

interface AggregateStats {
  wins: number
  draws: number
  losses: number
  avgDiff: number
  maxIT: number
  minIT: number
  maxITCon: number
  minITCon: number
  avgIT: number
  avgITCon: number
  avgT: number
  count: number
  maxStat: number
  minStat: number
  maxStatCon: number
  minStatCon: number
  avgStat: number
  avgStatCon: number
}

// Доступные метрики для вкладок (в порядке приоритета)
const STAT_METRICS: Array<{ key: StatMetric; label: string }> = [
  { key: 'goals', label: 'Голы' },
  { key: 'corners', label: 'Угловые' },
  { key: 'yellowCards', label: 'Жёлтые карточки' },
  { key: 'shotsOnTarget', label: 'Удары в створ' },
  { key: 'fouls', label: 'Фолы' },
  { key: 'shots', label: 'Удары' },
  { key: 'offsides', label: 'Офсайды' },
  { key: 'saves', label: 'Сэйвы' },
  { key: 'redCards', label: 'Красные карточки' },
  { key: 'shotsOffTarget', label: 'Удары мимо' },
  { key: 'shotsBlocked', label: 'Заблокированные удары' },
  // { key: 'passes', label: 'Передачи' },
  // { key: 'passesAccurate', label: 'Точные передачи' },
  // { key: 'passAccuracy', label: 'Точность передач' },
  { key: 'possession', label: 'Владение' },
  { key: 'attacks', label: 'Атаки' },
  { key: 'dangerousAttacks', label: 'Опасные атаки' },
]

async function fetchTeamLastMatches(
  teamId: number,
  limit = 10,
  opponentTeamId?: number,
): Promise<unknown[]> {
  try {
    const query = new URLSearchParams({
      teamId: String(teamId),
      limit: String(limit),
    })
    if (opponentTeamId) {
      query.append('opponentTeamId', String(opponentTeamId))
    }
    const res = await fetch(`/api/team-matches?${query.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    return data?.success ? data?.data || [] : []
  } catch {
    return []
  }
}

function normalizeRows(rows: unknown[]): MatchRow[] {
  return rows.map((m: unknown) => {
    const match = m as Record<string, unknown>
    // gf и ga из API могут быть перепутаны в зависимости от того, как команда загружена
    // Используем homeScore/awayScore как источник истины для счета хозяев/гостей
    const homeScore = (match.homeScore as number) ?? (match.gf as number) ?? 0
    const awayScore = (match.awayScore as number) ?? (match.ga as number) ?? 0
    const result = (match.result as 'W' | 'D' | 'L') ?? 'D'
    const season: string | undefined =
      ((match.season as Record<string, unknown>)?.name as string) ??
      ((match.season as Record<string, unknown>)?.year as string) ??
      undefined

    return {
      id: String(match.id ?? match.matchId ?? ''),
      matchId: String(match.matchId ?? ''),
      fixtureId: String(match.fixtureId ?? ''),
      date: String(match.date ?? ''),
      competition: (match.competition as string) ?? undefined,
      season,
      round: (match.round as string) ?? undefined,
      homeName: (match.homeName as string) ?? '—',
      awayName: (match.awayName as string) ?? '—',
      homeTeamId: (match.homeTeamId as number) ?? 0,
      awayTeamId: (match.awayTeamId as number) ?? 0,
      homeScore,
      awayScore,
      // gf и ga всегда относятся к хозяевам и гостям соответственно
      gf: homeScore,
      ga: awayScore,
      total: homeScore + awayScore,
      result,
      stats: match.stats,
    }
  })
}

function getStatValue(row: MatchRow, metric: StatMetric, side: TeamSide): number {
  // Специальная обработка для голов
  if (metric === 'goals') {
    return side === 'home' ? row.gf : row.ga
  }

  if (!row.stats) return 0
  const stat = row.stats[metric as keyof MatchStatsData]
  if (!stat || typeof stat !== 'object' || !('home' in stat) || !('away' in stat)) return 0
  return side === 'home' ? (stat.home as number) : (stat.away as number)
}

function aggregateByMetric(rows: MatchRow[], metric: StatMetric): AggregateStats {
  const n = rows.length || 1
  const wins = rows.filter((r) => r.result === 'W').length
  const draws = rows.filter((r) => r.result === 'D').length
  const losses = rows.filter((r) => r.result === 'L').length
  const gfArr = rows.map((r) => r.gf)
  const gaArr = rows.map((r) => r.ga)
  const totals = rows.map((r) => r.total)
  const statArr = rows.map((r) => getStatValue(r, metric, 'home'))
  const statConArr = rows.map((r) => getStatValue(r, metric, 'away'))

  const avg = (arr: number[]): number =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  return {
    wins,
    draws,
    losses,
    avgDiff: avg(rows.map((r) => r.gf - r.ga)),
    maxIT: Math.max(...(gfArr.length ? gfArr : [0])),
    minIT: Math.min(...(gfArr.length ? gfArr : [0])),
    maxITCon: Math.max(...(gaArr.length ? gaArr : [0])),
    minITCon: Math.min(...(gaArr.length ? gaArr : [0])),
    avgIT: avg(gfArr),
    avgITCon: avg(gaArr),
    avgT: avg(totals),
    count: n,
    maxStat: Math.max(...(statArr.length ? statArr : [0])),
    minStat: Math.min(...(statArr.length ? statArr : [0])),
    maxStatCon: Math.max(...(statConArr.length ? statConArr : [0])),
    minStatCon: Math.min(...(statConArr.length ? statConArr : [0])),
    avgStat: avg(statArr),
    avgStatCon: avg(statConArr),
  }
}

function ResultPill({ res }: { res: 'W' | 'D' | 'L' }): JSX.Element {
  const map: Record<'W' | 'D' | 'L', string> = {
    W: 'bg-green-100 text-green-800 border border-green-300',
    D: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    L: 'bg-red-100 text-red-800 border border-red-300',
  }
  const label: Record<'W' | 'D' | 'L', string> = { W: 'В', D: 'Н', L: 'П' }
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${map[res]}`}>
      {label[res]}
    </span>
  )
}

// Карта а��иасов и порядок метрик для упорядочивания статистики
const ORDERED_STATS_KEYS: string[] = [
  // Сводка
  'possession',
  'shots',
  'shotsOnTarget',
  'bigChances',
  'corners',
  'passes',
  'yellowCards',
  // Детализация
  'shotsOffTarget',
  'shotsBlocked',
  'shotsInsideBox',
  'shotsOutsideBox',
  'hitWoodwork',
  'goals',
  'offsides',
  'freeKicks',
  'longPasses',
  'finalThirdPasses',
  'crosses',
  'xa',
  'throwIns',
  'fouls',
  'tackles',
  'duelsWon',
  'clearances',
  'interceptions',
  'errorsLeadingToShot',
  'errorsLeadingToGoal',
  'saves',
  'xgotAfterShotsOnTarget',
  'goalsPrevented',
]

// Утилита для русскоязычных названий статистики
const getStatsLabel = (key: string): string => {
  const statsLabels: Record<string, string> = {
    possession: 'Владение мячом',
    shots: 'Удары',
    shotsOnTarget: 'Удары в створ',
    shotsOffTarget: 'Удары мимо',
    shotsBlocked: 'Заблокированные удары',
    shotsInsideBox: 'Удары из штрафной',
    shotsOutsideBox: 'Удары за штрафной',
    hitWoodwork: 'Попадание в штангу',
    goals: 'Голы',
    bigChances: 'Голевые моменты',
    corners: 'Угловые',
    offsides: 'Офсайды',
    freeKicks: 'Штрафные',
    longPasses: 'Длинные передачи',
    finalThirdPasses: 'Передачи в последней трети',
    crosses: 'Навесы',
    xa: 'Ожидаемые ассисты',
    throwIns: 'Вбрасывания',
    fouls: 'Фолы',
    tackles: 'Отборы',
    duelsWon: 'Выиграно дуэлей',
    clearances: 'Выносы',
    interceptions: 'Перехваты',
    errorsLeadingToShot: 'Ошибки, приведшие к удару',
    errorsLeadingToGoal: 'Ошибки, приведшие к голу',
    yellowCards: 'Жёлтые карточки',
    redCards: 'Красные карточки',
    saves: 'Сэйвы',
    passes: 'Передачи',
    passesAccurate: 'Точные передачи',
    passAccuracy: 'Точность передач (%)',
    attacks: 'Атаки',
    dangerousAttacks: 'Опасные атаки',
    xgotAfterShotsOnTarget: 'xGOT после ударов в створ',
    goalsPrevented: 'Предотвращённые голы',
  }
  return statsLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function MiniStatsPopover({ stats }: { stats?: MatchStatsData }): JSX.Element {
  if (!stats) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <button className="p-1 hover:bg-muted rounded">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <p className="text-sm text-muted-foreground">Статистика недоступна</p>
        </HoverCardContent>
      </HoverCard>
    )
  }

  // Получить все ключи из stats, отсортировать по ORDERED_STATS_KEYS
  const allKeys = Object.keys(stats)
  const sortedKeys = ORDERED_STATS_KEYS.filter((key) => allKeys.includes(key)).concat(
    allKeys.filter((key) => !ORDERED_STATS_KEYS.includes(key)),
  )

  if (sortedKeys.length === 0) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <button className="p-1 hover:bg-muted rounded">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <p className="text-sm text-muted-foreground">Статистика недоступна</p>
        </HoverCardContent>
      </HoverCard>
    )
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="p-1 hover:bg-muted rounded">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 max-h-96 overflow-y-auto">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Статистика матча</h4>
          {sortedKeys.map((key) => {
            const val = stats[key as keyof MatchStatsData]
            if (
              val &&
              typeof val === 'object' &&
              'home' in val &&
              'away' in val &&
              typeof val.home === 'number' &&
              typeof val.away === 'number'
            ) {
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{getStatsLabel(key)}</span>
                  <span className="font-semibold">
                    {val.home} - {val.away}
                  </span>
                </div>
              )
            }
            return null
          })}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

type MatchFilter = 'all' | 'head-to-head'
type VenueFilter = 'all' | 'home' | 'away'

export default function ComparativeTeamAnalysis({
  home,
  away,
  limit: initialLimit = 10,
}: ComparativeTeamAnalysisProps) {
  const [homeRows, setHomeRows] = useState<MatchRow[]>([])
  const [awayRows, setAwayRows] = useState<MatchRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Record<'home' | 'away', Set<string>>>({
    home: new Set(),
    away: new Set(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<StatMetric>('goals')
  const [limit, setLimit] = useState(initialLimit)
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all')

  useEffect(() => {
    let aborted = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        console.log('[ComparativeTeamAnalysis] Загрузка матчей для:', {
          home: home.id,
          away: away.id,
          matchFilter,
        })
        const [hRaw, aRaw] = await Promise.all([
          fetchTeamLastMatches(
            home.id,
            limit,
            matchFilter === 'head-to-head' ? away.id : undefined,
          ),
          fetchTeamLastMatches(
            away.id,
            limit,
            matchFilter === 'head-to-head' ? home.id : undefined,
          ),
        ])
        console.log('[ComparativeTeamAnalysis] Получены матчи:', {
          homeCount: hRaw.length,
          awayCount: aRaw.length,
        })
        console.log('[ComparativeTeamAnalysis] Матчи home:', JSON.stringify(hRaw, null, 2))
        console.log('[ComparativeTeamAnalysis] Матчи away:', JSON.stringify(aRaw, null, 2))
        if (aborted) return
        const normalizedHome = normalizeRows(hRaw)
        const normalizedAway = normalizeRows(aRaw)
        setHomeRows(normalizedHome)
        setAwayRows(normalizedAway)
        // Выбрать все матчи по умолчанию
        setSelectedIds({
          home: new Set(normalizedHome.map((r) => r.id)),
          away: new Set(normalizedAway.map((r) => r.id)),
        })
      } catch (e: unknown) {
        const error = e as Record<string, unknown>
        console.error('[ComparativeTeamAnalysis] Ошибка:', error)
        if (!aborted) setError((error?.message as string) || 'Не удалось загрузить данные')
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    load()
    return () => {
      aborted = true
    }
  }, [home.id, home.name, away.id, away.name, limit, matchFilter])

  const filteredHomeRows = useMemo(() => {
    if (matchFilter === 'head-to-head') {
      // Для homeRows: ищем матчи, где home.id играет дома, а away.id играет в гостях
      const filtered = homeRows.filter((r) => r.awayTeamId === away.id)
      console.log('[ComparativeTeamAnalysis] Фильтр head-to-head для home:', {
        homeTeamId: home.id,
        awayTeamId: away.id,
        totalHomeRows: homeRows.length,
        filteredCount: filtered.length,
        sampleRows: homeRows.slice(0, 2).map((r) => ({
          id: r.id,
          homeTeamId: r.homeTeamId,
          awayTeamId: r.awayTeamId,
          homeName: r.homeName,
          awayName: r.awayName,
        })),
      })
      return filtered
    }
    return homeRows
  }, [homeRows, matchFilter, away.id, home.id])

  const filteredAwayRows = useMemo(() => {
    if (matchFilter === 'head-to-head') {
      // Для awayRows: ищем матчи, где away.id играет в гостях, а home.id играет дома
      // awayRows содержит матчи, где away.id играет (может быть дома или в гостях)
      // Нам нужны матчи, где away.id в гостях (awayTeamId === away.id) и home.id дома (homeTeamId === home.id)
      const filtered = awayRows.filter((r) => r.homeTeamId === home.id && r.awayTeamId === away.id)
      console.log('[ComparativeTeamAnalysis] Фильтр head-to-head для away:', {
        homeTeamId: home.id,
        awayTeamId: away.id,
        totalAwayRows: awayRows.length,
        filteredCount: filtered.length,
        sampleRows: awayRows.slice(0, 2).map((r) => ({
          id: r.id,
          homeTeamId: r.homeTeamId,
          awayTeamId: r.awayTeamId,
          homeName: r.homeName,
          awayName: r.awayName,
        })),
      })
      return filtered
    }
    return awayRows
  }, [awayRows, matchFilter, home.id, away.id])

  // Обновить выбранные матчи при смене фильтра
  useEffect(() => {
    setSelectedIds({
      home: new Set(filteredHomeRows.map((r) => r.id)),
      away: new Set(filteredAwayRows.map((r) => r.id)),
    })
  }, [matchFilter, filteredHomeRows, filteredAwayRows])

  const aggHome = useMemo(() => {
    const selectedHomeRows = filteredHomeRows.filter((r) => selectedIds.home.has(r.id))
    return aggregateByMetric(selectedHomeRows, selectedMetric)
  }, [filteredHomeRows, selectedIds.home, selectedMetric])

  const aggAway = useMemo(() => {
    const selectedAwayRows = filteredAwayRows.filter((r) => selectedIds.away.has(r.id))
    return aggregateByMetric(selectedAwayRows, selectedMetric)
  }, [filteredAwayRows, selectedIds.away, selectedMetric])

  function toggle(side: TeamSide, id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev[side])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, [side]: next }
    })
  }

  function toggleAll(side: TeamSide, rows: MatchRow[]) {
    setSelectedIds((prev) => {
      const allIds = new Set(rows.map((r) => r.id))
      const current = prev[side]
      const isAllSelected = rows.every((r) => current.has(r.id))
      if (isAllSelected) {
        // Deselect all
        return { ...prev, [side]: new Set() }
      } else {
        // Select all
        return { ...prev, [side]: allIds }
      }
    })
  }

  function AggBlock({ title, agg }: { title: string; agg: AggregateStats }): JSX.Element {
    const formatValue = (val: number): string => {
      if (Number.isInteger(val)) return String(val)
      return val.toFixed(2).replace(/\.?0+$/, '')
    }

    const column1 = [
      { label: 'Победы', value: agg.wins, tooltip: 'Количество побед' },
      { label: 'Ничьи', value: agg.draws, tooltip: 'Количество ничьих' },
      { label: 'Поражения', value: agg.losses, tooltip: 'Количество поражений' },
    ]

    const column2 = [
      {
        label: 'СР ИТ',
        value: formatValue(agg.avgIT),
        tooltip: 'Средний индивидуальный тотал (забитые голы)',
      },
      {
        label: 'СР ИТ СОП',
        value: formatValue(agg.avgITCon),
        tooltip: 'Средний индивидуальный тотал соперника (пропущенные голы)',
      },
      {
        label: 'СР Т',
        value: formatValue(agg.avgT),
        tooltip: 'Средний общий тотал матча',
      },
    ]

    const renderStat = (stat: { label: string; value: string | number; tooltip: string }) => (
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-help block truncate">
                  {stat.label}
                </span>
              </TooltipTrigger>
              <TooltipContent>{stat.tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-xs font-semibold text-right">{stat.value}</span>
      </div>
    )

    return (
      <Card className="rounded-lg shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              {column1.map((stat, idx) => (
                <div key={idx}>{renderStat(stat)}</div>
              ))}
            </div>
            <div className="space-y-3">
              {column2.map((stat, idx) => (
                <div key={idx}>{renderStat(stat)}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  function MatchTable({
    side,
    title,
    rows,
  }: {
    side: TeamSide
    title: string
    rows: MatchRow[]
  }): JSX.Element {
    const getResultColor = (result: 'W' | 'D' | 'L'): string => {
      switch (result) {
        case 'W':
          return 'bg-green-50 hover:bg-green-100'
        case 'D':
          return 'bg-yellow-50 hover:bg-yellow-100'
        case 'L':
          return 'bg-red-50 hover:bg-red-100'
      }
    }

    // Фильтрация по месту проведения и сортировка по дате
    const sortedRows = useMemo(() => {
      let filtered = rows
      if (venueFilter === 'home') {
        // Показываем только матчи, где команда играет дома
        filtered = rows.filter((r) =>
          side === 'home' ? r.homeTeamId === home.id : r.homeTeamId === away.id,
        )
      } else if (venueFilter === 'away') {
        // Показываем только матчи, где команда играет в гостях
        filtered = rows.filter((r) =>
          side === 'home' ? r.awayTeamId === home.id : r.awayTeamId === away.id,
        )
      }
      // Сортируем по дате (от новых к старым)
      return [...filtered].sort((a, b) => {
        const aDate = new Date(a.date).getTime()
        const bDate = new Date(b.date).getTime()
        return bDate - aDate
      })
    }, [rows, venueFilter, side, home.id, away.id]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <Card className="rounded-lg shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      className="accent-primary cursor-pointer"
                      checked={
                        sortedRows.length > 0 &&
                        sortedRows.every((r) => selectedIds[side].has(r.id))
                      }
                      onChange={() => toggleAll(side, sortedRows)}
                    />
                  </TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Хозяева</TableHead>
                  <TableHead className="text-center">ИТ1</TableHead>
                  <TableHead className="text-center">ИТ2</TableHead>
                  <TableHead>Гости</TableHead>
                  <TableHead className="text-center">Т</TableHead>
                  <TableHead className="text-center">Рез.</TableHead>
                  <TableHead className="w-20 text-center">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                      Нет данных
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRows.map((r) => {
                    const checked = selectedIds[side].has(r.id)
                    const rowClass = getResultColor(r.result)
                    return (
                      <TableRow
                        key={r.id}
                        className={`transition-colors cursor-pointer ${rowClass}`}
                        onClick={() => toggle(side, r.id)}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            className="accent-primary cursor-pointer"
                            checked={checked}
                            onChange={() => toggle(side, r.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(r.date).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help block w-24 truncate overflow-hidden text-ellipsis">
                                  {r.homeName}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{r.homeName}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        {/* ИТ1 - всегда хозяева матча, ИТ2 - всегда гости матча */}
                        <TableCell className="text-center font-semibold text-xs">
                          {getStatValue(r, selectedMetric, 'home')}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs">
                          {getStatValue(r, selectedMetric, 'away')}
                        </TableCell>
                        <TableCell className="text-xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help block w-24 truncate overflow-hidden text-ellipsis">
                                  {r.awayName}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{r.awayName}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        {/* Т - всегда сумма ИТ1 (хозяева) + ИТ2 (гости) */}
                        <TableCell className="text-center font-semibold text-xs">
                          {getStatValue(r, selectedMetric, 'home') +
                            getStatValue(r, selectedMetric, 'away')}
                        </TableCell>
                        {/* Рез. - всегда счет ИТ1:ИТ2 (хозяева:гости) */}
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1">
                            <ResultPill res={r.result} />
                            <span className="font-semibold text-xs">
                              {r.gf}:{r.ga}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1">
                            <MiniStatsPopover stats={r.stats} />
                            <Link
                              href={generateMatchUrl({
                                homeTeamName: r.homeName,
                                awayTeamName: r.awayName,
                                date: r.date,
                                homeTeamId: r.homeTeamId,
                                awayTeamId: r.awayTeamId,
                                fixtureId: r.fixtureId,
                                matchId: r.matchId,
                              })}
                              className="p-1 hover:bg-muted rounded inline-block"
                            >
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  function SelectedSummary(): JSX.Element {
    const pick = (side: TeamSide, rows: MatchRow[]) =>
      rows.filter((r) => selectedIds[side].has(r.id))
    const sh = pick('home', homeRows)
    const sa = pick('away', awayRows)

    const agg = (rows: MatchRow[]) => {
      const gf = rows.reduce((s, r) => s + r.gf, 0)
      const ga = rows.reduce((s, r) => s + r.ga, 0)
      const t = rows.reduce((s, r) => s + r.total, 0)
      return { gf, ga, t, n: rows.length }
    }

    const ah = agg(sh)
    const aa = agg(sa)

    return (
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <TableIcon className="h-4 w-4" />
          Итоги по выбранным матчам
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{home.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ИТ (сумма):</span>
                <span className="font-semibold">{ah.gf}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ИТ Кон (сумма):</span>
                <span className="font-semibold">{ah.ga}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Т (сумма):</span>
                <span className="font-semibold">{ah.t}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground">Выбрано матчей:</span>
                <span className="font-semibold">{ah.n}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{away.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ИТ (сумма):</span>
                <span className="font-semibold">{aa.gf}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ИТ Кон (сумма):</span>
                <span className="font-semibold">{aa.ga}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Т (сумма):</span>
                <span className="font-semibold">{aa.t}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground">Выбрано матчей:</span>
                <span className="font-semibold">{aa.n}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  function ChartsSection(): JSX.Element {
    const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar')

    const pick = (side: TeamSide, rows: MatchRow[]) =>
      rows.filter((r) => selectedIds[side].has(r.id))
    const sh = pick('home', homeRows)
    const sa = pick('away', awayRows)

    // Подготовка данных для графика по матчам (по каждому матчу отдельно)
    const matchChartData = useMemo(() => {
      const data: Array<{
        matchIndex: string
        [key: string]: string | number
      }> = []

      // Сортируем матчи по дате (от новых к старым)
      const sortedHome = [...sh].sort((a, b) => {
        const aDate = new Date(a.date).getTime()
        const bDate = new Date(b.date).getTime()
        return bDate - aDate
      })

      sortedHome.forEach((match, idx) => {
        const homeValue = getStatValue(match, selectedMetric, 'home')
        const awayValue = getStatValue(match, selectedMetric, 'away')

        data.push({
          matchIndex: `М${idx + 1}`,
          [home.name]: homeValue,
          [away.name]: awayValue,
        })
      })

      return data
    }, [sh, selectedMetric, home.name, away.name]) // eslint-disable-line react-hooks/exhaustive-deps

    // Расчёт средних значений и добавление их в данные
    const chartDataWithAverages = useMemo(() => {
      if (matchChartData.length === 0) {
        return { data: [], homeAvg: 0, awayAvg: 0 }
      }

      const homeSum = matchChartData.reduce((sum, item) => sum + (item[home.name] as number), 0)
      const awaySum = matchChartData.reduce((sum, item) => sum + (item[away.name] as number), 0)

      const homeAvg = homeSum / matchChartData.length
      const awayAvg = awaySum / matchChartData.length

      // Добавляем средние значения в каждую точку данных
      const dataWithAvg = matchChartData.map((item) => ({
        ...item,
        [`${home.name} (ср)`]: homeAvg,
        [`${away.name} (ср)`]: awayAvg,
      }))

      return { data: dataWithAvg, homeAvg, awayAvg }
    }, [matchChartData])

    // Подготовка данных для круговой диаграммы (общие тоталы)
    const pieChartData = useMemo(() => {
      const homeTotal = sh.reduce((sum, r) => sum + r.total, 0)
      const awayTotal = sa.reduce((sum, r) => sum + r.total, 0)

      return [
        {
          name: `${home.name} (Т)`,
          value: homeTotal,
          fill: '#3b82f6',
        },
        {
          name: `${away.name} (Т)`,
          value: awayTotal,
          fill: '#ef4444',
        },
      ]
    }, [sh, sa])

    const COLORS = ['#3b82f6', '#ef4444']

    return (
      <Card className="rounded-lg shadow-sm mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {chartType === 'pie' ? 'Общие тоталы' : 'Сравнение по матчам'}
            </CardTitle>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setChartType('bar')}
                      className={`p-2 rounded-md transition-colors ${
                        chartType === 'bar'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <BarChart4 className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Столбчатая диаграмма (по матчам)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setChartType('line')}
                      className={`p-2 rounded-md transition-colors ${
                        chartType === 'line'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <LineChartIcon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Линейная диаграмма (по матчам)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setChartType('pie')}
                      className={`p-2 rounded-md transition-colors ${
                        chartType === 'pie'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <PieChartIcon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Круговая диаграмма (общие тоталы)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {chartType === 'pie' ? (
            pieChartData[0].value === 0 && pieChartData[1].value === 0
          ) : matchChartData.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Нет данных для отображения графика
            </div>
          ) : (
            <div className="w-full h-80">
              {chartType === 'bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={matchChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="matchIndex" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey={home.name} fill="#3b82f6" />
                    <Bar dataKey={away.name} fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {chartType === 'line' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataWithAverages.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="matchIndex" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line
                      type="monotone"
                      dataKey={home.name}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey={away.name}
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey={`${home.name} (ср)`}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={`${away.name} (ср)`}
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {chartType === 'pie' && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        Анализ матчей — сравнительная статистика команд
      </div>

      {error && (
        <div className="inline-flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Загрузка…</div>
      ) : (
        <>
          {/* Фильтр: Все матчи / Личные матчи */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setMatchFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                matchFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Все матчи
            </button>
            <button
              onClick={() => setMatchFilter('head-to-head')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                matchFilter === 'head-to-head'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Личные матчи
            </button>
          </div>

          {/* Фильтр: Хозяева / Гости / Все */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setVenueFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                venueFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Все матчи
            </button>
            <button
              onClick={() => setVenueFilter('home')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                venueFilter === 'home'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Дома
            </button>
            <button
              onClick={() => setVenueFilter('away')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                venueFilter === 'away'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              В гостях
            </button>
          </div>

          {/* Селектор количества матчей и вкладки для выбора метрики */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {STAT_METRICS.map((metric) => (
                <button
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    selectedMetric === metric.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {[10, 20, 30].map((value) => (
                <button
                  key={value}
                  onClick={() => setLimit(value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    limit === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Сводная статистика команд */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AggBlock title={home.name} agg={aggHome} />
            <AggBlock title={away.name} agg={aggAway} />
          </div>

          {/* 2. Таблицы последних матчей */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MatchTable
              side="home"
              title={`Последние матчи — ${home.name}`}
              rows={filteredHomeRows}
            />
            <MatchTable
              side="away"
              title={`Последние матчи — ${away.name}`}
              rows={filteredAwayRows}
            />
          </div>

          {/* 3. Итоги по выбранным матчам */}
          <SelectedSummary />

          {/* 4. Графики сравнения */}
          <ChartsSection />
        </>
      )}
    </div>
  )
}
