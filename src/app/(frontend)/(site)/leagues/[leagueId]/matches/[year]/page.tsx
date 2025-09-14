import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Calendar, Clock, Trophy } from 'lucide-react'
import Link from 'next/link'
import { getCompetitionsListJson, getMatchesHistoryJson } from '@/app/(frontend)/client'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { YearSelector } from '@/components/YearSelector'
import type { Metadata } from 'next'
import { LocalDateTime } from '@/components/LocalDateTime'

export const revalidate = 300 // 5 минут

export async function generateMetadata({ params }: MatchesYearPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const { leagueId, year } = resolvedParams

  const league = await getLeagueInfo(leagueId)

  if (!league) {
    return {
      title: 'Лига не найдена',
    }
  }

  return {
    title: `Матчи ${league.name} ${year} года`,
    description: `Все матчи лиги ${league.name} за ${year} год. Результаты, счета, даты проведения матчей.`,
    keywords: `${league.name}, матчи ${year}, футбол, результаты матчей, ${league.country?.name || ''}`,
  }
}

interface MatchesYearPageProps {
  params: Promise<{
    leagueId: string
    year: string
  }>
}

interface Match {
  id: number
  date: string
  time: string
  status: string
  home_team: {
    id: number
    name: string
  }
  away_team: {
    id: number
    name: string
  }
  score?: {
    home: number
    away: number
  }
}

interface League {
  id: number
  name: string
  country?: {
    id: number
    name: string
  }
}

async function getLeagueInfo(leagueId: string): Promise<League | null> {
  try {
    const response = await getCompetitionsListJson(
      {
        size: 500,
      },
      {
        next: { revalidate: 300 },
      },
    )

    const competitions = (response.data?.data?.competition || []) as Array<{
      id?: number | string
      name?: string
      countries?: Array<{ id?: number | string; name?: string }>
    }>
    const league = competitions.find(
      (comp) => String(comp.id) === String(leagueId) || Number(comp.id) === Number(leagueId),
    )

    if (!league) return null

    return {
      id: parseInt(league.id),
      name: league.name || 'Неизвестная лига',
      country:
        league.countries && league.countries.length > 0
          ? {
              id: parseInt(league.countries[0].id),
              name: league.countries[0].name,
            }
          : undefined,
    }
  } catch (error) {
    console.error('Ошибка загрузки информации о лиге:', error)
    return null
  }
}

async function getLeagueMatches(leagueId: string, year: string): Promise<Match[]> {
  try {
    console.log(`[DEBUG] Начинаем загрузку матчей для лиги ${leagueId}, год: ${year}`)

    const fromDate = `${year}-01-01`
    const toDate = `${year}-12-31`

    console.log(`[DEBUG] Диапазон дат: ${fromDate} - ${toDate}`)

    const requestParams = {
      competition_id: String(leagueId),
      from: new Date(fromDate),
      to: new Date(toDate),
    }

    console.log(`[DEBUG] Параметры запроса:`, requestParams)
    console.log(`[DEBUG] Типы параметров:`, {
      competition_id: typeof requestParams.competition_id,
      from: typeof requestParams.from,
      to: typeof requestParams.to,
    })

    console.log(`[DEBUG] Значения дат:`, {
      from: requestParams.from,
      to: requestParams.to,
    })

    const response = await getMatchesHistoryJson(requestParams, {
      next: { revalidate: 300 },
    })

    console.log(`[DEBUG] Ответ получен, статус:`, response.status)
    console.log(`[DEBUG] Структура ответа:`, Object.keys(response))
    console.log(`[DEBUG] response.data:`, response.data)

    if (response.data?.data) {
      console.log(`[DEBUG] response.data.data:`, response.data.data)
      console.log(`[DEBUG] Ключи в data.data:`, Object.keys(response.data.data))
    }

    const allMatches = response.data?.data?.match || []
    console.log(`[DEBUG] Найдено матчей в API: ${allMatches.length}`)

    const processedMatches = allMatches
      .map((match: any, index: number) => {
        // Парсим счет из строки "2 - 1"
        let score = undefined
        if (match.scores?.ft_score) {
          const scoreMatch = match.scores.ft_score.match(/(\d+)\s*-\s*(\d+)/)
          if (scoreMatch) {
            score = {
              home: parseInt(scoreMatch[1]),
              away: parseInt(scoreMatch[2]),
            }
          }
        }

        const processedMatch = {
          id: parseInt(match.id),
          date: match.date || '',
          time: match.scheduled || match.time || '',
          status: match.status || 'finished',
          home_team: {
            id: parseInt(match.home?.id || '0'),
            name: match.home?.name || 'Неизвестная команда',
          },
          away_team: {
            id: parseInt(match.away?.id || '0'),
            name: match.away?.name || 'Неизвестная команда',
          },
          score,
        }

        return processedMatch
      })
      .sort(
        (a: Match, b: Match) =>
          new Date(`${b.date}T${b.time || '00:00'}Z`).getTime() -
          new Date(`${a.date}T${a.time || '00:00'}Z`).getTime(),
      )

    return processedMatches
  } catch (error) {
    console.error('Ошибка загрузки матчей лиги:', error)
    return []
  }
}



