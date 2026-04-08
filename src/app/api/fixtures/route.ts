import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { loggedFetch } from '@/lib/http/livescore/logged-fetch'
import type { GetMatchesLiveJson200 } from '@/app/(frontend)/client/types/GetMatchesLiveJson'

export const dynamic = 'force-dynamic'

interface TeamData {
  id: unknown
  name: unknown
  logo: unknown | null
}

interface CompetitionData {
  id: unknown
  name: unknown
}

interface ApiFixture {
  id: unknown
  fixtureId: unknown
  date: string
  time: string
  home: TeamData
  away: TeamData
  homeTeam: unknown
  awayTeam: unknown
  home_id: unknown
  away_id: unknown
  home_name: unknown
  away_name: unknown
  home_logo: unknown | null
  away_logo: unknown | null
  competition: CompetitionData | undefined
  league: unknown
  status: unknown
  odds: unknown
  round: unknown
  group: unknown
  venue: unknown
}

function payloadDocToApiFormat(doc: unknown): ApiFixture {
  const docRecord = doc as Record<string, unknown>
  const dateIso = docRecord.date ? new Date(docRecord.date as string).toISOString() : ''
  const dateStr = dateIso ? dateIso.split('T')[0] : ''

  // Преобразование homeTeam и awayTeam в структуру, совместимую с компонентами
  const homeTeam = docRecord.homeTeam as Record<string, unknown> | undefined
  const awayTeam = docRecord.awayTeam as Record<string, unknown> | undefined
  const competition = docRecord.competition as Record<string, unknown> | undefined

  const home: TeamData = {
    id: homeTeam?.teamId,
    name: homeTeam?.name,
    logo: homeTeam?.logo || null,
  }

  const away: TeamData = {
    id: awayTeam?.teamId,
    name: awayTeam?.name,
    logo: awayTeam?.logo || null,
  }

  // Преобразование competition в структуру с id и name
  const normalizedCompetition: CompetitionData | undefined = competition
    ? {
        id: competition.competitionId,
        name: competition.name,
      }
    : undefined

  return {
    id: docRecord.fixtureId,
    fixtureId: docRecord.fixtureId,
    date: dateStr,
    time: (docRecord.time as string) || '',
    home,
    away,
    homeTeam: docRecord.homeTeam,
    awayTeam: docRecord.awayTeam,
    home_id: home.id,
    away_id: away.id,
    home_name: home.name,
    away_name: away.name,
    home_logo: home.logo,
    away_logo: away.logo,
    competition: normalizedCompetition,
    league: docRecord.league,
    status: docRecord.status,
    odds: docRecord.odds,
    round: docRecord.round,
    group: docRecord.group,
    venue: docRecord.venue,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    let size = Number(searchParams.get('size') || '60')
    if (!Number.isFinite(size) || size <= 0) size = 60
    size = Math.min(size, 200)

    const live = searchParams.get('live') === 'true'
    const explicitCompetition = searchParams.get('competition_id')
    const includeAll = searchParams.get('all') === 'true'
    const dateParam = searchParams.get('date')

    const payload = await getPayload({ config: await configPromise })

    if (live) {
      console.log(`[API /fixtures] Fetching live matches with size=${size}`)
      const result = await payload.find({
        collection: 'fixtures',
        where: { status: { equals: 'live' } },
        sort: 'date',
        limit: size,
        depth: 0,
      })
      console.log(`[API /fixtures] Found ${result.docs.length} live matches in database`)

      // If no live matches in database, fetch from LiveScore API
      if (result.docs.length === 0) {
        console.log('[API /fixtures] No matches in DB, fetching from LiveScore API...')
        try {
          const apiResponse = await loggedFetch.get<GetMatchesLiveJson200>(
            '/matches/live.json',
            {},
            { source: 'api-route', ttl: 30000 }
          )

          if (apiResponse?.data?.match && Array.isArray(apiResponse.data.match)) {
            const apiMatches = apiResponse.data.match.slice(0, size).map((match: any) => ({
              id: match.id,
              fixtureId: match.fixture_id || match.id,
              date: match.date,
              time: match.time,
              home: {
                id: match.home?.id,
                name: match.home?.name || 'Команда дома',
                logo: match.home?.logo || null,
              },
              away: {
                id: match.away?.id,
                name: match.away?.name || 'Команда гостей',
                logo: match.away?.logo || null,
              },
              homeTeam: match.home,
              awayTeam: match.away,
              home_id: match.home?.id,
              away_id: match.away?.id,
              home_name: match.home?.name,
              away_name: match.away?.name,
              home_logo: match.home?.logo || null,
              away_logo: match.away?.logo || null,
              competition: match.competition
                ? {
                    id: match.competition.id,
                    name: match.competition.name,
                  }
                : undefined,
              league: null,
              status: 'live',
              odds: match.odds,
              round: match.round,
              group: match.group_id,
              venue: match.location ? { name: match.location, city: null, country: match.country?.name } : null,
              scores: match.scores,
            }))
            console.log(`[API /fixtures] Returning ${apiMatches.length} matches from LiveScore API`)
            return NextResponse.json(
              { matches: apiMatches, lastUpdated: new Date().toISOString(), source: 'livescore-api' },
              { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } },
            )
          }
        } catch (apiError) {
          console.error('[API /fixtures] Error fetching from LiveScore API:', apiError)
        }
      }

      const fixtures = result.docs.map(payloadDocToApiFormat)
      return NextResponse.json(
        { matches: fixtures, lastUpdated: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } },
      )
    }

    // Date range: specific date or today + 10 days (синхронизировано с sync-fixtures.mjs)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    let fromDate: Date
    let toDate: Date

    if (dateParam && dateParam !== 'today') {
      fromDate = new Date(dateParam)
      fromDate.setUTCHours(0, 0, 0, 0)
      toDate = new Date(dateParam)
      toDate.setUTCHours(23, 59, 59, 999)
    } else {
      fromDate = today
      toDate = new Date(today)
      toDate.setDate(today.getDate() + 9) // +9 дней = 10 дней всего (сегодня + 9)
      toDate.setUTCHours(23, 59, 59, 999)
    }

    // Построение условий фильтрации для Payload
    // Используем as any для совместимости с типом Where из Payload
    // TODO: Заменить на правильный тип Where когда будет обновлена типизация Payload
    const whereConditions = {
      and: [
        { date: { greater_than_equal: fromDate.toISOString() } },
        { date: { less_than_equal: toDate.toISOString() } },
      ],
    }

    if (!includeAll && explicitCompetition) {
      // Фильтр по competitionId (новое имя поля после переименования)
      const andArray = whereConditions.and as Array<Record<string, unknown>>
      andArray.push({ 'competition.competitionId': { equals: Number(explicitCompetition) } })
    }

    const result = await payload.find({
      collection: 'fixtures',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: whereConditions as any,
      sort: 'date',
      limit: size,
      depth: 0,
    })

    const fixtures = result.docs.map(payloadDocToApiFormat)
    console.log(`[fixtures] Payload returned ${fixtures.length} fixtures`)

    return NextResponse.json(
      { fixtures, lastUpdated: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (e) {
    console.error('[fixtures] payload error:', e)
    return NextResponse.json({ fixtures: [], error: 'failed' }, { status: 500 })
  }
}
