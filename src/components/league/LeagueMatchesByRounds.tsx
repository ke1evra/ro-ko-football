import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Trophy, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import {
  getMatchesHistoryJson,
  getFixturesMatchesJson,
} from '@/app/(frontend)/client'
import PredictionButton from '@/components/predictions/PredictionButton'
import { TeamLogo } from '@/components/TeamLogo'

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

interface LeagueMatchesByRoundsProps {
  leagueId: string
  className?: string
  maxRounds?: number // Максимальное количество туров для отображения
  showViewAllButton?: boolean
}

async function getLeagueMatches(leagueId: string): Promise<Match[]> {
  try {
    console.log(`[LeagueMatchesByRounds] Загрузка матчей для лиги ${leagueId}`)

    let allMatches: any[] = []

    // Загружаем историю текущего сезона (Европа: 1 июля — 30 июня)
    const now = new Date()
    const year = now.getUTCFullYear()
    const seasonStart =
      now.getUTCMonth() + 1 >= 7
        ? new Date(`${year}-07-01T00:00:00Z`)
        : new Date(`${year - 1}-07-01T00:00:00Z`)
    const seasonEnd =
      now.getUTCMonth() + 1 >= 7
        ? new Date(`${year + 1}-06-30T23:59:59Z`)
        : new Date(`${year}-06-30T23:59:59Z`)
    const histTo = now < seasonEnd ? now : seasonEnd

    const response = await getMatchesHistoryJson(
      {
        competition_id: String(leagueId),
        from: seasonStart,
        to: histTo,
      },
      { next: { revalidate: 300 } },
    )
    allMatches = response.data?.data?.match || []
    console.log(`[LeagueMatchesByRounds] История сезона: ${allMatches.length}`)

    // Дополнительно получаем будущие матчи (fixtures)
    const fixturesRaw: any[] = []
    try {
      const start = now > seasonStart ? now : seasonStart
      const end = seasonEnd
      let page = 1
      let hasNext = true
      
      while (hasNext && page <= 5) { // Ограничиваем количество страниц
        const resp = await getFixturesMatchesJson(
          { competition_id: String(leagueId), from: start, to: end, size: 50, page },
          { next: { revalidate: 300 } },
        )
        const chunk = (resp.data?.data?.fixtures || []) as any[]
        fixturesRaw.push(...chunk)
        const nextURL = resp.data?.data?.next_page as string | null | undefined
        hasNext = Boolean(nextURL)
        page += 1
      }
    } catch (e) {
      console.error('[LeagueMatchesByRounds] Ошибка загрузки будущих матчей:', e)
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

    console.log(`[LeagueMatchesByRounds] Всего матчей получено: ${combined.length}`)

    return combined.sort(
      (a: Match, b: Match) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  } catch (error) {
    console.error('[LeagueMatchesByRounds] Ошибка загрузки матчей лиги:', error)
    return []
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return dateString
  }
}

function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'finished':
    case 'ft':
      return <Badge variant="secondary" className="text-xs">Завершен</Badge>
    case 'live':
    case 'ht':
      return <Badge variant="destructive" className="text-xs">Live</Badge>
    case 'scheduled':
    case 'ns':
      return <Badge variant="outline" className="text-xs">Запланирован</Badge>
    case 'postponed':
      return <Badge variant="secondary" className="text-xs">Отложен</Badge>
    case 'cancelled':
      return <Badge variant="secondary" className="text-xs">Отменен</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>
  }
}

function MatchCard({ match }: { match: Match }) {
  const played = isPlayed(match)
  const isScheduled = match.status.toLowerCase() === 'scheduled' || match.status.toLowerCase() === 'ns'
  
  // Определяем URL для перехода к матчу
  // Генерируем правильный URL для matches-v2
  const matchUrl = `/matches-v2/match_${match.date}_${match.home_team?.id || 0}_${match.away_team?.id || 0}_${match.id}${played && match.id ? `_${match.id}` : ''}`

  return (
    <div className="group relative border rounded-lg p-3 hover:bg-accent/50 hover:shadow-sm transition-all duration-200">
      {/* Кликабельная область */}
      <Link href={matchUrl} className="block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{formatDate(match.date)}</span>
              <Clock className="h-3 w-3 flex-shrink-0 ml-1" />
              <span className="truncate">{match.time || '—'}</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
                <TeamLogo 
                  teamId={match.home_team.id}
                  teamName={match.home_team.name}
                  size="small"
                />
                <span className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                  {match.home_team.name}
                </span>
              </div>
              <div className="px-2 flex-shrink-0">
                {match.score ? (
                  <div className="text-sm font-bold">
                    {match.score.home}:{match.score.away}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-xs">vs</div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                  {match.away_team.name}
                </span>
                <TeamLogo 
                  teamId={match.away_team.id}
                  teamName={match.away_team.name}
                  size="small"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {getStatusBadge(match.status)}
          </div>
        </div>
      </Link>
      
      {/* Кнопка прогноза для запланированных матчей */}
      {isScheduled && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <PredictionButton 
            fixtureId={match.id}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
          />
        </div>
      )}
    </div>
  )
}

function isPlayed(m: Match): boolean {
  if (m.score && (typeof m.score.home === 'number' || typeof m.score.away === 'number'))
    return true
  const s = (m.status || '').toLowerCase()
  return s === 'finished' || s === 'ft'
}

export default async function LeagueMatchesByRounds({ 
  leagueId, 
  className = '',
  maxRounds = 3,
  showViewAllButton = true
}: LeagueMatchesByRoundsProps) {
  const matches = await getLeagueMatches(leagueId)

  if (matches.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Матчи по турам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Матчи не найдены
          </div>
        </CardContent>
      </Card>
    )
  }

  // Группируем по турам (если нет тура — "Без тура")
  const byRound = matches.reduce(
    (acc, m) => {
      const key = (m.round && String(m.round).trim()) || 'Без тура'
      if (!acc[key]) acc[key] = []
      acc[key].push(m)
      return acc
    },
    {} as Record<string, Match[]>,
  )

  // Сортируем туры и берём только нужное количество
  const sortedRounds = Object.entries(byRound)
    .sort(([a], [b]) => {
      const na = Number(a)
      const nb = Number(b)
      const aIsNum = !Number.isNaN(na)
      const bIsNum = !Number.isNaN(nb)
      if (aIsNum && bIsNum) return nb - na // Сортируем по убыванию (последние туры сверху)
      if (aIsNum) return -1
      if (bIsNum) return 1
      return b.localeCompare(a, 'ru')
    })
    .slice(0, maxRounds)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Матчи по турам
            </CardTitle>
            <CardDescription>
              Последние {maxRounds} тура • Всего матчей: {matches.length}
            </CardDescription>
          </div>
          {showViewAllButton && (
            <Link href={`/leagues/${leagueId}/matches`}>
              <Button variant="outline" size="sm">
                Все матчи
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedRounds.map(([round, items]) => (
            <div key={round}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-lg">
                  {round === 'Без тура' ? 'Без тура' : `Тур ${round}`}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {items.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {items
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(`${b.date}T${b.time || '00:00'}Z`).getTime() -
                      new Date(`${a.date}T${a.time || '00:00'}Z`).getTime(),
                  )
                  .slice(0, 6) // Показываем максимум 6 матчей на тур
                  .map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                {items.length > 6 && (
                  <div className="text-center pt-2">
                    <Link href={`/leagues/${leagueId}/matches`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Ещё {items.length - 6} матчей тура...
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}