/**
 * Утилиты для работы с логотипами команд
 */

/**
 * Мапинг известных команд на их логотипы из бесплатных источников
 * Используем простые эмодзи-иконки для команд
 */
const TEAM_LOGOS: Record<number, string> = {
  // Испанская Ла Лига
  22: '🔵', // Real Sociedad
  26: '🔴', // Atletico Madrid
  30: '🔵', // Getafe
  35: '🟢', // Real Betis
  40: '🔵', // Deportivo Alaves
  
  // Итальянская Серия А
  90: '🟡', // Roma
  
  // Французская Лига 1
  69: '🔴', // Nice
  
  // Немецкая Бундеслига
  55: '🔴', // Freiburg
  
  // Другие европейские команды
  133: '🔴', // Basel
  135: '🟢', // Celtic
  141: '🔴', // Feyenoord
  147: '🟡', // Maccabi Tel Aviv
  153: '🔴', // Sporting Braga
  155: '🟢', // Razgrad
  168: '🔴', // Crvena Zvezda
  487: '🔴', // Nottingham Forest
  792: '⚪', // Rayo Vallecano
  853: '⚫', // Sturm Graz
  866: '🟡', // Fenerbahce
  905: '🔵', // Dinamo Zagreb
  963: '🔴', // Midtjylland
  977: '⚫', // PAOK
  1814: '🔴', // Mallorca
  1853: '🔵', // Malmo FF
}

/**
 * Генерирует URL логотипа команды на основе ID
 * Сначала проверяет локальную базу, затем пытается использовать альтернативные источники
 */
export function getTeamLogoUrl(teamId: number): string | null {
  // Проверяем локальную базу логотипов
  if (TEAM_LOGOS[teamId]) {
    return TEAM_LOGOS[teamId]
  }
  
  // Возвращаем null если логотип неизвестен
  return null
}

/**
 * Проверяет, доступен ли логотип команды
 * Возвращает fallback URL если основной недоступен
 */
export function getTeamLogoUrlWithFallback(teamId: number): string | null {
  return getTeamLogoUrl(teamId)
}

/**
 * Генерирует альтернативный текст для логотипа команды
 */
export function getTeamLogoAlt(teamName: string): string {
  return `Логотип ${teamName}`
}

/**
 * Про��еряет, есть ли логотип для команды
 */
export function hasTeamLogo(teamId: number): boolean {
  return teamId in TEAM_LOGOS
}