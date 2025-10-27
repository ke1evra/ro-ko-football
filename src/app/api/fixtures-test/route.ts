import { NextRequest, NextResponse } from 'next/server'
import { getFixturesMatchesJson } from '@/app/(frontend)/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const results = []

  // Тестируем разные форматы даты
  const testCases = [
    { name: 'today', params: { date: 'today', size: 20 } },
    {
      name: 'current date YYYY-MM-DD',
      params: { date: new Date().toISOString().split('T')[0], size: 20 },
    },
    {
      name: 'tomorrow',
      params: {
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        size: 20,
      },
    },
    {
      name: 'yesterday',
      params: {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        size: 20,
      },
    },
    { name: 'no date param', params: { size: 20 } },
    {
      name: 'from-to range (3 days)',
      params: {
        from: new Date().toISOString().split('T')[0],
        to: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        size: 50,
      },
    },
  ]

  for (const testCase of testCases) {
    try {
      console.log(`[fixtures-test] Testing: ${testCase.name}`)
      console.log(`[fixtures-test] Params:`, testCase.params)

      const res = await getFixturesMatchesJson(testCase.params as any, {
        cache: 'no-store',
        next: { revalidate: 0 },
        timeoutMs: 8000,
      })

      const fixtures = (res.data?.data?.fixtures || []) as any[]
      console.log(`[fixtures-test] ${testCase.name}: got ${fixtures.length} fixtures`)

      if (fixtures.length > 0) {
        console.log(`[fixtures-test] ${testCase.name}: sample fixtures:`)
        fixtures.slice(0, 3).forEach((fx, i) => {
          console.log(`  [${i}]:`, {
            id: fx?.id,
            date: fx?.date,
            time: fx?.time,
            competition: fx?.competition?.name,
            home: fx?.home?.name || fx?.homeTeam?.name,
            away: fx?.away?.name || fx?.awayTeam?.name,
          })
        })
      }

      results.push({
        test: testCase.name,
        params: testCase.params,
        count: fixtures.length,
        success: true,
        sample: fixtures.slice(0, 2).map((fx) => ({
          id: fx?.id,
          date: fx?.date,
          competition: fx?.competition?.name,
          home: fx?.home?.name || fx?.homeTeam?.name,
          away: fx?.away?.name || fx?.awayTeam?.name,
        })),
      })
    } catch (e) {
      console.error(`[fixtures-test] ${testCase.name} failed:`, e)
      results.push({
        test: testCase.name,
        params: testCase.params,
        count: 0,
        success: false,
        error: String(e),
      })
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  })
}
