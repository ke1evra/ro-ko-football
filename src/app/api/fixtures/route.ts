import { NextRequest, NextResponse } from 'next/server'
import { getFixturesMatchesJson } from '@/app/(frontend)/client'
import CHEATSHEET_FILE from '@/lib/highlight-cheatsheet.json'
import { COMPETITION_NAME_PATTERNS } from '@/lib/highlight-competitions'

export const dynamic = 'force-dynamic'

const TARGET_COUNTRIES_RU = ['Англия', 'Германия', 'Италия', 'Франция', 'Испания', 'Россия'] as const
const TARGET_KEYS = ['ucl', 'uel', 'eng', 'ger', 'ita', 'fra', 'esp', 'rus'] as const

async function getHighlightCompetitionIds(): Promise<number[]> {
  const fromCheats = TARGET_KEYS
    .map((k) => (CHEATSHEET_FILE as Record<string, unknown>)[k as string])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  console.log('[fixtures] using cheatsheet competition ids:', fromCheats)
  return fromCheats
}

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

    // Явный competition_id в запросе имеет приоритет
    const explicitCompetition = searchParams.get('competition_id') || undefined

    let competition_id: string | undefined = explicitCompetition
    if (!competition_id) {
      const ids = await getHighlightCompetitionIds()
      if (ids.length > 0) competition_id = ids.join(',')
    }
    if (!competition_id || competition_id.trim() === '') {
      console.warn('[fixtures] no competitions in cheatsheet — falling back to name-based filter (eng, ger, ita, fra, esp, rus)')
      const ac0 = new AbortController()
      const to0 = setTimeout(() => ac0.abort(), 8000)
      console.log('[fixtures] fallback: calling fixtures/matches.json without competition_id filter')
      const res0 = await getFixturesMatchesJson(
        { date: dateParam, size },
        { cache: 'no-store', next: { revalidate: 0 }, signal: ac0.signal },
      )
      clearTimeout(to0)
      const all = (res0.data?.data?.fixtures || []) as any[]
      console.log('[fixtures] fallback: got', all.length, 'total fixtures')
      
      // Показываем примеры всех матчей для анализа
      if (all.length > 0) {
        console.log('[fixtures] fallback: sample of all fixtures:')
        all.slice(0, 5).forEach((fx, i) => {
          console.log(`  [${i}]:`, {
            id: fx?.id,
            competition: fx?.competition?.name,
            competitionId: fx?.competition?.id,
            home: fx?.home?.name || fx?.homeTeam?.name,
            away: fx?.away?.name || fx?.awayTeam?.name,
          })
        })
      }
      
      const keys = ['eng', 'ger', 'ita', 'fra', 'esp', 'rus'] as const
      const patterns = keys.flatMap((k) => COMPETITION_NAME_PATTERNS[k])
      console.log('[fixtures] fallback: filtering with patterns:', patterns.map(p => p.source))
      
      const filtered = all.filter((fx) => {
        const name = String(fx?.competition?.name || '').toLowerCase()
        const matches = patterns.some((re) => re.test(name))
        if (matches) {
          console.log('[fixtures] fallback: MATCH found:', fx?.competition?.name)
        }
        return matches
      })
      console.log('[fixtures] fallback filtered count:', filtered.length, 'of', all.length)
      return NextResponse.json(
        { fixtures: filtered, lastUpdated: new Date().toISOString(), fallback: true },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
      )
    }

    console.log('[fixtures] using competition_id:', competition_id || '(none)', 'date:', dateParam, 'size:', size)
    const ac = new AbortController()
    const to = setTimeout(() => ac.abort(), 8000)
    console.log('[fixtures] calling fixtures/matches.json with params:', { date: dateParam, size, competition_id })
    const res = await getFixturesMatchesJson(
      { date: dateParam, size, competition_id },
      { cache: 'no-store', next: { revalidate: 0 }, signal: ac.signal },
    )
    clearTimeout(to)
    const fixtures = (res.data?.data?.fixtures || []) as any[]
    console.log('[fixtures] fixtures count:', fixtures.length)
    
    // Подробный дебаг ответа API
    console.log('[fixtures] API response structure:', {
      success: res.data?.success,
      dataKeys: Object.keys(res.data?.data || {}),
      fixturesType: Array.isArray(fixtures) ? 'array' : typeof fixtures,
      statusCode: res.status
    })
    
    // Показываем первые несколько матчей для анализа
    if (fixtures.length > 0) {
      console.log('[fixtures] First 3 fixtures sample:')
      fixtures.slice(0, 3).forEach((fx, i) => {
        console.log(`  [${i}]:`, {
          id: fx?.id,
          date: fx?.date,
          time: fx?.time,
          home: fx?.home?.name || fx?.homeTeam?.name,
          away: fx?.away?.name || fx?.awayTeam?.name,
          competition: fx?.competition?.name,
          competitionId: fx?.competition?.id
        })
      })
    } else {
      console.log('[fixtures] No fixtures returned. Trying fallback without competition filter...')
      console.log('[fixtures] Raw API response data:', JSON.stringify(res.data, null, 2))
      
      // Фоллбэк: попробуем без фильтра по лигам
      try {
        const ac2 = new AbortController()
        const to2 = setTimeout(() => ac2.abort(), 8000)
        console.log('[fixtures] fallback: calling without competition_id filter')
        const res2 = await getFixturesMatchesJson(
          { date: dateParam, size: Math.min(size, 50) },
          { cache: 'no-store', next: { revalidate: 0 }, signal: ac2.signal },
        )
        clearTimeout(to2)
        const allFixtures = (res2.data?.data?.fixtures || []) as any[]
        console.log('[fixtures] fallback: got', allFixtures.length, 'total fixtures')
        
        if (allFixtures.length > 0) {
          console.log('[fixtures] fallback: sample fixtures:')
          allFixtures.slice(0, 3).forEach((fx, i) => {
            console.log(`  [${i}]:`, {
              id: fx?.id,
              competition: fx?.competition?.name,
              competitionId: fx?.competition?.id,
              home: fx?.home?.name || fx?.homeTeam?.name,
              away: fx?.away?.name || fx?.awayTeam?.name,
            })
          })
          
          return NextResponse.json(
            { fixtures: allFixtures.slice(0, 10), lastUpdated: new Date().toISOString(), fallback: true },
            { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
          )
        }
      } catch (e) {
        console.error('[fixtures] fallback error:', e)
      }
    }

    return NextResponse.json(
      { fixtures, lastUpdated: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (e) {
    console.error('fixtures api error', e)
    return NextResponse.json({ fixtures: [], error: 'failed' }, { status: 500 })
  }
}
