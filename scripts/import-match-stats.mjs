
#!/usr/bin/env node

/**
 * Загрузка статистики по матчам отдельным процессом.
 * 
 * Логика:
 *  - Находит матчи в Payload (коллекция `matches`) по условиям (hasStats=false, статус/дата/лимит)
 *  - Для каждого matchId вызывает LiveScore API `/matches/stats.json?match_id=...`
 *  - Сохраняет статистику в коллекцию `matchStats` (upsert по matchId)
 *  - Обновляет исходный матч: `hasStats=true`, `lastSyncAt=now`
 * 
 * Запуск:
 *   node scripts/import-match-stats.mjs [--days=7] [--status=finished] [--limit=50] [--matchId=NNNN] [--loop] [--interval=600000]
 * 
 * Параметры:
 *   --days=N       Диапазон по дате для поиска матчей (date >= now-N дней), по умолчанию 7
 *   --status=...   Фильтр статуса матчей для загрузки статистики: finished|live|any (по умолчанию finished)
 *   --limit=N      Сколько матчей обрабатывать за один запуск (по умолчанию 50)
 *   --matchId=NNN  Обработать конкретный matchId (игнорирует days/limit)
 *   --loop         Запустить в режиме постоянной работы
 *   --interval=N   Интервал между итерациями в мс (по умолчанию 600000 = 10 мин)
 * 
 * Требования .env:
 *   DATABASE_URI, PAYLOAD_SECRET, LIVESCORE_KEY, LIVESCORE_SECRET
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
for (const p of envCandidates) dotenv.config({ path: p })

const mask = (v) => (typeof v === 'string' && v.length > 6 ? `${v.slice(0, 3)}***${v.slice(-2)}` : v ? 'set' : 'empty')
console.log('[INIT] Загрузка окружения:')
console.log(`       DATABASE_URI: ${process.env.DATABASE_URI ? 'set' : 'empty'}`)
console.log(`       PAYLOAD_SECRET: ${process.env.PAYLOAD_SECRET ? 'set' : 'empty'}`)
console.log(`       LIVESCORE_KEY: ${mask(process.env.LIVESCORE_KEY)}`)
console.log(`       LIVESCORE_SECRET: ${mask(process.env.LIVESCORE_SECRET)}`)

// Утилиты CLI
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

function requestJson(url) {
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

function buildStatsUrl(matchId) {
  const base = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'
  const key = process.env.LIVESCORE_KEY
  const secret = process.env.LIVESCORE_SECRET
  const qs = new URLSearchParams()
  qs.set('match_id', String(matchId))
  if (key) qs.set('key', key)
  if (secret) qs.set('secret', secret)
  qs.set('lang', 'ru')
  return `${base}/matches/stats.json?${qs.toString()}`
}

// Преобразования типов статистики
function toNumOrNull(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function mapSide(obj) {
  if (!obj) return null
  return {
    home: toNumOrNull(obj.home),
    away: toNumOrNull(obj.away),
  }
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

function transformStatsResp(matchId, respData) {
  const now = new Date().toISOString()
  const d = respData || {}

  // Поддержка возможной структуры: data: { ... } или сразу объект
  const stats = d.stats || d.statistics || d || {}

  // События
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

  // Составы
  const lx = d.lineups || {}
  const mapLineup = (side) => {
    if (!side) return null
    const sXI = Array.isArray(side.starting_xi)
      ? side.starting_xi.map((p) => ({ number: toNumOrNull(p.number), name: p.name, position: p.position || null }))
      : []
    const subs = Array.isArray(side.substitutes)
      ? side.substitutes.map((p) => ({ number: toNumOrNull(p.number), name: p.name, position: p.position || null }))
      : []
    return { formation: side.formation || null, startingXI: sXI, substitutes: subs }
  }

  const transformed = {
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
    lineups: {
      home: mapLineup(lx.home),
      away: mapLineup(lx.away),
    },
    additionalStats: d,
    lastSyncAt: now,
    syncSource: 'stats',
    dataQuality: deriveQuality(stats, events, lx),
  }

  return transformed
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

async function fetchMatchStats(matchId) {
  const url = buildStatsUrl(matchId)
  const json = await requestJson(url)
  if (json && json.success === false) {
    const msg = json?.error?.message || json?.error || json?.message || 'unknown error'
    throw new Error(`API error for match ${matchId}: ${msg}`)
  }
  // данные бывают в data или напрямую
  const data = json?.data || json
  return transformStatsResp(matchId, data)
}

async function upsertMatchStats(payload, matchDoc, statsDto) {
  // Найдём или создадим stats
  const existing = await payload.find({
    collection: 'matchStats',
    where: { matchId: { equals: statsDto.matchId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    const doc = existing.docs[0]
    await payload.update({
      collection: 'matchStats',
      id: doc.id,
      data: { ...statsDto, match: matchDoc.id },
      overrideAccess: true,
    })
    return { action: 'updated', id: doc.id }
  } else {
    const created = await payload.create({
      collection: 'matchStats',
      data: { ...statsDto, match: matchDoc.id },
      overrideAccess: true,
    })
    return { action: 'created', id: created.id }
  }
}

function formatDate(d) {
  return d.toISOString().split('T')[0]
}

async function pickMatches(payload, { days = 7, status = 'finished', limit = 50, matchId } = {}) {
  if (matchId) {
    const res = await payload.find({
      collection: 'matches',
      where: { matchId: { equals: Number(matchId) } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return res.docs
  }

  const since = new Date()
  since.setDate(since.getDate() - Number(days))

  const where = {
    and: [
      { hasStats: { equals: false } },
      { date: { greater_than_equal: formatDate(since) } },
    ],
  }
  if (status && status !== 'any') {
    where.and.push({ status: { equals: status } })
  }

  const res = await payload.find({
    collection: 'matches',
    where,
    sort: '-date',
    limit: Number(limit),
    depth: 0,
    overrideAccess: true,
  })
  return res.docs
}

async function processBatch(payload, matches) {
  let stats = { created: 0, updated: 0, failed: 0 }
  let done = 0
  for (const m of matches) {
    const ord = ++done
    console.log(`  • [${ord}/${matches.length}] matchId=${m.matchId} ${m.homeTeam} - ${m.awayTeam}`)
    try {
      const dto = await fetchMatchStats(m.matchId)
      const res = await upsertMatchStats(payload, m, dto)
      await payload.update({
        collection: 'matches',
        id: m.id,
        data: { hasStats: true, lastSyncAt: new Date().toISOString() },
        overrideAccess: true,
      })
      stats[res.action === 'created' ? 'created' : 'updated']++
      console.log(`    ↳ STATS ${res.action.toUpperCase()} (statsId=${res.id})`)
    } catch (e) {
      stats.failed++
      console.error(`    ↳ STATS ERROR:`, e?.message || e)
    }
  }
  return stats
}

async function runOnce(payload, options) {
  console.log('\n' + '='.repeat(60))
  console.log('ИМПОРТ СТАТИСТИКИ МАТЧЕЙ')
  console.log('='.repeat(60))
  const list = await pickMatches(payload, options)
  console.log(`[MATCHES] К обработке: ${list.length}`)
  const started = Date.now()
  const stats = await processBatch(payload, list)
  const dur = Date.now() - started
  console.log(`[RESULT] created=${stats.created}, updated=${stats.updated}, failed=${stats.failed}, time=${Math.round(dur / 1000)}s`)
  return stats
}

async function runLoop(payload, options, interval) {
  console.log(`[LOOP] Режим постоянной работы, интервал ${Math.round(interval / 1000)}с`)
  let iter = 0
  while (true) {
    iter++
    console.log(`\n[LOOP] === Итерация ${iter} ===`)
    try {
      await runOnce(payload, options)
    } catch (e) {
      console.error('[LOOP] Ошибка итерации:', e?.message || e)
    }
    await new Promise((r) => setTimeout(r, interval))
  }
}

async function main() {
  const days = Number(parseArg('days', 7))
  const status = String(parseArg('status', 'finished'))
  const limit = Number(parseArg('limit', 50))
  const matchId = parseArg('matchId')
  const loop = hasFlag('loop')
  const interval = Number(parseArg('interval', 600000))

  if (!process.env.DATABASE_URI) {
    console.error('Ошибка: не задан DATABASE_URI в .env')
    process.exit(1)
  }
  if (!process.env.PAYLOAD_SECRET) {
    console.error('Ошибка: не задан PAYLOAD_SECRET в .env')
    process.exit(1)
  }
  if (!process.env.LIVESCORE_KEY || !process.env.LIVESCORE_SECRET) {
    console.warn('[WARN] Нет LIVESCORE_KEY/LIVESCORE_SECRET — API может вернуть ошибку авторизации')
  }

  console.log('[STEP] Подключение к базе и подготовка Payload Local API')
  const { default: config } = await import('../src/payload.config.ts')
  const payload = await getPayload({ config })

  const options = { days, status, limit, matchId }

  if (loop) {
    await runLoop(payload, options, interval)
  } else {
    await runOnce(payload, options)
    if (payload?.db?.drain) await payload.db.drain()
    process.exit(0)
  }
}

main().catch(async (err) => {
  console.error('Ошибка импорта статистики матчей:')
  console.error(err)
  try {
    const payload = globalThis?.payload
    if (payload?.db?.drain) await payload.db.drain()
  } catch {}
  process.exit(1)
})
