import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Calendar, Trophy } from 'lucide-react'
import Link from 'next/link'
import {
  getCompetitionsListJson,
  getSeasonsListJson,
  getCompetitionsStandingsJson,
} from '@/app/(frontend)/client'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import SeasonStandingsTable from '@/components/league/SeasonStandingsTable'
import LeagueMatchesByRounds from '@/components/league/LeagueMatchesByRounds'

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
  season?: {
    id: number
    name: string
    start?: Date
    end?: Date
  }
  // Дополнительная информация о лиге
  is_league?: boolean
  is_cup?: boolean
  tier?: number
  has_groups?: boolean
  active?: boolean
  national_teams_only?: boolean
}

async function getLeagueInfo(
  leagueId: string,
): Promise<{ league: League | null; availableSeasons: Season[] }> {
  try {
    console.log(`Поиск лиги с ID: ${leagueId}`)

    // Получаем информацию о лиге из списка всех лиг
    const response = await getCompetitionsListJson(
      { size: 100 },
      { next: { revalidate: 300 }, cache: 'no-store' },
    )

    // Проверяем различные структуры, но используем типизированный путь data.data.competition
    const competitions = (response.data?.data?.competition || []) as Array<any>
    console.log(`Найдено ${competitions.length} соревнований`)

    const league = competitions.find(
      (comp) => String(comp.id) === String(leagueId) || Number(comp.id) === Number(leagueId),
    )
    console.log(`Лига найдена:`, league ? { id: league.id, name: league.name } : 'НЕ НАЙДЕНА')

    if (!league) {
      return { league: null, availableSeasons: [] }
    }

    const leagueData: League = {
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
      season: league.season
        ? {
            id: Number(league.season.id),
            name: league.season.name || 'Текущий сезон',
            start: league.season.start ? new Date(league.season.start) : undefined,
            end: league.season.end ? new Date(league.season.end) : undefined,
          }
        : undefined,
      is_league: league.is_league,
      is_cup: league.is_cup,
      tier: league.tier,
      has_groups: league.has_groups,
      active: league.active,
      national_teams_only: league.national_teams_only,
    }

    // Пытаемся найти доступные сезоны, проверяя турнирные таблицы
    let availableSeasons: Season[] = []

    try {
      console.log(`Поиск доступных сезонов для лиги ${leagueId}`)

      // Получаем общий список сезонов
      const seasonsResponse = await getSeasonsListJson({ next: { revalidate: 300 } })
      const allSeasons = (seasonsResponse.data?.data?.season || []) as Array<{
        id?: number | string
        name?: string
        start?: string | Date
        end?: string | Date
      }>

      console.log(`Найдено ${allSeasons.length} общих сезонов`)

      // Проверяем последние 10 сезонов на наличие данных
      const recentSeasons = allSeasons
        .map((s) => ({
          id: Number(s.id),
          name: s.name || `Сезон ${s.id}`,
          year: extractYearFromSeasonName(s.name),
          start: s.start ? new Date(s.start) : undefined,
          end: s.end ? new Date(s.end) : undefined,
        }))
        .sort((a, b) => (b.year || 0) - (a.year || 0))
        .slice(0, 10)

      console.log(`Проверяем ${recentSeasons.length} последних сезонов`)

      // Проверяем каждый сезон на наличие турнирной таблицы
      const seasonChecks = await Promise.allSettled(
        recentSeasons.map(async (season) => {
          try {
            const standingsResponse = await getCompetitionsStandingsJson(
              {
                competition_id: leagueId,
                season: season.id,
                lang: 'ru',
              },
              {
                next: { revalidate: 300 },
                cache: 'no-store',
              },
            )

            const standings = standingsResponse.data?.data?.table || []
            const hasData = standings.length > 0

            console.log(
              `Сезон ${season.name} (ID: ${season.id}): ${hasData ? 'есть данные' : 'нет данных'} (${standings.length} команд)`,
            )

            if (hasData) {
              // Определяем, является ли сезон текущим
              const now = new Date()
              let is_current = false

              if (season.start && season.end) {
                is_current = now >= season.start && now <= season.end
              }

              // Если у лиги есть текущий сезон, сравниваем с ним
              if (leagueData.season?.id && Number(season.id) === Number(leagueData.season.id)) {
                is_current = true
              }

              return {
                ...season,
                is_current,
                hasData: true,
              }
            }

            return null
          } catch (error) {
            console.log(`Ошибка проверки сезона ${season.name}:`, error)
            return null
          }
        }),
      )

      // Собираем успешные результаты
      availableSeasons = seasonChecks
        .map((result) => (result.status === 'fulfilled' ? result.value : null))
        .filter(Boolean) as Season[]

      console.log(`Найдено ${availableSeasons.length} доступных сезонов`)

      // Если не нашли сезоны, но у лиги есть текущий сезон, добавляем его
      if (availableSeasons.length === 0 && leagueData.season) {
        availableSeasons.push({
          id: leagueData.season.id,
          name: leagueData.season.name,
          year: extractYearFromSeasonName(leagueData.season.name),
          is_current: true,
        })
        console.log(`Добавлен текущий сезон лиги: ${leagueData.season.name}`)
      }
    } catch (error) {
      console.error('Ошибка поиска доступных сезонов:', error)

      // Fallback: если есть текущий сезон лиги, используем его
      if (leagueData.season) {
        availableSeasons = [
          {
            id: leagueData.season.id,
            name: leagueData.season.name,
            year: extractYearFromSeasonName(leagueData.season.name),
            is_current: true,
          },
        ]
      }
    }

    return { league: leagueData, availableSeasons }
  } catch (error) {
    console.error('Ошибка загрузки информации о лиге:', error)
    return { league: null, availableSeasons: [] }
  }
}