function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'finished':
    case 'ft':
      return <Badge variant="secondary">Завершен</Badge>
    case 'live':
    case 'ht':
      return <Badge variant="destructive">Live</Badge>
    case 'scheduled':
    case 'ns':
      return <Badge variant="outline">Запланирован</Badge>
    case 'postponed':
      return <Badge variant="secondary">Отложен</Badge>
    case 'cancelled':
      return <Badge variant="secondary">Отменен</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function MatchesYearPage({ params }: MatchesYearPageProps) {
  const resolvedParams = await params
  const { leagueId, year } = resolvedParams

  const [league, matches] = await Promise.all([
    getLeagueInfo(leagueId),
    getLeagueMatches(leagueId, year),
  ])

  if (!league) {
    return (
      <Section>
        <Container className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Лига не найдена. Проверьте правильность ссылки.</AlertDescription>
          </Alert>

          <Link href="/leagues">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />К списку лиг
            </Button>
          </Link>
        </Container>
      </Section>
    )
  }

  const breadcrumbItems = [
    { label: 'Лиги', href: '/leagues' },
    ...(league.country
      ? [{ label: league.country.name, href: `/leagues?country=${league.country.id}` }]
      : []),
    { label: league.name, href: `/leagues/${leagueId}` },
    { label: 'Матчи', href: `/leagues/${leagueId}/matches` },
    { label: year },
  ]

  // Группируем матчи по датам
  const matchesByDate = matches.reduce(
    (acc, match) => {
      const date = match.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(match)
      return acc
    },
    {} as Record<string, Match[]>,
  )

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <header>
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/leagues/${leagueId}/matches`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />К матчам
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Матчи {year}</h1>
                <p className="text-muted-foreground text-lg">{league.name}</p>
              </div>
            </div>

            <YearSelector leagueId={leagueId} selectedYear={year} />
          </div>
        </header>

        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800">Отладочная информация:</h3>
          <p className="text-sm text-yellow-700">Найдено матчей: {matches.length}</p>
          <p className="text-sm text-yellow-700">Лига ID: {leagueId}</p>
          <p className="text-sm text-yellow-700">Год: {year}</p>
          {matches.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm text-yellow-700 cursor-pointer">
                Первый матч (клик для раскрытия)
              </summary>
              <pre className="text-xs text-yellow-600 mt-1 overflow-auto">
                {JSON.stringify(matches[0], null, 2)}
              </pre>
            </details>
          )}
        </div>

        {matches.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Матчи не найдены для {year} года в этой лиге.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-4">
              <div className="text-muted-foreground">
                Найдено матчей: <Badge variant="outline">{matches.length}</Badge>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(matchesByDate).map(([date, dayMatches]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <LocalDateTime date={date} utc showTime={false} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dayMatches.map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <LocalDateTime date={match.date} time={match.time} utc showDate={false} />
                            </div>

                            <div className="flex items-center gap-3 flex-1">
                              <div className="text-right flex-1">
                                <Link
                                  href={`/teams/${match.home_team.id}`}
                                  className="font-medium hover:text-primary transition-colors"
                                >
                                  {match.home_team.name}
                                </Link>
                              </div>

                              <div className="flex items-center gap-2 px-3">
                                {match.score ? (
                                  <div className="text-lg font-bold">
                                    {match.score.home} : {match.score.away}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground">vs</div>
                                )}
                              </div>

                              <div className="text-left flex-1">
                                <Link
                                  href={`/teams/${match.away_team.id}`}
                                  className="font-medium hover:text-primary transition-colors"
                                >
                                  {match.away_team.name}
                                </Link>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {getStatusBadge(match.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Навигация по лиге</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href={`/leagues/${leagueId}`} className="text-primary hover:underline">
              Обзор лиги
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href={`/leagues/${leagueId}/teams`} className="text-primary hover:underline">
              Команды
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href={`/leagues/${leagueId}/topscorers`} className="text-primary hover:underline">
              Бомбардиры
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}
