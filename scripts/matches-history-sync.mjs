#!/usr/bin/env node

/**
 * Общая абстракция для синхронизации истории матчей по периоду дат.
 * Используется обоими скриптами (forward / backward), у которых различается только логика расчёта дат.
 */

import https from 'https'

// ===== Request budget limiter =====
let REQUEST_BUDGET = Infinity
export function setRequestBudget(limit) {
  const n = Number(limit)
  REQUEST_BUDGET = Number.isFinite(n) && n > 0 ? Math.floor(n) : Infinity
}
function ensureBudgetOrThrow() {
  if (!(REQUEST_BUDGET > 0)) {
    const err = new Error('Request budget exhausted')
    err.code = 'REQUEST_BUDGET_EXHAUSTED'
    throw err
  }
  REQUEST_BUDGET -= 1
  console.log(`[BUDGET] remaining=${REQUEST_BUDGET}`)
}

// ===== Utils =====
export function maskUrlForLog(rawUrl) {
  try {
    const u = new URL(rawUrl)
    if (u.searchParams.has('secret')) {
      const s = u.searchParams.get('secret')
      u.searchParams.set('secret', s ? `${s.slice(0, 3)}***${s.slice(-2)}` : '')
    }
    if (u.searchParams.has('key')) {
      const k = u.searchParams.get('key')
      u.searchParams.set('key', k ? `${k.slice(0, 3)}***${k.slice(-2)}` : '')
    }
    return u.toString()
  } catch {
    return rawUrl
  }
}

export async function requestJson(url) {
  const shownUrl = maskUrlForLog(url)
  console.log(`[HTTP] → GET ${shownUrl}`)
  ensureBudgetOrThrow()
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode } = res
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          console.log(`[HTTP] ← ${statusCode} ${shownUrl}`)

          // Проверяем HTTP статус код
          if (statusCode >= 400) {
            const error = new Error(`HTTP ${statusCode}: ${data.slice(0, 200)}`)
            error.statusCode = statusCode
            error.responseBody = data
            reject(error)
            return
          }

          try {
            resolve(JSON.parse(data))
          } catch (e) {
            console.error('[HTTP] JSON parse error:', e.message)
            console.error('[HTTP] Response body preview:', data.slice(0, 200))
            const error = new Error(`JSON parse error: ${e.message}`)
            error.statusCode = statusCode
            error.responseBody = data
            reject(error)
          }
        })
      })
      .on('error', (err) => {
        console.error('[HTTP] network error:', err.message)
        reject(err)
      })
  })
}

export async function fetchMatchesHistory({
  from,
  to,
  page = 1,
  size = 30,
  competitionIds,
  teamIds,
}) {
  const base = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'
  const key = process.env.LIVESCORE_KEY
  const secret = process.env.LIVESCORE_SECRET
  const qs = new URLSearchParams()
  qs.set('lang', 'ru')
  qs.set('page', String(page))
  qs.set('size', String(size))
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  if (competitionIds && String(competitionIds).trim())
    qs.set(
      'competition_id',
      Array.isArray(competitionIds) ? competitionIds.join(',') : String(competitionIds),
    )
  if (teamIds && String(teamIds).trim())
    qs.set('team_id', Array.isArray(teamIds) ? teamIds.join(',') : String(teamIds))
  if (key) qs.set('key', key)
  if (secret) qs.set('secret', secret)
  const url = `${base}/matches/history.json?${qs.toString()}`
  return await requestJson(url)
}

export function normalizeMatches(resp) {
  const d = resp?.data || {}
  let list = d.matches ?? d.match ?? resp?.matches ?? d.list ?? []
  if (list && !Array.isArray(list) && typeof list === 'object') list = Object.values(list)
  return Array.isArray(list) ? list : []
}

