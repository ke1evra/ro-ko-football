/**
 * Клиентские утилиты для работы с приоритетными лигами
 * Эти функции можно использовать в клиентских компонентах
 * Синхронизировано с серверной версией из highlight-competitions.ts
 */

/**
 * Приоритетные лиги (клиентская копия серверной версии)
 * ID получены через прямой запрос к API лиг
 */
export const PRIORITY_LEAGUES_CLIENT = {
  // Топ-5 европейских лиг
  PREMIER_LEAGUE: { 
    id: 2, 
    name: 'Premier League', 
    country: 'England', 
    priority: 1,
    description: 'Английская Премьер-лига'
  },
  BUNDESLIGA: { 
    id: 1, 
    name: 'Bundesliga', 
    country: 'Germany', 
    priority: 2,
    description: 'Немецкая Бундеслига'
  },
  SERIE_A: { 
    id: 4, 
    name: 'Serie A', 
    country: 'Italy', 
    priority: 3,
    description: 'Итальянская Серия А'
  },
  LIGUE_1: { 
    id: 5, 
    name: 'Ligue 1', 
    country: 'France', 
    priority: 4,
    description: 'Французская Лига 1'
  },
  LA_LIGA: { 
    id: 3, 
    name: 'LaLiga Santander', 
    country: 'Spain', 
    priority: 5,
    description: 'Испанская Ла Лига'
  },
  
  // Российская лига
  RUSSIAN_PREMIER_LEAGUE: { 
    id: 7, 
    name: 'Premier League', 
    country: 'Russia', 
    priority: 6,
    description: 'Российская Премьер-лига'
  },
  
  // Европейские кубки
  UEFA_CHAMPIONS_LEAGUE: { 
    id: 268, 
    name: 'Champions League', 
    country: 'Europe', 
    priority: 7,
    description: 'Лига Чемпионов УЕФА'
  },
  UEFA_EUROPA_LEAGUE: { 
    id: 245, 
    name: 'Europa League', 
    country: 'Europe', 
    priority: 8,
    description: 'Лига Европы УЕФА'
  },
  UEFA_CONFERENCE_LEAGUE: { 
    id: 446, 
    name: 'UEFA Conference League', 
    country: 'Europe', 
    priority: 9,
    description: 'Лига Конференций УЕФА'
  },
} as const

/**
 * Получить приоритет лиги (чем меньше число, тем выше приоритет)
 * Клие��тская версия функции
 */
export function getLeaguePriorityClient(competitionId: number): number {
  const league = Object.values(PRIORITY_LEAGUES_CLIENT).find(league => league.id === competitionId)
  return league?.priority ?? 999 // Низкий приоритет для неприоритетных лиг
}

/**
 * Проверить, является ли лига приоритетной
 * Клиентская версия функции
 */
export function isPriorityLeagueClient(competitionId: number): boolean {
  return Object.values(PRIORITY_LEAGUES_CLIENT).some(league => league.id === competitionId)
}

/**
 * Получить информацию о лиге по ID
 * Клиентская версия функции
 */
export function getLeagueInfoClient(competitionId: number) {
  return Object.values(PRIORITY_LEAGUES_CLIENT).find(league => league.id === competitionId)
}

/**
 * Получить ID всех приоритетных лиг
 * Клиентская версия функции
 */
export function getPriorityLeagueIdsClient(): number[] {
  return Object.values(PRIORITY_LEAGUES_CLIENT).map(league => league.id)
}