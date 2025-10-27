import { NextRequest, NextResponse } from 'next/server'
import { getFixturesMatchesJson, getMatchesLiveJson } from '@/app/(frontend)/client'
import { getTopMatchesLeagueIds } from '@/lib/leagues'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Поддержка диапазона дат: если передан конкретный date, используем его, иначе диапазон 7 дней
    const dateParam = searchParams.get('date')
    const useDateRange = !dateParam || dateParam === 'today'

    let size = Number(searchParams.get('size') || '60')
    if (!Number.isFinite(size) || size <= 0) size = 60
    size = Math.min(size, 100)

    // Поддержка live=true: в этом режиме возвращаем live‑матчи
    const live = searchParams.get('live') === 'true'

    // Получаем ID приоритетных лиг или используем явно переданный competition_id; поддерживаем флаг all=true для всех лиг
    const includeAll = searchParams.get('all') === 'true'
    const explicitCompetition = searchParams.get('competition_id')

    // Получаем ID лиг из Payload CMS
    let priorityLeagueIds: number[] = []
    try {
      priorityLeagueIds = await getTopMatchesLeagueIds()
      console.log('[fixtures] Priority leagues from CMS:', priorityLeagueIds)
    } catch (error) {
      console.error('[fixtures] Ошибка загрузки лиг из CMS:', error)
      // Если CMS недоступен, используем пустой массив (будут загружены все матчи)
      priorityLeagueIds = []
    }

    const ac = new AbortController()
    const to = setTimeout(() => ac.abort(), 8000)

    if (live) {
      const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
      const liveParams: any = { page, lang: 'ru' }
      if (!includeAll && (explicitCompetition || priorityLeagueIds.length > 0)) {
        liveParams.competition_id = explicitCompetition || priorityLeagueIds.join(',')
      }

      console.log(
        '[fixtures/live] using',
        includeAll ? 'ALL competitions' : `competition_id: ${liveParams.competition_id}`,
        'page:',
        page,
      )

      const res = await getMatchesLiveJson(liveParams, {
        cache: 'no-store',
        next: { revalidate: 0 },
        signal: ac.signal,
      })
      clearTimeout(to)

      const matches = (res.data?.data?.match || []) as any[]
      console.log('[fixtures/live] matches count:', matches.length)

      return NextResponse.json(
        { matches, lastUpdated: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } },
      )
    }

    // Формируем параметры запроса
    const params: any = { size, lang: 'ru' }

    if (useDateRange) {
      // Используем диапазон дат: сегодня + 7 дней
      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 7)

      params.from = today.toISOString().split('T')[0]
      params.to = endDate.toISOString().split('T')[0]

      console.log('[fixtures] using date range:', params.from, 'to', params.to)
    } else {
      // Используем конкретную дату
      params.date = dateParam
      console.log('[fixtures] using specific date:', dateParam)
    }

    if (!includeAll && (explicitCompetition || priorityLeagueIds.length > 0)) {
      params.competition_id = explicitCompetition || priorityLeagueIds.join(',')
    }

    console.log(
      '[fixtures] using',
      includeAll ? 'ALL competitions' : `competition_id: ${params.competition_id}`,
      'size:',
      size,
    )

    const res = await getFixturesMatchesJson(params, {
      cache: 'no-store',
      next: { revalidate: 0 },
      signal: ac.signal,
    })
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