// ===== Transforms =====
export function transformMatchStatus(apiStatus) {
  const statusMap = {
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
  const key = String(apiStatus || '').toLowerCase()
  return statusMap[key] || 'scheduled'
}

export function transformMatchPeriod(apiPeriod) {
  if (!apiPeriod) return null
  const periodMap = {
    not_started: 'not_started',
    first_half: 'first_half',
    halftime: 'halftime',
    second_half: 'second_half',
    extra_time: 'extra_time',
    penalties: 'penalties',
    finished: 'finished',
    ft: 'finished',
  }
  const key = String(apiPeriod || '').toLowerCase()
  return periodMap[key] || null
}

function parseScoreStr(s) {
  if (!s || typeof s !== 'string') return [null, null]
  const parts = s.split('-').map((p) => p.trim())
  if (parts.length !== 2) return [null, null]
  const a = Number(parts[0])
  const b = Number(parts[1])
  return [Number.isFinite(a) ? a : null, Number.isFinite(b) ? b : null]
}

function mapOdds(o) {
  if (!o) return { home: null, draw: null, away: null }
  return {
    home: o['1'] != null ? Number(o['1']) : o.home != null ? Number(o.home) : null,
    draw: o['X'] != null ? Number(o['X']) : o.draw != null ? Number(o.draw) : null,
    away: o['2'] != null ? Number(o['2']) : o.away != null ? Number(o.away) : null,
  }
}
function trimToNull(s) {
  if (s == null) return null
  const t = String(s).trim()
  return t.length > 0 ? t : null
}

export function toMatchDoc(apiMatch, syncSource = 'history') {
  const now = new Date().toISOString()
  const home = apiMatch.home || apiMatch.home_team || apiMatch.homeTeam || {}
  const away = apiMatch.away || apiMatch.away_team || apiMatch.awayTeam || {}

  const scoresStr = apiMatch.scores || {}
  const [scoreH, scoreA] = parseScoreStr(scoresStr.score)
  const [htH, htA] = parseScoreStr(scoresStr.ht_score)
  const [ftH, ftA] = parseScoreStr(scoresStr.ft_score)
  const [etH, etA] = parseScoreStr(scoresStr.et_score)
  const [psH, psA] = parseScoreStr(scoresStr.ps_score)

  const comp = apiMatch.competition || apiMatch.league || {}
  const country = apiMatch.country || null
  const federation = apiMatch.federation || null

  const addedAt = apiMatch.added ? new Date(apiMatch.added.replace(' ', 'T')).toISOString() : null
  const lastChangedAt = apiMatch.last_changed
    ? new Date(apiMatch.last_changed.replace(' ', 'T')).toISOString()
    : null

  return {
    // ID
    matchId: Number(apiMatch.id),
    fixtureId: apiMatch.fixture_id ? Number(apiMatch.fixture_id) : Number(apiMatch.id),

    // Время/статус
    date: apiMatch.date ? new Date(apiMatch.date).toISOString() : now,
    status: transformMatchStatus(apiMatch.status || apiMatch.time || 'scheduled'),
    time: apiMatch.time || null,
    scheduled: apiMatch.scheduled || null,
    minute: apiMatch.minute ? Number(apiMatch.minute) : null,
    period: transformMatchPeriod(apiMatch.period || (apiMatch.time === 'FT' ? 'finished' : null)),
    addedAt,
    lastChangedAt,

    // Команды
    homeTeam: home.name || 'Команда 1',
    homeTeamId: home.id != null ? Number(home.id) : null,
    homeLogo: home.logo || null,
    homeCountryId: home.country_id != null ? Number(home.country_id) : null,
    homeStadium: trimToNull(home.stadium),

    awayTeam: away.name || 'Команда 2',
    awayTeamId: away.id != null ? Number(away.id) : null,
    awayLogo: away.logo || null,
    awayCountryId: away.country_id != null ? Number(away.country_id) : null,
    awayStadium: trimToNull(away.stadium),

    // Счёт нормализованный
    homeScore:
      scoreH ??
      ftH ??
      (apiMatch.scores?.home_score != null
        ? Number(apiMatch.scores.home_score)
        : apiMatch.score?.home != null
          ? Number(apiMatch.score.home)
          : null),
    awayScore:
      scoreA ??
      ftA ??
      (apiMatch.scores?.away_score != null
        ? Number(apiMatch.scores.away_score)
        : apiMatch.score?.away != null
          ? Number(apiMatch.score.away)
          : null),
    homeScoreHalftime:
      htH ??
      (apiMatch.scores?.home_score_halftime != null
        ? Number(apiMatch.scores.home_score_halftime)
        : null),
    awayScoreHalftime:
      htA ??
      (apiMatch.scores?.away_score_halftime != null
        ? Number(apiMatch.scores.away_score_halftime)
        : null),
    homeScoreExtraTime:
      etH ??
      (apiMatch.scores?.home_score_extra_time != null
        ? Number(apiMatch.scores.home_score_extra_time)
        : null),
    awayScoreExtraTime:
      etA ??
      (apiMatch.scores?.away_score_extra_time != null
        ? Number(apiMatch.scores.away_score_extra_time)
        : null),
    homeScorePenalties:
      psH ??
      (apiMatch.scores?.home_score_penalties != null
        ? Number(apiMatch.scores.home_score_penalties)
        : null),
    awayScorePenalties:
      psA ??
      (apiMatch.scores?.away_score_penalties != null
        ? Number(apiMatch.scores.away_score_penalties)
        : null),

    // Счёт сырым видом
    scoresRaw: {
      score: scoresStr.score || null,
      htScore: scoresStr.ht_score || null,
      ftScore: scoresStr.ft_score || null,
      etScore: scoresStr.et_score || null,
      psScore: scoresStr.ps_score || null,
    },

    // Турнир / федерация / страна
    competition: comp.name || 'Неизвестное соревнование',
    competitionId: comp.id != null ? Number(comp.id) : null,
    competitionDetails: {
      isCup: Boolean(comp.is_cup),
      isLeague: Boolean(comp.is_league),
      hasGroups: Boolean(comp.has_groups),
      nationalTeamsOnly: Boolean(comp.national_teams_only),
      active: comp.active == null ? true : Boolean(comp.active),
      tier: comp.tier != null ? Number(comp.tier) : null,
    },
    federation: federation
      ? {
          federationId: federation.id != null ? Number(federation.id) : null,
          name: federation.name || null,
        }
      : null,
    country: country
      ? {
          countryId: country.id != null ? Number(country.id) : null,
          name: country.name || null,
          flag: country.flag || null,
          fifaCode: country.fifa_code || null,
          uefaCode: country.uefa_code || null,
          isReal: country.is_real != null ? Boolean(country.is_real) : null,
        }
      : null,
    groupId: apiMatch.group_id != null ? Number(apiMatch.group_id) : null,

    // Сезон/раунд
    season: apiMatch.season
      ? {
          seasonId: apiMatch.season.id ? Number(apiMatch.season.id) : null,
          name: apiMatch.season.name || null,
          year: apiMatch.season.year || null,
        }
      : null,
    round: apiMatch.round || null,

    // Локация и стадион
    location: apiMatch.location || null,
    venue: (() => {
      if (apiMatch.venue) {
        return {
          name: trimToNull(apiMatch.venue.name),
          city: trimToNull(apiMatch.venue.city),
          country: trimToNull(apiMatch.venue.country),
        }
      }
      const name = trimToNull(home.stadium) || trimToNull(away.stadium) || null
      const loc = trimToNull(apiMatch.location)
      const ctry = trimToNull(country?.name)
      if (name || loc || ctry) {
        return { name: name || loc, city: null, country: ctry || null }
      }
      return null
    })(),
    referee: apiMatch.referee || null,

    // Исходы
    outcomes: apiMatch.outcomes
      ? {
          halfTime: apiMatch.outcomes.half_time || null,
          fullTime: apiMatch.outcomes.full_time || null,
          extraTime: apiMatch.outcomes.extra_time || null,
          penaltyShootout: apiMatch.outcomes.penalty_shootout || null,
        }
      : null,

    // Коэффициенты и ссылки
    odds: { pre: mapOdds(apiMatch.odds?.pre), live: mapOdds(apiMatch.odds?.live) },
    urls: apiMatch.urls
      ? {
          events: apiMatch.urls.events || null,
          statistics: apiMatch.urls.statistics || null,
          lineups: apiMatch.urls.lineups || null,
          head2head: apiMatch.urls.head2head || null,
        }
      : null,

    // Метаданные
    lastSyncAt: now,
    syncSource,
    hasStats: false,
    priority: 999,

    // Сырой ответ
    raw: apiMatch,
  }
}

async function resolveLeague(payload, competitionId) {
  if (competitionId == null) return null
  try {
    const res = await payload.find({
      collection: 'leagues',
      where: { competitionId: { equals: Number(competitionId) } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (res.docs.length > 0) return res.docs[0].id
  } catch (e) {
    console.warn('[MATCH][LINK] Ошибка поиска лиги:', e?.message || e)
  }
  return null
}

export function sanitizeMatchDoc(input) {
  const out = {
    matchId: input.matchId,
    fixtureId: input.fixtureId ?? null,
    externalId: input.externalId ?? undefined,

    date: input.date,
    status: input.status,
    minute: input.minute ?? null,
    period: input.period ?? null,
    time: input.time ?? null,
    scheduled: input.scheduled ?? null,
    addedAt: input.addedAt ?? null,
    lastChangedAt: input.lastChangedAt ?? null,

    homeTeam: input.homeTeam,
    homeTeamId: input.homeTeamId ?? null,
    homeLogo: input.homeLogo ?? null,
    homeCountryId: input.homeCountryId ?? null,
    homeStadium: input.homeStadium ?? null,

    awayTeam: input.awayTeam,
    awayTeamId: input.awayTeamId ?? null,
    awayLogo: input.awayLogo ?? null,
    awayCountryId: input.awayCountryId ?? null,
    awayStadium: input.awayStadium ?? null,

    homeScore: input.homeScore ?? null,
    awayScore: input.awayScore ?? null,
    homeScoreHalftime: input.homeScoreHalftime ?? null,
    awayScoreHalftime: input.awayScoreHalftime ?? null,
    homeScoreExtraTime: input.homeScoreExtraTime ?? null,
    awayScoreExtraTime: input.awayScoreExtraTime ?? null,
    homeScorePenalties: input.homeScorePenalties ?? null,
    awayScorePenalties: input.awayScorePenalties ?? null,
    scoresRaw: input.scoresRaw ?? null,

    competition: input.competition,
    competitionId: input.competitionId ?? null,
    competitionDetails: input.competitionDetails ?? null,
    league: input.league ?? undefined,

    federation: input.federation
      ? {
          federationId: input.federation.federationId ?? input.federation.id ?? null,
          name: input.federation.name ?? null,
        }
      : undefined,
    country: input.country
      ? {
          countryId: input.country.countryId ?? input.country.id ?? null,
          name: input.country.name ?? null,
          flag: input.country.flag ?? null,
          fifaCode: input.country.fifaCode ?? null,
          uefaCode: input.country.uefaCode ?? null,
          isReal: input.country.isReal ?? null,
        }
      : undefined,

    groupId: input.groupId ?? null,

    season: input.season
      ? {
          seasonId: input.season.seasonId ?? input.season.id ?? null,
          name: input.season.name ?? null,
          year: input.season.year ?? null,
        }
      : null,
    round: input.round ?? null,

    location: input.location ?? null,
    venue: input.venue ?? null,
    referee: input.referee ?? null,

    outcomes: input.outcomes ?? null,
    odds: input.odds ?? null,
    urls: input.urls ?? null,

    lastSyncAt: input.lastSyncAt,
    syncSource: input.syncSource,
    hasStats: input.hasStats,
    priority: input.priority,

    raw: input.raw ?? null,
  }
  if (out.externalId == null) delete out.externalId
  // Поле связи с лигой — удаляем, если не установлено
  if (out.league == null) delete out.league
  // Удаляем групповые поля, если исходных данных нет — чтобы не писать null
  if (!input.federation) delete out.federation
  if (!input.country) delete out.country
  if (!input.season) delete out.season
  if (!input.venue) delete out.venue
  if (!input.outcomes) delete out.outcomes
  if (!input.scoresRaw) delete out.scoresRaw
  if (!input.odds) delete out.odds
  if (!input.urls) delete out.urls

  // Дополнительно чистим пустые группы, оставшиеся после нормализации
  if (out.federation && !out.federation.federationId && !out.federation.name) delete out.federation
  if (
    out.country &&
    !out.country.countryId &&
    !out.country.name &&
    !out.country.flag &&
    !out.country.fifaCode &&
    !out.country.uefaCode &&
    out.country.isReal == null
  )
    delete out.country
  if (out.season && !out.season.seasonId && !out.season.name && !out.season.year) delete out.season
  if (out.venue && !out.venue.name && !out.venue.city && !out.venue.country) delete out.venue
  if (
    out.outcomes &&
    !out.outcomes.halfTime &&
    !out.outcomes.fullTime &&
    !out.outcomes.extraTime &&
    !out.outcomes.penaltyShootout
  )
    delete out.outcomes
  if (
    out.scoresRaw &&
    !out.scoresRaw.score &&
    !out.scoresRaw.htScore &&
    !out.scoresRaw.ftScore &&
    !out.scoresRaw.etScore &&
    !out.scoresRaw.psScore
  )
    delete out.scoresRaw
  if (
    out.urls &&
    !out.urls.events &&
    !out.urls.statistics &&
    !out.urls.lineups &&
    !out.urls.head2head
  )
    delete out.urls
  if (out.odds) {
    const pre = out.odds.pre
    const live = out.odds.live
    const preEmpty = !pre || (pre.home == null && pre.draw == null && pre.away == null)
    const liveEmpty = !live || (live.home == null && live.draw == null && live.away == null)
    if (preEmpty && liveEmpty) delete out.odds
    else {
      if (preEmpty) delete out.odds.pre
      if (liveEmpty) delete out.odds.live
    }
  }
  return out
}

export async function upsertMatch(payload, doc) {
  const payloadData = sanitizeMatchDoc(doc)
  console.log(
    `[UPSERT] Обработка matchId=${payloadData.matchId} "${payloadData.homeTeam} - ${payloadData.awayTeam}"`,
  )

  let existing = await payload.find({
    collection: 'matches',
    where: { matchId: { equals: payloadData.matchId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    const id = existing.docs[0].id
    // Линкуем лигу по competitionId перед апдейтом
    if (payloadData.competitionId != null) {
      const leagueId = await resolveLeague(payload, payloadData.competitionId)
      if (leagueId) {
        payloadData.league = leagueId
        console.log(
          `[MATCH][LINK] league by competitionId=${payloadData.competitionId} → ${leagueId}`,
        )
      } else {
        console.log(`[MATCH][LINK] league not found for competitionId=${payloadData.competitionId}`)
      }
    }
    console.log(`[UPSERT] ≡ Матч уже существует (payloadId=${id}) → обновляем`)
    try {
      await payload.update({
        collection: 'matches',
        id,
        data: payloadData,
        overrideAccess: true,
      })
      return { action: 'updated', id }
    } catch (e) {
      console.warn(
        `[UPSERT][UPDATE] Ошибка при обновлении matchId=${payloadData.matchId}:`,
        e?.message || e,
      )
      return { action: 'skipped', id }
    }
  }

  try {
    console.log(`[UPSERT] ➕ Создаём новую запись для matchId=${payloadData.matchId}`)
    // Линкуем лигу по competitionId перед созданием
    if (payloadData.competitionId != null) {
      const leagueId = await resolveLeague(payload, payloadData.competitionId)
      if (leagueId) {
        payloadData.league = leagueId
        console.log(
          `[MATCH][LINK] league by competitionId=${payloadData.competitionId} → ${leagueId}`,
        )
      } else {
        console.log(`[MATCH][LINK] league not found for competitionId=${payloadData.competitionId}`)
      }
    }

    const baseData = {
      matchId: payloadData.matchId,
      date: payloadData.date,
      status: payloadData.status,
      homeTeam: payloadData.homeTeam,
      awayTeam: payloadData.awayTeam,
      competition: payloadData.competition,
      competitionId: payloadData.competitionId,
      league: payloadData.league,
      lastSyncAt: payloadData.lastSyncAt,
      syncSource: payloadData.syncSource,
    }
    const created = await payload.create({
      collection: 'matches',
      data: baseData,
      overrideAccess: true,
    })
    const createdId = created?.id ?? created?.doc?.id ?? created?._id ?? null

    try {
      if (createdId) {
        await payload.update({
          collection: 'matches',
          id: createdId,
          data: payloadData,
          overrideAccess: true,
        })
      }
    } catch (uerr) {
      console.warn(
        '[UPSERT] ⚠️ Не удалось дозаполнить все поля через update:',
        uerr?.message || uerr,
      )
    }

    console.log(`[UPSERT] ✅ Создано${createdId ? ` (payloadId=${createdId})` : ''}`)
    return { action: 'created', id: createdId }
  } catch (e) {
    if (
      e?.message?.includes('duplicate key') ||
      e?.message?.includes('unique') ||
      e?.message?.includes('E11000') ||
      (Array.isArray(e?.data?.errors) && e.data.errors.some((err) => err?.path === 'matchId'))
    ) {
      console.log(`[UPSERT] Конфликт уникальности для matchId=${payloadData.matchId}, пропускаем`)
      return { action: 'skipped', id: null }
    }
    console.error(
      `[UPSERT][CREATE] Критическая ошибка при создании записи matchId=${payloadData.matchId}:`,
      e?.message || e,
    )
    if (e?.data?.errors) console.error('[UPSERT][CREATE] Детали ошибки:', e.data.errors)
    throw e
  }
}

// ===== Stats integration =====
function toNumOrNull(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function mapSide(obj) {
  if (!obj || typeof obj !== 'object') return { home: null, away: null }
  return { home: toNumOrNull(obj.home), away: toNumOrNull(obj.away) }
}
function parsePair(str) {
  if (str == null) return { home: null, away: null }
  const s = String(str).trim()
  if (!s) return { home: null, away: null }
  const parts = s.split(':').map((p) => p.trim())
  if (parts.length !== 2) return { home: null, away: null }
  const a = Number(parts[0])
  const b = Number(parts[1])
  return { home: Number.isFinite(a) ? a : null, away: Number.isFinite(b) ? b : null }
}
function sumPairs(...pairs) {
  let ah = 0,
    aa = 0,
    hasH = false,
    hasA = false
  for (const p of pairs) {
    if (p && typeof p === 'object') {
      if (p.home != null) {
        ah += Number(p.home)
        hasH = true
      }
      if (p.away != null) {
        aa += Number(p.away)
        hasA = true
      }
    }
  }
  return { home: hasH ? ah : null, away: hasA ? aa : null }
}
function transformEventType(apiType) {
  const key = String(apiType || '').toLowerCase()
  const dict = {
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
  return dict[key] || 'other'
}
function deriveQuality(stats, events, lineups) {
  let score = 0
  if (stats && (stats.possession || stats.shots || stats.corners)) score += 2
  if (stats && (stats.yellow_cards || stats.red_cards || stats.fouls)) score += 2
  if (Array.isArray(events) && events.length > 0) score += 2
  if (lineups && (lineups.home || lineups.away)) score += 2
  if (score >= 7) return 'complete'
  if (score >= 4) return 'partial'
  if (score >= 2) return 'minimal'
  return 'none'
}
function buildStatsUrl(matchId) {
  const base = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'
  const key = process.env.LIVESCORE_KEY
  const secret = process.env.LIVESCORE_SECRET
  const qs = new URLSearchParams()
  qs.set('match_id', String(matchId))
  qs.set('lang', 'ru')
  if (key) qs.set('key', key)
  if (secret) qs.set('secret', secret)
  return `${base}/matches/stats.json?${qs.toString()}`
}
async function fetchMatchStatsDTO(matchId, retries = 3) {
  const url = buildStatsUrl(matchId)
  let json

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      json = await requestJson(url)
      if (json && json.success === false) {
        const msg = json?.error?.message || json?.error || json?.message || 'unknown error'
        throw new Error(`API error for match ${matchId}: ${msg}`)
      }

      // Если дошли сюда, запрос успешен
      break
    } catch (error) {
      const isLastAttempt = attempt === retries
      const isRetryableError =
        error.statusCode >= 500 || // 5xx ошибки сервера
        error.statusCode === 429 || // Too Many Requests
        error.message.includes('JSON parse error') || // HTML вместо JSON
        error.message.includes('network error') // сетевые ошибки

      if (isRetryableError && !isLastAttempt) {
        const delay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
        console.warn(
          `[STATS][RETRY] Попытка ${attempt}/${retries} для matchId=${matchId} неудачна (${error.message}), повтор через ${delay}мс`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // Если это последняя попытка или ошибка не подлежит повтору
      throw error
    }
  }
  const d = json?.data || json || {}
  const stats = d.stats || d.statistics || {}
  const events = Array.isArray(d.events)
    ? d.events.map((e) => ({
        minute: toNumOrNull(e.minute),
        type: transformEventType(e.type),
        team: e.team === 'home' || e.team === 'away' ? e.team : 'home',
        player: e.player || null,
        assistPlayer: e.assist_player || null,
        playerOut: e.player_out || null,
        playerIn: e.player_in || null,
        description: e.description || null,
      }))
    : []
  const lx = d.lineups || {}
  const mapLineup = (side) => {
    if (!side) return null
    const sXI = Array.isArray(side.starting_xi)
      ? side.starting_xi.map((p) => ({
          number: toNumOrNull(p.number),
          name: p.name,
          position: p.position || null,
        }))
      : []
    const subs = Array.isArray(side.substitutes)
      ? side.substitutes.map((p) => ({
          number: toNumOrNull(p.number),
          name: p.name,
          position: p.position || null,
        }))
      : []
    return { formation: side.formation || null, startingXI: sXI, substitutes: subs }
  }
  const now = new Date().toISOString()
  const result = {
    matchId: Number(matchId),
    possession: mapSide(stats.possession),
    shots: mapSide(stats.shots),
    shotsOnTarget: mapSide(stats.shots_on_target),
    shotsOffTarget: mapSide(stats.shots_off_target),
    shotsBlocked: mapSide(stats.shots_blocked),
    corners: mapSide(stats.corners),
    offsides: mapSide(stats.offsides),
    fouls: mapSide(stats.fouls),
    yellowCards: mapSide(stats.yellow_cards),
    redCards: mapSide(stats.red_cards),
    saves: mapSide(stats.saves),
    passes: mapSide(stats.passes),
    passesAccurate: mapSide(stats.passes_accurate),
    passAccuracy: mapSide(stats.pass_accuracy),
    attacks: mapSide(stats.attacks),
    dangerousAttacks: mapSide(stats.dangerous_attacks),
    events,
    lineups: { home: mapLineup(lx.home), away: mapLineup(lx.away) },
    additionalStats: d.statistics || d,
    lastSyncAt: now,
    syncSource: 'stats',
    dataQuality: deriveQuality(stats, events, lx),
  }
  // Fallback: парсим строковые метрики из additionalStats вида "11:7"
  const ad = d || {}
  const hasValues = (p) => p && typeof p === 'object' && (p.home != null || p.away != null)
  const fill = (current, src) => {
    const parsed = parsePair(src)
    return hasValues(parsed) ? parsed : current
  }
  result.possession = fill(result.possession, ad.possession || ad.possesion)
  result.corners = fill(result.corners, ad.corners)
  result.offsides = fill(result.offsides, ad.offsides)
  result.fouls = fill(result.fouls, ad.fouls || ad.fauls)
  result.yellowCards = fill(result.yellowCards, ad.yellow_cards)
  result.redCards = fill(result.redCards, ad.red_cards)
  result.saves = fill(result.saves, ad.saves)
  result.attacks = fill(result.attacks, ad.attacks)
  result.dangerousAttacks = fill(result.dangerousAttacks, ad.dangerous_attacks)
  result.shotsOnTarget = fill(result.shotsOnTarget, ad.shots_on_target)
  result.shotsOffTarget = fill(result.shotsOffTarget, ad.shots_off_target)
  result.shotsBlocked = fill(result.shotsBlocked, ad.shots_blocked)
  if (!hasValues(result.shots)) {
    const sum = sumPairs(result.shotsOnTarget, result.shotsOffTarget, result.shotsBlocked)
    if (hasValues(sum)) result.shots = sum
  }

  // Очистка пустых групп (home/away оба null)
  const clean = (g) =>
    g && typeof g === 'object' && (g.home != null || g.away != null) ? g : undefined
  const drop = (k) => {
    if (result[k] === undefined) delete result[k]
  }
  result.possession = clean(result.possession)
  drop('possession')
  result.shots = clean(result.shots)
  drop('shots')
  result.shotsOnTarget = clean(result.shotsOnTarget)
  drop('shotsOnTarget')
  result.shotsOffTarget = clean(result.shotsOffTarget)
  drop('shotsOffTarget')
  result.shotsBlocked = clean(result.shotsBlocked)
  drop('shotsBlocked')
  result.corners = clean(result.corners)
  drop('corners')
  result.offsides = clean(result.offsides)
  drop('offsides')
  result.fouls = clean(result.fouls)
  drop('fouls')
  result.yellowCards = clean(result.yellowCards)
  drop('yellowCards')
  result.redCards = clean(result.redCards)
  drop('redCards')
  result.saves = clean(result.saves)
  drop('saves')
  result.passes = clean(result.passes)
  drop('passes')
  result.passesAccurate = clean(result.passesAccurate)
  drop('passesAccurate')
  result.passAccuracy = clean(result.passAccuracy)
  drop('passAccuracy')
  result.attacks = clean(result.attacks)
  drop('attacks')
  result.dangerousAttacks = clean(result.dangerousAttacks)
  drop('dangerousAttacks')
  if (!result.events || result.events.length === 0) delete result.events
  if (!result.lineups || (!result.lineups.home && !result.lineups.away)) delete result.lineups

  // ��омпактное логирование метрик
  const pairs = [
    ['poss', result.possession],
    ['corn', result.corners],
    ['offs', result.offsides],
    ['fouls', result.fouls],
    ['yc', result.yellowCards],
    ['rc', result.redCards],
    ['saves', result.saves],
    ['att', result.attacks],
    ['dang', result.dangerousAttacks],
    ['sot', result.shotsOnTarget],
    ['soff', result.shotsOffTarget],
    ['sblk', result.shotsBlocked],
    ['shots', result.shots],
  ]

  const metrics = []
  let mapped = 0

  for (const [name, val] of pairs) {
    if (val && (val.home != null || val.away != null)) {
      mapped++
      metrics.push(`${name}=${val.home ?? '∅'}:${val.away ?? '∅'}`)
    }
  }

  if (metrics.length > 0) {
    console.log(`    [STATS] ${metrics.join(' • ')}`)
  } else {
    console.log(`    [STATS] нет данных`)
  }

  return result
}
async function fetchAndUpsertStatsForMatch(payload, payloadMatchId, matchId) {
  try {
    const dto = await fetchMatchStatsDTO(matchId)
    const existing = await payload.find({
      collection: 'matchStats',
      where: { matchId: { equals: Number(matchId) } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    // Подсчет непустых метрик перед з��писью
    const isPair = (p) => p && typeof p === 'object' && (p.home != null || p.away != null)
    const metricsPresent = [
      dto.possession,
      dto.corners,
      dto.offsides,
      dto.fouls,
      dto.yellowCards,
      dto.redCards,
      dto.saves,
      dto.attacks,
      dto.dangerousAttacks,
      dto.shotsOnTarget,
      dto.shotsOffTarget,
      dto.shotsBlocked,
      dto.shots,
    ].filter(isPair).length

    if (existing.docs.length > 0) {
      const upd = await payload.update({
        collection: 'matchStats',
        id: existing.docs[0].id,
        data: { ...dto, match: payloadMatchId },
        overrideAccess: true,
      })
      console.log(
        `[STATS] UPDATED (statsId=${upd.id}) для matchId=${matchId}; metrics=${metricsPresent}`,
      )
    } else {
      const created = await payload.create({
        collection: 'matchStats',
        data: { ...dto, match: payloadMatchId },
        overrideAccess: true,
      })
      console.log(
        `[STATS] CREATED (statsId=${created.id}) для matchId=${matchId}; metrics=${metricsPresent}`,
      )
    }
    await payload.update({
      collection: 'matches',
      id: payloadMatchId,
      data: { hasStats: true, lastSyncAt: new Date().toISOString() },
      overrideAccess: true,
    })
  } catch (e) {
    if (e?.code === 'REQUEST_BUDGET_EXHAUSTED') throw e
    console.warn(`[STATS] Ошибка для matchId=${matchId}:`, e?.message || e)
  }
}

function formatDateISO(d) {
  return d.toISOString().split('T')[0]
}

function* iterateDays(from, to) {
  const start = new Date(from)
  const end = new Date(to)
  // Нормализуем к полуночи UTC
  start.setUTCHours(0, 0, 0, 0)
  end.setUTCHours(0, 0, 0, 0)
  const step = start.getTime() <= end.getTime() ? 1 : -1
  const cmp = (a, b) => (step === 1 ? a <= b : a >= b)
  for (let t = start.getTime(); cmp(t, end.getTime()); t += step * 86400000) {
    const d = new Date(t)
    yield formatDateISO(d)
  }
}

async function processDay(
  payload,
  { day, pageSize = 30, competitionIds, teamIds, withStats = true },
) {
  console.log(`[DAY] ${day} (withStats=${withStats})`)
  let page = 1
  let processed = 0
  const stats = { created: 0, skipped: 0, errors: 0 }
  const seenIds = new Set()

  while (true) {
    console.log(`[PAGE] day=${day} page=${page} size=${pageSize}`)
    const startedAt = Date.now()
    let response
    try {
      response = await fetchMatchesHistory({
        from: day,
        to: day,
        page,
        size: pageSize,
        competitionIds,
        teamIds,
      })
    } catch (e) {
      if (e?.code === 'REQUEST_BUDGET_EXHAUSTED') {
        console.warn(`[BUDGET] Лимит запросов исчерпан — прерываем day=${day}`)
        return { processed, stats, exhausted: true }
      }
      throw e
    }
    if (response && response.success === false) {
      const msg =
        response?.error?.message || response?.error || response?.message || 'unknown error'
      console.error('[ERROR] LiveScore API вернул ошибку:', msg)
      throw new Error(`API Error: ${msg}`)
    }

    const list = normalizeMatches(response)
    const durationMs = Date.now() - startedAt
    console.log(`[PAGE] получено=${list.length} за ${durationMs} мс`)

    if (list.length === 0) {
      console.log('[PAGE] пустая страница — останов')
      break
    }

    // Проверка на несоответствие дат в ответе
    try {
      const offDate = list.filter((m) => m?.date && m.date !== day).length
      if (offDate > 0) {
        console.log(`[WARN] day=${day}: ${offDate} матч(ей) с датой, отличной от ${day}`)
      }
    } catch {}

    const fresh = []
    for (const m of list) {
      if (m?.id && !seenIds.has(m.id)) {
        seenIds.add(m.id)
        fresh.push(m)
      }
    }
    const dupCount = list.length - fresh.length
    console.log(`[PAGE] новых=${fresh.length}, повторов=${dupCount}`)

    if (fresh.length === 0) {
      console.log(`[PAGE] нет новых матчей на page=${page} — останов`)
      break
    }

    // Обрабатываем матчи параллельно пачками по 30
    const BATCH_SIZE = 30
    const batches = []
    for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
      batches.push(fresh.slice(i, i + BATCH_SIZE))
    }

    console.log(
      `[PARALLEL] Обработка ${fresh.length} матчей в ${batches.length} пачках по ${BATCH_SIZE}`,
    )

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`[BATCH] ${batchIndex + 1}/${batches.length}: обработка ${batch.length} матчей`)

      const batchPromises = batch.map(async (apiMatch, index) => {
        const doc = toMatchDoc(apiMatch, 'history')
        const ordinal = processed + index + 1
        const dateStr = new Date(doc.date).toLocaleDateString('ru-RU')

        try {
          console.log(
            `  ��� [${ordinal}] ${doc.matchId} ${doc.homeTeam} - ${doc.awayTeam} (${dateStr})`,
          )

          // Лог маппинга основных полей матча
          console.log(
            `    [MATCH][MAP] fixture=${doc.fixtureId ?? '∅'} round=${doc.round ?? '∅'} groupId=${doc.groupId ?? '∅'} sched=${doc.scheduled ?? '∅'} time=${doc.time ?? '∅'} venue=${doc.venue?.name ?? '∅'} loc=${doc.location ?? '∅'}`,
          )

          const { action, id } = await upsertMatch(payload, doc)
          console.log(`    ↳ ${action.toUpperCase()}${id ? ` (payloadId=${id})` : ''}`)

          // Подтягиваем статистику для завершённых матчей (только если включено)
          if (withStats && doc.status === 'finished' && id) {
            await fetchAndUpsertStatsForMatch(payload, id, doc.matchId)
          }

          return { action, matchId: doc.matchId }
        } catch (e) {
          if (e?.code === 'REQUEST_BUDGET_EXHAUSTED') throw e
          console.error(`[ERROR] Ошибка при обработке ${doc.matchId}:`, e?.message || e)
          return { action: 'error', matchId: doc.matchId, error: e?.message || e }
        }
      })

      // Ждём завершения всех матчей в пачке
      const settled = await Promise.allSettled(batchPromises)

      // Подсчитываем результаты пачки, учитывая возможное исчерпание бюджета
      let budgetExhausted = false
      let countCreated = 0
      let countUpdated = 0
      let countSkipped = 0
      let countErrors = 0

      for (const r of settled) {
        if (r.status === 'fulfilled') {
          const result = r.value
          if (result.action === 'created') {
            stats.created++
            countCreated++
          } else if (result.action === 'skipped') {
            stats.skipped++
            countSkipped++
          } else if (result.action === 'updated') {
            countUpdated++
          } else if (result.action === 'error') {
            stats.errors++
            countErrors++
          }
          processed++
        } else {
          if (r.reason?.code === 'REQUEST_BUDGET_EXHAUSTED') {
            budgetExhausted = true
          } else {
            stats.errors++
            countErrors++
          }
          processed++
        }
      }

      console.log(
        `[BATCH] ${batchIndex + 1}/${batches.length} завершена: создано=${countCreated}, обновлено=${countUpdated}, пропущено=${countSkipped}, ошибок=${countErrors}`,
      )

      if (budgetExhausted) {
        console.warn(
          '[BUDGET] Лимит запросов исчерпан — прерываем дальнейшую обработку матчей в этом дне',
        )
        return { processed, stats, exhausted: true }
      }
    }

    if (list.length < pageSize) {
      console.log(`[PAGE] завершение: размер страницы ${list.length} < ${pageSize}`)
      break
    }
    page += 1
  }

  return { processed, stats, exhausted: false }
}

export async function processHistoryPeriod(
  payload,
  { from, to, pageSize = 30, competitionIds, teamIds, withStats = true } = {},
) {
  console.log(`[SYNC] Синхронизация матчей по периоду: ${from} - ${to}`)
  let totalProcessed = 0
  const totalStats = { created: 0, skipped: 0, errors: 0 }
  let exhausted = false

  for (const day of iterateDays(from, to)) {
    const dayRes = await processDay(payload, {
      day,
      pageSize,
      competitionIds,
      teamIds,
      withStats,
    })
    totalProcessed += dayRes.processed
    totalStats.created += dayRes.stats.created
    totalStats.skipped += dayRes.stats.skipped
    totalStats.errors += dayRes.stats.errors
    if (dayRes.exhausted) {
      exhausted = true
      break
    }
  }

  return { processed: totalProcessed, stats: totalStats, exhausted }
}
