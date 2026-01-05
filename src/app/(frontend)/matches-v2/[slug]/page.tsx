import { Container, Section } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { findMatchByMatchId, findMatchByTeamsAndDate } from '@/lib/payload-client'
import MatchPageClient from '@/components/matches/MatchPageClient'
import FixturePageClient from '@/components/fixtures/FixturePageClient'
import H2HBlock from '@/components/fixtures/H2HBlock'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const revalidate = 300

// Безопасная сборка URL для fetch в SSR
function makeApiUrl(path: string): string {
  const isProd = process.env.NODE_ENV === 'production'
  const baseUrl = process.env.APP_URL

  if (isProd && baseUrl) {
    return `${baseUrl}${path}`
  }

  // В dev используем APP_URL или дефолтный localhost:3000
  if (baseUrl) {
    return `${baseUrl}${path}`
  }

  // Fallback для SSR в dev: используем localhost с портом из переменной или 3000
  const port = process.env.PORT || '3000'
  return `http://localhost:${port}${path}`
}

interface MatchParams {
  homeTeamSlug: string
  awayTeamSlug: string
  date: string
  homeTeamId: number
  awayTeamId: number
  fixtureId: number
  matchId?: number
}

/**
 * Парсит slug формата:
 * spartak-dinamo_2025-05-28_123_456_789 (без matchId)
 * spartak-dinamo_2025-05-28_123_456_789_1011 (с matchId)
 */
function parseMatchSlug(slug: string): MatchParams | null {
  const parts = slug.split('_')

  if (parts.length < 5) {
    return null
  }

  const teamsSlug = parts[0] // spartak-dinamo
  const date = parts[1] // 2025-05-28
  const homeTeamId = Number(parts[2])
  const awayTeamId = Number(parts[3])
  const fixtureId = Number(parts[4])
  const matchId = parts[5] ? Number(parts[5]) : undefined

  // Валидация
  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return null
  }

  if (!Number.isFinite(homeTeamId) || !Number.isFinite(awayTeamId) || !Number.isFinite(fixtureId)) {
    return null
  }

  if (matchId !== undefined && !Number.isFinite(matchId)) {
    return null
  }

  const [homeTeamSlug, awayTeamSlug] = teamsSlug.split('-', 2)

  return {
    homeTeamSlug: homeTeamSlug || 'team',
    awayTeamSlug: awayTeamSlug || 'team',
    date,
    homeTeamId,
    awayTeamId,
    fixtureId,
    matchId,
  }
}

/**
 * Ищет матч в Payload CMS по matchId (через прямой клиент)
 */
async function findMatchInPayloadById(matchId: number) {
  try {
    const match = await findMatchByMatchId(matchId)
    return match
  } catch (error) {
    console.error('[findMatchInPayloadById] Error:', error)
    return null
  }
}

/**
 * Ищет матч в Payload CMS по дате и ID команд (через прямой клиент)
 */
async function findMatchInPayload(params: MatchParams) {
  try {
    const match = await findMatchByTeamsAndDate(params.homeTeamId, params.awayTeamId, params.date)
    return match
  } catch (error) {
    console.error('[findMatchInPayload] Error:', error)
    return null
  }
}

/**
 * Ищет матч в fixtures API
 */
