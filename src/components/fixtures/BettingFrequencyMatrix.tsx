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

export interface BasicMatchRow {
  id: string
  date: string
  homeTeamId: number
  awayTeamId: number
  gf: number // голы хозяев
  ga: number // голы гостей
}

interface BettingFrequencyMatrixProps {
  teamId: number
  rows: BasicMatchRow[]
  limit?: number
  title?: string
}

interface CountCell {
  line: number
  hits: number
  total: number
}

function ratioColor(hits: number, total: number): string {
  if (!total) return ''
  const pct = hits / total
  return pct >= 0.5 ? 'bg-green-50 text-green-800' : 'bg-muted text-muted-foreground'
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
}: BettingFrequencyMatrixProps) {
  const recent = React.useMemo(() => {
    const sorted = [...rows].sort(byDateDesc)
    return sorted.slice(0, Math.min(limit, sorted.length))
  }, [rows, limit])

  const totalMatches = recent.length

  const computeTeamGoals = React.useCallback(
    (r: BasicMatchRow) => {
      const isHome = r.homeTeamId === teamId
      const teamGoals = isHome ? r.gf : r.ga
      const oppGoals = isHome ? r.ga : r.gf
      return { teamGoals, oppGoals }
    },
    [teamId],
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
      const { teamGoals, oppGoals } = computeTeamGoals(r)
      if (teamGoals > oppGoals) wins += 1
      else if (teamGoals === oppGoals) draws += 1
      else losses += 1

      if (teamGoals > 0 && oppGoals > 0) btts += 1
      if (teamGoals > 0) teamScored += 1
      if (oppGoals > 0) opponentScored += 1
    }

    return { wins, draws, losses, btts, teamScored, opponentScored, total: totalMatches }
  }, [recent, computeTeamGoals, totalMatches])

  // Линии тоталов (общих и индивидуальных)
  const LINES = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]
  const HANDICAP_LINES = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]

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
      const { teamGoals, oppGoals } = computeTeamGoals(r)
      const total = teamGoals + oppGoals
      if (total > line) tb += 1
      if (total < line) tm += 1
      if (teamGoals > line) itb += 1
      if (teamGoals < line) itm += 1
      if (oppGoals > line) it2b += 1
      if (oppGoals < line) it2m += 1
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
      const { teamGoals, oppGoals } = computeTeamGoals(r)
      const diff = teamGoals - oppGoals
      // Условие прохода форы: diff - handicap > 0
      if (diff - h > 0) hitsTeam += 1
      // Для соперника зеркально: (oppGoals - teamGoals) - h > 0
      const diffOpp = oppGoals - teamGoals
      if (diffOpp - h > 0) hitsOpp += 1
    }
    hcpTeam.push({ line: h, hits: hitsTeam, total: totalMatches })
    hcpOpp.push({ line: h, hits: hitsOpp, total: totalMatches })
  }

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Верхние агрегаты */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <AggTile label="Победы" value={formatXN(topAggregates.wins, topAggregates.total)} />
          <AggTile label="Ничьи" value={formatXN(topAggregates.draws, topAggregates.total)} />
          <AggTile label="Поражения" value={formatXN(topAggregates.losses, topAggregates.total)} />
          <AggTile label="Обе забили" value={formatXN(topAggregates.btts, topAggregates.total)} />
          <AggTile
            label="Команда забивала"
            value={formatXN(topAggregates.teamScored, topAggregates.total)}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <AggTile label="Первый гол (н/д)" value="—" muted />
                </div>
              </TooltipTrigger>
              <TooltipContent>Недоступно: нет данных событий по минутам</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Матрица частот */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-16">Линия</TableHead>
                <TableHead>ТБ</TableHead>
                <TableHead>ТМ</TableHead>
                <TableHead>ИТБ</TableHead>
                <TableHead>ИТМ</TableHead>
                <TableHead>ИТ2Б</TableHead>
                <TableHead>ИТ2М</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LINES.map((line) => {
                const tb = totalsOver.find((c) => c.line === line)!
                const tm = totalsUnder.find((c) => c.line === line)!
                const itb = itOver.find((c) => c.line === line)!
                const itm = itUnder.find((c) => c.line === line)!
                const it2b = it2Over.find((c) => c.line === line)!
                const it2m = it2Under.find((c) => c.line === line)!
                return (
                  <TableRow key={`line-${line}`}>
                    <TableCell className="font-mono text-xs">{line}</TableCell>
                    <TableCell
                      className={`font-semibold text-xs text-center ${ratioColor(tb.hits, tb.total)}`}
                    >
                      {formatXN(tb.hits, tb.total)}
                    </TableCell>
                    <TableCell
                      className={`font-semibold text-xs text-center ${ratioColor(tm.hits, tm.total)}`}
                    >
                      {formatXN(tm.hits, tm.total)}
                    </TableCell>
                    <TableCell
                      className={`font-semibold text-xs text-center ${ratioColor(itb.hits, itb.total)}`}
                    >
                      {formatXN(itb.hits, itb.total)}
                    </TableCell>
                    <TableCell
                      className={`font-semibold text-xs text-center ${ratioColor(itm.hits, itm.total)}`}
                    >
                      {formatXN(itm.hits, itm.total)}
                    </TableCell>
                    <TableCell
                      className={`font-semibold text-xs text-center ${ratioColor(it2b.hits, it2b.total)}`}
                    >
                      {formatXN(it2b.hits, it2b.total)}
                    </TableCell>
                    <TableCell
                      className={`font-semibold text-xs text-center ${ratioColor(it2m.hits, it2m.total)}`}
                    >
                      {formatXN(it2m.hits, it2m.total)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Форы */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-16">Фора</TableHead>
                <TableHead>Ф (команда)</TableHead>
                <TableHead>Ф2 (соперник)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {HANDICAP_LINES.map((h) => {
                const f = hcpTeam.find((c) => c.line === h)!
                const f2 = hcpOpp.find((c) => c.line === h)!
                return (
                  <TableRow key={`hcp-${h}`}>
                    <TableCell className="font-mono text-xs">{h > 0 ? `+${h}` : h}</TableCell>
                    <TableCell
                      className={`font-semibold text-xs text-center ${ratioColor(f.hits, f.total)}`}
                    >
                      {formatXN(f.hits, f.total)}
                    </TableCell>
                    <TableCell
                      className={`font-semibold text-xs text-center ${ratioColor(f2.hits, f2.total)}`}
                    >
                      {formatXN(f2.hits, f2.total)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function AggTile({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className={`rounded border p-3 ${muted ? 'opacity-70' : ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}