// Вспомогательная функция для извлечения года из названия сезона
function extractYearFromSeasonName(name?: string): number | undefined {
  if (!name) return undefined

  // Ищем год в формате "2023/2024", "2023-2024", "2023"
  const yearMatch = name.match(/(\d{4})/)
  if (yearMatch) {
    return parseInt(yearMatch[1])
  }

  return undefined
}

// Функция больше не нужна, так как сезоны получаются в getLeagueInfo
async function getLeagueSeasons(leagueId: string): Promise<Season[]> {
  // Эта функция теперь не используется, но оставляем для совместимости
  return []
}

async function getLeagueStandings(leagueId: string, seasonId?: number) {
  try {
    console.log(`Загрузка турнирной таблицы для лиги ${leagueId}, сезон ${seasonId}`)

    const params: any = {
      competition_id: leagueId,
      include_form: 1,
      lang: 'ru',
    }

    if (seasonId) {
      params.season = seasonId
    }

    const response = await getCompetitionsStandingsJson(params, {
      next: { revalidate: 300 },
      cache: 'no-store',
    })

    const standings = response.data?.data?.table || []
    const competition = null // Этот endpoint не возвращает competition

    console.log(`Получено ${standings.length} команд в турнирной таблице`)
    console.log(
      `Структура первой команды:`,
      standings[0] ? JSON.stringify(standings[0], null, 2) : 'нет данных',
    )

    return {
      standings,
      competition,
    }
  } catch (error) {
    console.error('Ошибка загрузки турнирной таблицы:', error)
    return {
      standings: [],
      competition: null,
    }
  }
}

export default async function LeaguePage({ params }: LeaguePageProps) {
  const resolvedParams = await params
  const leagueId = resolvedParams.leagueId

  const { league, availableSeasons } = await getLeagueInfo(leagueId)

  // Получаем турнирную таблицу для текущего сезона
  const currentSeason =
    availableSeasons.find((s) => s.is_current) || availableSeasons[0] || league?.season
  const { standings, competition } = currentSeason
    ? await getLeagueStandings(leagueId, currentSeason.id)
    : league?.season
      ? await getLeagueStandings(leagueId, league.season.id)
      : { standings: [], competition: null }

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

              {/* Дополнительная информация о лиге */}
              <div className="flex flex-wrap gap-2 mt-2">
                {league.is_league && <Badge variant="secondary">Лига</Badge>}
                {league.is_cup && <Badge variant="secondary">Кубок</Badge>}
                {league.tier && <Badge variant="outline">Дивизион {league.tier}</Badge>}
                {league.has_groups && <Badge variant="outline">Групповой этап</Badge>}
                {league.national_teams_only && <Badge variant="outline">Сборные</Badge>}
                {league.active === false && <Badge variant="destructive">Архив</Badge>}
              </div>

              {/* Информация о текущем сезоне */}
              {league.season && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium">Текущий сезон</div>
                  <div className="text-lg font-semibold">{league.season.name}</div>
                  {league.season.start && league.season.end && (
                    <div className="text-sm text-muted-foreground">
                      {league.season.start.toLocaleDateString('ru-RU')} —{' '}
                      {league.season.end.toLocaleDateString('ru-RU')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Турнирная таблица текущего сезона */}
        {currentSeason && (
          <SeasonStandingsTable
            leagueId={leagueId}
            seasonId={currentSeason.id}
            competitionName={league.name}
            seasonName={currentSeason.name}
            className="mb-6"
          />
        )}

        {/* Матчи по турам */}
        <LeagueMatchesByRounds
          leagueId={leagueId}
          maxRounds={3}
          showViewAllButton={true}
          className="mb-6"
        />

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
                {availableSeasons.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Сезоны не найдены для этой лиги.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableSeasons.map((season) => (
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
