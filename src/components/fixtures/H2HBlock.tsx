'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, MapPin } from 'lucide-react'
import Link from 'next/link'

interface H2HData {
  success: boolean
  data: {
    team1: {
      id: string
      name: string
      stadium: string
      location: string
      overall_form: string[]
      h2h_form: string[]
    }
    team2: {
      id: string
      name: string
      stadium: string
      location: string
      overall_form: string[]
      h2h_form: string[]
    }
    team1_last_6: Array<{
      id: string
      date: string
      home_name: string
      away_name: string
      score: string
      ht_score: string
      ft_score: string
      et_score: string
      location: string
      scheduled: string
      competition: {
        id: string
        name: string
      }
      outcomes: {
        half_time: string | null
        full_time: string | null
        extra_time: string | null
      }
    }>
    team2_last_6: Array<{
      id: string
      date: string
      home_name: string
      away_name: string
      score: string
      ht_score: string
      ft_score: string
      et_score: string
      location: string
      scheduled: string
      competition: {
        id: string
        name: string
      }
      outcomes: {
        half_time: string | null
        full_time: string | null
        extra_time: string | null
      }
    }>
    h2h: Array<{
      id: string
      date: string
      home_name: string
      away_name: string
      score: string
      ht_score: string
      ft_score: string
      et_score: string
      location: string
      scheduled: string
      competition: {
        id: string
        name: string
      }
      outcomes: {
        half_time: string | null
        full_time: string | null
        extra_time: string | null
      }
    }>
    fixture: {
      id: string
      date: string
      time: string
      round: string
      home_name: string
      away_name: string
      location: string
      competition: {
        id: string
        name: string
      }
    }
  }
}

interface H2HBlockProps {
  homeTeamId: number
  awayTeamId: number
  homeTeamName: string
  awayTeamName: string
}

interface MatchRow {
  id: string
  date: string
  competition?: string
  homeName: string
  awayName: string
  gf: number
  ga: number
  total: number
  result: 'W' | 'D' | 'L'
}

function normalizeRows(rows: any[], teamName?: string): MatchRow[] {
  return rows.map((m) => {
    const match = m as any
    const score = match.score || match.ft_score || '0-0'
    const [gfStr, gaStr] = score.split('-')
    const gf = parseInt(gfStr) || 0
    const ga = parseInt(gaStr) || 0
    const result = teamName ? getMatchResult(match, teamName) : 'D'

    return {
      id: String(match.id),
      date: String(match.date),
      competition: match.competition?.name,
      homeName: match.home_name,
      awayName: match.away_name,
      gf,
      ga,
      total: gf + ga,
      result,
    }
  })
}

