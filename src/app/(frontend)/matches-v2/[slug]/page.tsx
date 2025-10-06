import { Container, Section } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { findMatchByMatchId, findMatchByTeamsAndDate } from '@/lib/payload-client'

export const revalidate = 300

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
 * Проверяет, соответствует ли матч параметрам из URL
 */
function validateMatchParams(match: any, params: MatchParams): boolean {
  // Проверяем ID команд
  const matchHomeId = match.homeTeamId || match.home?.id || match.home_team?.id
  const matchAwayId = match.awayTeamId || match.away?.id || match.away_team?.id
  
  if (matchHomeId !== params.homeTeamId || matchAwayId !== params.awayTeamId) {
    console.log('[validateMatchParams] Team IDs mismatch:', {
      expected: { home: params.homeTeamId, away: params.awayTeamId },
      actual: { home: matchHomeId, away: matchAwayId },
    })
    return false
  }

  // Проверяем дату (только день, игнорируем время)
  const matchDate = new Date(match.date)
  const paramsDate = new Date(params.date)
  
  if (
    matchDate.getFullYear() !== paramsDate.getFullYear() ||
    matchDate.getMonth() !== paramsDate.getMonth() ||
    matchDate.getDate() !== paramsDate.getDate()
  ) {
    console.log('[validateMatchParams] Date mismatch:', {
      expected: params.date,
      actual: match.date,
    })
    return false
  }

  return true
}

/**
 * Ищет матч в Payload CMS по matchId (через прямой клиент)
 */
