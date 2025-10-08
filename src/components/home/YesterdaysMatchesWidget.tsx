import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TeamLogo } from '@/components/TeamLogo'
import { getPayloadClient } from '@/lib/payload-client'
import { getLeagueNamesMap, getTopMatchesLeagueIds } from '@/lib/leagues'
import { generateCompletedMatchUrl } from '@/lib/match-urls'
import { CountryFlagImage } from '@/components/CountryFlagImage'

export default async function YesterdaysMatchesWidget({ limit = 30 }: { limit?: number }) {
  const payload = await getPayloadClient()

  // Список лиг из CMS (топ-лиги)
  const allowedCompetitionIds = await getTopMatchesLeagueIds()

  // Условие выборки с учётом топ-лиг
  const where = Array.isArray(allowedCompetitionIds) && allowedCompetitionIds.length > 0
    ? { and: [{ status: { equals: 'finished' } }, { competitionId: { in: allowedCompetitionIds } }] }
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
  }>

  // Собираем карту названий лиг из Payload
  const competitionIds = Array.from(
    new Set(items.map((m) => m.competitionId).filter((x): x is number => typeof x === 'number')),
  )
  const namesMap = await getLeagueNamesMap(competitionIds)

  // Группируем по лигам; порядок групп — как в CMS (allowedCompetitionIds)
  const groups: Record<number, typeof items> = {}
  for (const m of items) {
    const cid = typeof m.competitionId === 'number' ? m.competitionId : -1
    if (cid === -1) continue
    if (!groups[cid]) groups[cid] = []
    groups[cid].push(m)
  }
  const order: number[] =
    Array.isArray(allowedCompetitionIds) && allowedCompetitionIds.length > 0
      ? allowedCompetitionIds.filter((cid) => groups[cid] && groups[cid].length > 0)
      : Object.keys(groups).map((k) => Number(k))

  const total = items.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Последние матчи</CardTitle>
        <CardDescription>
          {total > 0 ? `Показано ${Math.min(total, limit)} из ${total}` : 'Нет данных'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-sm text-muted-foreground">Матчи отсутствуют</div>
        ) : (
          <div className="space-y-4">
            {order.map((cid) => {
              const list = groups[cid] || []
              if (list.length === 0) return null
              const leagueTitle = namesMap[cid] || list[0]?.competition || `Лига ${cid}`
              return (
                <div key={cid}>
                  <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    {/* Флаг страны (если доступен) */}
                    {(() => {
                      // Берём страну из первого матча группы
                      const sample = list[0]
                      const countryId = sample?.country?.countryId
                      const countryName = sample?.country?.name || undefined
                      if (typeof countryId === 'number' && countryId > 0) {
                        return (
                          <CountryFlagImage
                            countryId={countryId}
                            countryName={countryName}
                            size="small"
                            className="w-3 h-3 rounded-sm object-cover flex-shrink-0"
                          />
                        )
                      }
                      return null
                    })()}
                    <span className="truncate">{leagueTitle}</span>
                  </div>
                  <ul className="space-y-2">
                    {list.map((m) => {
                      const homeScore = typeof m.homeScore === 'number' ? String(m.homeScore) : '—'
                      const awayScore = typeof m.awayScore === 'number' ? String(m.awayScore) : '—'

                      const dateOnly = typeof m.date === 'string'
                        ? m.date.split('T')[0]
                        : new Date(m.date as any).toISOString().split('T')[0]

                      const url = generateCompletedMatchUrl(
                        m.homeTeam || 'Команда дома',
                        m.awayTeam || 'Команда гостей',
                        dateOnly,
                        m.homeTeamId || 0,
                        m.awayTeamId || 0,
                        m.fixtureId || m.matchId,
                        m.matchId || (m.fixtureId || 0),
                      )

                      return (
                        <li key={m.id} className="border rounded px-2 py-1 bg-card/50">
                          <Link href={url} className="block hover:text-primary">
                            <div className="grid grid-cols-[24px_1fr_auto] gap-y-1 items-center">
                              <TeamLogo teamId={m.homeTeamId} teamName={m.homeTeam} size="small" />
                              <div className="truncate text-sm font-medium">{m.homeTeam}</div>
                              <div className="text-sm font-semibold tabular-nums pl-2">{homeScore}</div>

                              <TeamLogo teamId={m.awayTeamId} teamName={m.awayTeam} size="small" />
                              <div className="truncate text-sm text-muted-foreground">{m.awayTeam}</div>
                              <div className="text-sm font-semibold tabular-nums pl-2">{awayScore}</div>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
