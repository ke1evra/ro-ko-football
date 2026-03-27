import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getMatchesLiveJson } from '@/app/(frontend)/client'

export const dynamic = 'force-dynamic'

function payloadDocToApiFormat(doc: any) {
  const dateIso = doc.date ? new Date(doc.date).toISOString() : ''
  const dateStr = dateIso ? dateIso.split('T')[0] : ''
  return {
    id: doc.fixtureId,
    fixtureId: doc.fixtureId,
    date: dateStr,
    time: doc.time || '',
    homeTeam: doc.homeTeam,
    awayTeam: doc.awayTeam,
    competition: doc.competition,
    league: doc.league,
    status: doc.status,
    odds: doc.odds,
    round: doc.round,
    group: doc.group,
    venue: doc.venue,
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
      const result = await payload.find({
        collection: 'fixtures',
        where: { status: { equals: 'live' } },
        sort: 'date',
        limit: size,
        depth: 0,
      })
      const matches = result.docs.map(payloadDocToApiFormat)
      return NextResponse.json(
        { matches, lastUpdated: new Date().toISOString() },
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

    const andConditions: any[] = [
      { date: { greater_than_equal: fromDate.toISOString() } },
      { date: { less_than_equal: toDate.toISOString() } },
    ]

    if (!includeAll && explicitCompetition) {
      // Фильтр по competitionId (новое имя поля после переименования)
      andConditions.push({ 'competition.competitionId': { equals: Number(explicitCompetition) } })
    }

    const result = await payload.find({
      collection: 'fixtures',
      where: { and: andConditions },
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
