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

export const revalidate = 300 // 5 минут

interface MatchesPageProps {
  params: Promise<{
    leagueId: string
  }>
  searchParams: Promise<{
    date?: string
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
      id: Number(league.id),
      name: league.name || 'Неизвестная лига',
      country:
        league.countries && league.countries.length > 0
          ? {
              id: Number(league.countries[0].id),
              name: league.countries[0].name || 'Неизвестная страна',
            }
          : undefined,
    }
  } catch (error) {
    console.error('Ошибка загрузки информации о лиге:', error)
    return null
  }
}

async function getLeagueMatches(leagueId: string, date?: string): Promise<Match[]> {
  try {
    console.log(`Загрузка матчей для лиги ${leagueId}, дата: ${date || 'не указана'}`)

    let allMatches: any[] = []

    if (date) {
      // Если дата указана, используем диапазон для всего года
      const year = new Date(date).getFullYear()
      const fromDate = `${year}-01-01`
      const toDate = `${year}-12-31`

      console.log(`Используем диапазон дат: ${fromDate} - ${toDate}`)

      const response = await getMatchesHistoryJson(
        {
          competition_id: String(leagueId),
          from: new Date(fromDate),
          to: new Date(toDate),
        },
        {
          next: { revalidate: 300 },
        },
      )

      allMatches = response.data?.data?.match || []
      console.log(`Матчей найдено для ${year} года: ${allMatches.length}`)
    } else {
      // Если дата не указана, пробуем получить матчи за последние несколько дней
      console.log('Дата не указана, ищем матчи за последние дни')

      const dates = []
      for (let i = 0; i < 30; i++) {
        const targetDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
        dates.push(targetDate)
      }

      // Берем только несколько последних дат для начала
      for (const targetDate of dates.slice(0, 5)) {
        try {
          const response = await getMatchesHistoryJson(
            {
              competition_id: String(leagueId),
              date: new Date(targetDate),
            },
            {
              next: { revalidate: 300 },
            },
          )

          const matches = response.data?.data?.match || []
          allMatches.push(...matches)
          console.log(`Матчей найдено для даты ${targetDate}: ${matches.length}`)

          if (allMatches.length > 0) break // Если нашли матчи, останавливаемся
        } catch (error) {
          console.log(`Нет матчей на дату ${targetDate}`)
        }
      }
    }

    console.log(`Всего матчей получено: ${allMatches.length}`)

    return allMatches
      .map((match: any) => {
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

        return {
          id: Number(match.id),
          date: match.date || '',
          time: match.scheduled || match.time || '',
          status: match.status || 'finished',
          home_team: {
            id: Number(match.home?.id ?? 0),
            name: match.home?.name || 'Неизвестная команда',
          },
          away_team: {
            id: Number(match.away?.id ?? 0),
            name: match.away?.name || 'Неизвестная команда',
          },
          score,
        }
      })
      .sort((a: Match, b: Match) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch (error) {
    console.error('Ошибка загрузки матчей лиги:', error)
    return []
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateString
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

export default async function MatchesPage({ params, searchParams }: MatchesPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const leagueId = resolvedParams.leagueId
  const selectedDate = resolvedSearchParams.date

  const [league, matches] = await Promise.all([
    getLeagueInfo(leagueId),
    getLeagueMatches(leagueId, selectedDate),
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
    { label: 'Матчи' },
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
            <Link href={`/leagues/${leagueId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />К лиге
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Матчи</h1>
                <p className="text-muted-foreground text-lg">{league.name}</p>
              </div>
            </div>

            <YearSelector leagueId={leagueId} />
          </div>
        </header>

        {matches.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Матчи не найдены для этой лиги.</AlertDescription>
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
                      {formatDate(date)}
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
                              {match.time}
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
