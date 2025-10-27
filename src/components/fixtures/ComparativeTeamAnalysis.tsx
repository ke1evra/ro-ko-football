'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
import { AlertCircle, Info, Table as TableIcon, BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { generateMatchUrl } from '@/lib/match-url-utils'

type TeamSide = 'home' | 'away'

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
}

async function fetchTeamLastMatches(teamId: number, limit = 10): Promise<unknown[]> {
  try {
    const query = new URLSearchParams({
      teamId: String(teamId),
      limit: String(limit),
    })
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
    const gf = (match.gf as number) ?? 0
    const ga = (match.ga as number) ?? 0
    const homeScore = (match.homeScore as number) ?? 0
    const awayScore = (match.awayScore as number) ?? 0
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
      gf,
      ga,
      total: gf + ga,
      result,
      stats: match.stats,
    }
  })
}

function aggregate(rows: MatchRow[]): AggregateStats {
  const n = rows.length || 1
  const wins = rows.filter((r) => r.result === 'W').length
  const draws = rows.filter((r) => r.result === 'D').length
  const losses = rows.filter((r) => r.result === 'L').length
  const gfArr = rows.map((r) => r.gf)
  const gaArr = rows.map((r) => r.ga)
  const totals = rows.map((r) => r.total)

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

export default function ComparativeTeamAnalysis({
  home,
  away,
  limit = 10,
}: ComparativeTeamAnalysisProps) {
  const [homeRows, setHomeRows] = useState<MatchRow[]>([])
  const [awayRows, setAwayRows] = useState<MatchRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Record<'home' | 'away', Set<string>>>({
    home: new Set(),
    away: new Set(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aborted = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        console.log('[ComparativeTeamAnalysis] Загрузка матчей для:', {
          home: home.id,
          away: away.id,
        })
        const [hRaw, aRaw] = await Promise.all([
          fetchTeamLastMatches(home.id, limit),
          fetchTeamLastMatches(away.id, limit),
        ])
        console.log('[ComparativeTeamAnalysis] Получены матчи:', {
          homeCount: hRaw.length,
          awayCount: aRaw.length,
        })
        console.log('[ComparativeTeamAnalysis] Матчи home:', JSON.stringify(hRaw, null, 2))
        console.log('[ComparativeTeamAnalysis] Матчи away:', JSON.stringify(aRaw, null, 2))
        if (aborted) return
        setHomeRows(normalizeRows(hRaw))
        setAwayRows(normalizeRows(aRaw))
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
  }, [home.id, home.name, away.id, away.name, limit])

  const aggHome = useMemo(() => aggregate(homeRows), [homeRows])
  const aggAway = useMemo(() => aggregate(awayRows), [awayRows])

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

    const diffColor = agg.avgDiff > 0 ? 'text-green-600' : agg.avgDiff < 0 ? 'text-red-600' : ''
    const diffSign = agg.avgDiff > 0 ? '+' : ''

    return (
      <Card className="rounded-lg shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                    В {agg.wins}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Количество побед</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                    Н {agg.draws}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Количество ничьих</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-200">П {agg.losses}</Badge>
                </TooltipTrigger>
                <TooltipContent>Количество поражений</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className={diffColor}>
                    {diffSign}
                    {formatValue(agg.avgDiff)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Средняя разница забитых и пропущенных голов</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {/* Группа A: Макс/Мин ИТ */}
            <div className="flex items-center justify-between min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate cursor-help">
                      Макс ИТ
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Максимум забитых голов в одном матче</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-sm font-semibold tabular-nums text-right ml-2">
                {formatValue(agg.maxIT)}
              </span>
            </div>
            <div className="flex items-center justify-between min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate cursor-help">
                      Мин ИТ
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Минимум забитых голов в одном матче</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-sm font-semibold tabular-nums text-right ml-2">
                {formatValue(agg.minIT)}
              </span>
            </div>

            {/* Группа B: Макс/Мин ИТ Кон */}
            <div className="flex items-center justify-between min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate cursor-help">
                      Макс ИТ Кон
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Максимум пропущенных голов в одном матче</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-sm font-semibold tabular-nums text-right ml-2">
                {formatValue(agg.maxITCon)}
              </span>
            </div>
            <div className="flex items-center justify-between min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate cursor-help">
                      Мин ИТ Кон
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Минимум пропущенных голов в одном матче</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-sm font-semibold tabular-nums text-right ml-2">
                {formatValue(agg.minITCon)}
              </span>
            </div>

            {/* Группа C: Ср ИТ / Ср ИТ Кон */}
            <div className="flex items-center justify-between min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate cursor-help">
                      Ср ИТ
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Среднее количество забитых голов за матч</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-sm font-semibold tabular-nums text-right ml-2">
                {formatValue(agg.avgIT)}
              </span>
            </div>
            <div className="flex items-center justify-between min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate cursor-help">
                      Ср ИТ Кон
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Среднее количество пропущенных голов за матч</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-sm font-semibold tabular-nums text-right ml-2">
                {formatValue(agg.avgITCon)}
              </span>
            </div>

            {/* Группа D: Ср Т (растянуть на 2 колонки) */}
            <div className="col-span-1 md:col-span-2 flex items-center justify-between min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate cursor-help">Ср Т</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Средний тотал голов (забитых + пропущенных) за матч
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-sm font-semibold tabular-nums text-right ml-2">
                {formatValue(agg.avgT)}
              </span>
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
                      checked={rows.length > 0 && rows.every((r) => selectedIds[side].has(r.id))}
                      onChange={() => toggleAll(side, rows)}
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
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                      Нет данных
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
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
                        <TableCell className="truncate text-xs">{r.homeName}</TableCell>
                        <TableCell className="text-center font-semibold text-xs">
                          {r.homeScore}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs">
                          {r.awayScore}
                        </TableCell>
                        <TableCell className="truncate text-xs">{r.awayName}</TableCell>
                        <TableCell className="text-center font-semibold text-xs">
                          {r.total}
                        </TableCell>
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
          {/* 1. Сводная статистика команд */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AggBlock title={home.name} agg={aggHome} />
            <AggBlock title={away.name} agg={aggAway} />
          </div>

          {/* 2. Таблицы последних матчей */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MatchTable side="home" title={`Последние матчи — ${home.name}`} rows={homeRows} />
            <MatchTable side="away" title={`Последние матчи — ${away.name}`} rows={awayRows} />
          </div>

          {/* 3. Итоги по выбранным матчам */}
          <SelectedSummary />
        </>
      )}
    </div>
  )
}
