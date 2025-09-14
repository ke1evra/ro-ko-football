import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Users, MapPin } from 'lucide-react'
import Link from 'next/link'
import { getCompetitionsListJson, getTeamsListJson } from '@/app/(frontend)/client'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 300 // 5 минут

interface TeamsPageProps {
  params: Promise<{
    leagueId: string
  }>
}

interface Team {
  id: number
  name: string
  logo?: string
  country?: {
    id: number
    name: string
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

async function getLeagueTeams(leagueId: string): Promise<Team[]> {
  try {
    console.log(`Загрузка команд для лиги ${leagueId}`)

    const response = await getTeamsListJson(
      {
        size: 100,
      },
      {
        next: { revalidate: 300 },
      },
    )

    console.log(`Структура ответа teams:`, Object.keys(response.data?.data || {}))
    const teams = response.data?.data?.team || []
    console.log(`Всего команд получено: ${teams.length}`)

    // Поскольку API не фильтрует по лиге, возвращаем пустой массив с сообщением
    // В реальном API нужно было бы фильтровать команды по лиге
    console.log(`Фильтрация команд по лиге ${leagueId} не поддерживается API`)

    return []
  } catch (error) {
    console.error('Ошибка загрузки команд лиги:', error)
    return []
  }
}

export default async function TeamsPage({ params }: TeamsPageProps) {
  const resolvedParams = await params
  const leagueId = resolvedParams.leagueId

  const [league, teams] = await Promise.all([getLeagueInfo(leagueId), getLeagueTeams(leagueId)])

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
    { label: 'Команды' },
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
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Команды</h1>
              <p className="text-muted-foreground text-lg">{league.name}</p>
            </div>
          </div>
        </header>

        {teams.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Команды не найдены для этой лиги.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-muted-foreground">
                Найдено команд: <Badge variant="outline">{teams.length}</Badge>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {teams.map((team) => (
                <Link key={team.id} href={`/teams/${team.id}`} className="block">
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {team.logo ? (
                            <img
                              src={team.logo}
                              alt={`Логотип ${team.name}`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div
                            className={`flex items-center justify-center w-full h-full ${team.logo ? 'hidden' : ''}`}
                          >
                            <span className="text-lg font-bold text-muted-foreground">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{team.name}</CardTitle>
                          {team.country && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">
                                {team.country.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        Просмотреть информацию о команде
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
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
            <Link href={`/leagues/${leagueId}/matches`} className="text-primary hover:underline">
              Матчи
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
