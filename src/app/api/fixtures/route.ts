import { NextRequest, NextResponse } from 'next/server'
import { getFixturesMatchesJson, getMatchesLiveJson } from '@/app/(frontend)/client'
import { getPriorityLeagueIds } from '@/lib/highlight-competitions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    let dateParam = (searchParams.get('date') || 'today') as any

    // Всегда используем today для получения актуальных матчей
    if (typeof dateParam === 'string' && dateParam !== 'today') {
      console.log('[fixtures] converting date', dateParam, 'to today for actual matches')
      dateParam = 'today'
    }

    let size = Number(searchParams.get('size') || '30')
    if (!Number.isFinite(size) || size <= 0) size = 30
    size = Math.min(size, 100)

    // Поддержка live=true: в этом режиме возвращаем live‑матчи
    const live = searchParams.get('live') === 'true'

    // Получаем ID приоритетных лиг или используем явно переданный competition_id; поддерживаем флаг all=true для всех лиг
    const includeAll = searchParams.get('all') === 'true'
    const explicitCompetition = searchParams.get('competition_id')

    const ac = new AbortController()
    const to = setTimeout(() => ac.abort(), 8000)

    if (live) {
      const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
      const liveParams: any = { page, lang: 'ru' }
      if (!includeAll) {
        liveParams.competition_id = explicitCompetition || getPriorityLeagueIds().join(',')
      }

      console.log(
        '[fixtures/live] using',
        includeAll ? 'ALL competitions' : `competition_id: ${liveParams.competition_id}`,
        'page:', page
      )

      const res = await getMatchesLiveJson(
        liveParams,
        { cache: 'no-store', next: { revalidate: 0 }, signal: ac.signal },
      )
      clearTimeout(to)

      const matches = (res.data?.data?.match || []) as any[]
      console.log('[fixtures/live] matches count:', matches.length)

      return NextResponse.json(
        { matches, lastUpdated: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } },
      )
    }

    const params: any = { date: dateParam, size }
    if (!includeAll) {
      params.competition_id = explicitCompetition || getPriorityLeagueIds().join(',')
    }

    console.log(
      '[fixtures] using',
      includeAll ? 'ALL competitions' : `competition_id: ${params.competition_id}`,
      'date:', dateParam, 'size:', size
    )

    const res = await getFixturesMatchesJson(
      params,
      { cache: 'no-store', next: { revalidate: 0 }, signal: ac.signal },
    )
    clearTimeout(to)
    
    const fixtures = (res.data?.data?.fixtures || []) as any[]
    console.log('[fixtures] fixtures count:', fixtures.length)

    return NextResponse.json(
      { fixtures, lastUpdated: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (e) {
    console.error('[fixtures] api error:', e)
    return NextResponse.json({ fixtures: [], error: 'failed' }, { status: 500 })
  }
}
