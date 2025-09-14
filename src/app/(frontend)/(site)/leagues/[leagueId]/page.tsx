import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Calendar, Trophy } from 'lucide-react'
import Link from 'next/link'
import { getCompetitionsListJson, getSeasonsListJson } from '@/app/(frontend)/client'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 300 // 5 минут

interface LeaguePageProps {
  params: Promise<{
    leagueId: string
  }>
}

interface Season {
  id: number
  name: string
  year?: number
  is_current?: boolean
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

async function getLeagueInfo(leagueId: string): Promise<League | null> {
  try {
    console.log(`Поиск лиги с ID: ${leagueId}`)

    // Получаем информацию о лиге из списка всех лиг
    const response = await getCompetitionsListJson(
      { size: 500 },
      { next: { revalidate: 300 } },
    )

    // Проверяем разные возможные структуры данных
    const competitions = (response.data?.data?.competition || response.data?.competition || []) as Array<{
      id?: number | string
      name?: string
      countries?: Array<{ id?: number | string; name?: string; flag?: string }>
    }>
    console.log(`Найдено ${competitions.length} соревнований`)
    console.log(`Структура ответа:`, Object.keys(response.data || {}))
    console.log(`Структура data:`, Object.keys(response.data?.data || {}))
    console.log(
      `Первые 5 ID:`,
      competitions.slice(0, 5).map((c) => ({ id: c.id, name: c.name })),
    )

    const league = competitions.find(
      (comp) => String(comp.id) === String(leagueId) || Number(comp.id) === Number(leagueId),
    )
    console.log(`Лига найдена:`, league ? { id: league.id, name: league.name } : 'НЕ НАЙДЕНА')

    if (!league) {
      return null
    }

    return {
      id: Number(league.id),
      name: league.name || 'Неизвестная лига',
      country:
        league.countries && league.countries.length > 0
          ? {
              id: Number(league.countries[0].id),
              name: league.countries[0].name || 'Неизвестная страна',
              flag: league.countries[0].flag,
            }
          : undefined,
    }
  } catch (error) {
    console.error('Ошибка загрузки информации о лиге:', error)
    return null
  }
}

async function getLeagueSeasons(leagueId: string): Promise<Season[]> {
  try {
    const response = await getSeasonsListJson({ next: { revalidate: 300 } })

    const seasons = (response.data?.data?.seasons || []) as Array<{
      id?: number | string
      name?: string
      year?: number | string
      is_current?: string | boolean
    }>

    if (Array.isArray(seasons)) {
      return seasons
        .map((season) => ({
          id: Number(season.id),
          name: season.name || `Сезон ${season.year || season.id}`,
          year: season.year ? Number(season.year) : undefined,
          is_current: season.is_current === '1' || season.is_current === true,
        }))
        .sort((a: Season, b: Season) => {
          // Сортируем: текущий сезон первым, затем по году (новые первыми)
          if (a.is_current && !b.is_current) return -1
          if (!a.is_current && b.is_current) return 1
          return (b.year || 0) - (a.year || 0)
        })
    }

    return []
  } catch (error) {
    console.error('Ошибка загрузки сезонов:', error)
    return []
  }
}

export default async function LeaguePage({ params }: LeaguePageProps) {
  const resolvedParams = await params
  const leagueId = resolvedParams.leagueId

  const [league, seasons] = await Promise.all([getLeagueInfo(leagueId), getLeagueSeasons(leagueId)])

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

  const breadcrumbItems = league.country
    ? [
        { label: 'Лиги', href: '/leagues' },
        { label: league.country.name, href: `/leagues?country=${league.country.id}` },
        { label: league.name },
      ]
    : [{ label: 'Лиги', href: '/leagues' }, { label: league.name }]

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <header>
          <div className="flex items-center gap-4 mb-4">
            <Link href="/leagues">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />К лигам
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {league.country && (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                <CountryFlagImage
                  countryId={league.country.id}
                  countryName={league.country.name}
                  size="large"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold tracking-tight">{league.name}</h1>
              {league.country && (
                <p className="text-muted-foreground text-lg">{league.country.name}</p>
              )}
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
                  Сезоны
                </CardTitle>
                <CardDescription>
                  Выберите сезон для просмотра турнирной таблицы и статистики
                </CardDescription>
              </CardHeader>
              <CardContent>
                {seasons.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Сезоны не найдены для этой лиги.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {seasons.map((season) => (
                      <Link
                        key={season.id}
                        href={`/leagues/${leagueId}/seasons/${season.id}`}
                        className="block"
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">{season.name}</h3>
                                {season.year && (
                                  <p className="text-sm text-muted-foreground">{season.year}</p>
                                )}
                              </div>
                              {season.is_current && <Badge variant="default">Текущий</Badge>}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
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
                  <Trophy className="h-5 w-5" />
                  Быстрые ссылки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/leagues/${leagueId}/teams`}
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Команды</div>
                  <div className="text-sm text-muted-foreground">Все команды лиги</div>
                </Link>

                <Link
                  href={`/leagues/${leagueId}/matches`}
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">М��тчи</div>
                  <div className="text-sm text-muted-foreground">Расписание и результаты</div>
                </Link>

                <Link
                  href={`/leagues/${leagueId}/topscorers`}
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Бомбардиры</div>
                  <div className="text-sm text-muted-foreground">Лучшие снайперы</div>
                </Link>
              </CardContent>
            </Card>

            {league.country && (
              <Card>
                <CardHeader>
                  <CardTitle>Страна</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/leagues?country=${league.country.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                      <CountryFlagImage
                        countryId={league.country.id}
                        countryName={league.country.name}
                        size="medium"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-medium">{league.country.name}</div>
                      <div className="text-sm text-muted-foreground">Другие лиги страны</div>
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
