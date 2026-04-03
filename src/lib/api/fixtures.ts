/**
 * Shared API functions for fixtures
 * These functions can be used directly in Server Components without HTTP fetch
 */

import { getPayload } from 'payload'
import configPromise from '@payload-config'

// Types
export interface TeamData {
  id: unknown
  name: unknown
  logo: unknown | null
}

export interface CompetitionData {
  id: unknown
  name: unknown
}

export interface ApiFixture {
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

export interface FixturesResult {
  fixtures: ApiFixture[]
  lastUpdated: string
  error?: string
}

/**
 * Convert Payload document to API format
 */
export function payloadDocToApiFormat(doc: unknown): ApiFixture {
  const docRecord = doc as Record<string, unknown>
  const dateIso = docRecord.date ? new Date(docRecord.date as string).toISOString() : ''
  const dateStr = dateIso ? dateIso.split('T')[0] : ''

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

/**
 * Fetch upcoming fixtures from Payload
 * Can be used directly in Server Components
 */
export async function fetchFixtures(options: {
  size?: number
  live?: boolean
  competitionId?: number
  includeAll?: boolean
  date?: string
} = {}): Promise<FixturesResult> {
  try {
    const { size = 60, live = false, competitionId, includeAll = false, date } = options

    const payload = await getPayload({ config: await configPromise })

    if (live) {
      const result = await payload.find({
        collection: 'fixtures',
        where: { status: { equals: 'live' } },
        sort: 'date',
        limit: Math.min(size, 200),
        depth: 0,
      })
      const fixtures = result.docs.map(payloadDocToApiFormat)
      return {
        fixtures,
        lastUpdated: new Date().toISOString(),
      }
    }

    // Date range calculation
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    let fromDate: Date
    let toDate: Date

    if (date && date !== 'today') {
      fromDate = new Date(date)
      fromDate.setUTCHours(0, 0, 0, 0)
      toDate = new Date(date)
      toDate.setUTCHours(23, 59, 59, 999)
    } else {
      fromDate = today
      toDate = new Date(today)
      toDate.setDate(today.getDate() + 9)
      toDate.setUTCHours(23, 59, 59, 999)
    }

    // Build where conditions
    const whereConditions: Record<string, unknown> = {
      and: [
        { date: { greater_than_equal: fromDate.toISOString() } },
        { date: { less_than_equal: toDate.toISOString() } },
      ],
    }

    if (!includeAll && competitionId) {
      const andArray = whereConditions.and as Array<Record<string, unknown>>
      andArray.push({ 'competition.competitionId': { equals: competitionId } })
    }

    const result = await payload.find({
      collection: 'fixtures',
      where: whereConditions as Parameters<typeof payload.find>[0]['where'],
      sort: 'date',
      limit: Math.min(size, 200),
      depth: 0,
    })

    const fixtures = result.docs.map(payloadDocToApiFormat)
    console.log(`[fetchFixtures] Payload returned ${fixtures.length} fixtures`)

    return {
      fixtures,
      lastUpdated: new Date().toISOString(),
    }
  } catch (e) {
    console.error('[fetchFixtures] payload error:', e)
    return {
      fixtures: [],
      lastUpdated: new Date().toISOString(),
      error: 'failed',
    }
  }
}

/**
 * Fetch fixtures for a specific league/season
 */
export async function fetchFixturesByLeague(
  league: string,
  season: string,
  date?: string,
): Promise<FixturesResult> {
  const competitionId = Number(league)
  if (!Number.isFinite(competitionId)) {
    return { fixtures: [], lastUpdated: new Date().toISOString(), error: 'Invalid league ID' }
  }
  return fetchFixtures({ competitionId, size: 60, date })
}
