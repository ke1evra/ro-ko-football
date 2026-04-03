/**
 * Server Component: Fetches upcoming matches server-side
 * 
 * This component:
 * 1. Fetches fixtures from LiveScore API on the server
 * 2. Normalizes and filters future matches
 * 3. Passes pre-fetched data to client component for pagination
 * 4. Tracks loading/error state for proper SSR rendering
 */

import { getFixturesMatchesJson } from '@/app/(frontend)/client'

type SimpleFixture = {
  id: number
  date: string
  time?: string
  home: string
  away: string
  homeId?: number
  awayId?: number
  competitionName?: string
}

export type { SimpleFixture }

interface ClientProps {
  initialMatches: SimpleFixture[]
  initialVisible?: number
  pageSize?: number
  /** Error message if data failed to load */
  error?: string | null
  /** Whether initial load failed */
  hasError?: boolean
}

/**
 * Result type for fetch with error tracking
 */
interface FetchResult {
  matches: SimpleFixture[]
  error: string | null
}

/**
 * Fetch and normalize upcoming matches for the widget
 */
async function fetchUpcomingMatches(): Promise<FetchResult> {
  try {
    // Use skipCache: true for Server Components to bypass memory cache
    // This ensures fresh data is fetched on each SSR request
    console.log('[UpcomingAllMatchesWidget] Fetching fixtures with skipCache=true...')
    console.log('[UpcomingAllMatchesWidget] ENV check - LIVESCORE_API_BASE:', process.env.LIVESCORE_API_BASE ? 'set' : 'NOT SET')
    console.log('[UpcomingAllMatchesWidget] ENV check - LIVESCORE_KEY:', process.env.LIVESCORE_KEY ? 'set' : 'NOT SET')

    const res = await getFixturesMatchesJson({ size: 100 }, {
      skipCache: true,
    })

    console.log('[UpcomingAllMatchesWidget] API response status:', res.status)
    console.log('[UpcomingAllMatchesWidget] API response data:', JSON.stringify(res.data).slice(0, 500))

    const data = res.data as any
    const fixtures = (data?.data?.fixtures || data?.fixtures || []) as any[]

    console.log('[UpcomingAllMatchesWidget] Raw fixtures count:', fixtures.length)

    const normalized: SimpleFixture[] = fixtures
      .map((fx: any) => ({
        id: Number(fx?.id ?? fx?.fixtureId ?? fx?.fixture_id),
        date: String(fx?.date ?? fx?.fixture_date ?? fx?.fixtureDate ?? ''),
        time:
          typeof fx?.time === 'string'
            ? fx.time
            : typeof fx?.fixture_time === 'string'
              ? fx.fixture_time
              : undefined,
        home: (fx?.home?.name ||
          fx?.homeTeam?.name ||
          fx?.home_name ||
          fx?.homeName ||
          'Команда дома') as string,
        away: (fx?.away?.name ||
          fx?.awayTeam?.name ||
          fx?.away_name ||
          fx?.awayName ||
          'Команда гостей') as string,
        homeId:
          Number(fx?.home?.id || fx?.homeTeam?.id || fx?.home_id || fx?.homeId || 0) ||
          undefined,
        awayId:
          Number(fx?.away?.id || fx?.awayTeam?.id || fx?.away_id || fx?.awayId || 0) ||
          undefined,
        competitionName: (fx?.competition?.name || fx?.league?.name || fx?.compName) as
          | string
          | undefined,
      }))
      .filter((m) => Number.isFinite(m.id))

    // Sort by date/time (nearest first)
    const withTime = normalized.map((m) => {
      const tsVal = new Date(`${m.date}T${m.time || '00:00'}Z`).getTime()
      const ts = Number.isFinite(tsVal) ? tsVal : Number.MAX_SAFE_INTEGER
      return { ...m, ts }
    }) as (SimpleFixture & { ts: number })[]

    // Filter only future matches and sort by time
    const now = Date.now()
    const futureMatches = withTime
      .filter((m) => m.ts > now)
      .sort((a, b) => a.ts - b.ts)

    console.log('[UpcomingAllMatchesWidget] Future matches count:', futureMatches.length)
    console.log('[UpcomingAllMatchesWidget] First match if any:', futureMatches[0])

    return { matches: futureMatches, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load matches'
    console.error('[UpcomingAllMatchesWidget] Error fetching matches:', errorMessage, error)
    return { matches: [], error: errorMessage }
  }
}

/**
 * Server Component for upcoming matches
 * 
 * Usage:
 * ```tsx
 * import UpcomingAllMatchesWidget from '@/components/home/UpcomingAllMatchesWidget'
 * 
 * export default async function Page() {
 *   return <UpcomingAllMatchesWidget />
 * }
 * ```
 */
export default async function UpcomingAllMatchesWidget() {
  // Dynamic import to avoid client-side bundling issues
  const { UpcomingMatchesClient } = await import('./UpcomingMatchesClient')

  const { matches, error } = await fetchUpcomingMatches()

  const clientProps: ClientProps = {
    initialMatches: matches,
    initialVisible: 5,
    pageSize: 5,
    error: error,
    hasError: !!error,
  }

  return <UpcomingMatchesClient {...clientProps} />
}
