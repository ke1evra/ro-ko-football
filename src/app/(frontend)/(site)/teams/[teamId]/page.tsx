import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Calendar, Trophy, Users } from 'lucide-react'
import Link from 'next/link'
import { executeApiMethod } from '../../api-test/api-actions'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 300 // 5 минут

interface TeamPageProps {
  params: Promise<{
    teamId: string
  }>
}

interface Team {
  id: number
  name: string
  logo?: string
  country?: {
    id: number
    name: string
    flag?: string
  }
  founded?: number
  venue?: string
}

interface Match {
  id: number
  date: string
  home_team: {
    id: number
    name: string
    logo?: string
  }
  away_team: {
    id: number
    name: string
    logo?: string
  }
  score?: {
    home: number
    away: number
  }
  status: string
  competition?: {
    id: number
    name: string
  }
}

async function getTeamInfo(teamId: string): Promise<Team | null> {
  try {
    // Получаем информацию о команде из списка команд
    const result = await executeApiMethod({
      method: 'getTeamsListJson',
      params: {
        size: 100,
        lang: 'ru',
      },
    })

    if (!result.success || !result.data) {
      return null
    }

    const teams = result.data.data || result.data.teams || result.data
    if (!Array.isArray(teams)) {
      return null
    }

    const team = teams.find((t: any) => t.id === parseInt(teamId))
    if (!team) {
      return null
    }

    return {
      id: team.id,
      name: team.name || 'Неизвестная команда',
      logo: team.logo,
      country:
        team.countries && team.countries.length > 0
          ? {
              id: team.countries[0].id,
              name: team.countries[0].name,
              flag: team.countries[0].flag,
            }
          : undefined,
      founded: team.founded,
      venue: team.venue,
    }
  } catch (error) {
    console.error('Ошибка загрузки информации о команде:', error)
    return null
  }
}

