import { NextRequest, NextResponse } from 'next/server'
import {
  getFixturesMatchesJson,
  getMatchesLiveJson,
} from '@/app/(frontend)/client'

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  try {
    const { fixtureId } = await params
    const id = Number(fixtureId)

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid fixture ID' }, { status: 400 })
    }

    // Сначала пробуем точечный метод: live/предматч по fixture_id
    try {
      const liveResp = await getMatchesLiveJson({ fixture_id: id })
      const liveList = (liveResp.data?.data?.match || []) as Array<any>
      const m = liveList[0]
      if (m) {
        const homeName = m.home?.name || 'Команда дома'
        const awayName = m.away?.name || 'Команда гостей'
        const normalized = {
          id: Number(m.fixture_id || id),
          date: String(m.date || ''),
          time: String(m.time || ''),
          home: { id: Number(m.home?.id || '0'), name: homeName },
          away: { id: Number(m.away?.id || '0'), name: awayName },
          competition: m.competition
            ? { id: Number(m.competition.id || '0'), name: m.competition.name || '' }
            : undefined,
          location: typeof m.location === 'string' ? m.location : null,
          round:
            typeof m.round === 'string' ? m.round : m.round != null ? String(m.round) : undefined,
          group_id: m.group_id != null ? Number(m.group_id) : null,
          odds: m.odds,
          h2h: m.urls?.head2head || undefined,
          status: m.status,
          time_status: m.time_status ?? null,
          match_id: Number(m.id || 0) || undefined,
          scores: m.scores,
          added: m.added,
          last_changed: m.last_changed,
          outcomes: m.outcomes,
          urls: m.urls,
        }
        return NextResponse.json(normalized)
      }
    } catch {
      // игнорируем и пробуем fixtures
    }

    // Фоллбэк: ищем в расписании ближайшей недели (fixtures)
    const now = new Date()
    const start = new Date(now.toISOString().split('T')[0])
    const end = new Date(
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    )

    let page = 1
    const maxPages = 8

    while (page <= maxPages) {
      const resp = await getFixturesMatchesJson({ from: start, to: end, size: 100, page })
      const fixtures = (resp.data?.data?.fixtures || []) as Array<any>

      const found = fixtures.find((fx) => Number(fx?.id) === id)
      if (found) {
        const fx = found
        const homeName = fx.home?.name || fx.home_team?.name || fx.home_name || 'Команда дома'
        const awayName = fx.away?.name || fx.away_team?.name || fx.away_name || 'Команда гостей'

        const normalized = {
          id: Number(fx.id),
          date: String(fx.date || ''),
          time: String(fx.time || ''),
          home: { id: Number(fx.home?.id || fx.home_team?.id || fx.home_id || '0'), name: homeName },
          away: { id: Number(fx.away?.id || fx.away_team?.id || fx.away_id || '0'), name: awayName },
          competition: fx.competition
            ? { id: Number(fx.competition.id || '0'), name: fx.competition.name || '' }
            : undefined,
          location: typeof fx.location === 'string' ? fx.location : fx.venue?.name || null,
          round:
            typeof fx.round === 'string' ? fx.round : fx.round != null ? String(fx.round) : undefined,
          group_id: fx.group_id != null ? Number(fx.group_id) : null,
          odds: fx.odds,
          h2h: typeof fx.h2h === 'string' ? fx.h2h : undefined,
        }
        return NextResponse.json(normalized)
      }

      const nextURL = resp.data?.data?.next_page as string | null | undefined
      if (!nextURL) break
      page += 1
    }

    return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })

  } catch (error) {
    console.error('Error fetching fixture:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}