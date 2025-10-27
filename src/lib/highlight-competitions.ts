import { getCompetitionsListJson } from '@/app/(frontend)/client'

/**
 * Приоритетные лиги для отображения на главной странице
 * ID получены через прямой запрос к API лиг
 */
export const PRIORITY_LEAGUES = {
  // Топ-5 европейских лиг
  PREMIER_LEAGUE: {
    id: 2,
    name: 'Premier League',
    country: 'England',
    priority: 1,
    description: 'Английская Премьер-лига',
  },
  BUNDESLIGA: {
    id: 1,
    name: 'Bundesliga',
    country: 'Germany',
    priority: 2,
    description: 'Немецкая Бундеслига',
  },
  SERIE_A: {
    id: 4,
    name: 'Serie A',
    country: 'Italy',
    priority: 3,
    description: 'Итальянская Серия А',
  },
  LIGUE_1: {
    id: 5,
    name: 'Ligue 1',
    country: 'France',
    priority: 4,
    description: 'Французская Лига 1',
  },
  LA_LIGA: {
    id: 3,
    name: 'LaLiga Santander',
    country: 'Spain',
    priority: 5,
    description: 'Испанская Ла Лига',
  },

  // Российская лига
  RUSSIAN_PREMIER_LEAGUE: {
    id: 7,
    name: 'Premier League',
    country: 'Russia',
    priority: 6,
    description: 'Российская Премьер-лига',
  },

  // Европейские кубки
  UEFA_CHAMPIONS_LEAGUE: {
    id: 268,
    name: 'Champions League',
    country: 'Europe',
    priority: 7,
    description: 'Лига Чемпионов УЕФА',
  },
  UEFA_EUROPA_LEAGUE: {
    id: 245,
    name: 'Europa League',
    country: 'Europe',
    priority: 8,
    description: 'Лига Европы УЕФА',
  },
  UEFA_CONFERENCE_LEAGUE: {
    id: 446,
    name: 'UEFA Conference League',
    country: 'Europe',
    priority: 9,
    description: 'Лига Конференций УЕФА',
  },
} as const

/**
 * Получить ID всех приоритетных лиг
 */
export function getPriorityLeagueIds(): number[] {
  return Object.values(PRIORITY_LEAGUES).map((league) => league.id)
}

/**
 * Проверить, является ли лига приоритетной
 */
export function isPriorityLeague(competitionId: number): boolean {
  return getPriorityLeagueIds().includes(competitionId)
}

/**
 * Получить приоритет лиги (чем меньше число, тем выше приоритет)
 */
export function getLeaguePriority(competitionId: number): number {
  const league = Object.values(PRIORITY_LEAGUES).find((league) => league.id === competitionId)
  return league?.priority ?? 999 // Низкий приоритет для неприоритетных лиг
}

/**
 * Получить информацию о лиге по ID
 */
export function getLeagueInfo(competitionId: number) {
  return Object.values(PRIORITY_LEAGUES).find((league) => league.id === competitionId)
}

/**
 * Получить все приоритетные лиги, отсортированные по приоритету
 */
export function getAllPriorityLeagues() {
  return Object.values(PRIORITY_LEAGUES).sort((a, b) => a.priority - b.priority)
}

/**
 * Сортировать матчи по приоритету лиг
 */
export function sortMatchesByLeaguePriority<T extends { competitionId?: number }>(
  matches: T[],
): T[] {
  return matches.sort((a, b) => {
    const priorityA = getLeaguePriority(a.competitionId || 0)
    const priorityB = getLeaguePriority(b.competitionId || 0)
    return priorityA - priorityB
  })
}
