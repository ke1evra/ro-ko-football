/**
 * Shared utility functions for LiveMatches widgets
 * This file contains pure data transformation functions that can be used
 * in both Server Components and Client Components
 */

export type LiveItem = {
  id: number
  fixtureId?: number
  date?: string
  time?: string
  compName?: string
  home: {
    name: string
    id?: number | string
    score?: number
  }
  away: {
    name: string
    id?: number | string
    score?: number
  }
  status?: string
  time_status?: string | null
  location?: string
  scores?: {
    score?: string
    ht_score?: string
    ft_score?: string
  }
}

/**
 * Normalizes raw match data from API to LiveItem format
 * Pure function - can be used in both Server and Client Components
 * 
 * Поддерживает два формата входных данных:
 * 1. LiveScore API: { home, away, date, time, fixture_id }
 * 2. Transformed: { homeTeam, awayTeam, matchTime, fixtureId }
 */
export function normalize(match: any): LiveItem | null {
  const id = Number(match?.id)
  const fixtureId = Number(match?.fixture_id ?? match?.fixtureId)
  if (!Number.isFinite(id) && !Number.isFinite(fixtureId)) return null

  // DEBUG: Логируем структуру полученных данных
  console.log(`[LiveMatchesWidget] Обрабатываем лайв матч ${id}:`, {
    id: match?.id,
    fixture_id: match?.fixture_id,
    fixtureId: match?.fixtureId,
    date: match?.date,
    time: match?.time,
    matchTime: match?.matchTime,
    // Проверяем какие поля есть для команд
    hasHome: !!match?.home,
    hasHomeTeam: !!match?.homeTeam,
    hasAway: !!match?.away,
    hasAwayTeam: !!match?.awayTeam,
    homeName: match?.home?.name || match?.homeTeam?.name,
    awayName: match?.away?.name || match?.awayTeam?.name,
  })

  // Поддерживаем два формата данных:
  // 1. LiveScore API: match.home, match.away
  // 2. Transformed API: match.homeTeam, match.awayTeam
  const homeData = match?.home || match?.homeTeam
  const awayData = match?.away || match?.awayTeam
  
  const homeName = homeData?.name || 'Команда дома'
  const awayName = awayData?.name || 'Команда гостей'
  const homeId = homeData?.id
  const awayId = awayData?.id

  // Извлекаем счёт - поддерживаем два формата:
  // 1. LiveScore API: scores.score = "2 - 1"
  // 2. Transformed API: score = { home: 2, away: 1 } или homeScore/awayScore
  const scoreString = match?.scores?.score || ''
  let homeScore: number | undefined
  let awayScore: number | undefined

  console.log(`[LiveMatchesWidget] Исходный счёт для матча ${id}:`, scoreString || match?.score || 'N/A')

  // Формат 1: LiveScore API - строка "2 - 1"
  if (scoreString && typeof scoreString === 'string') {
    const scoreParts = scoreString.split(' - ').map((s: string) => s.trim())
    if (scoreParts.length === 2) {
      homeScore = parseInt(scoreParts[0]) || 0
      awayScore = parseInt(scoreParts[1]) || 0
      console.log(`[LiveMatchesWidget] Разобранный счёт (из строки): ${homeScore} - ${awayScore}`)
    }
  }
  
  // Формат 2: Transformed API - объект score { home, away }
  if (homeScore === undefined && match?.score) {
    homeScore = Number(match?.score?.home ?? match?.homeScore ?? 0)
    awayScore = Number(match?.score?.away ?? match?.awayScore ?? 0)
    console.log(`[LiveMatchesWidget] Разобранный счёт (из объекта): ${homeScore} - ${awayScore}`)
  }

  const compName = match?.competition?.name || match?.league?.name
  const status = match?.status
  const time_status = match?.time_status != null ? String(match?.time_status) : null
  const location = match?.location
  
  // Поддерживаем оба формата для даты/времени
  const date = match?.date
  const time = match?.time || match?.matchTime

  const result = {
    id: Number.isFinite(id) ? id : fixtureId!,
    fixtureId: Number.isFinite(fixtureId) ? fixtureId : undefined,
    date: date,
    time: time,
    compName,
    home: {
      name: homeName,
      id: homeId,
      score: homeScore,
    },
    away: {
      name: awayName,
      id: awayId,
      score: awayScore,
    },
    status,
    time_status: time_status ?? null,
    location,
    // Поддерживаем оба формата: LiveScore API или Transformed
    scores: match?.scores || (homeScore !== undefined ? { score: `${homeScore} - ${awayScore}` } : undefined),
  }

  console.log(`[LiveMatchesWidget] Финальный результат для матча ${id}:`, {
    id: result.id,
    fixtureId: result.fixtureId,
    date: result.date,
    homeId: result.home.id,
    awayId: result.away.id,
  })

  return result
}
