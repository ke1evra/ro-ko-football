/**
 * Server Component: Fetches matches and league priorities server-side
 * 
 * This component:
 * 1. Fetches fixtures from LiveScore API on the server
 * 2. Fetches league priorities from Payload CMS
 * 3. Passes pre-initialized data to client component for pagination
 * 4. Tracks loading/error state for proper SSR rendering
 */

import { getFixturesMatchesJson } from '@/app/(frontend)/client'
import { getFilteredSidebarLeagues } from '@/lib/leagues'
import type { UpcomingMatch, LeaguePriority } from './WeekFixturesClient'

/**
 * Result type for fetch with error tracking
 */
interface FetchMatchesResult {
  matches: UpcomingMatch[]
  error: string | null
}

/**
 * Fetch league priorities result type
 */
interface FetchLeaguesResult {
  leagues: LeaguePriority[]
  error: string | null
}

/**
 * Fetch upcoming matches for the widget
 */
async function fetchWeekMatches(): Promise<FetchMatchesResult> {
  try {
    // Use skipCache: true for Server Components to bypass memory cache
    // This ensures fresh data is fetched on each SSR request
    console.log('[WeekFixturesGrouped] Fetching fixtures with skipCache=true...')
    
    const res = await getFixturesMatchesJson({ size: 100 }, {
      skipCache: true,
    })

    console.log('[WeekFixturesGrouped] API response status:', res.status)
    console.log('[WeekFixturesGrouped] Raw fixtures count:', (res.data as any)?.data?.fixtures?.length || 0)

    const data = res.data as any
    const fixtures = (data?.data?.fixtures || data?.fixtures || []) as any[]

    // Transform fixtures to UpcomingMatch format
    const matches: UpcomingMatch[] = fixtures.map((fx: any) => {
      // Extract time from various possible fields
      let time = ''
      if (typeof fx?.time === 'string') {
        time = fx.time
      } else if (typeof fx?.fixture_time === 'string') {
        time = fx.fixture_time
      } else if (typeof fx?.scheduled === 'string') {
        time = fx.scheduled.split('T')[1]?.slice(0, 5) || ''
      }

      return {
        id: Number(fx?.id ?? fx?.fixtureId ?? fx?.fixture_id ?? 0),
        date: String(fx?.date ?? fx?.fixture_date ?? fx?.fixtureDate ?? ''),
        time,
        home_team: {
          id: Number(fx?.home?.id ?? fx?.homeTeam?.id ?? fx?.home_id ?? fx?.homeId ?? 0),
          name: String(fx?.home?.name ?? fx?.homeTeam?.name ?? fx?.home_name ?? fx?.homeName ?? 'Команда дома'),
        },
        away_team: {
          id: Number(fx?.away?.id ?? fx?.awayTeam?.id ?? fx?.away_id ?? fx?.awayId ?? 0),
          name: String(fx?.away?.name ?? fx?.awayTeam?.name ?? fx?.away_name ?? fx?.awayName ?? 'Команда гостей'),
        },
        competition: fx?.competition
          ? {
              id: Number(fx.competition.id),
              name: String(fx.competition.name || (fx.competition.cc ?? '')),
            }
          : fx?.league
            ? {
                id: Number(fx.league.id ?? fx.league.ccid ?? fx.league.competitionId ?? 0),
                name: String(fx.league.name || (fx.league.cc ?? '')),
              }
            : undefined,
        location: fx?.location ?? fx?.venue ?? null,
        round: fx?.round ?? fx?.stage ?? undefined,
        group_id: fx?.group_id ?? fx?.groupId ?? null,
        odds: fx?.odds ?? undefined,
        h2h: fx?.h2h ?? undefined,
      }
    }).filter((m) => m.id > 0 && m.date)

    // Sort by date/time (nearest first)
    const withTime = matches.map((m) => {
      const tsVal = new Date(`${m.date}T${m.time || '00:00'}Z`).getTime()
      const ts = Number.isFinite(tsVal) ? tsVal : Number.MAX_SAFE_INTEGER
      return { ...m, ts }
    })

    // Filter only future matches
    const now = Date.now()
    const futureMatches = withTime
      .filter((m) => m.ts > now)
      .sort((a, b) => a.ts - b.ts)

    return { matches: futureMatches, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load matches'
    console.error('[WeekFixturesGrouped] Error fetching matches:', errorMessage, error)
    return { matches: [], error: errorMessage }
  }
}

/**
 * Fetch league priorities from Payload CMS
 */
async function fetchLeaguePriorities(): Promise<FetchLeaguesResult> {
  try {
    const leagues = await getFilteredSidebarLeagues()

    return {
      leagues: leagues.map((item: any) => ({
        id: item.league?.competitionId ?? item.id ?? 0,
        name: item.league?.name ?? item.displayName ?? item.customName ?? '',
        country: item.league?.countryName,
        priority: item.priority ?? 999,
        enabled: item.enabled ?? true,
      })),
      error: null,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load leagues'
    console.error('[WeekFixturesGrouped] Error fetching league priorities:', errorMessage, error)
    return { leagues: [], error: errorMessage }
  }
}

/**
 * Server Component for week fixtures grouped by date and league
 * 
 * Usage:
 * ```tsx
 * import WeekFixturesGrouped from '@/components/home/WeekFixturesGrouped'
 * 
 * export default async function Page() {
 *   return <WeekFixturesGrouped />
 * }
 * ```
 */
export default async function WeekFixturesGrouped() {
  // Dynamic import to avoid client-side bundling issues
  const { WeekFixturesClient } = await import('./WeekFixturesClient')

  // Fetch data in parallel on the server
  const [matchesResult, leaguesResult] = await Promise.all([
    fetchWeekMatches(),
    fetchLeaguePriorities(),
  ])

  // Combine errors from both fetches
  const matchesError = matchesResult.error
  const leaguesError = leaguesResult.error
  const combinedError = matchesError || leaguesError || null

  return (
    <WeekFixturesClient
      matches={matchesResult.matches}
      leaguePriorities={leaguesResult.leagues}
      initialVisibleDates={3}
      pageSize={3}
      error={combinedError}
      hasError={!!combinedError}
    />
  )
}

// Re-export types for backwards compatibility
export type { UpcomingMatch }
