/**
 * Shared API functions for live matches
 * These functions can be used directly in Server Components without HTTP fetch
 */

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { payloadDocToApiFormat, type ApiFixture } from './fixtures'

// Types
export interface LiveMatch {
  id: string | number
  date: string
  matchTime?: string
  homeTeam: {
    id: string | number
    name: string
    logo?: string
  }
  awayTeam: {
    id: string | number
    name: string
    logo?: string
  }
  homeScore?: number
  awayScore?: number
  score?: {
    home: number
    away: number
  }
  status: string
  minute?: number
  competition?: {
    id: string | number
    name: string
  }
  venue?: {
    name?: string
    city?: string
  }
  time?: string
}

export interface LiveMatchesResult {
  matches: LiveMatch[]
  lastUpdated: string
  error?: string
}

/**
 * Fetch live matches from Payload
 * Can be used directly in Server Components
 */
export async function fetchLiveMatches(options: {
  size?: number
  competitionId?: number
} = {}): Promise<LiveMatchesResult> {
  try {
    const { size = 50, competitionId } = options

    const payload = await getPayload({ config: await configPromise })

    // Build where conditions
    const whereConditions: Record<string, unknown> = {
      status: { equals: 'live' },
    }

    if (competitionId) {
      whereConditions['competition.competitionId'] = { equals: competitionId }
    }

    const result = await payload.find({
      collection: 'fixtures',
      where: whereConditions as Parameters<typeof payload.find>[0]['where'],
      sort: 'date',
      limit: Math.min(size, 200),
      depth: 1,
    })

    const matches: LiveMatch[] = result.docs.map((doc) => {
      const docRecord = doc as unknown as Record<string, unknown>
      const normalized = payloadDocToApiFormat(doc) as ApiFixture
      const homeTeam = docRecord.homeTeam as Record<string, unknown> | undefined
      const awayTeam = docRecord.awayTeam as Record<string, unknown> | undefined
      const competition = docRecord.competition as Record<string, unknown> | undefined
      const venue = docRecord.venue as Record<string, unknown> | undefined

      const homeTeamId = homeTeam?.teamId || homeTeam?.id || 0
      const awayTeamId = awayTeam?.teamId || awayTeam?.id || 0

      return {
        id: (normalized.fixtureId || normalized.id) as string | number,
        date: normalized.date,
        matchTime: normalized.time,
        homeTeam: {
          id: homeTeamId as string | number,
          name: String(homeTeam?.name || 'Команда 1'),
          logo: (homeTeam?.logo as string) || undefined,
        },
        awayTeam: {
          id: awayTeamId as string | number,
          name: String(awayTeam?.name || 'Команда 2'),
          logo: (awayTeam?.logo as string) || undefined,
        },
        score: {
          home: Number(docRecord.homeScore || docRecord.home_score || 0),
          away: Number(docRecord.awayScore || docRecord.away_score || 0),
        },
        homeScore: Number(docRecord.homeScore || docRecord.home_score || 0),
        awayScore: Number(docRecord.awayScore || docRecord.away_score || 0),
        status: String(docRecord.status || 'live'),
        competition: competition
          ? {
              id: (competition.competitionId || competition.id) as string | number,
              name: String(competition.name || 'Неизвестная лига'),
            }
          : undefined,
        venue: venue
          ? {
              name: (venue.name as string) || undefined,
              city: (venue.city as string) || undefined,
            }
          : undefined,
      }
    })

    console.log(`[fetchLiveMatches] Returning ${matches.length} live matches`)

    return {
      matches,
      lastUpdated: new Date().toISOString(),
    }
  } catch (e) {
    console.error('[fetchLiveMatches] error:', e)
    return {
      matches: [],
      lastUpdated: new Date().toISOString(),
      error: 'failed',
    }
  }
}

/**
 * Fetch live matches for a specific competition
 */
export async function fetchLiveMatchesByCompetition(
  competitionExtId: string,
): Promise<LiveMatchesResult> {
  const competitionId = Number(competitionExtId)
  if (!Number.isFinite(competitionId)) {
    return { matches: [], lastUpdated: new Date().toISOString(), error: 'Invalid competition ID' }
  }
  return fetchLiveMatches({ competitionId })
}
