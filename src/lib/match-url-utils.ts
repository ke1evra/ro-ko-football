/**
 * Утилиты для генерации URL матчей в формате matches-v2
 */

/**
 * Генерирует slug для команды (транслитерация и нормализация)
 */
function generateTeamSlug(teamName: string): string {
  // Простая транслитерация кириллицы
  const translitMap: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }

  return teamName
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20) // ограничиваем длину
}

/**
 * Форматиру��т дату в формат YYYY-MM-DD
 */
function formatMatchDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface MatchUrlParams {
  homeTeamName: string
  awayTeamName: string
  homeTeamId: number | string
  awayTeamId: number | string
  date: string | Date
  fixtureId: number | string
  matchId?: number | string
}

/**
 * Генерирует URL для страницы матча в формате matches-v2
 * 
 * Формат:
 * /matches-v2/spartak-dinamo_2025-05-28_123_456_789 (без matchId)
 * /matches-v2/spartak-dinamo_2025-05-28_123_456_789_1011 (с matchId)
 */
export function generateMatchUrl(params: MatchUrlParams): string {
  const homeSlug = generateTeamSlug(params.homeTeamName)
  const awaySlug = generateTeamSlug(params.awayTeamName)
  const dateStr = formatMatchDate(params.date)
  const homeId = Number(params.homeTeamId)
  const awayId = Number(params.awayTeamId)
  const fixtureId = Number(params.fixtureId)

  // Базовый slug
  let slug = `${homeSlug}-${awaySlug}_${dateStr}_${homeId}_${awayId}_${fixtureId}`

  // Добавляем matchId если есть
  if (params.matchId) {
    const matchId = Number(params.matchId)
    if (Number.isFinite(matchId)) {
      slug += `_${matchId}`
    }
  }

  return `/matches-v2/${slug}`
}

/**
 * Генерирует URL для матча из объекта LiveScore API
 */
export function generateMatchUrlFromApiMatch(match: any): string {
  const homeTeamName = match?.home?.name || match?.home_team?.name || match?.homeTeam || 'team1'
  const awayTeamName = match?.away?.name || match?.away_team?.name || match?.awayTeam || 'team2'
  const homeTeamId = match?.home?.id || match?.home_team?.id || match?.homeTeamId || 0
  const awayTeamId = match?.away?.id || match?.away_team?.id || match?.awayTeamId || 0
  const date = match?.date || new Date().toISOString()
  const fixtureId = match?.fixture_id || match?.fixtureId || match?.id || 0
  const matchId = match?.id || match?.matchId

  return generateMatchUrl({
    homeTeamName,
    awayTeamName,
    homeTeamId,
    awayTeamId,
    date,
    fixtureId,
    matchId,
  })
}

/**
 * Генерирует URL для матча из объекта Payload CMS
 */
export function generateMatchUrlFromPayload(match: any): string {
  const homeTeamName = match?.homeTeam || 'team1'
  const awayTeamName = match?.awayTeam || 'team2'
  const homeTeamId = match?.homeTeamId || 0
  const awayTeamId = match?.awayTeamId || 0
  const date = match?.date || new Date().toISOString()
  const fixtureId = match?.fixtureId || match?.matchId || 0
  const matchId = match?.matchId

  return generateMatchUrl({
    homeTeamName,
    awayTeamName,
    homeTeamId,
    awayTeamId,
    date,
    fixtureId,
    matchId,
  })
}

/**
 * Генерирует fallback URL для старого формата (на случай если нет всех данных)
 */
export function generateLegacyMatchUrl(matchId: number | string): string {
  return `/matches/${matchId}`
}

export function generateLegacyFixtureUrl(fixtureId: number | string): string {
  return `/fixtures/${fixtureId}`
}
