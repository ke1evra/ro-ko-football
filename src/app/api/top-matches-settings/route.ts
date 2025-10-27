import { NextResponse } from 'next/server'
import { getTopMatchesLeagues, getTopMatchesLeagueIds } from '@/lib/leagues'

export async function GET() {
  try {
    // Получаем настройки из Payload
    const settings = await getTopMatchesLeagues()

    if (!settings?.enabled) {
      return NextResponse.json({
        success: true,
        enabled: false,
        leagues: [],
        leagueIds: [],
        message: 'Виджет топ матчей отключён в настройках',
      })
    }

    // Получаем ID лиг
    const leagueIds = await getTopMatchesLeagueIds()

    // Формируем список лиг с приоритетами для клиента
    const leagues =
      settings.leagues
        ?.filter((item: any) => item.enabled && item.league && item.league.competitionId)
        ?.map((item: any) => {
          // Разрешаем имя лиги из CMS: приоритет — customName из глобала, затем из коллекции, затем displayName, затем оригинал
          const resolvedName =
            (typeof item.customName === 'string' && item.customName.trim()) ||
            (typeof item.league?.customName === 'string' && item.league.customName.trim()) ||
            (typeof item.league?.displayName === 'string' && item.league.displayName.trim()) ||
            item.league?.name

          return {
            id: item.league.competitionId,
            name: resolvedName,
            displayName: resolvedName,
            country: item.league.countryName,
            priority: item.priority || 999,
            enabled: item.enabled,
          }
        })
        ?.sort((a: any, b: any) => a.priority - b.priority) || []

    console.log(
      '[API] Processed leagues:',
      leagues.map((l: any) => `${l.id}: ${l.name} (priority: ${l.priority})`),
    )

    return NextResponse.json({
      success: true,
      enabled: settings.enabled,
      title: settings.title || 'Топ матчи',
      maxMatches: settings.maxMatches || 10,
      leagues,
      leagueIds,
      filterSettings: settings.filterSettings || {},
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] /api/top-matches-settings - ошибка:', error)

    return NextResponse.json(
      {
        success: false,
        enabled: false,
        error: 'Ошибка при загрузке настроек топ матчей',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        leagues: [],
        leagueIds: [],
      },
      { status: 500 },
    )
  }
}
