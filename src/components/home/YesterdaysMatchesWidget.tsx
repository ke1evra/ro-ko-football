import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getPayloadClient } from '@/lib/payload-client'
import { getLeagueNamesMap, getTopMatchesLeagueIds } from '@/lib/leagues'
import { generateMatchUrl } from '@/lib/match-url-utils'
import FinishedMatchesClient, {
  type FinishedMatchItem,
} from '@/components/home/FinishedMatchesClient'

export default async function YesterdaysMatchesWidget({ limit = 200 }: { limit?: number }) {
  const payload = await getPayloadClient()

  // Список лиг из CMS (топ-лиги)
  const allowedCompetitionIds = await getTopMatchesLeagueIds()

  // Фильтрация: только завершённые матчи выбранных лиг
  const where =
    Array.isArray(allowedCompetitionIds) && allowedCompetitionIds.length > 0
      ? {
          and: [
            { status: { equals: 'finished' } },
            { competitionId: { in: allowedCompetitionIds } },
          ],
        }
      : { status: { equals: 'finished' } }

  // Берём последние завершённые матчи из Payload только для выбранных лиг
  const res = await payload.find({
    collection: 'matches',
    where,
    sort: '-date',
    limit,
    depth: 0,
    overrideAccess: true,
  })

  const items = (res.docs || []) as Array<{
    id: string
    matchId: number
    fixtureId?: number
    date: string
    status: string
    homeTeamId?: number
    homeTeam?: string
    awayTeamId?: number
    awayTeam?: string
    homeScore?: number
    awayScore?: number
    competitionId?: number
    competition?: string
    country?: { countryId?: number; name?: string } | null
    lastChangedAt?: string
    updatedAt?: string
    createdAt?: string
  }>

  // Собираем карту названий лиг из Payload
  const competitionIds = Array.from(
    new Set(items.map((m) => m.competitionId).filter((x): x is number => typeof x === 'number')),
  )
  const namesMap = await getLeagueNamesMap(competitionIds)

  // Формируем плоский список, отсортированный по времен�� (без группировки по лигам)
  const sorted = items
    .filter((m) => typeof m.competitionId === 'number')
    .slice()
    .sort((a, b) => {
      const da = new Date(a.date).getTime() || 0
      const db = new Date(b.date).getTime() || 0
      if (db !== da) return db - da
      const ta = Math.max(
        a.lastChangedAt ? new Date(a.lastChangedAt).getTime() : 0,
        a.updatedAt ? new Date(a.updatedAt).getTime() : 0,
        a.createdAt ? new Date(a.createdAt).getTime() : 0,
      )
      const tb = Math.max(
        b.lastChangedAt ? new Date(b.lastChangedAt).getTime() : 0,
        b.updatedAt ? new Date(b.updatedAt).getTime() : 0,
        b.createdAt ? new Date(b.createdAt).getTime() : 0,
      )
      return tb - ta
    })

  const flat: FinishedMatchItem[] = sorted.map((m) => {
    const cid = (m.competitionId as number) || -1
    const leagueTitle = namesMap[cid] || m.competition || `Лига ${cid}`
    const dateOnly =
      typeof m.date === 'string'
        ? m.date.split('T')[0]
        : new Date(m.date as any).toISOString().split('T')[0]
    const url = generateMatchUrl({
      homeTeamName: m.homeTeam || 'Команда дома',
      awayTeamName: m.awayTeam || 'Команда гостей',
      homeTeamId: m.homeTeamId || 0,
      awayTeamId: m.awayTeamId || 0,
      date: dateOnly,
      fixtureId: m.fixtureId || m.matchId,
      matchId: m.matchId || m.fixtureId || 0,
    })

    return {
      id: m.id,
      url,
      date: m.date,
      leagueId: cid,
      leagueTitle,
      countryId: m.country?.countryId,
      countryName: m.country?.name,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние матчи</CardTitle>
      </CardHeader>
      <CardContent>
        {flat.length === 0 ? (
          <div className="text-sm text-muted-foreground">Матчи отсутствуют</div>
        ) : (
          <FinishedMatchesClient items={flat} pageSize={20} />
        )}
      </CardContent>
    </Card>
  )
}