function getMatchResult(match: any, teamName: string): 'W' | 'D' | 'L' {
  const isHome = match.home_name === teamName
  const isAway = match.away_name === teamName

  if (!isHome && !isAway) return 'D'

  const outcome = match.outcomes?.full_time
  if (!outcome) return 'D'

  if (outcome === 'X') return 'D'
  if (outcome === '1') return isHome ? 'W' : 'L'
  if (outcome === '2') return isAway ? 'W' : 'L'

  return 'D'
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

function MatchTable({ title, rows }: { title: string; rows: MatchRow[] }): JSX.Element {
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
                <TableHead>Дата</TableHead>
                <TableHead>Хозяева</TableHead>
                <TableHead className="text-center">ИТ1</TableHead>
                <TableHead className="text-center">ИТ2</TableHead>
                <TableHead>Гости</TableHead>
                <TableHead className="text-center">Т</TableHead>
                <TableHead className="text-center">Рез.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    Нет данных
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const rowClass = getResultColor(r.result)
                  return (
                    <TableRow key={r.id} className={`transition-colors ${rowClass}`}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(r.date).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="truncate text-xs">{r.homeName}</TableCell>
                      <TableCell className="text-center font-semibold text-xs">{r.gf}</TableCell>
                      <TableCell className="text-center font-semibold text-xs">{r.ga}</TableCell>
                      <TableCell className="truncate text-xs">{r.awayName}</TableCell>
                      <TableCell className="text-center font-semibold text-xs">{r.total}</TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1">
                          <ResultPill res={r.result} />
                          <span className="font-semibold text-xs">
                            {r.gf}:{r.ga}
                          </span>
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

// Компонент для отображения формы команды
function FormIndicator({
  form,
  title,
  matches,
  teamName,
}: {
  form: string[]
  title: string
  matches?: any[]
  teamName?: string
}) {
  const getFormColor = (result: string) => {
    switch (result) {
      case 'W':
        return 'bg-green-500 hover:bg-green-600'
      case 'L':
        return 'bg-red-500 hover:bg-red-600'
      case 'D':
        return 'bg-yellow-500 hover:bg-yellow-600'
      default:
        return 'bg-gray-400 hover:bg-gray-500'
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="flex gap-1">
        {form.map((result, index) => {
          const match = matches?.[index]
          const matchId = match?.id

          const FormDot = (
            <div
              className={`w-8 h-8 rounded-full transition-colors ${getFormColor(result)} ${matchId ? 'cursor-pointer' : ''}`}
              title={
                match
                  ? `${match.home_name} - ${match.away_name} (${match.score || match.ft_score || '—'})`
                  : ''
              }
            />
          )

          // Если есть ID матча, оборачиваем в ссылку
          if (matchId) {
            return (
              <Link
                key={index}
                href={`/matches-v2/match_${match.date || new Date().toISOString().split('T')[0]}_${match.home?.id || 0}_${match.away?.id || 0}_${matchId}_${matchId}`}
              >
                {FormDot}
              </Link>
            )
          }

          return <div key={index}>{FormDot}</div>
        })}
      </div>
    </div>
  )
}

export default function H2HBlock({
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: H2HBlockProps) {
  const [h2hData, setH2hData] = useState<H2HData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchH2HData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/h2h?team1=${homeTeamId}&team2=${awayTeamId}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Ошибка получения данных H2H')
      }

      setH2hData(data)
    } catch (err) {
      console.error('Ошибка загрузки H2H данных:', err)
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[H2HBlock] Component mounted with:', {
      homeTeamId,
      awayTeamId,
      homeTeamName,
      awayTeamName,
    })
    if (homeTeamId && awayTeamId) {
      fetchH2HData()
    }
  }, [homeTeamId, awayTeamId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Личные встречи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Личные встречи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchH2HData} variant="outline" size="sm">
              Попробовать снова
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!h2hData) {
    return null
  }

  const { team1, team2, team1_last_6, team2_last_6, h2h } = h2hData.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Личные встречи
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Форма команд - всегда видна сверху */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-semibold">{team1.name}</h3>
              <div className="text-xs text-muted-foreground space-y-1">
                {team1.stadium && (
                  <div className="flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{team1.stadium}</span>
                  </div>
                )}
              </div>
            </div>

            <FormIndicator
              form={team1.overall_form}
              title="Общая форма (последние 6 матчей)"
              matches={team1_last_6}
              teamName={team1.name}
            />

            <FormIndicator
              form={team1.h2h_form}
              title="Форма в личных встречах"
              matches={h2h.slice(0, team1.h2h_form.length)}
              teamName={team1.name}
            />
          </div>

          <div className="space-y-2">
            <div className="text-center">
              <h3 className="font-semibold">{team2.name}</h3>
              <div className="text-xs text-muted-foreground space-y-1">
                {team2.stadium && (
                  <div className="flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{team2.stadium}</span>
                  </div>
                )}
              </div>
            </div>

            <FormIndicator
              form={team2.overall_form}
              title="Общая форма (последние 6 матчей)"
              matches={team2_last_6}
              teamName={team2.name}
            />

            <FormIndicator
              form={team2.h2h_form}
              title="Форма в личных встречах"
              matches={h2h.slice(0, team2.h2h_form.length)}
              teamName={team2.name}
            />
          </div>
        </div>

        {/* Основной контент */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Личные встречи */}
          <MatchTable
            title={`${team1.name} vs ${team2.name}`}
            rows={normalizeRows(h2h, homeTeamName)}
          />

          {/* Последние матчи */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MatchTable
              title={`Последние матчи — ${team1.name}`}
              rows={normalizeRows(team1_last_6, team1.name)}
            />
            <MatchTable
              title={`Последние матчи — ${team2.name}`}
              rows={normalizeRows(team2_last_6, team2.name)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
