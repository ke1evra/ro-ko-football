import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Trophy, Target, User } from 'lucide-react'
import Link from 'next/link'
import { getCompetitionsListJson, getCompetitionsTopscorersJson } from '@/app/(frontend)/client'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 300 // 5 минут

interface TopscorersPageProps {
  params: Promise<{
    leagueId: string
  }>
}

interface Topscorer {
  position: number
  player: {
    id: number
    name: string
  }
  team: {
    id: number
    name: string
  }
  goals: number
  matches?: number
  assists?: number
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

async function getLeagueTopscorers(leagueId: string): Promise<Topscorer[]> {
  try {
    console.log(`Загрузка бомбардиров для лиги ${leagueId}`)

    const response = await getCompetitionsTopscorersJson(
      {
        competition_id: String(leagueId),
      },
      {
        next: { revalidate: 300 },
      },
    )

    console.log(`Структура ответа topscorers:`, Object.keys(response.data?.data || {}))
    const topscorers = response.data?.data?.topscorers || []
    console.log(`Всего бомбардиров получено: ${topscorers.length}`)

    return topscorers
      .map((scorer: any, index: number) => ({
        position: index + 1,
        player: {
          id: Number(scorer.player?.id ?? 0),
          name: scorer.player?.name || 'Неизвестный игрок',
        },
        team: {
          id: Number(scorer.team?.id ?? 0),
          name: scorer.team?.name || 'Неизвестная команда',
        },
        goals: Number(scorer.goals ?? 0),
        matches: scorer.matches ? Number(scorer.matches) : undefined,
        assists: scorer.assists ? Number(scorer.assists) : undefined,
      }))
      .sort((a: Topscorer, b: Topscorer) => b.goals - a.goals)
  } catch (error) {
    console.error('Ошибка загрузки бомбардиров лиги:', error)
    return []
  }
}

function getPositionBadge(position: number) {
  if (position === 1) {
    return <Badge className="bg-yellow-500 hover:bg-yellow-600">🥇 1</Badge>
  } else if (position === 2) {
    return <Badge className="bg-gray-400 hover:bg-gray-500">🥈 2</Badge>
  } else if (position === 3) {
    return <Badge className="bg-amber-600 hover:bg-amber-700">🥉 3</Badge>
  } else {
    return <Badge variant="outline">{position}</Badge>
  }
}

export default async function TopscorersPage({ params }: TopscorersPageProps) {
  const resolvedParams = await params
  const leagueId = resolvedParams.leagueId

  const [league, topscorers] = await Promise.all([
    getLeagueInfo(leagueId),
    getLeagueTopscorers(leagueId),
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
    { label: 'Бомбардиры' },
  ]

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

          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Бомбардиры</h1>
              <p className="text-muted-foreground text-lg">{league.name}</p>
            </div>
          </div>
        </header>

        {topscorers.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Статистика бомбардиров не найдена для этой лиги.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-4">
              <div className="text-muted-foreground">
                Найдено игроков: <Badge variant="outline">{topscorers.length}</Badge>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Лучшие бомбардиры
                </CardTitle>
                <CardDescription>Рейтинг игроков по количеству забитых голов</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topscorers.map((scorer) => (
                    <div
                      key={`${scorer.player.id}-${scorer.team.id}`}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-3">
                          {getPositionBadge(scorer.position)}
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <div className="flex-1">
                          <div className="font-medium text-lg">{scorer.player.name}</div>
                          <Link
                            href={`/teams/${scorer.team.id}`}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            {scorer.team.name}
                          </Link>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{scorer.goals}</div>
                          <div className="text-xs text-muted-foreground">голов</div>
                        </div>

                        {scorer.matches && (
                          <div className="text-center">
                            <div className="text-lg font-semibold">{scorer.matches}</div>
                            <div className="text-xs text-muted-foreground">матчей</div>
                          </div>
                        )}

                        {scorer.assists && (
                          <div className="text-center">
                            <div className="text-lg font-semibold">{scorer.assists}</div>
                            <div className="text-xs text-muted-foreground">передач</div>
                          </div>
                        )}

                        {scorer.matches && (
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              {(scorer.goals / scorer.matches).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">гол/матч</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
            <Link href={`/leagues/${leagueId}/matches`} className="text-primary hover:underline">
              Матчи
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}
