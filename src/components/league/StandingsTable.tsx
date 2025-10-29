import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'
import { getCompetitionsStandingsJson } from '@/app/(frontend)/client'
import type { CompetitionsStandingsTableRow } from '@/app/(frontend)/client'

interface TableRowData extends CompetitionsStandingsTableRow {
  // Старая структура для совместимости
  team_name?: string
  goals_for?: number
  goals_against?: number
}

interface StandingsTableProps {
  competitionId: number
  season: string
  view?: 'all' | 'home' | 'away'
  round?: string
  className?: string
}

function FormBadge({ form }: { form: string | null | undefined }) {
  if (!form || typeof form !== 'string') return null

  return (
    <div className="flex gap-1">
      {form
        .split('')
        .slice(-5)
        .map((result, index) => {
          let variant: 'default' | 'secondary' | 'destructive' = 'secondary'
          let icon = <Minus className="w-3 h-3" />

          if (result === 'W') {
            variant = 'default'
            icon = <TrendingUp className="w-3 h-3" />
          } else if (result === 'L') {
            variant = 'destructive'
            icon = <TrendingDown className="w-3 h-3" />
          }

          return (
            <Badge
              key={index}
              variant={variant}
              className="w-6 h-6 p-0 flex items-center justify-center text-xs"
            >
              {result}
            </Badge>
          )
        })}
    </div>
  )
}

function getRankColor(rank?: number): string {
  if (!rank) return ''

  // Зоны для разных лиг (можно настроить)
  if (rank <= 4) return 'text-green-600 font-semibold' // Лига чемпионов
  if (rank <= 6) return 'text-blue-600 font-semibold' // Лига Европы
  if (rank >= 18) return 'text-red-600 font-semibold' // Зона вылета

  return ''
}

export default async function StandingsTable({
  competitionId,
  season,
  view = 'all',
  round,
  className = '',
}: StandingsTableProps) {
  try {
    // Получаем данные турнирной таблицы
    const response = await getCompetitionsStandingsJson({
      competition_id: competitionId.toString(),
      season: parseInt(season),
      include_form: 1,
      lang: 'ru',
    })

    const standings = response.data?.data?.table || []

    if (!standings || standings.length === 0) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Турнирная таблица
            </CardTitle>
            <CardDescription>Сезон {season}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Турнирная таблица недоступна
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Турнирная таблица
          </CardTitle>
          <CardDescription>Сезон {season}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Команда</TableHead>
                  <TableHead className="text-center w-12">И</TableHead>
                  <TableHead className="text-center w-12">В</TableHead>
                  <TableHead className="text-center w-12">Н</TableHead>
                  <TableHead className="text-center w-12">П</TableHead>
                  <TableHead className="text-center w-16">Мячи</TableHead>
                  <TableHead className="text-center w-12">РМ</TableHead>
                  <TableHead className="text-center w-12">О</TableHead>
                  <TableHead className="text-center w-24">Форма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((team, index) => (
                  <TableRow key={team.team_id || index} className="hover:bg-muted/50">
                    <TableCell className={`font-medium ${getRankColor(Number(team.rank))}`}>
                      {team.rank || index + 1}
                    </TableCell>
                    <TableCell>
                      <Link href={`/teams/${team.team_id}`} className="hover:underline font-medium">
                        {team.name || team.team_name || 'Неизвестная команда'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">{team.matches || 0}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">
                      {team.won || 0}
                    </TableCell>
                    <TableCell className="text-center text-yellow-600">{team.drawn || 0}</TableCell>
                    <TableCell className="text-center text-red-600">{team.lost || 0}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="text-green-600 font-medium">
                        {team.goals_scored || team.goals_for || 0}
                      </span>
                      :
                      <span className="text-red-600">
                        {team.goals_conceded || team.goals_against || 0}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`text-center font-medium ${
                        Number(team.goal_diff || 0) > 0
                          ? 'text-green-600'
                          : Number(team.goal_diff || 0) < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {Number(team.goal_diff || 0) > 0 ? '+' : ''}
                      {team.goal_diff || 0}
                    </TableCell>
                    <TableCell className="text-center font-bold">{team.points || 0}</TableCell>
                    <TableCell className="text-center">
                      <FormBadge form={team.form} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Легенда */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span>Лига чемпионов (1-4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span>Лига Европы (5-6)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded"></div>
                  <span>Зона вылета (18-20)</span>
                </div>
              </div>
              <div className="text-xs mt-2">
                И - игры, В - выигрыши, Н - ничьи, П - поражения, РМ - разность мячей, О - очки
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error('Error loading standings:', error)

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Турнирная таблица
          </CardTitle>
          <CardDescription>Сезон {season}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Не удалось загрузить турнирную таблицу
          </div>
        </CardContent>
      </Card>
    )
  }
}
