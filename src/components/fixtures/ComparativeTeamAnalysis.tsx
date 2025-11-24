'use client'

import React, { JSX, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle } from 'lucide-react'

import BettingFrequencyMatrix from '@/components/fixtures/BettingFrequencyMatrix'
import { MatchTable, MatchRow, TeamSide, StatMetric } from '@/components/fixtures/MatchTable'

type TeamInfo = {
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
  shotsInsideBox?: { home: number; away: number }
  shotsOutsideBox?: { home: number; away: number }
  hitWoodwork?: { home: number; away: number }
  bigChances?: { home: number; away: number }
  freeKicks?: { home: number; away: number }
  longPasses?: { home: number; away: number }
  finalThirdPasses?: { home: number; away: number }
  crosses?: { home: number; away: number }
  xa?: { home: number; away: number }
  throwIns?: { home: number; away: number }
  tackles?: { home: number; away: number }
  duelsWon?: { home: number; away: number }
  clearances?: { home: number; away: number }
  interceptions?: { home: number; away: number }
  errorsLeadingToShot?: { home: number; away: number }
  errorsLeadingToGoal?: { home: number; away: number }
  xgotAfterShotsOnTarget?: { home: number; away: number }
  goalsPrevented?: { home: number; away: number }
  [key: string]: unknown
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
  { key: 'possession', label: 'Владение' },
  { key: 'attacks', label: 'Атаки' },
  { key: 'dangerousAttacks', label: 'Опасные атаки' },
]

async function fetchTeamLastMatches(
  teamId: number,
  limit = 10,
  opponentTeamId?: number,
  venueFilter: 'all' | 'home' | 'away' = 'all',
): Promise<unknown[]> {
  try {
    const query = new URLSearchParams({
      teamId: String(teamId),
      limit: String(limit),
      venueFilter,
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
      gf: homeScore,
      ga: awayScore,
      total: homeScore + awayScore,
      result,
      stats: (match.stats as MatchStatsData | undefined) ?? undefined,
    }
  })
}

function getStatValue(row: MatchRow, metric: StatMetric, side: TeamSide): number {
  if (metric === 'goals') {
    return side === 'home' ? row.gf : row.ga
  }

  if (!row.stats) return 0
  const stats = row.stats as MatchStatsData
  const stat = stats[metric]
  if (!stat || typeof stat !== 'object' || !('home' in stat) || !('away' in stat)) return 0
  const v = stat as { home: number; away: number }
  return side === 'home' ? v.home : v.away
}

