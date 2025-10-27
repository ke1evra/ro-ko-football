/**
 * Утилиты для генерации SEO-friendly URL матчей
 */

/**
 * Транслитерирует кириллицу в латиницу
 */
function transliterate(text: string): string {
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
    А: 'A',
    Б: 'B',
    В: 'V',
    Г: 'G',
    Д: 'D',
    Е: 'E',
    Ё: 'Yo',
    Ж: 'Zh',
    З: 'Z',
    И: 'I',
    Й: 'Y',
    К: 'K',
    Л: 'L',
    М: 'M',
    Н: 'N',
    О: 'O',
    П: 'P',
    Р: 'R',
    С: 'S',
    Т: 'T',
    У: 'U',
    Ф: 'F',
    Х: 'H',
    Ц: 'Ts',
    Ч: 'Ch',
    Ш: 'Sh',
    Щ: 'Sch',
    Ъ: '',
    Ы: 'Y',
    Ь: '',
    Э: 'E',
    Ю: 'Yu',
    Я: 'Ya',
  }

  return text.replace(/[а-яёА-ЯЁ]/g, (char) => translitMap[char] || char)
}

/**
 * Очищает название команды для URL с транслитерацией
 */
function cleanTeamName(name: string): string {
  return transliterate(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '') // Убираем все кроме латиницы, цифр и пробелов
    .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
    .replace(/-+/g, '-') // Убираем множественные дефисы
    .replace(/^-|-$/g, '') // Убираем дефисы в начале и конце
    .slice(0, 20) // Ограничиваем длину
}

/**
 * Генерирует SEO-friendly URL для матча
 * Формат: /matches-v2/spartak-dinamo_2025-05-28_team-1-id_team-2-id_fixture-id_match-id-if-exists
 */
export function generateMatchUrl(
  homeTeamName: string,
  awayTeamName: string,
  date: string,
  homeTeamId: number,
  awayTeamId: number,
  fixtureId: number,
  matchId?: number,
): string {
  const homeSlug = cleanTeamName(homeTeamName)
  const awaySlug = cleanTeamName(awayTeamName)
  const teamsSlug = `${homeSlug}-${awaySlug}`

  const parts = [teamsSlug, date, homeTeamId, awayTeamId, fixtureId]
  if (matchId) {
    parts.push(matchId)
  }

  return `/matches-v2/${parts.join('_')}`
}

/**
 * Парсит SEO-friendly URL матча
 */
export function parseMatchUrl(slug: string) {
  const parts = slug.split('_')
  if (parts.length < 5) {
    return null
  }

  const [teamNames, date, homeTeamId, awayTeamId, fixtureId, matchId] = parts

  return {
    teamNames,
    date,
    homeTeamId: Number(homeTeamId),
    awayTeamId: Number(awayTeamId),
    fixtureId: Number(fixtureId),
    matchId: matchId ? Number(matchId) : undefined,
  }
}

/**
 * Генерирует URL для фикстуры (будущий матч)
 */
export function generateFixtureUrl(
  homeTeamName: string,
  awayTeamName: string,
  date: string,
  homeTeamId: number,
  awayTeamId: number,
  fixtureId: number,
): string {
  return generateMatchUrl(homeTeamName, awayTeamName, date, homeTeamId, awayTeamId, fixtureId)
}

/**
 * Генерирует URL для завершенного матча
 */
export function generateCompletedMatchUrl(
  homeTeamName: string,
  awayTeamName: string,
  date: string,
  homeTeamId: number,
  awayTeamId: number,
  fixtureId: number,
  matchId: number,
): string {
  return generateMatchUrl(
    homeTeamName,
    awayTeamName,
    date,
    homeTeamId,
    awayTeamId,
    fixtureId,
    matchId,
  )
}
