import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Calendar, Clock, Trophy } from 'lucide-react'
import Link from 'next/link'
import {
  getCompetitionsListJson,
  getMatchesHistoryJson,
  getFixturesMatchesJson,
} from '@/app/(frontend)/client'
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
  round?: string
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

    // Дополнительно получаем будущие матчи (fixtures)
    const fixturesRaw: any[] = []
    try {
      if (date) {
        const year = new Date(date).getFullYear()
        const today = new Date()
        const start = new Date(Math.max(today.getTime(), new Date(`${year}-01-01`).getTime()))
        const end = new Date(`${year}-12-31T00:00:00Z`)
        let page = 1
        let hasNext = true
        while (hasNext && page <= 5) {
          const resp = await getFixturesMatchesJson(
            { competition_id: String(leagueId), from: start, to: end, size: 100, page },
            { next: { revalidate: 60 } },
          )
          const chunk = (resp.data?.data?.fixtures || []) as any[]
          fixturesRaw.push(...chunk)
          const nextURL = resp.data?.data?.next_page as string | null | undefined
          hasNext = Boolean(nextURL)
          page += 1
        }
      } else {
        const now = new Date()
        const start = new Date(now.toISOString().split('T')[0])
        const end = new Date(
          new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        )
        let page = 1
        let hasNext = true
        while (hasNext && page <= 5) {
          const resp = await getFixturesMatchesJson(
            { competition_id: String(leagueId), from: start, to: end, size: 100, page },
            { next: { revalidate: 60 } },
          )
          const chunk = (resp.data?.data?.fixtures || []) as any[]
          fixturesRaw.push(...chunk)
          const nextURL = resp.data?.data?.next_page as string | null | undefined
          hasNext = Boolean(nextURL)
          page += 1
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки будущих матчей:', e)
    }

    // Преобразуем прошедшие матчи (history)
    const pastMapped: Match[] = allMatches
      .map((match: any) => {
        let score = undefined
        if (match.scores?.ft_score) {
          const scoreMatch = match.scores.ft_score.match(/(\d+)\s*-\s*(\d+)/)
          if (scoreMatch) {
            score = { home: parseInt(scoreMatch[1]), away: parseInt(scoreMatch[2]) }
          }
        }
        return {
          id: Number(match.id),
          date: match.date || '',
          time: match.scheduled || match.time || '',
          status: match.status || 'finished',
          round:
            typeof match.round === 'string'
              ? match.round
              : match.round != null
                ? String(match.round)
                : undefined,
          home_team: { id: Number(match.home?.id ?? 0), name: match.home?.name || 'Команда дома' },
          away_team: {
            id: Number(match.away?.id ?? 0),
            name: match.away?.name || 'Команда гостей',
          },
          score,
        }
      })
      .filter((m: Match) => Boolean(m.id && m.date))

    // Преобразуем будущие матчи (fixtures)
    const futureMapped: Match[] = fixturesRaw
      .map((fx: any) => {
        const homeName = fx.home?.name || fx.home_team?.name || fx.home_name || 'Команда дома'
        const awayName = fx.away?.name || fx.away_team?.name || fx.away_name || 'Команда гостей'
        return {
          id: Number(fx.id),
          date: String(fx.date || ''),
          time: String(fx.time || ''),
          status: 'scheduled',
          round:
            typeof fx.round === 'string'
              ? fx.round
              : fx.round != null
                ? String(fx.round)
                : undefined,
          home_team: {
            id: Number(fx.home?.id || fx.home_team?.id || fx.home_id || 0),
            name: homeName,
          },
          away_team: {
            id: Number(fx.away?.id || fx.away_team?.id || fx.away_id || 0),
            name: awayName,
          },
          score: undefined,
        }
      })
      .filter((m: Match) => Boolean(m.id && m.date))

    const combined = [...pastMapped, ...futureMapped]

    console.log(`Всего матчей получено: ${combined.length}`)

    return combined.sort(
      (a: Match, b: Match) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
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

  // Разделяем матчи на сыгранные и несыгранные
  const isPlayed = (m: Match): boolean => {
    if (m.score && (typeof m.score.home === 'number' || typeof m.score.away === 'number'))
      return true
    const s = (m.status || '').toLowerCase()
    return s === 'finished' || s === 'ft'
  }
  const playedMatches: Match[] = matches.filter(isPlayed)
  const unplayedMatches: Match[] = matches.filter((m) => !isPlayed(m))

  // Оценка тура для несыгранных матчей по календарю (кластер Fri–Sun, иногда Fri)
  const addDays = (d: Date, days: number) => {
    const copy = new Date(d)
    copy.setDate(copy.getDate() + days)
    return copy
  }
  const toISO = (d: Date) => d.toISOString().slice(0, 10)
  const anchorFriday = (d: Date) => {
    // Используем UTC-дни недели, чтобы избежать смещения
    const day = d.getUTCDay() // 0=Sun..6=Sat
    if (day >= 1 && day <= 4) {
      // Пн–Чт → ближайшая будущая пятница этой неде��и
      return addDays(d, 5 - day)
    }
    // Пт/Сб/Вс → предыдущая пятница
    const delta = (day - 5 + 7) % 7
    return addDays(d, -delta)
  }

  const estimatedRoundById: Record<number, string> = (() => {
    const anchors: string[] = []
    const map: Record<number, string> = {}
    const pushAnchor = (iso: string) => {
      if (!anchors.includes(iso)) anchors.push(iso)
    }

    // Собираем якорные пятницы сезона из несыгранных матчей
    unplayedMatches.forEach((m) => {
      const d = new Date(`${m.date}T${m.time || '00:00'}Z`)
      if (Number.isNaN(d.getTime())) return
      const a = anchorFriday(d)
      pushAnchor(toISO(a))
    })

    // Сортируем по возрастанию
    anchors.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    // Присваиваем номера туров начиная с 1
    unplayedMatches.forEach((m) => {
      if (m.round && String(m.round).trim()) return
      const d = new Date(`${m.date}T${m.time || '00:00'}Z`)
      if (Number.isNaN(d.getTime())) return
      const a = anchorFriday(d)
      const idx = anchors.indexOf(toISO(a))
      if (idx >= 0) map[m.id] = String(idx + 1)
    })

    return map
  })()

  // Нормализуем тур: берём API-значение или оценённый
  const normalizedMatches: Match[] = matches.map((m) => ({
    ...m,
    round: (m.round && String(m.round).trim()) || estimatedRoundById[m.id] || m.round,
  }))

  // Календарь сезона: индексация дат -> по месяцам/дням
  const byMonthDay = playedMatches.concat(unplayedMatches).reduce(
    (acc, m) => {
      const d = new Date(m.date)
      if (Number.isNaN(d.getTime())) return acc
      const month = d.getMonth() // 0-11
      const day = d.getDate()
      if (!acc[month]) acc[month] = new Map<number, Match[]>()
      const map = acc[month]
      map.set(day, [...(map.get(day) || []), m])
      return acc
    },
    {} as Record<number, Map<number, Match[]>>,
  )

  const monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ]

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

  // Группируем по турам (если нет тура — "Без тура")
  const byRound = normalizedMatches.reduce(
    (acc, m) => {
      const key = (m.round && String(m.round).trim()) || 'Без тура'
      if (!acc[key]) acc[key] = []
      acc[key].push(m)
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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" /> Календарь сезона
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(byMonthDay)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([monthIdx, daysMap]) => (
                        <Card key={monthIdx} className="border-muted">
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm font-semibold">
                              {monthNames[Number(monthIdx)]}
                            </CardTitle>
                            <CardDescription>Дней с матчами: {daysMap.size}</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2">
                              {[...daysMap.keys()]
                                .sort((a, b) => a - b)
                                .map((day) => {
                                  // Берём первую дату из списка матчей этого дня
                                  const sample = daysMap.get(day)?.[0]
                                  const dateStr = sample ? sample.date : ''
                                  return (
                                    <Link
                                      key={day}
                                      href={`?date=${dateStr}`}
                                      className="inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border hover:bg-accent"
                                      title={formatDate(dateStr)}
                                    >
                                      {day}
                                    </Link>
                                  )
                                })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {unplayedMatches.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" /> Несыгранные матчи
                    </CardTitle>
                    <CardDescription>Всего: {unplayedMatches.length}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {unplayedMatches
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(`${a.date}T${a.time || '00:00'}Z`).getTime() -
                            new Date(`${b.date}T${b.time || '00:00'}Z`).getTime(),
                        )
                        .map((match) => (
                          <div
                            key={match.id}
                            className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-900/10"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {formatDate(match.date)}
                                <Clock className="h-4 w-4 ml-3" />
                                {match.time || '—'}
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
                                <div className="px-3 text-muted-foreground">vs</div>
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
              )}

              <div className="text-muted-foreground">
                Всего матчей в сезоне: <Badge variant="outline">{matches.length}</Badge> • Сыграно:{' '}
                <Badge variant="secondary" className="ml-1">
                  {playedMatches.length}
                </Badge>{' '}
                • Впереди:{' '}
                <Badge variant="outline" className="ml-1">
                  {unplayedMatches.length}
                </Badge>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(byRound)
                .sort(([a], [b]) => {
                  const na = Number(a)
                  const nb = Number(b)
                  const aIsNum = !Number.isNaN(na)
                  const bIsNum = !Number.isNaN(nb)
                  if (aIsNum && bIsNum) return na - nb
                  if (aIsNum) return -1
                  if (bIsNum) return 1
                  return a.localeCompare(b, 'ru')
                })
                .map(([round, items]) => (
                  <Card key={round}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        {round === 'Без тура' ? 'Без тура' : `Тур ${round}`}
                      </CardTitle>
                      <CardDescription>Матчей: {items.length}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(`${a.date}T${a.time || '00:00'}Z`).getTime() -
                              new Date(`${b.date}T${b.time || '00:00'}Z`).getTime(),
                          )
                          .map((match) => {
                            const played = isPlayed(match)
                            return (
                              <div
                                key={match.id}
                                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                  played
                                    ? 'hover:bg-accent/50'
                                    : 'bg-amber-50/50 dark:bg-amber-900/10'
                                }`}
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(match.date)}
                                    <Clock className="h-4 w-4 ml-3" />
                                    {match.time || '—'}
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
                                    <div className="px-3">
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
                            )
                          })}
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
