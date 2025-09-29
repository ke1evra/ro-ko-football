/**
 * Клиентские утилиты для работы с приоритетными лигами
 * Получает данные из Payload CMS через API
 */

/**
 * Кэш для приоритетных лиг на клиенте
 */
let cachedLeagues: Array<{
  id: number
  name: string
  country?: string
  priority: number
  enabled: boolean
}> | null = null

let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

/**
 * Получить приоритетные лиги из API с кэшированием
 */
async function getCachedLeaguesFromAPI() {
  const now = Date.now()
  
  // Проверяем кэш
  if (cachedLeagues && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedLeagues
  }
  
  try {
    const response = await fetch('/api/top-matches-settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success || !data.enabled) {
      console.warn('[LEAGUES_CLIENT] Настройки топ матчей отключены или недоступны')
      return []
    }
    
    // Обновляем кэш
    cachedLeagues = data.leagues || []
    cacheTimestamp = now
    
    console.log(`[LEAGUES_CLIENT] Загружено ${cachedLeagues.length} лиг из Payload`)
    return cachedLeagues
    
  } catch (error) {
    console.error('[LEAGUES_CLIENT] Ошибка при загрузке лиг:', error)
    
    // Возвращаем кэшированные данные, если есть
    if (cachedLeagues) {
      console.warn('[LEAGUES_CLIENT] Используем кэшированные данные')
      return cachedLeagues
    }
    
    // Если нет кэша и API недоступен - возвращаем пустой массив
    console.warn('[LEAGUES_CLIENT] API недоступен, возвращаем пустой список')
    return []
  }
}

/**
 * Синхронная версия для обратной совместимости
 * Использует только кэшированные данные из CMS
 */
function getCachedLeaguesSync() {
  if (cachedLeagues) {
    return cachedLeagues
  }
  // Если кэш пуст - возвращаем пустой массив, НЕ fallback
  return []
}

/**
 * Получить приоритет лиги (чем меньше число, тем выше приоритет)
 * Синхронная версия для использования в компонентах
 */
export function getLeaguePriorityClient(competitionId: number): number {
  const leagues = getCachedLeaguesSync()
  const league = leagues.find(league => league.id === competitionId)
  return league?.priority ?? 999 // Низкий приоритет для неприоритетных лиг
}

/**
 * Проверить, является ли лига приоритетной
 * Синхронная версия для использования в компонентах
 */
export function isPriorityLeagueClient(competitionId: number): boolean {
  const leagues = getCachedLeaguesSync()
  return leagues.some(league => league.id === competitionId)
}

/**
 * Получить информацию о лиге по ID
 * Синхронная версия для использования в компонентах
 */
export function getLeagueInfoClient(competitionId: number) {
  const leagues = getCachedLeaguesSync()
  return leagues.find(league => league.id === competitionId)
}

/**
 * Получить ID всех приоритетных лиг
 * Синхронная версия для использования в компонентах
 */
export function getPriorityLeagueIdsClient(): number[] {
  const leagues = getCachedLeaguesSync()
  return leagues.map(league => league.id)
}

/**
 * Асинхронные версии функций для загрузки свежих данных
 */

/**
 * Получить приоритет лиги (асинхронная версия)
 */
export async function getLeaguePriorityClientAsync(competitionId: number): Promise<number> {
  const leagues = await getCachedLeaguesFromAPI()
  const league = leagues.find(league => league.id === competitionId)
  return league?.priority ?? 999
}

/**
 * Проверить, является ли лига приоритетной (асинхронная версия)
 */
export async function isPriorityLeagueClientAsync(competitionId: number): Promise<boolean> {
  const leagues = await getCachedLeaguesFromAPI()
  return leagues.some(league => league.id === competitionId)
}

/**
 * Получить информацию о лиге по ID (асинхронная версия)
 */
export async function getLeagueInfoClientAsync(competitionId: number) {
  const leagues = await getCachedLeaguesFromAPI()
  return leagues.find(league => league.id === competitionId)
}

/**
 * Получить ID всех приоритетных лиг (асинхронная версия)
 */
export async function getPriorityLeagueIdsClientAsync(): Promise<number[]> {
  const leagues = await getCachedLeaguesFromAPI()
  return leagues.map(league => league.id)
}

/**
 * Инициализировать кэш лиг (вызывать при загрузке приложения)
 */
export async function initializeLeaguesCache() {
  try {
    await getCachedLeaguesFromAPI()
    console.log('[LEAGUES_CLIENT] Кэш лиг инициализирован')
  } catch (error) {
    console.error('[LEAGUES_CLIENT] Ошибка инициализации кэша:', error)
  }
}

/**
 * Очистить кэш лиг (для принудительного обновления)
 */
export function clearLeaguesCache() {
  cachedLeagues = null
  cacheTimestamp = 0
}