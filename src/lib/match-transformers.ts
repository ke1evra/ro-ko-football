import type { LiveScoreMatch, LiveScoreMatchStats } from './livescore-client'

/**
 * Преобразует статус матча из API в наш формат
 */
export function transformMatchStatus(apiStatus: string): string {
  const statusMap: Record<string, string> = {
    scheduled: 'scheduled',
    live: 'live',
    halftime: 'halftime',
    finished: 'finished',
    ft: 'finished',
    cancelled: 'cancelled',
    postponed: 'postponed',
    suspended: 'suspended',
    abandoned: 'cancelled',
    awarded: 'finished',
    not_started: 'scheduled',
    first_half: 'live',
    second_half: 'live',
    extra_time: 'live',
    penalties: 'live',
  }

  return statusMap[apiStatus.toLowerCase()] || 'scheduled'
}

/**
 * Преобразует период матча из API в наш формат
 */
export function transformMatchPeriod(apiPeriod?: string): string | undefined {
  if (!apiPeriod) return undefined

  const periodMap: Record<string, string> = {
    not_started: 'not_started',
    first_half: 'first_half',
    halftime: 'halftime',
    second_half: 'second_half',
    extra_time: 'extra_time',
    penalties: 'penalties',
    finished: 'finished',
    ft: 'finished',
  }

  return periodMap[apiPeriod.toLowerCase()]
}

/**
 * Преобразует тип события из API в наш формат
 */
export function transformEventType(apiType: string): string {
  const typeMap: Record<string, string> = {
    goal: 'goal',
    own_goal: 'own_goal',
    penalty: 'penalty',
    yellow_card: 'yellow_card',
    red_card: 'red_card',
    substitution: 'substitution',
    var: 'var',
    booking: 'yellow_card',
    red_booking: 'red_card',
    subst: 'substitution',
  }

  return typeMap[apiType.toLowerCase()] || 'other'
}

/**
 * Преобразует данные матча из API в формат для Payload
 */
export function transformMatchData(apiMatch: LiveScoreMatch, syncSource: string = 'history') {
  const now = new Date().toISOString()

  return {
    matchId: apiMatch.id,
    fixtureId: apiMatch.fixture_id || apiMatch.id,
    date: new Date(apiMatch.date).toISOString(),
    status: transformMatchStatus(apiMatch.status),
    minute: apiMatch.minute || null,
    period: transformMatchPeriod(apiMatch.period) || null,

    // Команды
    homeTeam: apiMatch.home_team.name,
    homeTeamId: apiMatch.home_team.id,
    awayTeam: apiMatch.away_team.name,
    awayTeamId: apiMatch.away_team.id,

    // Счёт
    homeScore: apiMatch.scores?.home_score ?? null,
    awayScore: apiMatch.scores?.away_score ?? null,
    homeScoreHalftime: apiMatch.scores?.home_score_halftime ?? null,
    awayScoreHalftime: apiMatch.scores?.away_score_halftime ?? null,
    homeScoreExtraTime: apiMatch.scores?.home_score_extra_time ?? null,
    awayScoreExtraTime: apiMatch.scores?.away_score_extra_time ?? null,
    homeScorePenalties: apiMatch.scores?.home_score_penalties ?? null,
    awayScorePenalties: apiMatch.scores?.away_score_penalties ?? null,

    // Соревнование
    competition: apiMatch.competition.name,
    competitionId: apiMatch.competition.id,

    // Сезон
    season: apiMatch.season
      ? {
          id: apiMatch.season.id,
          name: apiMatch.season.name,
          year: apiMatch.season.year || null,
        }
      : null,

    round: apiMatch.round || null,

    // Стадион
    venue: apiMatch.venue
      ? {
          name: apiMatch.venue.name || null,
          city: apiMatch.venue.city || null,
          country: apiMatch.venue.country || null,
        }
      : null,

    referee: apiMatch.referee || null,

    // Погода
    weather: apiMatch.weather
      ? {
          temperature: apiMatch.weather.temperature || null,
          humidity: apiMatch.weather.humidity || null,
          windSpeed: apiMatch.weather.wind_speed || null,
          condition: apiMatch.weather.condition || null,
        }
      : null,

    // Метаданные
    lastSyncAt: now,
    syncSource,
    hasStats: false, // Будет обновлено при загрузке статистики
    priority: 999,
  }
}

/**
 * Преобразует статистику матча из API в формат для Payload
 */
