import { NextRequest, NextResponse } from 'next/server'
import { getFixturesMatchesJson } from '@/app/(frontend)/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    console.log('[fixtures-debug] Testing API without filters...')
    
    const res = await getFixturesMatchesJson(
      { date: 'today', size: 50 },
      { cache: 'no-store', next: { revalidate: 0 }, timeoutMs: 10000 }
    )
    
    const fixtures = (res.data?.data?.fixtures || []) as any[]
    console.log('[fixtures-debug] Got', fixtures.length, 'fixtures for today')
    
    if (fixtures.length > 0) {
      console.log('[fixtures-debug] Sample fixtures:')
      fixtures.slice(0, 10).forEach((fx, i) => {
        console.log(`  [${i}]:`, {
          id: fx?.id,
          date: fx?.date,
          time: fx?.time,
          competition: fx?.competition?.name,
          competitionId: fx?.competition?.id,
          home: fx?.home?.name || fx?.homeTeam?.name,
          away: fx?.away?.name || fx?.awayTeam?.name,
        })
      })
      
      // Группируем по лигам
      const byCompetition = new Map<string, number>()
      fixtures.forEach(fx => {
        const name = fx?.competition?.name || 'Unknown'
        byCompetition.set(name, (byCompetition.get(name) || 0) + 1)
      })
      
      console.log('[fixtures-debug] Competitions found today:')
      Array.from(byCompetition.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
          console.log(`  ${name}: ${count} matches`)
        })
    }
    
    return NextResponse.json({
      success: true,
      count: fixtures.length,
      fixtures: fixtures.slice(0, 10),
      competitions: fixtures.reduce((acc, fx) => {
        const name = fx?.competition?.name || 'Unknown'
        acc[name] = (acc[name] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    })
    
  } catch (e) {
    console.error('[fixtures-debug] Error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}