import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trophy, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getCompetitionsStandingsJson } from '@/app/(frontend)/client'
import { TeamLogo } from '@/components/TeamLogo'

interface StandingsTeam {
  position: number
  team: {
    id: number
    name: string
    logo?: string
  }
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  form?: string[]
}

interface SeasonStandingsTableProps {
  leagueId: string
  seasonId?: number
  competitionName?: string
  seasonName?: string
  className?: string
}

async function getStandings(leagueId: string, seasonId?: number): Promise<StandingsTeam[]> {
  try {
    console.log(
      `[SeasonStandingsTable] Загрузка турнирной таблицы для лиги ${leagueId}, сезон ${seasonId}`,
    )

    const params: any = {
      competition_id: String(leagueId),
      include_form: 1,
      lang: 'ru',
    }

    if (seasonId) {
      params.season = seasonId
    }

    console.log(`[SeasonStandingsTable] Параметры запроса:`, params)

    const response = await getCompetitionsStandingsJson(params, {
      next: { revalidate: 300 },
      cache: 'no-store',
    })

    console.log(`[SeasonStandingsTable] Полный ответ API:`, response)
    console.log(
      `[SeasonStandingsTable] Структура ответа standings:`,
      Object.keys(response.data?.data || {}),
    )

    const standings = response.data?.data?.table || []
    console.log(`[SeasonStandingsTable] Всего команд в таблице получено: ${standings.length}`)

    if (standings.length > 0) {
      console.log(
        `[SeasonStandingsTable] Первая команда в таблице:`,
        JSON.stringify(standings[0], null, 2),
      )
    } else {
      console.log(`[SeasonStandingsTable] Таблица пуста! Проверяем response.data:`, response.data)
    }

    return standings
      .map((team: any, index: number) => {
        // Используем правильные поля из реального API ответа
        const position = parseInt(team.rank) || index + 1
        const teamId = parseInt(team.team_id) || 0
        const teamName = team.name || 'Неизвестная команда'
        const played = parseInt(team.matches) || 0
        const won = parseInt(team.won) || 0
        const drawn = parseInt(team.drawn) || 0
        const lost = parseInt(team.lost) || 0
        const goalsFor = parseInt(team.goals_scored) || 0
        const goalsAgainst = parseInt(team.goals_conceded) || 0
        const goalDiff = parseInt(team.goal_diff) || goalsFor - goalsAgainst
        const points = parseInt(team.points) || 0
        let form = undefined
        try {
          if (team.form && typeof team.form === 'string') {
            form = team.form
              .split(',')
              .map((f: string) => f.trim())
              .filter((f: string) => f.length > 0)
              .slice(-5)
          }
        } catch (formError) {
          console.error(
            `[SeasonStandingsTable] Ошибка обработки формы для команды ${teamName}:`,
            formError,
            'форма:',
            team.form,
          )
          form = undefined
        }

        console.log(
          `[SeasonStandingsTable] Команда ${teamName}: позиция=${position}, очки=${points}, форма=${team.form}, обработанная форма:`,
          form,
        )

        return {
          position,
          team: {
            id: teamId,
            name: teamName,
            logo: undefined, // API не возвращает логотипы в standings
          },
          played,
          won,
          drawn,
          lost,
          goals_for: goalsFor,
          goals_against: goalsAgainst,
          goal_difference: goalDiff,
          points,
          form,
        }
      })
      .sort((a: StandingsTeam, b: StandingsTeam) => a.position - b.position)
  } catch (error) {
    console.error('[SeasonStandingsTable] Ошибка загрузки турнирной таблицы:', error)
    console.error('[SeasonStandingsTable] Детали ошибки:', error)
    return []
  }
}

function getFormColor(result: string) {
  switch (result.toUpperCase()) {
    case 'W':
      return 'bg-green-500'
    case 'L':
      return 'bg-red-500'
    case 'D':
      return 'bg-yellow-500'
    default:
      return 'bg-gray-400'
  }
}

export default async function SeasonStandingsTable({
  leagueId,
  seasonId,
  competitionName,
  seasonName,
  className = '',
}: SeasonStandingsTableProps) {
  console.log(`[SeasonStandingsTable] Компонент вызван с параметрами:`, {
    leagueId,
    seasonId,
    competitionName,
    seasonName,
  })

  const standings = await getStandings(leagueId, seasonId)

  console.log(`[SeasonStandingsTable] Получено команд для отображения:`, standings.length)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Турнирная таблица
        </CardTitle>
        <CardDescription>
          {seasonName ? `${seasonName} • ` : ''}Текущие позиции команд в турнирной таблице
        </CardDescription>
      </CardHeader>
      <CardContent>
        {standings.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Турнирная таблица не найдена для этого сезона.</AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="text-left p-2 w-12">#</th>
                  <th className="text-left p-2">Команда</th>
                  <th className="text-center p-2 w-12">И</th>
                  <th className="text-center p-2 w-12">В</th>
                  <th className="text-center p-2 w-12">Н</th>
                  <th className="text-center p-2 w-12">П</th>
                  <th className="text-center p-2 w-16">Мячи</th>
                  <th className="text-center p-2 w-12">РМ</th>
                  <th className="text-center p-2 w-12">О</th>
                  <th className="text-center p-2 w-20">Форма</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, index) => (
                  <tr
                    key={team.team.id}
                    className={`border-b hover:bg-muted/50 ${
                      index < 4 ? 'bg-green-50' : index >= standings.length - 3 ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="p-2 font-medium">
                      <div className="flex items-center gap-2">
                        {team.position}
                        {index < 4 && <div className="w-2 h-2 rounded-full bg-green-500" />}
                        {index >= standings.length - 3 && (
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <Link
                        href={`/teams/${team.team.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <TeamLogo teamId={team.team.id} teamName={team.team.name} size="small" />
                          <span className="font-medium">{team.team.name}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="p-2 text-center">{team.played}</td>
                    <td className="p-2 text-center text-green-600">{team.won}</td>
                    <td className="p-2 text-center text-yellow-600">{team.drawn}</td>
                    <td className="p-2 text-center text-red-600">{team.lost}</td>
                    <td className="p-2 text-center text-sm">
                      {team.goals_for}:{team.goals_against}
                    </td>
                    <td
                      className={`p-2 text-center font-medium ${
                        team.goal_difference > 0
                          ? 'text-green-600'
                          : team.goal_difference < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {team.goal_difference > 0 ? '+' : ''}
                      {team.goal_difference}
                    </td>
                    <td className="p-2 text-center font-bold">{team.points}</td>
                    <td className="p-2">
                      {team.form && team.form.length > 0 ? (
                        <div className="flex gap-1 justify-center">
                          {team.form.map((result, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${getFormColor(result)}`}
                              title={
                                result.toUpperCase() === 'W'
                                  ? 'Победа'
                                  : result.toUpperCase() === 'D'
                                    ? 'Ничья'
                                    : result.toUpperCase() === 'L'
                                      ? 'Поражение'
                                      : 'Неизвестно'
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-center">
                          <div className="text-xs text-muted-foreground">—</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Легенда */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Еврокубки (1-4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Зона вылета (18-20)</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span>
                  И - Игры, В - Выигрыши, Н - Ничьи, П - Поражения, РМ - Разность мячей, О - Очки
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Форма (последние 5 матчей):</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Победа</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Ничья</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Поражение</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