export function transformMatchStatsData(
  apiStats: LiveScoreMatchStats,
  matchPayloadId: string,
  syncSource: string = 'stats',
) {
  const now = new Date().toISOString()

  return {
    matchId: apiStats.match_id,
    match: matchPayloadId,

    // Основная статистика
    possession: apiStats.possession
      ? {
          home: apiStats.possession.home || null,
          away: apiStats.possession.away || null,
        }
      : null,

    shots: apiStats.shots
      ? {
          home: apiStats.shots.home || null,
          away: apiStats.shots.away || null,
        }
      : null,

    shotsOnTarget: apiStats.shots_on_target
      ? {
          home: apiStats.shots_on_target.home || null,
          away: apiStats.shots_on_target.away || null,
        }
      : null,

    shotsOffTarget: apiStats.shots_off_target
      ? {
          home: apiStats.shots_off_target.home || null,
          away: apiStats.shots_off_target.away || null,
        }
      : null,

    shotsBlocked: apiStats.shots_blocked
      ? {
          home: apiStats.shots_blocked.home || null,
          away: apiStats.shots_blocked.away || null,
        }
      : null,

    corners: apiStats.corners
      ? {
          home: apiStats.corners.home || null,
          away: apiStats.corners.away || null,
        }
      : null,

    offsides: apiStats.offsides
      ? {
          home: apiStats.offsides.home || null,
          away: apiStats.offsides.away || null,
        }
      : null,

    fouls: apiStats.fouls
      ? {
          home: apiStats.fouls.home || null,
          away: apiStats.fouls.away || null,
        }
      : null,

    yellowCards: apiStats.yellow_cards
      ? {
          home: apiStats.yellow_cards.home || null,
          away: apiStats.yellow_cards.away || null,
        }
      : null,

    redCards: apiStats.red_cards
      ? {
          home: apiStats.red_cards.home || null,
          away: apiStats.red_cards.away || null,
        }
      : null,

    saves: apiStats.saves
      ? {
          home: apiStats.saves.home || null,
          away: apiStats.saves.away || null,
        }
      : null,

    passes: apiStats.passes
      ? {
          home: apiStats.passes.home || null,
          away: apiStats.passes.away || null,
        }
      : null,

    passesAccurate: apiStats.passes_accurate
      ? {
          home: apiStats.passes_accurate.home || null,
          away: apiStats.passes_accurate.away || null,
        }
      : null,

    passAccuracy: apiStats.pass_accuracy
      ? {
          home: apiStats.pass_accuracy.home || null,
          away: apiStats.pass_accuracy.away || null,
        }
      : null,

    attacks: apiStats.attacks
      ? {
          home: apiStats.attacks.home || null,
          away: apiStats.attacks.away || null,
        }
      : null,

    dangerousAttacks: apiStats.dangerous_attacks
      ? {
          home: apiStats.dangerous_attacks.home || null,
          away: apiStats.dangerous_attacks.away || null,
        }
      : null,

    // События
    events:
      apiStats.events?.map((event) => ({
        minute: event.minute,
        type: transformEventType(event.type),
        team: event.team,
        player: event.player || null,
        assistPlayer: event.assist_player || null,
        playerOut: event.player_out || null,
        playerIn: event.player_in || null,
        description: event.description || null,
      })) || [],

    // Составы
    lineups: apiStats.lineups
      ? {
          home: apiStats.lineups.home
            ? {
                formation: apiStats.lineups.home.formation || null,
                startingXI:
                  apiStats.lineups.home.starting_xi?.map((player) => ({
                    number: player.number || null,
                    name: player.name,
                    position: player.position || null,
                  })) || [],
                substitutes:
                  apiStats.lineups.home.substitutes?.map((player) => ({
                    number: player.number || null,
                    name: player.name,
                    position: player.position || null,
                  })) || [],
              }
            : null,
          away: apiStats.lineups.away
            ? {
                formation: apiStats.lineups.away.formation || null,
                startingXI:
                  apiStats.lineups.away.starting_xi?.map((player) => ({
                    number: player.number || null,
                    name: player.name,
                    position: player.position || null,
                  })) || [],
                substitutes:
                  apiStats.lineups.away.substitutes?.map((player) => ({
                    number: player.number || null,
                    name: player.name,
                    position: player.position || null,
                  })) || [],
              }
            : null,
        }
      : null,

    // Дополнительная статистика (сохраняем оригинальные данные)
    additionalStats: apiStats,

    // Метаданные
    lastSyncAt: now,
    syncSource,
    dataQuality: determineDataQuality(apiStats),
  }
}

/**
 * Определяет качество данных статистики
 */
function determineDataQuality(stats: LiveScoreMatchStats): string {
  let score = 0

  // Проверяем наличие основных статистик
  if (stats.possession) score += 1
  if (stats.shots) score += 1
  if (stats.shots_on_target) score += 1
  if (stats.corners) score += 1
  if (stats.fouls) score += 1
  if (stats.yellow_cards) score += 1
  if (stats.events && stats.events.length > 0) score += 2
  if (stats.lineups) score += 2

  if (score >= 8) return 'complete'
  if (score >= 5) return 'partial'
  if (score >= 2) return 'minimal'
  return 'none'
}

/**
 * Создаёт уникальный ключ для матча
 */
export function createMatchKey(homeTeamId: number, awayTeamId: number, date: string): string {
  const dateKey = new Date(date).toISOString().split('T')[0]
  return `${homeTeamId}-${awayTeamId}-${dateKey}`
}

/**
 * Форматирует дату для API запросов
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Получает диапазон дат для синхронизации
 */
export function getDateRange(days: number, fromDate?: Date): { from: string; to: string } {
  const from = fromDate || new Date()
  const to = new Date(from)
  to.setDate(to.getDate() + days)

  return {
    from: formatDateForApi(from),
    to: formatDateForApi(to),
  }
}

/**
 * Получает диапазон дат для ретроспективной синхронизации
 */
export function getHistoricalDateRange(
  days: number,
  fromDate?: Date,
): { from: string; to: string } {
  const to = fromDate || new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - days)

  return {
    from: formatDateForApi(from),
    to: formatDateForApi(to),
  }
}