function aggregateByMetric(rows: MatchRow[], metric: StatMetric): AggregateStats {
  const n = rows.length || 1
  const wins = rows.filter(
    (r) => getStatValue(r, metric, 'home') > getStatValue(r, metric, 'away'),
  ).length
  const draws = rows.filter(
    (r) => getStatValue(r, metric, 'home') === getStatValue(r, metric, 'away'),
  ).length
  const losses = rows.filter(
    (r) => getStatValue(r, metric, 'home') < getStatValue(r, metric, 'away'),
  ).length
  const gfArr = rows.map((r) => r.gf)
  const gaArr = rows.map((r) => r.ga)
  const statArr = rows.map((r) => getStatValue(r, metric, 'home'))
  const statConArr = rows.map((r) => getStatValue(r, metric, 'away'))
  const totals = rows.map((r) => getStatValue(r, metric, 'home') + getStatValue(r, metric, 'away'))

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

type MatchFilter = 'all' | 'head-to-head'
type VenueFilter = 'all' | 'home' | 'away'

function AggBlock({
  title,
  agg,
  selectedMetric,
}: {
  title: string
  agg: AggregateStats
  selectedMetric: StatMetric
}): JSX.Element {
  const formatValue = (val: number): string => {
    if (Number.isInteger(val)) return String(val)
    return val.toFixed(2).replace(/\.0+$/, '')
  }

  const metricLabel =
    STAT_METRICS.find((m) => m.key === selectedMetric)?.label.toLowerCase() || 'метрики'

  const column1 = [
    {
      label: 'Победы',
      value: agg.wins,
      tooltip: `Количество матчей, где команда имела больше ${metricLabel}, чем соперник`,
    },
    {
      label: 'Ничьи',
      value: agg.draws,
      tooltip: `Количество матчей, где команда имела равное количество ${metricLabel} с соперником`,
    },
    {
      label: 'Поражения',
      value: agg.losses,
      tooltip: `Количество матчей, где команда имела меньше ${metricLabel}, чем соперник`,
    },
  ]

  const column2 = [
    {
      label: 'СР ИТ',
      value: formatValue(agg.avgStat),
      tooltip: `Среднее значение ${metricLabel} за команду`,
    },
    {
      label: 'СР ИТ СОП',
      value: formatValue(agg.avgStatCon),
      tooltip: `Среднее значение ${metricLabel} соперника`,
    },
    {
      label: 'СР Т',
      value: formatValue(agg.avgT),
      tooltip: `Среднее значение ${metricLabel} в матче`,
    },
  ]

  const getResultColor = (wins: number, draws: number, losses: number): string => {
    if (wins > draws && wins > losses) return 'text-green-600 font-bold'
    if (losses > wins && losses > draws) return 'text-red-600 font-bold'
    return 'text-yellow-600 font-bold'
  }

  const renderStat = (
    stat: { label: string; value: string | number; tooltip: string },
    aggStats: AggregateStats,
  ) => {
    let colorClass = ''
    if (stat.label === 'Победы' || stat.label === 'Ничьи' || stat.label === 'Поражения') {
      colorClass = getResultColor(aggStats.wins, aggStats.draws, aggStats.losses)
    }

    return (
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
        <span className={`text-xs font-semibold text-right ${colorClass}`}>{stat.value}</span>
      </div>
    )
  }

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            {column1.map((stat) => (
              <div key={stat.label}>{renderStat(stat, agg)}</div>
            ))}
          </div>
          <div className="space-y-3">
            {column2.map((stat) => (
              <div key={stat.label}>{renderStat(stat, agg)}</div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function buildFormLevels(form: Array<'W' | 'D' | 'L'>): number[] {
  const levels: number[] = []
  let current = 0

  for (const res of form) {
    if (res === 'W') current += 1
    else if (res === 'L') current -= 1

    levels.push(current)
  }

  return levels
}

function FormIndicator({
  form,
  title,
  compact,
}: {
  form: Array<'W' | 'D' | 'L'>
  title: string
  compact?: boolean
}): JSX.Element {
  const getFormStyles = (res: 'W' | 'D' | 'L'): string => {
    switch (res) {
      case 'W':
        return 'bg-green-500'
      case 'D':
        return 'bg-yellow-500'
      case 'L':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getFormLabel = (res: 'W' | 'D' | 'L'): string => {
    switch (res) {
      case 'W':
        return 'В'
      case 'D':
        return 'Н'
      case 'L':
        return 'П'
      default:
        return ''
    }
  }

  const levels = compact ? buildFormLevels(form) : []

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className={`flex ${compact ? 'gap-[1px]' : 'gap-1'}`}>
        {form.map((res, idx) => {
          const level = levels[idx] ?? 0
          const offsetY = compact ? -level * 4 : 0

          return (
            <div
              key={`${title}-${idx}`}
              className={`w-6 h-6 flex items-center justify-center text-[10px] font-semibold text-white ${
                compact ? 'rounded-none' : 'rounded-sm'
              } ${getFormStyles(res)}`}
              style={compact ? { transform: `translateY(${offsetY}px)` } : undefined}
            >
              {getFormLabel(res)}
            </div>
          )
        })}
        <div
          className={`w-6 h-6 flex items-center justify-center text-[10px] font-semibold text-white ${
            compact ? 'rounded-none' : 'rounded-sm'
          } bg-gray-400 animate-bounce`}
          style={
            compact && levels.length > 0
              ? { transform: `translateY(${-levels[levels.length - 1] * 4}px)` }
              : undefined
          }
        >
          ?
        </div>
      </div>
    </div>
  )
}

const computeForm = (rows: MatchRow[]): Array<'W' | 'D' | 'L'> => {
  const sorted = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return sorted.map((r) => r.result)
}

export default function ComparativeTeamAnalysis({
  home,
  away,
  limit: initialLimit = 10,
}: ComparativeTeamAnalysisProps): JSX.Element {
  const [homeRows, setHomeRows] = useState<MatchRow[]>([])
  const [awayRows, setAwayRows] = useState<MatchRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Record<'home' | 'away', Set<string>>>(() => ({
    home: new Set(),
    away: new Set(),
  }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<StatMetric>('goals')
  const [limit, setLimit] = useState(initialLimit)
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [venueFilter, setVenueFilter] = useState<Record<'home' | 'away', VenueFilter>>({
    home: 'all',
    away: 'all',
  })

  useEffect(() => {
    let aborted = false

    async function load(): Promise<void> {
      setLoading(true)
      setError(null)
      try {
        const [hRaw, aRaw] = await Promise.all([
          fetchTeamLastMatches(
            home.id,
            limit,
            matchFilter === 'head-to-head' ? away.id : undefined,
            matchFilter === 'head-to-head' ? 'all' : venueFilter.home,
          ),
          fetchTeamLastMatches(
            away.id,
            limit,
            matchFilter === 'head-to-head' ? home.id : undefined,
            matchFilter === 'head-to-head' ? 'all' : venueFilter.away,
          ),
        ])

        if (aborted) return

        const normalizedHome = normalizeRows(hRaw)
        const normalizedAway = normalizeRows(aRaw)
        setHomeRows(normalizedHome)
        setAwayRows(normalizedAway)
        setSelectedIds({
          home: new Set(normalizedHome.map((r) => r.id)),
          away: new Set(normalizedAway.map((r) => r.id)),
        })
      } catch (e: unknown) {
        const err = e as { message?: string }
        if (!aborted) setError(err?.message || 'Не удалось загрузить данные')
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    void load()

    return () => {
      aborted = true
    }
  }, [home.id, away.id, limit, matchFilter, venueFilter.home, venueFilter.away])

  const filteredHomeRows = useMemo(() => homeRows, [homeRows])
  const filteredAwayRows = useMemo(() => awayRows, [awayRows])

  useEffect(() => {
    setSelectedIds({
      home: new Set(filteredHomeRows.map((r) => r.id)),
      away: new Set(filteredAwayRows.map((r) => r.id)),
    })
  }, [matchFilter, filteredHomeRows, filteredAwayRows])

  const selectedHomeRows = useMemo(
    () => filteredHomeRows.filter((r) => selectedIds.home.has(r.id)),
    [filteredHomeRows, selectedIds.home],
  )
  const selectedAwayRows = useMemo(
    () => filteredAwayRows.filter((r) => selectedIds.away.has(r.id)),
    [filteredAwayRows, selectedIds.away],
  )

  const aggHome = useMemo(
    () => aggregateByMetric(selectedHomeRows, selectedMetric),
    [selectedHomeRows, selectedMetric],
  )
  const aggAway = useMemo(
    () => aggregateByMetric(selectedAwayRows, selectedMetric),
    [selectedAwayRows, selectedMetric],
  )

  const toggle = (side: TeamSide, id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev[side])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, [side]: next }
    })
  }

  const toggleAll = (side: TeamSide, rows: MatchRow[]): void => {
    setSelectedIds((prev) => {
      const allIds = new Set(rows.map((r) => r.id))
      const current = prev[side]
      const isAllSelected = rows.every((r) => current.has(r.id))
      if (isAllSelected) {
        return { ...prev, [side]: new Set() }
      }
      return { ...prev, [side]: allIds }
    })
  }

  const homeForm = useMemo(() => computeForm(filteredHomeRows), [filteredHomeRows])
  const awayForm = useMemo(() => computeForm(filteredAwayRows), [filteredAwayRows])

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <h2>Сравнительный анализ</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
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
                type="button"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground min-w-[60px]">{home.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setVenueFilter((prev) => ({
                      ...prev,
                      home: 'all',
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    venueFilter.home === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Все матчи
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setVenueFilter((prev) => ({
                      ...prev,
                      home: 'home',
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    venueFilter.home === 'home'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Дома
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setVenueFilter((prev) => ({
                      ...prev,
                      home: 'away',
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    venueFilter.home === 'away'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  В гостях
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground min-w-[60px]">{away.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setVenueFilter((prev) => ({
                      ...prev,
                      away: 'all',
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    venueFilter.away === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Все матчи
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setVenueFilter((prev) => ({
                      ...prev,
                      away: 'home',
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    venueFilter.away === 'home'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Дома
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setVenueFilter((prev) => ({
                      ...prev,
                      away: 'away',
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    venueFilter.away === 'away'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  В гостях
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {STAT_METRICS.map((metric) => (
                  <button
                    key={metric.key}
                    type="button"
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
                {[10, 20, 30, 40, 50].map((value) => (
                  <button
                    key={value}
                    type="button"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-lg shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">{home.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormIndicator title="Форма" form={homeForm} compact={limit >= 30} />
                </CardContent>
              </Card>
              <Card className="rounded-lg shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">{away.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormIndicator title="Форма" form={awayForm} compact={limit >= 30} />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AggBlock title={home.name} agg={aggHome} selectedMetric={selectedMetric} />
              <AggBlock title={away.name} agg={aggAway} selectedMetric={selectedMetric} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MatchTable
                side="home"
                teamId={home.id}
                title={`Последние матчи — ${home.name}`}
                rows={filteredHomeRows}
                selectedMetric={selectedMetric}
                selectedIds={selectedIds}
                onToggle={toggle}
                onToggleAll={toggleAll}
              />
              <MatchTable
                side="away"
                teamId={away.id}
                title={`Последние матчи — ${away.name}`}
                rows={filteredAwayRows}
                selectedMetric={selectedMetric}
                selectedIds={selectedIds}
                onToggle={toggle}
                onToggleAll={toggleAll}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BettingFrequencyMatrix
                teamId={home.id}
                rows={filteredHomeRows}
                limit={limit}
                selectedMetric={selectedMetric}
                title={`Частоты ставок — ${home.name}`}
              />
              <BettingFrequencyMatrix
                teamId={away.id}
                rows={filteredAwayRows}
                limit={limit}
                selectedMetric={selectedMetric}
                title={`Частоты ставок — ${away.name}`}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
