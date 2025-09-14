import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'
import { getCompetitionsListJson, getSeasonsListJson, getTablesStandingsJson } from '@/app/(frontend)/client'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 300 // 5 минут

interface SeasonPageProps {
  params: Promise<{
    leagueId: string
    seasonId: string
  }>
}

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

interface League {
  id: number
  name: string
  country?: {
    id: number
    name: string
    flag?: string
  }
}

interface Season {
  id: number
  name: string
  year?: number
}

async function getLeagueInfo(leagueId: string): Promise<League | null> {
  try {
    const response = await getCompetitionsListJson({
      size: 500,
    }, {
      next: { revalidate: 300 },
    })

    const competitions = response.data?.data?.competition || []
    const league = competitions.find((comp) => comp.id === leagueId || comp.id === parseInt(leagueId))
    
    if (!league) return null

    return {
      id: parseInt(league.id),
      name: league.name || 'Неизвестная лига',
      country: league.countries && league.countries.length > 0 ? {
        id: parseInt(league.countries[0].id),
        name: league.countries[0].name,
        flag: league.countries[0].flag,
      } : undefined,
    }
  } catch (error) {
    console.error('Ошибка загрузки информации о лиге:', error)
    return null
  }
}

async function getSeasonInfo(seasonId: string): Promise<Season | null> {
  try {
    const response = await getSeasonsListJson({}, {
      next: { revalidate: 300 },
    })

    const seasons = response.data?.data?.seasons || []
    const season = seasons.find((s) => s.id === parseInt(seasonId))
    
    if (!season) return null

    return {
      id: parseInt(season.id),
      name: season.name || `Сезон ${season.year || season.id}`,
      year: season.year ? parseInt(season.year) : undefined,
    }
  } catch (error) {
    console.error('Ошибка загрузки информации о сезоне:', error)
    return null
  }
}

async function getStandings(leagueId: string, seasonId: string): Promise<StandingsTeam[]> {
  try {
    console.log(`Загрузка турнирной таблицы для лиги ${leagueId}, сезон ${seasonId}`)
    
    const response = await getTablesStandingsJson({
      competition_id: parseInt(leagueId),
      season: parseInt(seasonId),
      include_form: 'yes',
    }, {
      next: { revalidate: 300 },
    })

    console.log(`Структура ответа standings:`, Object.keys(response.data?.data || {}))
    const standings = response.data?.data?.standing || []
    console.log(`Всего команд в таблице получено: ${standings.length}`)
    
    return standings
      .map((team, index) => ({
        position: parseInt(team.position) || index + 1,
        team: {
          id: parseInt(team.team?.id || '0'),
          name: team.team?.name || 'Неизвестная команда',
          logo: team.team?.logo,
        },
        played: parseInt(team.played || '0'),
        won: parseInt(team.won || '0'),
        drawn: parseInt(team.drawn || '0'),
        lost: parseInt(team.lost || '0'),
        goals_for: parseInt(team.goals_for || '0'),
        goals_against: parseInt(team.goals_against || '0'),
        goal_difference: parseInt(team.goal_difference || '0'),
        points: parseInt(team.points || '0'),
        form: team.form ? team.form.split('').slice(-5) : undefined,
      }))
      .sort((a, b) => a.position - b.position)
  } catch (error) {
    console.error('Ошибка загрузки турнирной таблицы:', error)
    return []
  }
}

function getFormColor(result: string) {
  switch (result.toUpperCase()) {
    case 'W':
      return 'bg-green-100 text-green-800'
    case 'L':
      return 'bg-red-100 text-red-800'
    case 'D':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const resolvedParams = await params
  const { leagueId, seasonId } = resolvedParams
  
  const [league, season, standings] = await Promise.all([
    getLeagueInfo(leagueId),
    getSeasonInfo(seasonId),
    getStandings(leagueId, seasonId),
  ])

  if (!league) {
    return (
      <Section>
        <Container className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Лига не найдена. Проверьте правильность ссылки.
            </AlertDescription>
          </Alert>
          
          <Link href="/leagues">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              К списку лиг
            </Button>
          </Link>
        </Container>
      </Section>
    )
  }

  const breadcrumbItems = []
  
  if (league.country) {
    breadcrumbItems.push({ label: 'Лиги', href: '/leagues' })
    breadcrumbItems.push({ label: league.country.name, href: `/leagues?country=${league.country.id}` })
    breadcrumbItems.push({ label: league.name, href: `/leagues/${leagueId}` })
  } else {
    breadcrumbItems.push({ label: 'Лиги', href: '/leagues' })
    breadcrumbItems.push({ label: league.name, href: `/leagues/${leagueId}` })
  }
  
  breadcrumbItems.push({ label: season?.name || `Сезон ${seasonId}` })

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />
        
        <header>
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/leagues/${leagueId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                К лиге
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {league.country && (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                <CountryFlagImage
                  countryId={league.country.id}
                  countryName={league.country.name}
                  size="large"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {league.name}
              </h1>
              <p className="text-muted-foreground text-lg">
                {season?.name || `Сезон ${seasonId}`}
                {league.country && ` • ${league.country.name}`}
              </p>
            </div>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Турнирная таблица
            </CardTitle>
            <CardDescription>
              Текущие позиции команд в турнирной таблице
            </CardDescription>
          </CardHeader>
          <CardContent>
            {standings.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Турнирная таблица не найдена для этого сезона.
                </AlertDescription>
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
                          index < 4 ? 'bg-green-50' : 
                          index >= standings.length - 3 ? 'bg-red-50' : ''
                        }`}
                      >
                        <td className="p-2 font-medium">
                          <div className="flex items-center gap-2">
                            {team.position}
                            {index < 4 && (
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                            )}
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
                              {team.team.logo ? (
                                <img
                                  src={team.team.logo}
                                  alt={team.team.name}
                                  className="w-6 h-6 object-contain"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                                  <span className="text-xs">⚽</span>
                                </div>
                              )}
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
                        <td className={`p-2 text-center font-medium ${
                          team.goal_difference > 0 ? 'text-green-600' :
                          team.goal_difference < 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                        </td>
                        <td className="p-2 text-center font-bold">{team.points}</td>
                        <td className="p-2">
                          {team.form && (
                            <div className="flex gap-1 justify-center">
                              {team.form.map((result, i) => (
                                <div
                                  key={i}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${getFormColor(result)}`}
                                >
                                  {result.toUpperCase()}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Легенда */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Еврокубки</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Вылет</span>
                  </div>
                  <div className="ml-4">
                    <span>И - Игры, В - Выигрыши, Н - Ничьи, П - Поражения, РМ - Разность мячей, О - Очки</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href={`/leagues/${leagueId}/topscorers`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-medium">Бомбардиры</h3>
                    <p className="text-sm text-muted-foreground">
                      Лучшие снайперы сезона
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href={`/leagues/${leagueId}/matches`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">⚽</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Матчи</h3>
                    <p className="text-sm text-muted-foreground">
                      Расписание и результаты
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href={`/leagues/${leagueId}/teams`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">👥</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Команды</h3>
                    <p className="text-sm text-muted-foreground">
                      Все команды лиги
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
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
            <Link href={`/leagues/${leagueId}`} className="text-primary hover:underline">
              {league.name}
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}