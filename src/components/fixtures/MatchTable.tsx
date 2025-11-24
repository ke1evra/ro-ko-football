import React, { useMemo } from 'react'
import Link from 'next/link'
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
import { ArrowRight, BarChart3 } from 'lucide-react'
import { generateMatchUrl } from '@/lib/match-url-utils'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

export type TeamSide = 'home' | 'away'

export type StatMetric =
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

export interface MatchStatsData {
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

export interface MatchRow {
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

export interface ResultPillProps {
  res: 'W' | 'D' | 'L'
}

export function ResultPill({ res }: ResultPillProps) {
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

export interface MiniStatsPopoverProps {
  stats?: MatchStatsData
}

export function MiniStatsPopover({ stats }: MiniStatsPopoverProps) {
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

  const ORDERED_STATS_KEYS: string[] = [
    'possession',
    'shots',
    'shotsOnTarget',
    'bigChances',
    'corners',
    'passes',
    'yellowCards',
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
              typeof (val as any).home === 'number' &&
              typeof (val as any).away === 'number'
            ) {
              const v = val as { home: number; away: number }
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{getStatsLabel(key)}</span>
                  <span className="font-semibold">
                    {v.home} - {v.away}
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

export interface MatchTableProps {
  side: TeamSide
  teamId: number
  title: string
  rows: MatchRow[]
  selectedMetric: StatMetric
  selectedIds: Record<'home' | 'away', Set<string>>
  onToggle: (side: TeamSide, id: string) => void
  onToggleAll: (side: TeamSide, rows: MatchRow[]) => void
}

function getStatValue(row: MatchRow, metric: StatMetric, side: TeamSide): number {
  if (metric === 'goals') {
    return side === 'home' ? row.gf : row.ga
  }

  if (!row.stats) return 0
  const stat = row.stats[metric as keyof MatchStatsData]
  if (!stat || typeof stat !== 'object' || !('home' in stat) || !('away' in stat)) return 0
  const v = stat as { home: number; away: number }
  return side === 'home' ? v.home : v.away
}

export function MatchTable({
  side,
  teamId,
  title,
  rows,
  selectedMetric,
  selectedIds,
  onToggle,
  onToggleAll,
}: MatchTableProps) {
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aDate = new Date(a.date).getTime()
      const bDate = new Date(b.date).getTime()
      return bDate - aDate
    })
  }, [rows])

  return (
    <Card className=" shadow-sm">
      <CardHeader className="py-1 pb-1">
        <CardTitle className="text-sm font-semibold leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 text-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 h-7">
                <TableHead className="w-8 text-center">
                  <input
                    type="checkbox"
                    className="accent-primary cursor-pointer h-3 w-3 align-middle"
                    checked={
                      sortedRows.length > 0 && sortedRows.every((r) => selectedIds[side].has(r.id))
                    }
                    onChange={() => onToggleAll(side, sortedRows)}
                  />
                </TableHead>
                <TableHead className="py-0.5 ">Дата</TableHead>
                <TableHead className="py-0.5 ">Хозяева</TableHead>
                <TableHead className="py-0.5  text-center">ИТ1</TableHead>
                <TableHead className="py-0.5  text-center">ИТ2</TableHead>
                <TableHead className="py-0.5 ">Гости</TableHead>
                <TableHead className="py-0.5  text-center">Т</TableHead>
                <TableHead className="py-0.5  w-16 text-center">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-3 ">
                    Нет данных
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((r) => {
                  const checked = selectedIds[side].has(r.id)
                  const it1Value = getStatValue(r, selectedMetric, 'home')
                  const it2Value = getStatValue(r, selectedMetric, 'away')
                  const totalValue = it1Value + it2Value

                  const rowBgClass =
                    r.result === 'W'
                      ? 'bg-green-50'
                      : r.result === 'L'
                        ? 'bg-red-50'
                        : r.result === 'D'
                          ? 'bg-yellow-50'
                          : ''

                  return (
                    <TableRow
                      key={r.id}
                      className={`transition-colors cursor-pointer h-7 hover:bg-muted/60 ${rowBgClass}`}
                      onClick={() => onToggle(side, r.id)}
                    >
                      <TableCell className="text-center align-middle">
                        <input
                          type="checkbox"
                          className="accent-primary cursor-pointer h-3 w-3 align-middle"
                          checked={checked}
                          onChange={() => onToggle(side, r.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap  py-0.5 align-middle">
                        {new Date(r.date).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className=" py-0.5 align-middle">
                        <div className="flex items-center gap-1">
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
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold  py-0.5 align-middle">
                        {it1Value}
                      </TableCell>
                      <TableCell className="text-center font-semibold  py-0.5 align-middle">
                        {it2Value}
                      </TableCell>
                      <TableCell className=" py-0.5 align-middle">
                        <div className="flex items-center gap-1">
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
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold  py-0.5 align-middle">
                        {totalValue}
                      </TableCell>
                      <TableCell className="text-center py-0.5 align-middle">
                        <div className="flex items-center gap-1 justify-center">
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
                            onClick={(e) => e.stopPropagation()}
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