async function findMatchInFixtures(params: MatchParams) {
  try {
    const apiUrl = makeApiUrl(
      `/api/matches/fixtures?date=${params.date}&team_id=${params.homeTeamId}`,
    )
    const response = await fetch(apiUrl, { next: { revalidate: 300 } })

    if (!response.ok) {
      return { match: null, apiUrl, response: null, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    if (!data.success || !data.data?.fixtures) {
      return { match: null, apiUrl, response: data, error: 'No fixtures data' }
    }

    // Ищем матч с нужными командами
    const match = data.data.fixtures.find(
      (f: any) =>
        (f.home?.id === params.homeTeamId && f.away?.id === params.awayTeamId) ||
        (f.home_team?.id === params.homeTeamId && f.away_team?.id === params.awayTeamId) ||
        (f.home_id === params.homeTeamId && f.away_id === params.awayTeamId),
    )

    return {
      match: match || null,
      apiUrl,
      response: data,
      error: match ? null : 'Match not found in fixtures list',
      totalFixtures: data.data.fixtures.length,
    }
  } catch (error) {
    console.error('[findMatchInFixtures] Error:', error)
    const apiUrl = makeApiUrl(
      `/api/matches/fixtures?date=${params.date}&team_id=${params.homeTeamId}`,
    )
    return {
      match: null,
      apiUrl,
      response: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Ищет матч в live API
 */
async function findMatchInLive(params: MatchParams) {
  try {
    const response = await fetch(makeApiUrl('/api/matches/live'), {
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (!data.success || !data.data?.matches) {
      return null
    }

    // Ищем матч с нужными командами и датой
    const match = data.data.matches.find(
      (m: any) =>
        m.date === params.date &&
        ((m.home?.id === params.homeTeamId && m.away?.id === params.awayTeamId) ||
          (m.home_team?.id === params.homeTeamId && m.away_team?.id === params.awayTeamId)),
    )

    return match || null
  } catch (error) {
    console.error('[findMatchInLive] Error:', error)
    return null
  }
}

/**
 * Ищет матч в history API
 */
async function findMatchInHistory(params: MatchParams) {
  try {
    const response = await fetch(
      makeApiUrl(`/api/matches/history?date=${params.date}&team_id=${params.homeTeamId}`),
      { next: { revalidate: 300 } },
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (!data.success || !data.data?.matches) {
      return null
    }

    // Ищем матч с нужными командами
    const match = data.data.matches.find(
      (m: any) =>
        (m.home?.id === params.homeTeamId && m.away?.id === params.awayTeamId) ||
        (m.home_team?.id === params.homeTeamId && m.away_team?.id === params.awayTeamId),
    )

    return match || null
  } catch (error) {
    console.error('[findMatchInHistory] Error:', error)
    return null
  }
}

/**
 * Ищет матч в LiveScore API по matchId
 */
async function findMatchInLiveScoreApi(matchId: number) {
  try {
    // Попытка 1: events API
    const eventsResponse = await fetch(makeApiUrl(`/api/matches/events?match_id=${matchId}`), {
      next: { revalidate: 300 },
    })

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json()
      if (eventsData.success && eventsData.data?.match) {
        const match = eventsData.data.match
        return { source: 'livescore-events', match }
      }
    }

    // Попытка 2: stats API
    const statsResponse = await fetch(makeApiUrl(`/api/matches/stats?match_id=${matchId}`), {
      next: { revalidate: 300 },
    })

    if (statsResponse.ok) {
      const statsData = await statsResponse.json()
      if (statsData.success && statsData.data) {
        const match = {
          id: matchId,
          home: { name: statsData.data.home?.name || 'Команда дома' },
          away: { name: statsData.data.away?.name || 'Команда гостей' },
          competition: statsData.data.competition,
          date: statsData.data.date,
          time: statsData.data.time,
          status: statsData.data.status,
          scores: statsData.data.scores,
        }
        return { source: 'livescore-stats', match }
      }
    }

    // Попытка 3: history API
    const historyResponse = await fetch(makeApiUrl(`/api/matches/history?match_id=${matchId}`), {
      next: { revalidate: 300 },
    })

    if (historyResponse.ok) {
      const historyData = await historyResponse.json()
      if (historyData.success && historyData.data) {
        const match = Array.isArray(historyData.data.matches)
          ? historyData.data.matches.find((m: any) => m.id === matchId)
          : historyData.data
        if (match) {
          return { source: 'livescore-history', match }
        }
      }
    }

    return null
  } catch (error) {
    console.error('[findMatchInLiveScoreApi] Error:', error)
    return null
  }
}

/**
 * Основная логика поиска матча
 */
async function findMatch(params: MatchParams) {
  const matchDate = new Date(params.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  matchDate.setHours(0, 0, 0, 0)

  // Если указан matchId → Payload → LiveScore API
  if (params.matchId) {
    const payloadMatch = await findMatchInPayloadById(params.matchId)
    if (payloadMatch) {
      return { source: 'payload', match: payloadMatch }
    }

    const liveScoreResult = await findMatchInLiveScoreApi(params.matchId)
    if (liveScoreResult) {
      return liveScoreResult
    }

    return null
  }

  const isFutureOrToday = matchDate >= today

  if (isFutureOrToday) {
    // fixtures → live → history
    const fixturesResult = await findMatchInFixtures(params)
    if (fixturesResult && fixturesResult.match) {
      return { source: 'fixtures', match: fixturesResult.match, debug: fixturesResult }
    }

    const liveMatch = await findMatchInLive(params)
    if (liveMatch) {
      return { source: 'live', match: liveMatch }
    }

    const historyMatch = await findMatchInHistory(params)
    if (historyMatch) {
      return { source: 'history', match: historyMatch }
    }
  } else {
    // history → live → fixtures
    const historyMatch = await findMatchInHistory(params)
    if (historyMatch) {
      return { source: 'history', match: historyMatch }
    }

    const liveMatch = await findMatchInLive(params)
    if (liveMatch) {
      return { source: 'live', match: liveMatch }
    }

    const fixturesResult = await findMatchInFixtures(params)
    if (fixturesResult && fixturesResult.match) {
      return { source: 'fixtures', match: fixturesResult.match, debug: fixturesResult }
    }
  }

  return null
}

/**
 * Генерирует slug для редиректа с matchId
 */
function generateSlugWithMatchId(params: MatchParams, matchId: number): string {
  return `${params.homeTeamSlug}-${params.awayTeamSlug}_${params.date}_${params.homeTeamId}_${params.awayTeamId}_${params.fixtureId}_${matchId}`
}

// Прогнозы по fixtureId (скопировано из страницы фикстур)
async function getPredictionsForFixture(fixtureId: number) {
  try {
    const payload = await getPayload({ config: await configPromise })

    const predictionsRes = await payload.find({
      collection: 'posts',
      where: {
        and: [{ postType: { equals: 'prediction' } }, { fixtureId: { equals: fixtureId } }],
      },
      sort: '-publishedAt',
      limit: 10,
      depth: 1,
    })

    // Подсчёт комментариев для каждого прогноза
    const withCounts = await Promise.all(
      predictionsRes.docs.map(async (post) => {
        try {
          const commentsRes = await payload.find({
            collection: 'comments',
            where: { post: { equals: post.id } },
            limit: 1,
            depth: 0,
          })
          const commentsCount = commentsRes?.totalDocs ?? 0
          return { post, commentsCount, rating: 0 }
        } catch {
          return { post, commentsCount: 0, rating: 0 }
        }
      }),
    )

    return withCounts
  } catch (error) {
    console.error('Ошибка загрузки прогнозов:', error)
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const parsed = parseMatchSlug(slug)

  if (!parsed) {
    return { title: 'Матч не найден' }
  }

  const result = await findMatch(parsed)

  if (!result) {
    return {
      title: `Матч ${parsed.homeTeamSlug} - ${parsed.awayTeamSlug}`,
      description: `Матч ${parsed.date}`,
    }
  }

  const match = result.match
  const homeTeam = match.home?.name || match.home_team?.name || match.homeTeam || 'Команда 1'
  const awayTeam = match.away?.name || match.away_team?.name || match.awayTeam || 'Команда 2'
  const competition = match.competition?.name || match.competition || ''

  return {
    title: `${homeTeam} - ${awayTeam}${competition ? ` — ${competition}` : ''}`,
    description: `Матч ${homeTeam} — ${awayTeam}. Дата: ${parsed.date}. События, статистика и подробности.`,
  }
}

export default async function MatchV2Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const parsed = parseMatchSlug(slug)

  if (!parsed) {
    return (
      <Section>
        <Container>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Неверный формат URL матча.</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/leagues">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />К лигам
              </Button>
            </Link>
          </div>
        </Container>
      </Section>
    )
  }

  const result = await findMatch(parsed)

  if (!result) {
    return (
      <Section>
        <Container>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Матч не найден. Дата: {parsed.date}, команды: {parsed.homeTeamId} vs{' '}
              {parsed.awayTeamId}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/leagues">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />К лигам
              </Button>
            </Link>
          </div>
        </Container>
      </Section>
    )
  }

  const match = result.match
  const source = (result as any).source as string | undefined

  // Получаем валидный matchId (реальный ID матча, не равный fixtureId и не из fixtures)
  const rawMatchId = (() => {
    const mid: unknown = (match as any)?.matchId
    if (typeof mid === 'number') return mid
    if (typeof mid === 'string' && /^\d+$/.test(mid)) return Number(mid)
    const rid: unknown = (match as any)?.id
    if (typeof rid === 'number') return rid
    if (typeof rid === 'string' && /^\d+$/.test(rid)) return Number(rid)
    return NaN
  })()
  const hasValidMatchId =
    Number.isFinite(rawMatchId) && rawMatchId !== parsed.fixtureId && source !== 'fixtures'

  // Редирект только если в URL нет matchId и мы нашли валидный реальный matchId
  if (hasValidMatchId && !parsed.matchId) {
    const newSlug = generateSlugWithMatchId(parsed, rawMatchId)
    redirect(`/matches-v2/${newSlug}`)
  }

  // Используем валидный matchId для отображения (если есть)
  const matchId = hasValidMatchId ? rawMatchId : undefined

  const homeTeamName =
    match.home_name ||
    match.homeName ||
    match.home?.name ||
    match.home_team?.name ||
    match.homeTeam?.name ||
    match.homeTeam ||
    parsed.homeTeamSlug
  const awayTeamName =
    match.away_name ||
    match.awayName ||
    match.away?.name ||
    match.away_team?.name ||
    match.awayTeam?.name ||
    match.awayTeam ||
    parsed.awayTeamSlug

  // Если есть matchId — используем страницу матчей (шапка + события + статистика) и добавляем H2H
  if (matchId) {
    const initialMatchInfo = {
      id: matchId,
      home: {
        id: match.home?.id || match.home_team?.id || parsed.homeTeamId,
        name: homeTeamName,
      },
      away: {
        id: match.away?.id || match.away_team?.id || parsed.awayTeamId,
        name: awayTeamName,
      },
      competition:
        match.competition?.id || match.competition?.name
          ? {
              id: String(match.competition.id || ''),
              name: match.competition.name || String(match.competition),
            }
          : undefined,
      date: match.date || parsed.date,
      time: match.time,
      status: match.status,
      score: match.scores?.score || match.score,
    }

    return (
      <Section>
        <Container className="space-y-6">
          <MatchPageClient matchId={matchId} initialMatchInfo={initialMatchInfo as any} />

          {/* Навигация */}
          <div className="flex items-center gap-2">
            <Link href="/leagues">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />К лигам
              </Button>
            </Link>
          </div>
        </Container>
      </Section>
    )
  }

  // Иначе — используем виджет фикстур (детали + прогнозы + H2H внутри)
  const fx = {
    id: parsed.fixtureId,
    date: match.date || parsed.date,
    time: match.time || '',
    home: { id: parsed.homeTeamId, name: homeTeamName },
    away: { id: parsed.awayTeamId, name: awayTeamName },
    competition: match.competition
      ? {
          id: Number(match.competition.id || 0),
          name: match.competition.name || String(match.competition),
        }
      : undefined,
    location: typeof match.location === 'string' ? match.location : match.venue?.name || null,
    round:
      typeof match.round === 'string'
        ? match.round
        : match.round != null
          ? String(match.round)
          : undefined,
    group_id: match.group_id != null ? Number(match.group_id) : null,
    odds: match.odds,
    h2h: match.urls?.head2head || undefined,
    status: match.status,
    time_status: match.time_status ?? null,
    match_id: Number(match.id || match.matchId || 0) || undefined,
    scores: match.scores,
    added: match.added,
    last_changed: match.last_changed,
    outcomes: match.outcomes,
    urls: match.urls,
  }

  const predictions = await getPredictionsForFixture(parsed.fixtureId)

  return (
    <Section>
      <Container className="space-y-6">
        <FixturePageClient fx={fx} initialPredictions={predictions} />

        {/* Навигация */}
        <div className="flex items-center gap-2">
          <Link href="/leagues">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />К лигам
            </Button>
          </Link>
        </div>
      </Container>
    </Section>
  )
}