async function getTeamMatches(teamId: string, limit = 10): Promise<Match[]> {
  try {
    const result = await executeApiMethod({
      method: 'getTeamsLastmatchesJson',
      params: {
        team_id: parseInt(teamId),
        limit,
      },
    })

    if (!result.success || !result.data) {
      return []
    }

    const matches = result.data.data || result.data.matches || result.data

    if (Array.isArray(matches)) {
      return matches.map((match: any) => ({
        id: match.id,
        date: match.date || match.match_date,
        home_team: {
          id: match.home_team?.id || match.home_team_id,
          name: match.home_team?.name || match.home_team_name || 'Неизвестная команда',
          logo: match.home_team?.logo,
        },
        away_team: {
          id: match.away_team?.id || match.away_team_id,
          name: match.away_team?.name || match.away_team_name || 'Неизвестная команда',
          logo: match.away_team?.logo,
        },
        score: match.score
          ? {
              home: match.score.home || match.home_score,
              away: match.score.away || match.away_score,
            }
          : undefined,
        status: match.status || 'unknown',
        competition: match.competition
          ? {
              id: match.competition.id,
              name: match.competition.name,
            }
          : undefined,
      }))
    }

    return []
  } catch (error) {
    console.error('Ошибка загрузки матчей команды:', error)
    return []
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

function getMatchResult(match: Match, teamId: number): 'win' | 'draw' | 'loss' | 'upcoming' {
  if (!match.score || match.status !== 'finished') {
    return 'upcoming'
  }

  const isHome = match.home_team.id === teamId
  const teamScore = isHome ? match.score.home : match.score.away
  const opponentScore = isHome ? match.score.away : match.score.home

  if (teamScore > opponentScore) return 'win'
  if (teamScore < opponentScore) return 'loss'
  return 'draw'
}

function getResultColor(result: string): string {
  switch (result) {
    case 'win':
      return 'bg-green-100 text-green-800'
    case 'loss':
      return 'bg-red-100 text-red-800'
    case 'draw':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params

  const [team, matches] = await Promise.all([getTeamInfo(teamId), getTeamMatches(teamId)])

  if (!team) {
    return (
      <Section>
        <Container className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Команда не найдена. Проверьте правильность ссылки.</AlertDescription>
          </Alert>

          <Link href="/leagues">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />К лигам
            </Button>
          </Link>
        </Container>
      </Section>
    )
  }

  const breadcrumbItems = team.country
    ? [
        { label: 'Страны', href: '/countries' },
        { label: team.country.name, href: `/leagues?country=${team.country.id}` },
        { label: team.name },
      ]
    : [{ label: team.name }]

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <header>
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {team.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl">⚽</span>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
              {team.country && <p className="text-muted-foreground text-lg">{team.country.name}</p>}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Основная информация */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Последние матчи
                </CardTitle>
                <CardDescription>Результаты последних игр команды</CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Матчи не найдены для этой команды.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {matches.map((match) => {
                      const result = getMatchResult(match, team.id)
                      const isHome = match.home_team.id === team.id
                      const opponent = isHome ? match.away_team : match.home_team

                      return (
                        <Link
                          key={match.id}
                          href={`/matches-v2/match_${match.date}_${match.home_team?.id || 0}_${match.away_team?.id || 0}_${match.id}_${match.id}`}
                          className="block"
                        >
                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge className={getResultColor(result)}>
                                    {result === 'win'
                                      ? 'П'
                                      : result === 'loss'
                                        ? 'Пор'
                                        : result === 'draw'
                                          ? 'Н'
                                          : 'Пред'}
                                  </Badge>

                                  <div className="flex items-center gap-2">
                                    {opponent.logo && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={opponent.logo}
                                        alt={opponent.name}
                                        className="w-6 h-6 object-contain"
                                      />
                                    )}
                                    <span className="font-medium">
                                      {isHome ? 'дома' : 'в гостях'} vs {opponent.name}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  {match.score && (
                                    <div className="font-bold text-lg">
                                      {isHome
                                        ? `${match.score.home}:${match.score.away}`
                                        : `${match.score.away}:${match.score.home}`}
                                    </div>
                                  )}
                                  <div className="text-sm text-muted-foreground">
                                    {formatDate(match.date)}
                                  </div>
                                  {match.competition && (
                                    <div className="text-xs text-muted-foreground">
                                      {match.competition.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Информация о команде
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {team.country && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Страна:</span>
                    <div className="flex items-center gap-2">
                      <CountryFlagImage
                        countryId={team.country.id}
                        countryName={team.country.name}
                        size="small"
                        className="w-4 h-4"
                      />
                      <span>{team.country.name}</span>
                    </div>
                  </div>
                )}

                {team.founded && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Основана:</span>
                    <span>{team.founded}</span>
                  </div>
                )}

                {team.venue && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Стадион:</span>
                    <span className="text-right">{team.venue}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Быстрые ссылки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/teams/${teamId}/matches`}
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Все матчи</div>
                  <div className="text-sm text-muted-foreground">Полное расписание команды</div>
                </Link>

                <Link
                  href={`/teams/${teamId}/stats`}
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Статистика</div>
                  <div className="text-sm text-muted-foreground">Подробная статистика</div>
                </Link>

                <Link
                  href={`/teams/${teamId}/squad`}
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Состав</div>
                  <div className="text-sm text-muted-foreground">Игроки команды</div>
                </Link>
              </CardContent>
            </Card>

            {team.country && (
              <Card>
                <CardHeader>
                  <CardTitle>Другие команды страны</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/teams?country=${team.country.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <CountryFlagImage
                      countryId={team.country.id}
                      countryName={team.country.name}
                      size="medium"
                      className="w-8 h-8"
                    />
                    <div>
                      <div className="font-medium">{team.country.name}</div>
                      <div className="text-sm text-muted-foreground">Все команды страны</div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Навигация по сайту</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/federations" className="text-primary hover:underline">
              Федерации
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/countries" className="text-primary hover:underline">
              Страны
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/leagues" className="text-primary hover:underline">
              Лиги
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/api-test" className="text-primary hover:underline">
              Тестирование API
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}
