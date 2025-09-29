import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * Получить настройки лиг для виджета топ матчей
 */
export async function getTopMatchesLeagues() {
  try {
    const payload = await getPayload({ config })
    const data = await payload.findGlobal({
      slug: 'topMatchesLeagues',
      depth: 2, // Загружаем связанные лиги
    })
    
    return data
  } catch (error) {
    console.error('Ошибка при получении настроек топ матчей:', error)
    return null
  }
}

/**
 * Получить настройки лиг для сайдбара
 */
export async function getSidebarLeagues() {
  try {
    const payload = await getPayload({ config })
    const data = await payload.findGlobal({
      slug: 'sidebarLeagues',
      depth: 2, // Загружаем связанные лиги
    })
    
    return data
  } catch (error) {
    console.error('Ошибка при получении настроек сайдбара:', error)
    return null
  }
}

/**
 * Получить отфильтрованный список лиг для топ матчей
 */
export async function getFilteredTopMatchesLeagues() {
  const settings = await getTopMatchesLeagues()
  
  if (!settings?.enabled || !settings?.leagues) {
    return []
  }
  
  return settings.leagues
    .filter((item: any) => item.enabled && item.league)
    .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))
    .slice(0, settings.maxMatches || 10)
    .map((item: any) => ({
      league: item.league,
      priority: item.priority,
    }))
}

/**
 * Получить отфильтрованный список лиг для сайдбара
 */
export async function getFilteredSidebarLeagues() {
  const settings = await getSidebarLeagues()
  
  if (!settings?.enabled || !settings?.leagues) {
    return []
  }
  
  return settings.leagues
    .filter((item: any) => item.enabled && item.league)
    .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))
    .slice(0, settings.maxItems || 15)
    .map((item: any) => ({
      league: item.league,
      customName: item.customName,
      priority: item.priority,
      highlightColor: item.highlightColor,
      showMatchCount: item.showMatchCount,
    }))
}

/**
 * Получить ID лиг для топ матчей (для использования в API запросах)
 */
export async function getTopMatchesLeagueIds(): Promise<number[]> {
  const settings = await getTopMatchesLeagues()
  
  if (!settings?.enabled || !settings?.leagues) {
    return []
  }
  
  const ids = settings.leagues
    .filter((item: any) => item.enabled && item.league && item.league.competitionId)
    .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))
    .map((item: any) => item.league.competitionId)
    .filter((id: any) => typeof id === 'number')
  
  console.log('[LEAGUES] getTopMatchesLeagueIds result:', ids)
  return ids
}

/**
 * Получить ID лиг для сайдбара (для использования в API запросах)
 */
export async function getSidebarLeagueIds(): Promise<number[]> {
  const leagues = await getFilteredSidebarLeagues()
  return leagues
    .map((item: any) => item.league?.competitionId)
    .filter((id: any) => typeof id === 'number')
}