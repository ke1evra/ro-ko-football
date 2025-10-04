#!/usr/bin/env node

/**
 * Синхронизация актуальных матчей (от текущей даты вперёд).
 * Предназначен для постоянной работы с периодическими запусками.
 *
 * Источник: matches/history.json API
 *
 * Запуск:
 *   node scripts/import-matches-forward.mjs [--days=7] [--pageSize=200] [--loop] [--interval=600000]
 *
 * Параметры:
 *   --days=N         Количество дней вперёд для синхронизации (по умолчанию 7)
 *   --pageSize=N     Размер страницы API (по умолчанию 200)
 *   --loop           Запустить в режиме постоянной работы
 *   --interval=N     Интервал между синхронизациями в мс (по умолчанию 600000 = 10 мин)
 *
 * Требования:
 * - В .env задан�� DATABASE_URI, PAYLOAD_SECRET, LIVESCORE_KEY, LIVESCORE_SECRET
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Загрузка env
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '.env.local'),
  path.resolve(process.cwd(), '.env.docker'),
  path.resolve(__dirname, '.env.docker'),
]
for (const p of envCandidates) {
  dotenv.config({ path: p })
}

const mask = (v) =>
  typeof v === 'string' && v.length > 6 ? `${v.slice(0, 3)}***${v.slice(-2)}` : v ? 'set' : 'empty'
console.log('[INIT] Загрузка окружения:')
console.log(`       DATABASE_URI: ${process.env.DATABASE_URI ? 'set' : 'empty'}`)
console.log(`       PAYLOAD_SECRET: ${process.env.PAYLOAD_SECRET ? 'set' : 'empty'}`)
console.log(`       LIVESCORE_KEY: ${mask(process.env.LIVESCORE_KEY)}`)
console.log(`       LIVESCORE_SECRET: ${mask(process.env.LIVESCORE_SECRET)}`)

function parseArg(name, def = undefined) {
  const k = `--${name}=`
  const found = process.argv.find((a) => a.startsWith(k))
  if (found) return found.slice(k.length)
  return def
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function maskUrlForLog(rawUrl) {
  try {
    const verbose = process.env.DEBUG_MATCHES_VERBOSE === '1'
    if (verbose) return rawUrl
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

function formatDateForApi(date) {
  return date.toISOString().split('T')[0]
}

function getDateRange(days, fromDate = new Date()) {
  const from = new Date(fromDate)
  const to = new Date(from)
  to.setDate(to.getDate() + days)

  return {
    from: formatDateForApi(from),
    to: formatDateForApi(to),
  }
}

async function requestJson(url) {
  const shownUrl = maskUrlForLog(url)
  console.log(`[HTTP] → GET ${shownUrl}`)

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode, headers } = res
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          console.log(`[HTTP] ← ${statusCode} ${shownUrl}`)
          if (process.env.DEBUG_MATCHES_VERBOSE === '1') {
            console.log('[HTTP] headers:', headers)
            console.log('[HTTP] body:', data)
          } else if (process.env.DEBUG_MATCHES === '1') {
            const preview = data.length > 1200 ? data.slice(0, 1200) + '…' : data
            console.log('[HTTP] body preview:', preview)
          }
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            console.error('[HTTP] JSON parse error:', e.message)
            reject(e)
          }
        })
      })
      .on('error', (err) => {
        console.error('[HTTP] network error:', err.message)
        reject(err)
      })
  })
}

async function fetchMatches({ dateFrom, dateTo, page = 1, size = 200 }) {
  const base = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'
  const key = process.env.LIVESCORE_KEY
  const secret = process.env.LIVESCORE_SECRET

  const qs = new URLSearchParams()
  qs.set('lang', 'ru')
  qs.set('page', String(page))
  qs.set('size', String(size))
  if (dateFrom) qs.set('date_from', dateFrom)
  if (dateTo) qs.set('date_to', dateTo)
  if (key) qs.set('key', key)
  if (secret) qs.set('secret', secret)

  const url = `${base}/matches/history.json?${qs.toString()}`
  return await requestJson(url)
}

function normalizeMatches(resp) {
  const d = resp?.data || {}
  let list = d.matches ?? d.match ?? resp?.matches ?? d.list ?? []
  if (list && !Array.isArray(list) && typeof list === 'object') {
    list = Object.values(list)
  }
  return Array.isArray(list) ? list : []
}

function transformMatchStatus(apiStatus) {
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

  return statusMap[String(apiStatus).toLowerCase()] || 'scheduled'
}

function transformMatchPeriod(apiPeriod) {
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

  return periodMap[String(apiPeriod).toLowerCase()] || null
}

function toMatchDoc(apiMatch, syncSource = 'history') {
  const now = new Date().toISOString()

  return {
    matchId: Number(apiMatch.id),
    fixtureId: apiMatch.fixture_id ? Number(apiMatch.fixture_id) : Number(apiMatch.id),
    date: new Date(apiMatch.date).toISOString(),
    status: transformMatchStatus(apiMatch.status),
    minute: apiMatch.minute ? Number(apiMatch.minute) : null,
    period: transformMatchPeriod(apiMatch.period),

    // Команды
    homeTeam: apiMatch.home_team?.name || apiMatch.homeTeam?.name || 'Команда 1',
    homeTeamId: Number(apiMatch.home_team?.id || apiMatch.homeTeam?.id || 0),
    awayTeam: apiMatch.away_team?.name || apiMatch.awayTeam?.name || 'Команда 2',
    awayTeamId: Number(apiMatch.away_team?.id || apiMatch.awayTeam?.id || 0),

    // Счёт
    homeScore:
      apiMatch.scores?.home_score !== undefined
        ? Number(apiMatch.scores.home_score)
        : apiMatch.score?.home !== undefined
          ? Number(apiMatch.score.home)
          : null,
    awayScore:
      apiMatch.scores?.away_score !== undefined
        ? Number(apiMatch.scores.away_score)
        : apiMatch.score?.away !== undefined
          ? Number(apiMatch.score.away)
          : null,
    homeScoreHalftime:
      apiMatch.scores?.home_score_halftime !== undefined
        ? Number(apiMatch.scores.home_score_halftime)
        : null,
    awayScoreHalftime:
      apiMatch.scores?.away_score_halftime !== undefined
        ? Number(apiMatch.scores.away_score_halftime)
        : null,
    homeScoreExtraTime:
      apiMatch.scores?.home_score_extra_time !== undefined
        ? Number(apiMatch.scores.home_score_extra_time)
        : null,
    awayScoreExtraTime:
      apiMatch.scores?.away_score_extra_time !== undefined
        ? Number(apiMatch.scores.away_score_extra_time)
        : null,
    homeScorePenalties:
      apiMatch.scores?.home_score_penalties !== undefined
        ? Number(apiMatch.scores.home_score_penalties)
        : null,
    awayScorePenalties:
      apiMatch.scores?.away_score_penalties !== undefined
        ? Number(apiMatch.scores.away_score_penalties)
        : null,

    // Соревнование
    competition: apiMatch.competition?.name || apiMatch.league?.name || 'Неизвестное соревнование',
    competitionId: Number(apiMatch.competition?.id || apiMatch.league?.id || 0),

    // Сезон
    season: apiMatch.season
      ? {
          id: apiMatch.season.id ? Number(apiMatch.season.id) : null,
          name: apiMatch.season.name || null,
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
          temperature: apiMatch.weather.temperature ? Number(apiMatch.weather.temperature) : null,
          humidity: apiMatch.weather.humidity ? Number(apiMatch.weather.humidity) : null,
          windSpeed: apiMatch.weather.wind_speed ? Number(apiMatch.weather.wind_speed) : null,
          condition: apiMatch.weather.condition || null,
        }
      : null,

    // Метаданные
    lastSyncAt: now,
    syncSource,
    hasStats: false,
    priority: 999,
  }
}

function sanitizeMatchDoc(input) {
  const out = {
    matchId: input.matchId,
    fixtureId: input.fixtureId,
    date: input.date,
    status: input.status,
    minute: input.minute,
    period: input.period,

    homeTeam: input.homeTeam,
    homeTeamId: input.homeTeamId,
    awayTeam: input.awayTeam,
    awayTeamId: input.awayTeamId,

    homeScore: input.homeScore,
    awayScore: input.awayScore,
    homeScoreHalftime: input.homeScoreHalftime,
    awayScoreHalftime: input.awayScoreHalftime,
    homeScoreExtraTime: input.homeScoreExtraTime,
    awayScoreExtraTime: input.awayScoreExtraTime,
    homeScorePenalties: input.homeScorePenalties,
    awayScorePenalties: input.awayScorePenalties,

    competition: input.competition,
    competitionId: input.competitionId,
    season: input.season,
    round: input.round,
    venue: input.venue,
    referee: input.referee,
    weather: input.weather,

    lastSyncAt: input.lastSyncAt,
    syncSource: input.syncSource,
    hasStats: input.hasStats,
    priority: input.priority,
  }

  // Добавляем externalId только если он не null/undefined
  if (input.externalId != null && input.externalId !== '') {
    out.externalId = input.externalId
  }

  return out
}

async function upsertMatch(payload, data) {
  const payloadData = sanitizeMatchDoc(data)

  console.log(
    `[UPSERT] Обработка matchId=${payloadData.matchId} "${payloadData.homeTeam} - ${payloadData.awayTeam}"`,
  )

  // Выводим основные поля для отладки
  console.log(`[UPSERT] 📝 Данные для сохранения:`)
  console.log(`         • homeTeam: "${payloadData.homeTeam}" (ID: ${payloadData.homeTeamId})`)
  console.log(`         • awayTeam: "${payloadData.awayTeam}" (ID: ${payloadData.awayTeamId})`)
  console.log(`         • date: ${payloadData.date}`)
  console.log(`         • status: ${payloadData.status}, period: ${payloadData.period || 'н/д'}`)
  console.log(
    `         • score: ${payloadData.homeScore !== null ? payloadData.homeScore : '?'}:${payloadData.awayScore !== null ? payloadData.awayScore : '?'}`,
  )
  console.log(
    `         • competition: "${payloadData.competition}" (ID: ${payloadData.competitionId})`,
  )
  if (payloadData.season?.name) {
    console.log(`         • season: "${payloadData.season.name}"`)
  }

  // Сначала ищем по уникальному matchId
  let existing = await payload.find({
    collection: 'matches',
    where: { matchId: { equals: payloadData.matchId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    const doc = existing.docs[0]
    try {
      console.log(`[UPSERT] Найдена существующая запись ${doc.id}, сравниваем данные`)

      // Детальная проверка изменений с выводом различий
      const changes = []
      if (doc.status !== payloadData.status)
        changes.push(`status: "${doc.status}" → "${payloadData.status}"`)
      if (doc.minute !== payloadData.minute)
        changes.push(`minute: ${doc.minute} → ${payloadData.minute}`)
      if (doc.period !== payloadData.period)
        changes.push(`period: "${doc.period}" → "${payloadData.period}"`)
      if (doc.homeScore !== payloadData.homeScore)
        changes.push(`homeScore: ${doc.homeScore} → ${payloadData.homeScore}`)
      if (doc.awayScore !== payloadData.awayScore)
        changes.push(`awayScore: ${doc.awayScore} → ${payloadData.awayScore}`)
      if (doc.homeScoreHalftime !== payloadData.homeScoreHalftime)
        changes.push(
          `homeScoreHalftime: ${doc.homeScoreHalftime} → ${payloadData.homeScoreHalftime}`,
        )
      if (doc.awayScoreHalftime !== payloadData.awayScoreHalftime)
        changes.push(
          `awayScoreHalftime: ${doc.awayScoreHalftime} → ${payloadData.awayScoreHalftime}`,
        )
      if (doc.homeTeam !== payloadData.homeTeam)
        changes.push(`homeTeam: "${doc.homeTeam}" → "${payloadData.homeTeam}"`)
      if (doc.awayTeam !== payloadData.awayTeam)
        changes.push(`awayTeam: "${doc.awayTeam}" → "${payloadData.awayTeam}"`)
      if (doc.competition !== payloadData.competition)
        changes.push(`competition: "${doc.competition}" → "${payloadData.competition}"`)
      if (doc.referee !== payloadData.referee)
        changes.push(`referee: "${doc.referee}" → "${payloadData.referee}"`)

      const oldSeason = JSON.stringify(doc.season || null)
      const newSeason = JSON.stringify(payloadData.season)
      if (oldSeason !== newSeason) changes.push(`season: изменён`)

      const oldVenue = JSON.stringify(doc.venue || null)
      const newVenue = JSON.stringify(payloadData.venue)
      if (oldVenue !== newVenue) changes.push(`venue: изменён`)

      const oldWeather = JSON.stringify(doc.weather || null)
      const newWeather = JSON.stringify(payloadData.weather)
      if (oldWeather !== newWeather) changes.push(`weather: изменён`)

      if (changes.length > 0) {
        console.log(`[UPSERT] 🔄 Обнаружены изменения:`)
        changes.forEach((change) => console.log(`         • ${change}`))

        await payload.update({
          collection: 'matches',
          id: doc.id,
          data: payloadData,
          overrideAccess: true,
        })
        console.log(`[UPSERT] ✅ Обновлено (payloadId=${doc.id})`)
        return { action: 'updated', id: doc.id, hasChanges: true }
      } else {
        console.log(`[UPSERT] ≡ Без изменений (payloadId=${doc.id})`)
        return { action: 'skipped', id: doc.id, hasChanges: false }
      }
    } catch (e) {
      console.error(`[UPSERT][UPDATE] Ошибка при обновлении записи ${doc.id}:`, e.message)
      if (e.data?.errors) {
        console.error('[UPSERT][UPDATE] Детали ошибки:', e.data.errors)
      }
      throw e
    }
  }

  // Если не найдено по matchId, пытаемся создать новую запись
  try {
    console.log(`[UPSERT] ➕ Создаём новую запись для matchId=${payloadData.matchId}`)
    const created = await payload.create({
      collection: 'matches',
      data: payloadData,
      overrideAccess: true,
    })
    const createdId = created?.id ?? created?.doc?.id ?? created?._id ?? null
    console.log(`[UPSERT] ✅ Создано${createdId ? ` (payloadId=${createdId})` : ''}`)
    return { action: 'created', id: createdId, hasChanges: true }
  } catch (e) {
    // Если ошибка уникальности - возможно запись была создана между поиском и созданием
    if (
      e?.message?.includes('duplicate key') ||
      e?.message?.includes('unique') ||
      e?.message?.includes('E11000') ||
      (Array.isArray(e?.data?.errors) && e.data.errors.some((err) => err?.path === 'matchId'))
    ) {
      console.log(
        `[UPSERT] Конфликт уникальности для matchId=${payloadData.matchId}, повторный поиск`,
      )

      // Повторный поиск
      existing = await payload.find({
        collection: 'matches',
        where: { matchId: { equals: payloadData.matchId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      if (existing.docs.length > 0) {
        const targetDoc = existing.docs[0]
        console.log(
          `[UPSERT] Найдена существующая запись при повторном поиске ${targetDoc.id}, обновляем`,
        )
        await payload.update({
          collection: 'matches',
          id: targetDoc.id,
          data: payloadData,
          overrideAccess: true,
        })
        console.log(`[UPSERT] ✓ Обновлено после конфликта (payloadId=${targetDoc.id})`)
        return { action: 'updated', id: targetDoc.id, hasChanges: true }
      }
    }

    console.error(
      `[UPSERT][CREATE] Критическая ошибка при создании записи matchId=${payloadData.matchId}:`,
      e?.message || e,
    )
    if (e?.data?.errors) {
      console.error('[UPSERT][CREATE] Детали ошибки:', e.data.errors)
    }
    if (process.env.DEBUG_MATCHES === '1' && e?.stack) {
      console.error('[UPSERT][CREATE] Stack:', e.stack.split('\n').slice(0, 10).join('\n'))
    }
    throw e
  }
}

async function syncMatches(payload, { days = 7, pageSize = 200 } = {}) {
  const dateRange = getDateRange(days)
  console.log(`[SYNC] Синхронизация матчей с ${dateRange.from} по ${dateRange.to}`)

  let page = 1
  let processed = 0
  let stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  }

  while (true) {
    console.log(`[SYNC] Загрузка страницы ${page}, размер ${pageSize}...`)
    const startedAt = Date.now()

    const response = await fetchMatches({
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      page,
      size: pageSize,
    })

    if (response && response.success === false) {
      const msg =
        response?.error?.message || response?.error || response?.message || 'unknown error'
      console.error('[ERROR] LiveScore API вернул ошибку:', msg)
      if (process.env.DEBUG_MATCHES === '1')
        console.error('[DEBUG] Полный ответ:', JSON.stringify(response, null, 2))
      throw new Error(`API Error: ${msg}`)
    }

    const matches = normalizeMatches(response)
    const pages = response?.data?.pages || response?.paging?.pages || 1
    const totalItems = response?.data?.total || response?.paging?.total || matches.length

    const durationMs = Date.now() - startedAt
    console.log(
      `[SYNC] Получено: ${matches.length}, pages=${pages}, total=${totalItems}, за ${durationMs} мс`,
    )

    if (page === 1 && matches.length === 0) {
      console.log('[INFO] Ответ API пуст.')
      break
    }

    for (const apiMatch of matches) {
      if (!apiMatch?.id) {
        console.log('  • пропуск записи без ID')
        continue
      }

      const doc = toMatchDoc(apiMatch, 'forward')
      const ordinal = processed + 1
      const dateStr = new Date(doc.date).toLocaleDateString('ru-RU')
      console.log(
        `  • [${ordinal}${totalItems ? `/${totalItems}` : ''}] ${doc.matchId} ${doc.homeTeam} - ${doc.awayTeam} (${dateStr})`,
      )

      try {
        const { action, id } = await upsertMatch(payload, doc)
        console.log(`    ↳ ${action.toUpperCase()} (payloadId=${id})`)

        if (action === 'created') stats.created++
        else if (action === 'updated') stats.updated++
        else if (action === 'skipped') stats.skipped++

        processed += 1
        if (processed % 25 === 0) {
          console.log(
            `[PROGRESS] Обработано ${processed}${totalItems ? `/${totalItems}` : ''} (создано: ${stats.created}, обновлено: ${stats.updated}, пропущено: ${stats.skipped})`,
          )
        }
      } catch (e) {
        console.error(
          `[ERROR] Ошибка при обработке ${doc.matchId} ${doc.homeTeam} - ${doc.awayTeam}:`,
          e.message,
        )
        stats.errors++
        processed += 1
      }
    }

    // Переходим к следующей странице
    if (pages && page < pages) {
      page += 1
    } else if (!pages) {
      if (matches.length === 0) break
      page += 1
    } else {
      break
    }
  }

  return { processed, stats }
}

async function runOnce(payload, options) {
  console.log('\n' + '='.repeat(60))
  console.log('СИНХРОНИЗАЦИЯ АКТУАЛЬНЫХ МАТЧЕЙ')
  console.log('='.repeat(60))

  const startTime = Date.now()
  const { processed, stats } = await syncMatches(payload, options)
  const duration = Date.now() - startTime

  console.log('\n' + '='.repeat(60))
  console.log('СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА')
  console.log('='.repeat(60))
  console.log(`📊 Статистика обработки:`)
  console.log(`   • Всего обработано: ${processed}`)
  console.log(`   • ✅ Создано новых: ${stats.created}`)
  console.log(`   • 🔄 Обновлено: ${stats.updated}`)
  console.log(`   • ≡ Без изменений: ${stats.skipped}`)
  console.log(`   • ❌ Ошибок: ${stats.errors}`)
  console.log(`   • ⏱️ Время выполнения: ${Math.round(duration / 1000)} сек`)
  console.log('='.repeat(60))

  if (stats.errors > 0) {
    console.log(`⚠️  Внимание: ${stats.errors} записей обработаны с ошибками`)
  }

  const changesCount = stats.created + stats.updated
  if (changesCount > 0) {
    console.log(`✨ Внесено изменений в базу данных: ${changesCount} записей`)
  } else {
    console.log(`ℹ️  Все записи актуальны, изменений не требуется`)
  }

  return { processed, stats, duration }
}

async function runLoop(payload, options, interval) {
  console.log(`[LOOP] Запуск в режиме постоянной работы с интервалом ${interval / 1000} сек`)

  let iteration = 0
  while (true) {
    iteration++
    console.log(`\n[LOOP] === Итерация ${iteration} ===`)

    try {
      await runOnce(payload, options)
    } catch (error) {
      console.error(`[LOOP] Ошибка в итерации ${iteration}:`, error.message)
      if (process.env.DEBUG_MATCHES === '1') {
        console.error('[DEBUG] Полная ошибка:', error)
      }
    }

    console.log(`[LOOP] Ожидание ${interval / 1000} сек до следующей итерации...`)
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

async function main() {
  const days = Number(parseArg('days', 7))
  const pageSize = Number(parseArg('pageSize', 200))
  const loop = hasFlag('loop')
  const interval = Number(parseArg('interval', 600000)) // 10 минут по умолчанию

  if (!process.env.DATABASE_URI) {
    console.error('Ошибка: не задан DATABASE_URI в .env')
    process.exit(1)
  }
  if (!process.env.PAYLOAD_SECRET) {
    console.error('Ошибка: не задан PAYLOAD_SECRET в .env')
    process.exit(1)
  }
  if (!process.env.LIVESCORE_KEY || !process.env.LIVESCORE_SECRET) {
    console.warn(
      '[WARN] Не заданы LIVESCORE_KEY/LIVESCORE_SECRET — API может вернуть пустой ответ или ошибку авторизации',
    )
  }

  console.log('[STEP] Подключение к базе и подготовка Payload Local API')
  const { default: config } = await import('../src/payload.config.ts')
  const payload = await getPayload({ config })

  const options = { days, pageSize }

  if (loop) {
    await runLoop(payload, options, interval)
  } else {
    await runOnce(payload, options)

    if (payload?.db?.drain) {
      await payload.db.drain()
    }
    process.exit(0)
  }
}

main().catch(async (err) => {
  console.error('Ошибка синхронизации матчей:')
  console.error(err)
  try {
    const payload = globalThis?.payload
    if (payload?.db?.drain) await payload.db.drain()
  } catch {}
  process.exit(1)
})
