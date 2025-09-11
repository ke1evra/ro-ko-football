/**
 * Server Actions для ручного обновления кэша
 * Используется кнопкой "Обновить" в UI
 */

'use server'

import { revalidateTag, revalidatePath } from 'next/cache'

// Типы для revalidation
export type RevalidateTarget = 
  | { type: 'standings'; league: string; season: string }
  | { type: 'live'; league: string }
  | { type: 'fixtures'; league: string; season: string }
  | { type: 'page'; path: string }

/**
 * Обновляет кэш для конкретного ресурса
 */
export async function revalidateResource(target: RevalidateTarget): Promise<{ success: boolean; message: string }> {
  try {
    switch (target.type) {
      case 'standings':
        // Обновляем кэш турнирной таблицы
        revalidateTag(`standings:${target.league}:${target.season}`)
        revalidatePath(`/api/standings/${target.league}/${target.season}`)
        return {
          success: true,
          message: `Турнирная таблица ${target.league} ${target.season} обновлена`
        }

      case 'live':
        // Обновляем кэш live-матчей
        revalidateTag(`live:${target.league}`)
        revalidatePath(`/api/live/${target.league}`)
        return {
          success: true,
          message: `Live-матчи ${target.league} обновлены`
        }

      case 'fixtures':
        // Обновляем кэш ближайших матчей
        revalidateTag(`fixtures:${target.league}:${target.season}`)
        revalidatePath(`/api/fixtures/${target.league}/${target.season}`)
        return {
          success: true,
          message: `Ближайшие матчи ${target.league} ${target.season} обновлены`
        }

      case 'page':
        // Обновляем страницу целиком
        revalidatePath(target.path)
        return {
          success: true,
          message: `Страница ${target.path} обновлена`
        }

      default:
        return {
          success: false,
          message: 'Неизвестный тип ресурса для обновления'
        }
    }
  } catch (error) {
    console.error('Revalidation error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка при обновлении кэша'
    }
  }
}

/**
 * Обновляет все данные для лиги/сезона
 */
export async function revalidateLeague(league: string, season: string): Promise<{ success: boolean; message: string }> {
  try {
    // Обновляем все связанные ресурсы
    await Promise.all([
      revalidateResource({ type: 'standings', league, season }),
      revalidateResource({ type: 'live', league }),
      revalidateResource({ type: 'fixtures', league, season }),
      revalidateResource({ type: 'page', path: `/${league}/${season}` }),
    ])

    return {
      success: true,
      message: `Все данные для ${league} ${season} обновлены`
    }
  } catch (error) {
    console.error('League revalidation error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка при обновлении данных лиги'
    }
  }
}

/**
 * Обновляет все live данные
 */
export async function revalidateAllLive(): Promise<{ success: boolean; message: string }> {
  try {
    const leagues = ['premier-league', 'la-liga', 'bundesliga', 'serie-a', 'ligue-1', 'all']
    
    await Promise.all(
      leagues.map(league => revalidateResource({ type: 'live', league }))
    )

    return {
      success: true,
      message: 'Все live-данные обновлены'
    }
  } catch (error) {
    console.error('All live revalidation error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка при обновлении live-данных'
    }
  }
}