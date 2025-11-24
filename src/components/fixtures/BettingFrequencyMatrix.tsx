'use client'

import * as React from 'react'
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

export interface BasicMatchRow {
  id: string
  date: string
  homeTeamId: number
  awayTeamId: number
  gf: number // голы хозяев
  ga: number // голы гостей
  stats?: any
}

interface BettingFrequencyMatrixProps {
  teamId: number
  rows: BasicMatchRow[]
  limit?: number
  title?: string
  selectedMetric?: StatMetric
}

function getStatValue(row: BasicMatchRow, metric: StatMetric, side: 'home' | 'away'): number {
  // Специальная обработка для голов
  if (metric === 'goals') {
    return side === 'home' ? row.gf : row.ga
  }

  if (!row.stats) return 0
  const stat = row.stats[metric as keyof typeof row.stats]
  if (!stat || typeof stat !== 'object' || !('home' in stat) || !('away' in stat)) return 0
  return side === 'home' ? (stat.home as number) : (stat.away as number)
}

interface CountCell {
  line: number
  hits: number
  total: number
}

function ratioColor(hits: number, total: number): string {
  if (!total) return ''
  const pct = hits / total
  return pct >= 0.5 ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
}

function RatioDisplay({ hits, total }: { hits: number; total: number }) {
  return (
    <span>
      <span className="font-semibold">{hits}</span>
      <span className="text-[10px] opacity-70">/</span>
      <span className="text-[10px] opacity-70">{total}</span>
    </span>
  )
}

function formatXN(hits: number, total: number): string {
  return `${hits}/${total}`
}

function byDateDesc(a: BasicMatchRow, b: BasicMatchRow): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime()
}

