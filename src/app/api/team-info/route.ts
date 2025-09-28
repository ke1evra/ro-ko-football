import { NextRequest, NextResponse } from 'next/server'
import { getTeamsListJson } from '@/app/(frontend)/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('id')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    console.log('[team-info] fetching team info for ID:', teamId)

    const ac = new AbortController()
    const to = setTimeout(() => ac.abort(), 5000)

    // Получаем список команд и ищем нужную
    const res = await getTeamsListJson(
      { size: 100 },
      { cache: 'no-store', next: { revalidate: 0 }, signal: ac.signal },
    )
    clearTimeout(to)

    const teams = res.data?.data?.teams || []
    const team = teams.find((t: any) => t.id === parseInt(teamId))

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    console.log('[team-info] found team:', team.name, 'logo:', team.logo)

    return NextResponse.json(
      { team },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch (e) {
    console.error('[team-info] api error:', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