async function findMatchInPayloadById(matchId: number) {
  console.log(`[findMatchInPayloadById] Поиск матча matchId=${matchId} через Payload клиент`)
  
  try {
    // Используем прямой Payload клиент вместо REST API
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
  console.log(`[findMatchInPayload] Поиск матча в Payload по дате и командам через клиент`)
  
  try {
    // Используем прямой Payload клиент вместо REST API
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const apiUrl = `${baseUrl}/api/matches/fixtures?date=${params.date}&team_id=${params.homeTeamId}`
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
      totalFixtures: data.data.fixtures.length
    }
  } catch (error) {
    console.error('[findMatchInFixtures] Error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const apiUrl = `${baseUrl}/api/matches/fixtures?date=${params.date}&team_id=${params.homeTeamId}`
    return { match: null, apiUrl, response: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Ищет матч в live API
 */
async function findMatchInLive(params: MatchParams) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/matches/live`, {
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const response = await fetch(
      `${baseUrl}/api/matches/history?date=${params.date}&team_id=${params.homeTeamId}`,
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
  console.log(`[findMatchInLiveScoreApi] Поиск матча matchId=${matchId} в LiveScore API (резервный источник)`)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    // Пробуем получить из events API (лучший источник для LiveScore)
    console.log(`[findMatchInLiveScoreApi] Попытка 1: events API`)
    const eventsResponse = await fetch(
      `${baseUrl}/api/matches/events?match_id=${matchId}`,
      { next: { revalidate: 300 } },
    )

    console.log(`[findMatchInLiveScoreApi] events API status: ${eventsResponse.status}`)

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json()
      if (eventsData.success && eventsData.data?.match) {
        const match = eventsData.data.match
        console.log(`[findMatchInLiveScoreApi] ✓ Найден в events API:`, {
          id: match.id,
          homeTeam: match.home?.name,
          awayTeam: match.away?.name,
          score: match.scores?.score,
          status: match.status,
        })
        return { source: 'livescore-events', match }
      }
    }

    // Пробуем получить из stats API
    console.log(`[findMatchInLiveScoreApi] Попытка 2: stats API`)
    const statsResponse = await fetch(
      `${baseUrl}/api/matches/stats?match_id=${matchId}`,
      { next: { revalidate: 300 } },
    )

    console.log(`[findMatchInLiveScoreApi] stats API status: ${statsResponse.status}`)

    if (statsResponse.ok) {
      const statsData = await statsResponse.json()
      if (statsData.success && statsData.data) {
        console.log(`[findMatchInLiveScoreApi] ✓ Найден в stats API`)
        // Для stats API данные о матче могут быть в другом формате
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

    // Пробуем получить из history API
    console.log(`[findMatchInLiveScoreApi] Попытка 3: history API`)
    const historyResponse = await fetch(
      `${baseUrl}/api/matches/history?match_id=${matchId}`,
      { next: { revalidate: 300 } },
    )

    console.log(`[findMatchInLiveScoreApi] history API status: ${historyResponse.status}`)

    if (historyResponse.ok) {
      const historyData = await historyResponse.json()
      if (historyData.success && historyData.data) {
        const match = Array.isArray(historyData.data.matches)
          ? historyData.data.matches.find((m: any) => m.id === matchId)
          : historyData.data
        if (match) {
          console.log(`[findMatchInLiveScoreApi] ✓ Найден в history API:`, {
            id: match.id,
            homeId: match.home?.id,
            awayId: match.away?.id,
            date: match.date,
          })
          return { source: 'livescore-history', match }
        }
      }
    }

    console.log(`[findMatchInLiveScoreApi] ✗ Матч не найден ни в одном LiveScore API`)
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
  console.log('='.repeat(80))
  console.log('[findMatch] Начало поиска матча с параметрами:', {
    date: params.date,
    homeTeamId: params.homeTeamId,
    awayTeamId: params.awayTeamId,
    fixtureId: params.fixtureId,
    matchId: params.matchId,
  })
  console.log('='.repeat(80))

  // Если указан matchId, ищем сначала в Payload (приоритет), затем в LiveScore API
  // matchId — это гарантия, что матч существует, валидация не нужна
  if (params.matchId) {
    console.log(`[findMatch] Режим поиска: по matchId=${params.matchId}`)
    
    // ПРИОРИТЕТ 1: Payload CMS (наша база данных)
    console.log(`[findMatch] Шаг 1: Поиск в Payload CMS (приоритетный источник)`)
    const payloadMatch = await findMatchInPayloadById(params.matchId)
    if (payloadMatch) {
      console.log(`[findMatch] ✓ Матч найден в Payload (приоритетный источник):`, {
        matchId: payloadMatch.matchId,
        homeTeam: payloadMatch.homeTeam,
        awayTeam: payloadMatch.awayTeam,
        date: payloadMatch.date,
      })
      return { source: 'payload', match: payloadMatch }
    }

    // ПРИОРИТЕТ 2: LiveScore API (резервный источник)
    console.log(`[findMatch] Шаг 2: Поиск в LiveScore API (резервный источник)`)
    const liveScoreResult = await findMatchInLiveScoreApi(params.matchId)
    if (liveScoreResult) {
      console.log(`[findMatch] ✓ Матч найден в LiveScore API (резервный источник)`)
      return liveScoreResult
    }

    console.log(`[findMatch] ✗ Матч с matchId=${params.matchId} не найден ни в Payload, ни в LiveScore API`)
    return null
  }

  // Определяем, где искать на основе даты
  console.log(`[findMatch] Режим поиска: по дате и командам`)
  const matchDate = new Date(params.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  matchDate.setHours(0, 0, 0, 0)

  const isFutureOrToday = matchDate >= today
  console.log(`[findMatch] Дата матча: ${params.date}, сегодня: ${today.toISOString().split('T')[0]}, isFutureOrToday: ${isFutureOrToday}`)

  if (isFutureOrToday) {
    // Дата в будущем или сегодня: fixtures → live → history
    console.log(`[findMatch] Стратегия: fixtures → live → history`)
    
    console.log(`[findMatch] Шаг 1: Поиск в fixtures`)
    let fixturesResult = await findMatchInFixtures(params)
    if (fixturesResult && fixturesResult.match) {
      console.log(`[findMatch] ✓ Найден в fixtures`)
      return { source: 'fixtures', match: fixturesResult.match, debug: fixturesResult }
    }

    console.log(`[findMatch] Шаг 2: Поиск в live`)
    let liveMatch = await findMatchInLive(params)
    if (liveMatch) {
      console.log(`[findMatch] ✓ Найден в live`)
      return { source: 'live', match: liveMatch }
    }

    console.log(`[findMatch] Шаг 3: Поиск в history`)
    let historyMatch = await findMatchInHistory(params)
    if (historyMatch) {
      console.log(`[findMatch] ✓ Найден в history`)
      return { source: 'history', match: historyMatch }
    }
  } else {
    // Дата в прошлом: history → live → fixtures (НЕ ищем в Payload для избежания неправильных редиректов)
    console.log(`[findMatch] Стратегия: history → live → fixtures`)
    
    console.log(`[findMatch] Шаг 1: Поиск в history`)
    let historyMatch = await findMatchInHistory(params)
    if (historyMatch) {
      console.log(`[findMatch] ✓ Найден в history`)
      return { source: 'history', match: historyMatch }
    }

    console.log(`[findMatch] Шаг 2: Поиск в live`)
    let liveMatch = await findMatchInLive(params)
    if (liveMatch) {
      console.log(`[findMatch] ✓ Найден в live`)
      return { source: 'live', match: liveMatch }
    }

    console.log(`[findMatch] Шаг 3: Поиск в fixtures`)
    let fixturesResult = await findMatchInFixtures(params)
    if (fixturesResult && fixturesResult.match) {
      console.log(`[findMatch] ✓ Найден в fixtures`)
      return { source: 'fixtures', match: fixturesResult.match, debug: fixturesResult }
    }

    // НЕ ищем в Payload без matchId - это может привести к неправильным редиректам
    console.log(`[findMatch] ✗ Payload пропущен - поиск только по matchId`)
  }

  console.log(`[findMatch] ✗ Матч не найден ни в одном источнике`)
  console.log('='.repeat(80))
  return null
}

/**
 * Генерирует slug для редиректа с matchId
 */
function generateSlugWithMatchId(params: MatchParams, matchId: number): string {
  return `${params.homeTeamSlug}-${params.awayTeamSlug}_${params.date}_${params.homeTeamId}_${params.awayTeamId}_${params.fixtureId}_${matchId}`
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
  
  // Получаем реальный matchId из результата поиска (НЕ fixtureId!)
  const realMatchId = match.id || match.matchId
  
  // Редирект только если:
  // 1. Найден реальный matchId из LiveScore API
  // 2. В URL нет matchId 
  // 3. realMatchId отличается от fixtureId (чтобы не было циклических редиректов)
  if (realMatchId && !parsed.matchId && realMatchId !== parsed.fixtureId) {
    console.log(`[MatchV2Page] Делаем редирект с matchId:`, {
      realMatchId,
      fixtureId: parsed.fixtureId,
      source: result.source,
    })
    const newSlug = generateSlugWithMatchId(parsed, realMatchId)
    redirect(`/matches-v2/${newSlug}`)
  }
  
  // Используем realMatchId для отображения
  const matchId = realMatchId

  const homeTeam = match.home?.name || match.home_team?.name || match.homeTeam || 'Команда 1'
  const awayTeam = match.away?.name || match.away_team?.name || match.awayTeam || 'Команда 2'
  const status = match.status || match.time || 'scheduled'
  const score = match.scores?.score || match.score || null
  const competition = match.competition?.name || match.competition || null

  return (
    <Section>
      <Container className="space-y-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="mb-4 text-2xl font-semibold tracking-tight">
            {homeTeam} - {awayTeam}
          </h1>

          <div className="space-y-4">
            {/* Основная информация о матче */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 py-6">
              {/* Команда дома */}
              <div className="text-center">
                <div className="font-semibold text-lg">{homeTeam}</div>
                <div className="text-sm text-muted-foreground">Дома</div>
              </div>

              {/* Счет */}
              <div className="text-center">
                {score ? (
                  <div className="text-4xl font-bold font-mono">{score}</div>
                ) : (
                  <div className="text-2xl font-bold text-muted-foreground">vs</div>
                )}
                <div className="text-sm text-muted-foreground mt-2">
                  {parsed.date}
                </div>
              </div>

              {/* Команда гостей */}
              <div className="text-center">
                <div className="font-semibold text-lg">{awayTeam}</div>
                <div className="text-sm text-muted-foreground">В гостях</div>
              </div>
            </div>

            {/* Дополнительная информация */}
            <div className="border-t pt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              {competition && (
                <p>
                  <strong>Турнир:</strong> {competition}
                </p>
              )}
              <p>
                <strong>Статус:</strong> {status}
              </p>
              <p>
                <strong>Источник:</strong> {result.source}
              </p>
              {matchId && (
                <p>
                  <strong>Match ID:</strong> {matchId}
                </p>
              )}
            </div>
          </div>

          {/* Отладочная информация */}
          {result.debug && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Отладочная информация API</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Запрос к API:</h4>
                  <code className="block p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-xs break-all">
                    {result.debug.apiUrl}
                  </code>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Результат поиска:</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Найдено фикстур:</strong> {result.debug.totalFixtures}</p>
                    <p><strong>Матч найден:</strong> {result.debug.match ? '✅ Да' : '❌ Нет'}</p>
                    {result.debug.error && (
                      <p><strong>Ошибка:</strong> <span className="text-red-600">{result.debug.error}</span></p>
                    )}
                  </div>
                </div>
              </div>
              
              {result.debug.response && (
                <div className="space-y-2">
                  <h4 className="font-medium">Полный ответ API:</h4>
                  <pre className="overflow-auto rounded bg-neutral-100 p-4 text-xs dark:bg-neutral-800 max-h-96">
                    {JSON.stringify(result.debug.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Данные матча</h3>
            <pre className="overflow-auto rounded bg-neutral-100 p-4 text-xs dark:bg-neutral-800">
              {JSON.stringify(match, null, 2)}
            </pre>
          </div>
        </div>

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
