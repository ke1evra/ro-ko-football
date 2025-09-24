import { NextRequest, NextResponse } from 'next/server'
import { PRIORITY_LEAGUES, getAllPriorityLeagues, getPriorityLeagueIds } from '@/lib/highlight-competitions'

/**
 * API роут для просмотра приоритетных лиг
 * GET /api/update-cheatsheet - показать текущие приоритетные лиги
 */
export async function GET() {
  try {
    const allLeagues = getAllPriorityLeagues()
    const leagueIds = getPriorityLeagueIds()
    
    return NextResponse.json({
      success: true,
      data: {
        priorityLeagues: allLeagues,
        leagueIds,
        totalLeagues: allLeagues.length,
        description: 'Приоритетные лиги теперь хранятся в константах в src/lib/highlight-competitions.ts',
      },
    })
  } catch (error) {
    console.error('[GET /api/update-cheatsheet] Ошибка:', error)
    return NextResponse.json(
      { success: false, error: 'Не удалось получить приоритетные лиги' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'POST больше не поддерживается. Приоритетные лиги теперь хранятся в константах в src/lib/highlight-competitions.ts',
  })
}