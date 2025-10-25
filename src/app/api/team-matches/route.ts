import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50)

    console.log('[Team Matches API] Запрос:', { teamId, limit })

    if (!teamId) {
      return NextResponse.json({ success: false, message: 'teamId обязателен' }, { status: 400 })
    }

    const payload = await getPayload({ config: await configPromise })

    // Получаем матчи команды (завершённые)
    const matches = await payload.find({
      collection: 'matches',
      where: {
        and: [
          {
            or: [
              { homeTeamId: { equals: Number(teamId) } },
              { awayTeamId: { equals: Number(teamId) } },
            ],
          },
          { status: { equals: 'finished' } },
        ],
      },
      sort: '-date',
      limit,
    })

    console.log('[Team Matches API] Найдено матчей:', matches.docs.length)
    console.log('[Team Matches API] Первый матч (RAW):', JSON.stringify(matches.docs[0], null, 2))

    // Получаем ID матчей для поиска статистики
    const matchIds = matches.docs.map((m: Record<string, unknown>) => m.matchId)
    console.log('[Team Matches API] Match IDs:', matchIds)

    // Получаем статистику для этих матчей
    const stats = await payload.find({
      collection: 'matchStats',
      where: {
        matchId: { in: matchIds },
      },
      limit: 100,
    })

    console.log('[Team Matches API] Найдено статистики:', stats.docs.length)
    if (stats.docs.length > 0) {
      console.log(
        '[Team Matches API] Первая статистика (RAW):',
        JSON.stringify(stats.docs[0], null, 2),
      )
    }

    // Создаём map статистики по matchId
    const statsMap = new Map(stats.docs.map((s: Record<string, unknown>) => [s.matchId, s]))

    // Нормализуем матчи
    const normalizedMatches = matches.docs.map((m: Record<string, unknown>) => {
      const teamIdNum = Number(teamId)
      const homeTeamIdNum = Number(m.homeTeamId)
      const awayTeamIdNum = Number(m.awayTeamId)
      const isHome = homeTeamIdNum === teamIdNum
      const isAway = awayTeamIdNum === teamIdNum

      const homeScore = (m.homeScore as number) ?? 0
      const awayScore = (m.awayScore as number) ?? 0
      const gf = isHome ? homeScore : awayScore
      const ga = isHome ? awayScore : homeScore

      let result: 'W' | 'D' | 'L' = 'D'
      if (gf > ga) result = 'W'
      else if (gf < ga) result = 'L'

      console.log('[Team Matches API] Нормализация матча:', {
        teamId: teamIdNum,
        matchId: m.matchId,
        homeTeamId: homeTeamIdNum,
        awayTeamId: awayTeamIdNum,
        isHome,
        isAway,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore,
        awayScore,
        gf,
        ga,
        result,
      })

      return {
        id: String(m.id),
        matchId: m.matchId,
        date: m.date,
        season:
          (m.season as Record<string, unknown>)?.name ||
          (m.season as Record<string, unknown>)?.year,
        competition: m.competition,
        homeName: m.homeTeam as string,
        awayName: m.awayTeam as string,
        homeScore,
        awayScore,
        gf,
        ga,
        total: gf + ga,
        result,
        stats: statsMap.get(m.matchId),
      }
    })

    console.log('[Team Matches API] Нормализовано матчей:', normalizedMatches.length)
    console.log(
      '[Team Matches API] Первый нормализованный матч:',
      JSON.stringify(normalizedMatches[0], null, 2),
    )

    return NextResponse.json({
      success: true,
      data: normalizedMatches,
      debug: {
        teamId,
        limit,
        matchesCount: matches.docs.length,
        statsCount: stats.docs.length,
        rawFirstMatch: matches.docs[0],
        rawFirstStats: stats.docs[0],
      },
    })
  } catch (error: unknown) {
    console.error('[Team Matches API] Ошибка:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
        debug: { error: String(error) },
      },
      { status: 500 },
    )
  }
}