export default function BettingFrequencyMatrix({
  teamId,
  rows,
  limit = 20,
  title = 'Частоты ставок',
  selectedMetric = 'goals',
}: BettingFrequencyMatrixProps) {
  const recent = React.useMemo(() => {
    const sorted = [...rows].sort(byDateDesc)
    return sorted.slice(0, Math.min(limit, sorted.length))
  }, [rows, limit])

  const totalMatches = recent.length

  const computeTeamValues = React.useCallback(
    (r: BasicMatchRow) => {
      const isHome = r.homeTeamId === teamId
      const teamValue = getStatValue(r, selectedMetric, isHome ? 'home' : 'away')
      const oppValue = getStatValue(r, selectedMetric, isHome ? 'away' : 'home')
      return { teamValue, oppValue }
    },
    [teamId, selectedMetric],
  )

  // Верхние агрегаты
  const topAggregates = React.useMemo(() => {
    let wins = 0
    let draws = 0
    let losses = 0
    let btts = 0 // обе забили
    let teamScored = 0 // команда забивала >= 1
    let opponentScored = 0 // соперник забивал >= 1

    for (const r of recent) {
      const { teamValue, oppValue } = computeTeamValues(r)
      if (teamValue > oppValue) wins += 1
      else if (teamValue === oppValue) draws += 1
      else losses += 1

      if (teamValue > 0 && oppValue > 0) btts += 1
      if (teamValue > 0) teamScored += 1
      if (oppValue > 0) opponentScored += 1
    }

    return { wins, draws, losses, btts, teamScored, opponentScored, total: totalMatches }
  }, [recent, computeTeamValues, totalMatches])

  // Линии тоталов (общих и индивидуальных)
  // Динамический расчёт диапазона линий с шагом 0.5 на основе наблюдаемых максимумов
  const { LINES, HANDICAP_LINES } = React.useMemo(() => {
    let maxTeam = 0
    let maxOpp = 0
    let maxTotal = 0
    let maxAbsDiff = 0

    for (const r of recent) {
      const { teamValue, oppValue } = computeTeamValues(r)
      const total = teamValue + oppValue
      const diff = teamValue - oppValue

      maxTeam = Math.max(maxTeam, teamValue)
      maxOpp = Math.max(maxOpp, oppValue)
      maxTotal = Math.max(maxTotal, total)
      maxAbsDiff = Math.max(maxAbsDiff, Math.abs(diff))
    }

    // Ограничители на случай пустых данных
    const maxTotalCeil = Math.max(1, Math.ceil(maxTotal))
    const maxTeamCeil = Math.max(1, Math.ceil(maxTeam))
    const maxOppCeil = Math.max(1, Math.ceil(maxOpp))
    const maxHcp = Math.max(1, Math.ceil(maxAbsDiff))

    const totalsMax = maxTotalCeil + 2
    const itMax = Math.max(maxTeamCeil, maxOppCeil) + 2
    const hcpMax = maxHcp + 2

    const buildHalfRange = (max: number) => {
      const arr: number[] = []
      // начинаем с 0.5, 1.5, ... пока не достигнем max
      for (let v = 0.5; v <= max; v += 1) arr.push(parseFloat(v.toFixed(1)))
      return arr
    }

    const buildHandicapRange = (max: number) => {
      const arr: number[] = []
      // симметричный диапазон от -max-0.5 до +max+0.5 с шагом 1.0
      for (let v = -max - 0.5; v <= max + 0.5; v += 1) arr.push(parseFloat(v.toFixed(1)))
      return arr
    }

    const LINES = buildHalfRange(Math.max(totalsMax, itMax))
    const HANDICAP_LINES = buildHandicapRange(hcpMax)

    return { LINES, HANDICAP_LINES }
  }, [recent, computeTeamValues])

  const totalsOver: CountCell[] = []
  const totalsUnder: CountCell[] = []
  const itOver: CountCell[] = []
  const itUnder: CountCell[] = []
  const it2Over: CountCell[] = []
  const it2Under: CountCell[] = []
  const hcpTeam: CountCell[] = []
  const hcpOpp: CountCell[] = []

  for (const line of LINES) {
    let tb = 0
    let tm = 0
    let itb = 0
    let itm = 0
    let it2b = 0
    let it2m = 0

    for (const r of recent) {
      const { teamValue, oppValue } = computeTeamValues(r)
      const total = teamValue + oppValue
      if (total > line) tb += 1
      if (total < line) tm += 1
      if (teamValue > line) itb += 1
      if (teamValue < line) itm += 1
      if (oppValue > line) it2b += 1
      if (oppValue < line) it2m += 1
    }

    totalsOver.push({ line, hits: tb, total: totalMatches })
    totalsUnder.push({ line, hits: tm, total: totalMatches })
    itOver.push({ line, hits: itb, total: totalMatches })
    itUnder.push({ line, hits: itm, total: totalMatches })
    it2Over.push({ line, hits: it2b, total: totalMatches })
    it2Under.push({ line, hits: it2m, total: totalMatches })
  }

  for (const h of HANDICAP_LINES) {
    let hitsTeam = 0
    let hitsOpp = 0
    for (const r of recent) {
      const { teamValue, oppValue } = computeTeamValues(r)
      const diff = teamValue - oppValue
      // Условие прохода форы: diff - handicap > 0
      if (diff - h > 0) hitsTeam += 1
      // Для соперника зеркально: (oppValue - teamValue) - h > 0
      const diffOpp = oppValue - teamValue
      if (diffOpp - h > 0) hitsOpp += 1
    }
    hcpTeam.push({ line: h, hits: hitsTeam, total: totalMatches })
    hcpOpp.push({ line: h, hits: hitsOpp, total: totalMatches })
  }

  // Предикат «дегенеративности» парных колонок: скрываем строки где хотя бы одна колонка 0 или total
  const isDegeneratePair = (a: CountCell, b: CountCell) => {
    if (a.total === 0 || b.total === 0) return true
    // Скрываем если обе колонки нулевые
    if (a.hits === 0 && b.hits === 0) return true
    // Скрываем если хотя бы одна колонка имеет 0 или total (дегенеративное значение)
    const aIsDegenerate = a.hits === 0 || a.hits === a.total
    const bIsDegenerate = b.hits === 0 || b.hits === b.total
    return aIsDegenerate && bIsDegenerate
  }

  // Поиск последнего значащего индекса для обрезки хвоста
  const lastSignificantIndex = (lines: number[], arrA: CountCell[], arrB: CountCell[]) => {
    let last = -1
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      const a = arrA.find((c) => c.line === line)!
      const b = arrB.find((c) => c.line === line)!
      if (!isDegeneratePair(a, b)) last = i
    }
    return last
  }

  const lastTotalsIdx = lastSignificantIndex(LINES, totalsOver, totalsUnder)
  const lastItIdx = lastSignificantIndex(LINES, itOver, itUnder)
  const lastIt2Idx = lastSignificantIndex(LINES, it2Over, it2Under)
  const lastHcpIdx = lastSignificantIndex(HANDICAP_LINES, hcpTeam, hcpOpp)

  const renderTotalsLines = lastTotalsIdx >= 0 ? LINES.slice(0, lastTotalsIdx + 1) : []
  const renderItLines = lastItIdx >= 0 ? LINES.slice(0, lastItIdx + 1) : []
  const renderIt2Lines = lastIt2Idx >= 0 ? LINES.slice(0, lastIt2Idx + 1) : []
  const renderHcpLines = lastHcpIdx >= 0 ? HANDICAP_LINES.slice(0, lastHcpIdx + 1) : []

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {/* Верхние агрегаты */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <AggTile
            label="Победы"
            value={formatXN(topAggregates.wins, topAggregates.total)}
            variant="success"
          />
          <AggTile
            label="Ничьи"
            value={formatXN(topAggregates.draws, topAggregates.total)}
            variant="warning"
          />
          <AggTile
            label="Поражения"
            value={formatXN(topAggregates.losses, topAggregates.total)}
            variant="danger"
          />
          <AggTile
            label="Обе забили"
            value={formatXN(topAggregates.btts, topAggregates.total)}
            variant="info"
          />
          <AggTile
            label="Команда забивала"
            value={formatXN(topAggregates.teamScored, topAggregates.total)}
            variant="primary"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <AggTile label="Первый гол (н/д)" value="—" muted variant="muted" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Недоступно: нет данных событий по минутам</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Матрица частот — 4 блока в одной строке */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* ТБ / ТМ */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 h-8">
                  <TableHead className="w-12 px-1 py-1 text-xs text-muted-foreground"></TableHead>
                  <TableHead className="px-1 py-1 text-xs text-muted-foreground">ТБ</TableHead>
                  <TableHead className="px-1 py-1 text-xs text-muted-foreground">ТМ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTotalsLines
                  .filter((line) => {
                    const tb = totalsOver.find((c) => c.line === line)!
                    const tm = totalsUnder.find((c) => c.line === line)!
                    return !isDegeneratePair(tb, tm)
                  })
                  .map((line) => {
                    const tb = totalsOver.find((c) => c.line === line)!
                    const tm = totalsUnder.find((c) => c.line === line)!
                    return (
                      <TableRow key={`tb-${line}`}>
                        <TableCell className="font-mono px-1 py-1">{line}</TableCell>
                        <TableCell
                          className={`font-semibold text-center px-1 py-1 ${ratioColor(tb.hits, tb.total)}`}
                        >
                          <RatioDisplay hits={tb.hits} total={tb.total} />
                        </TableCell>
                        <TableCell
                          className={`font-semibold text-center px-1 py-1 ${ratioColor(tm.hits, tm.total)}`}
                        >
                          <RatioDisplay hits={tm.hits} total={tm.total} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>

          {/* ИТБ / ИТМ */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 h-8">
                  <TableHead className="w-12 px-1 py-1 text-xs text-muted-foreground"></TableHead>
                  <TableHead className="px-1 py-1 text-xs text-muted-foreground">ИТБ</TableHead>
                  <TableHead className="px-1 py-1 text-xs text-muted-foreground">ИТМ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderItLines
                  .filter((line) => {
                    const itb = itOver.find((c) => c.line === line)!
                    const itm = itUnder.find((c) => c.line === line)!
                    return !isDegeneratePair(itb, itm)
                  })
                  .map((line) => {
                    const itb = itOver.find((c) => c.line === line)!
                    const itm = itUnder.find((c) => c.line === line)!
                    return (
                      <TableRow key={`it-${line}`}>
                        <TableCell className="font-mono px-1 py-1">{line}</TableCell>
                        <TableCell
                          className={`font-semibold text-center px-1 py-1 ${ratioColor(itb.hits, itb.total)}`}
                        >
                          <RatioDisplay hits={itb.hits} total={itb.total} />
                        </TableCell>
                        <TableCell
                          className={`font-semibold text-center px-1 py-1 ${ratioColor(itm.hits, itm.total)}`}
                        >
                          <RatioDisplay hits={itm.hits} total={itm.total} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>

          {/* ИТ2Б / ИТ2М */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 h-8">
                  <TableHead className="w-12 px-1 py-1 text-xs text-muted-foreground"></TableHead>
                  <TableHead className="px-1 py-1 text-xs text-muted-foreground">ИТ2Б</TableHead>
                  <TableHead className="px-1 py-1 text-xs text-muted-foreground">ИТ2М</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderIt2Lines
                  .filter((line) => {
                    const it2b = it2Over.find((c) => c.line === line)!
                    const it2m = it2Under.find((c) => c.line === line)!
                    return !isDegeneratePair(it2b, it2m)
                  })
                  .map((line) => {
                    const it2b = it2Over.find((c) => c.line === line)!
                    const it2m = it2Under.find((c) => c.line === line)!
                    return (
                      <TableRow key={`it2-${line}`}>
                        <TableCell className="font-mono px-1 py-1">{line}</TableCell>
                        <TableCell
                          className={`font-semibold text-center px-1 py-1 ${ratioColor(it2b.hits, it2b.total)}`}
                        >
                          <RatioDisplay hits={it2b.hits} total={it2b.total} />
                        </TableCell>
                        <TableCell
                          className={`font-semibold text-center px-1 py-1 ${ratioColor(it2m.hits, it2m.total)}`}
                        >
                          <RatioDisplay hits={it2m.hits} total={it2m.total} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Ф1 / Ф2 */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 h-8">
                  <TableHead className="w-12 px-1 py-1 text-xs text-muted-foreground"></TableHead>
                  <TableHead className="px-1 py-1 text-xs text-muted-foreground">Ф1</TableHead>
                  <TableHead className="px-1 py-1 text-xs text-muted-foreground">Ф2</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderHcpLines
                  .filter((h) => {
                    const f = hcpTeam.find((c) => c.line === h)!
                    const f2 = hcpOpp.find((c) => c.line === h)!
                    return !isDegeneratePair(f, f2)
                  })
                  .map((h) => {
                    const f = hcpTeam.find((c) => c.line === h)!
                    const f2 = hcpOpp.find((c) => c.line === h)!
                    return (
                      <TableRow key={`hcp-${h}`}>
                        <TableCell className="font-mono px-1 py-1">{h > 0 ? `+${h}` : h}</TableCell>
                        <TableCell
                          className={`font-semibold text-center px-1 py-1 ${ratioColor(f.hits, f.total)}`}
                        >
                          <RatioDisplay hits={f.hits} total={f.total} />
                        </TableCell>
                        <TableCell
                          className={`font-semibold text-center px-1 py-1 ${ratioColor(f2.hits, f2.total)}`}
                        >
                          <RatioDisplay hits={f2.hits} total={f2.total} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AggTile({
  label,
  value,
  muted = false,
  variant = 'default',
}: {
  label: string
  value: string
  muted?: boolean
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'muted' | 'info' | 'primary'
}) {
  const wrapper = `rounded border p-2 flex flex-col justify-between ${muted ? 'opacity-70' : ''}`
  const numberPalette: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    danger: 'text-red-700',
    info: 'text-sky-700',
    primary: 'text-indigo-700',
    muted: 'text-muted-foreground',
  }
  const numberCls = numberPalette[variant] || numberPalette.default

  return (
    <div className={wrapper}>
      <div className="text-[10px] leading-3 text-muted-foreground text-center break-words">
        {label}
      </div>
      <div className={`text-sm leading-5 font-semibold font-mono text-center ${numberCls}`}>
        {value}
      </div>
    </div>
  )
}
