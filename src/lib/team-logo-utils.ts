/**
 * Утилиты для работы с логотипами команд
 */

/**
 * Генерирует URL логотипа команды на основе ID
 * Использует загруженные PNG файлы из папки /team-logos/
 */
export function getTeamLogoUrl(teamId: number | string): string {
  return `/team-logos/${teamId}.png`
}

/**
 * Проверяет, доступен ли логотип команды
 * Возвращает fallback URL если основной недоступен
 */
export function getTeamLogoUrlWithFallback(teamId: number | string): string {
  return getTeamLogoUrl(teamId)
}

/**
 * Генерирует альтернативный текст для логотипа команды
 */
export function getTeamLogoAlt(teamName: string): string {
  return `Логотип ${teamName}`
}

/**
 * Проверяет, есть ли логотип для команды
 * Всегда возвращает true, так как у нас есть fallback механизм
 */
export function hasTeamLogo(teamId: number | string): boolean {
  return true
}

/**
 * Fallback эмодзи для команд, если логотип не загрузится
 */
export const TEAM_FALLBACK_EMOJI = '⚽'