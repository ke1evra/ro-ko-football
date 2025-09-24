import { NextRequest, NextResponse } from 'next/server'
import { getFixturesMatchesJson } from '@/app/(frontend)/client'
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

    // Получаем ID приоритетных лиг или используем явно переданный competition_id
    const explicitCompetition = searchParams.get('competition_id')
    const competition_id = explicitCompetition || getPriorityLeagueIds().join(',')

    console.log('[fixtures] using competition_id:', competition_id, 'date:', dateParam, 'size:', size)

    const ac = new AbortController()
    const to = setTimeout(() => ac.abort(), 8000)
    
    const res = await getFixturesMatchesJson(
      { date: dateParam, size, competition_id },
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
