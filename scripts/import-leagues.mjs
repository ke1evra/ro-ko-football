#!/usr/bin/env node

/**
 * Импорт всех лиг (соревнований) в Payload CMS через Local API.
 * Источник: catalogsService.getCompetitionsListJson
 *
 * Запуск:
 *   node scripts/import-leagues.mjs [--countryId=NN] [--federationId=NN] [--pageSize=200]
 *
 * Требования:
 * - В .env заданы DATABASE_URI, PAYLOAD_SECRET и ключи внешнего API (если требуются библиотекой fetch)
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Загрузка env из нескольких стандартных путей (корень проекта и папка scripts)
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

const mask = (v) => (typeof v === 'string' && v.length > 6 ? `${v.slice(0, 3)}***${v.slice(-2)}` : v ? 'set' : 'empty')
console.log('[INIT] Загрузка окружения:')
console.log(`       DATABASE_URI: ${process.env.DATABASE_URI ? 'set' : 'empty'}`)
console.log(`       PAYLOAD_SECRET: ${process.env.PAYLOAD_SECRET ? 'set' : 'empty'}`)
console.log(`       LIVESCORE_KEY: ${mask(process.env.LIVESCORE_KEY)}`)
console.log(`       LIVESCORE_SECRET: ${mask(process.env.LIVESCORE_SECRET)}`)

function maskUrlForLog(rawUrl) {
  try {
    const verbose = process.env.DEBUG_LEAGUES_VERBOSE === '1'
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

function parseArg(name, def = undefined) {
  const k = `--${name}=`
  const found = process.argv.find((a) => a.startsWith(k))
  if (found) return found.slice(k.length)
  return def
}

function normalizeCompetitions(resp) {
  const d = resp?.data || {}
  let list = d.competitions ?? d.competition ?? resp?.competitions ?? d.list ?? []
  if (list && !Array.isArray(list) && typeof list === 'object') {
    list = Object.values(list)
  }
  return Array.isArray(list) ? list : []
}

async function fetchCompetitions({ countryId, federationId, page = 1, size = 200 }) {
  const base = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'
  const key = process.env.LIVESCORE_KEY
  const secret = process.env.LIVESCORE_SECRET
  const qs = new URLSearchParams()
  // Согласно корректному использованию, не передаём page/size/lang — только обязательные ключи и опциональные фильтры
  if (countryId) qs.set('country_id', String(countryId))
  if (federationId) qs.set('federation_id', String(federationId))
  if (key) qs.set('key', key)
  if (secret) qs.set('secret', secret)

  const requestJson = async (url) => {
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
            if (process.env.DEBUG_LEAGUES_VERBOSE === '1') {
              console.log('[HTTP] headers:', headers)
              console.log('[HTTP] body:', data)
            } else if (process.env.DEBUG_LEAGUES === '1') {
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

  // Основной endpoint по спеке
  const urlPrimary = `${base}/competitions/list.json?${qs.toString()}`
  let json = await requestJson(urlPrimary)

  // Если "успех" и ноль записей — пробуем альтернативный endpoint
  const competitionsPrimary = normalizeCompetitions(json)
  if ((json?.success !== false) && Array.isArray(competitionsPrimary) && competitionsPrimary.length === 0) {
    const urlFallback = `${base}/competitions/listing.json?${qs.toString()}`
    console.log('[FALLBACK] Пустой список от /competitions/list.json, пробуем /competitions/listing.json')
    const fb = await requestJson(urlFallback)
    // Если fallback что-то вернул — используем его
    const competitionsFallback = normalizeCompetitions(fb)
    if (Array.isArray(competitionsFallback) && competitionsFallback.length > 0) {
      json = fb
    } else if (process.env.DEBUG_LEAGUES === '1') {
      console.log('[DEBUG] Fallback тоже пустой. Ответ:', JSON.stringify(fb).slice(0, 2000))
    }
  }

  return json
}

function dumpResponseBrief(resp, max = 1200) {
  try {
    const s = JSON.stringify(resp)
    return s.length > max ? s.slice(0, max) + '…' : s
  } catch {
    return '[unserializable]'
  }
}

function pickFirstCountry(competition) {
  const c = competition?.countries?.[0]
  return c ? { id: Number(c.id), name: c.name } : undefined
}

function toLeagueDoc(competition) {
  const toBool = (v) => v === true || v === 1 || v === '1'
  const toNum = (v) => (v === undefined || v === null || v === '' ? null : Number(v))
  const firstCountry = pickFirstCountry(competition)
  return {
    competitionId: Number(competition.id),
    name: competition.name,
    countryId: firstCountry?.id ?? null,
    countryName: firstCountry?.name ?? null,
    isLeague: toBool(competition.is_league),
    isCup: toBool(competition.is_cup),
    tier: toNum(competition.tier),
    hasGroups: toBool(competition.has_groups),
    active: toBool(competition.active ?? '1'),
    nationalTeamsOnly: toBool(competition.national_teams_only),
    countries: (competition.countries || []).map((c) => ({ id: Number(c.id), name: c.name })),
    federations: (competition.federations || []).map((f) => ({ id: Number(f.id), name: f.name })),
    season: competition.season
      ? {
          id: toNum(competition.season.id),
          name: competition.season.name ?? null,
          start: competition.season.start ? new Date(competition.season.start).toISOString() : null,
          end: competition.season.end ? new Date(competition.season.end).toISOString() : null,
        }
      : null,
    priority: 999,
  }
}

function sanitizeLeagueDoc(input) {
  const out = {
    competitionId: input.competitionId,
    name: input.name,
    countryId: input.countryId ?? null,
    countryName: input.countryName ?? null,
    isLeague: Boolean(input.isLeague),
    isCup: Boolean(input.isCup),
    tier: input.tier ?? null,
    hasGroups: Boolean(input.hasGroups),
    active: Boolean(input.active),
    nationalTeamsOnly: Boolean(input.nationalTeamsOnly),
    countries: Array.isArray(input.countries)
      ? input.countries.map((c) => ({ id: Number(c.id), name: c.name })).filter((c) => !Number.isNaN(c.id))
      : [],
    federations: Array.isArray(input.federations)
      ? input.federations.map((f) => ({ id: Number(f.id), name: f.name })).filter((f) => !Number.isNaN(f.id))
      : [],
    season: input.season
      ? {
          id: input.season.id ?? null,
          name: input.season.name ?? null,
          start: input.season.start ?? null,
          end: input.season.end ?? null,
        }
      : null,
    priority: input.priority ?? 999,
  }
  
  // Добавляем externalId только если оно не null/undefined
  if (input.externalId != null && input.externalId !== '') {
    out.externalId = input.externalId
  }
  
  return out
}

async function upsertLeague(payload, data) {
  const payloadData = sanitizeLeagueDoc(data)
  
  console.log(`[DEBUG] Обработка competitionId=${payloadData.competitionId}`)

  // Проверяем по уникальному competitionId
  const existing = await payload.find({
    collection: 'leagues',
    where: { competitionId: { equals: payloadData.competitionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    const doc = existing.docs[0]
    try {
      console.log(`[DEBUG] Найдена существующая запись ${doc.id}, обновляем`)
      await payload.update({ collection: 'leagues', id: doc.id, data: payloadData, overrideAccess: true })
      return { action: 'updated', id: doc.id }
    } catch (e) {
      console.error(`[UPSERT][UPDATE] Ошибка при обновлении записи ${doc.id}:`, e.message)
      throw e
    }
  }

  // Дополнительная проверка - может быть запись уже существует, но поиск не нашёл
  try {
    console.log(`[DEBUG] Создаём новую запись для competitionId=${payloadData.competitionId}`)
    const created = await payload.create({ collection: 'leagues', data: payloadData, overrideAccess: true })
    return { action: 'created', id: created.id }
  } catch (e) {
    // Если ошибка уникальности по competitionId - пытаемся найти и обновить
    if (e.message?.includes('duplicate key') || e.message?.includes('unique') || e.data?.errors?.some(err => err.path === 'competitionId')) {
      console.log(`[DEBUG] Ошибка уникальности для competitionId=${payloadData.competitionId}, пытаемся найти и обновить`)
      
      // Повторный поиск с более широкими критериями
      const existingRetry = await payload.find({
        collection: 'leagues',
        where: { 
          or: [
            { competitionId: { equals: payloadData.competitionId } },
            { name: { equals: payloadData.name }, countryId: { equals: payloadData.countryId } }
          ]
        },
        limit: 5,
        depth: 0,
        overrideAccess: true,
      })

      if (existingRetry.docs.length > 0) {
        // Берём первую найденную запись
        const doc = existingRetry.docs[0]
        console.log(`[DEBUG] Найдена существующая запись при повторном поиске ${doc.id}, обновляем`)
        await payload.update({ collection: 'leagues', id: doc.id, data: payloadData, overrideAccess: true })
        return { action: 'updated', id: doc.id }
      }
    }
    
    console.error(`[UPSERT][CREATE] Ошибка при создании записи competitionId=${payloadData.competitionId}:`, e.message)
    console.error('[UPSERT][CREATE] Детали ошибки:', e.data?.errors)
    throw e
  }
}

async function discoverByFilters(payload, { pageSize = 200 } = {}) {
  const base = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'
  const key = process.env.LIVESCORE_KEY
  const secret = process.env.LIVESCORE_SECRET

  const httpGetJson = async (url) => {
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
            if (process.env.DEBUG_LEAGUES_VERBOSE === '1') {
              console.log('[HTTP] headers:', headers)
              console.log('[HTTP] body:', data)
            } else if (process.env.DEBUG_LEAGUES === '1') {
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

  const buildQs = (extra = {}) => {
    const qs = new URLSearchParams()
    qs.set('lang', 'ru')
    qs.set('size', String(pageSize))
    qs.set('page', '1')
    if (key) qs.set('key', key)
    if (secret) qs.set('secret', secret)
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null) qs.set(k, String(v))
    }
    return qs
  }

  const fetchAllFromCatalog = async (kind) => {
    let page = 1
    const all = []
    while (true) {
      const qs = buildQs({ page })
      const url = `${base}/${kind}/list.json?${qs.toString()}`
      if (process.env.DEBUG_LEAGUES === '1') {
        const masked = new URL(url)
        if (masked.searchParams.has('secret')) {
          const s = masked.searchParams.get('secret')
          masked.searchParams.set('secret', s ? s.slice(0, 3) + '***' + s.slice(-2) : '')
        }
        if (masked.searchParams.has('key')) {
          const k = masked.searchParams.get('key')
          masked.searchParams.set('key', k ? k.slice(0, 3) + '***' + k.slice(-2) : '')
        }
        console.log(`[DEBUG] GET ${masked.toString()}`)
      }
      const json = await httpGetJson(url)
      const items = json?.data?.[kind] || json?.[kind] || json?.data?.list || []
      const pages = json?.data?.pages || json?.paging?.pages || 1
      if (!Array.isArray(items) || items.length === 0) break
      all.push(...items)
      if (page >= pages) break
      page += 1
    }
    return all
  }

  const parseEntity = (item, key) => (item?.[key] ? item[key] : item)

  let processed = 0
  const seen = new Set()

  console.log('[DISCOVERY] Пытаемся загрузить через федерации...')
  const federations = await fetchAllFromCatalog('federations')
  console.log(`[DISCOVERY] Найдено федераций: ${federations.length}`)
  for (const raw of federations) {
    const fed = parseEntity(raw, 'federation')
    if (!fed?.id) continue
    console.log(`  • Федерация ${fed.id} ${fed.name || ''}`)

    const resp = await fetchCompetitions({ federationId: fed.id, page: 1, size: pageSize })
    const comps = normalizeCompetitions(resp)
    console.log(`    ↳ соревнований: ${Array.isArray(comps) ? comps.length : 0}`)

    for (const comp of comps) {
      const c = comp?.competition || comp
      if (!c?.id || seen.has(c.id)) continue
      seen.add(c.id)
      const doc = toLeagueDoc(c)
      const { action, id } = await upsertLeague(payload, doc)
      console.log(`      ↳ ${action.toUpperCase()} ${doc.competitionId} ${doc.name} (payloadId=${id})`)
      processed += 1
    }
  }

  if (processed === 0) {
    console.log('[DISCOVERY] Через федерации пусто. Пробуем через страны...')
    const countries = await fetchAllFromCatalog('countries')
    console.log(`[DISCOVERY] Найдено стран: ${countries.length}`)
    for (const raw of countries) {
      const country = parseEntity(raw, 'country')
      if (!country?.id) continue
      console.log(`  • Страна ${country.id} ${country.name || ''}`)

      const resp = await fetchCompetitions({ countryId: country.id, page: 1, size: pageSize })
      const comps = normalizeCompetitions(resp)
      console.log(`    ↳ соревнований: ${Array.isArray(comps) ? comps.length : 0}`)

      for (const comp of comps) {
        const c = comp?.competition || comp
        if (!c?.id || seen.has(c.id)) continue
        seen.add(c.id)
        const doc = toLeagueDoc(c)
        const { action, id } = await upsertLeague(payload, doc)
        console.log(`      ↳ ${action.toUpperCase()} ${doc.competitionId} ${doc.name} (payloadId=${id})`)
        processed += 1
      }
    }
  }

  return processed
}

async function main() {
  const countryId = parseArg('countryId')
  const federationId = parseArg('federationId')
  const pageSize = Number(parseArg('pageSize', 200))

  if (!process.env.DATABASE_URI) {
    console.error('Ошибка: не задан DATABASE_URI в .env')
    process.exit(1)
  }
  if (!process.env.PAYLOAD_SECRET) {
    console.error('Ошибка: не задан PAYLOAD_SECRET в .env')
    process.exit(1)
  }
  if (!process.env.LIVESCORE_KEY || !process.env.LIVESCORE_SECRET) {
    console.warn('[WARN] Не заданы LIVESCORE_KEY/LIVESCORE_SECRET — API может вернуть пустой ответ или ошибку авторизации')
  }

  console.log('Инициализация Payload...')
  console.log('[STEP] Подключение к базе и подготовка Payload Local API')
  const { default: config } = await import('../src/payload.config.ts')
  const payload = await getPayload({ config })

  let page = 1
  let total = 0
  let processed = 0

  while (true) {
    console.log(`Загрузка соревнований: page=${page}, size=${pageSize}...`)
    const startedAt = Date.now()
    const response = await fetchCompetitions({ countryId, federationId, page, size: pageSize })

    if (response && response.success === false) {
      const msg = response?.error?.message || response?.error || response?.message || 'unknown error'
      console.error('[ERROR] LiveScore API вернул ошибку:', msg)
      if (process.env.DEBUG_LEAGUES === '1') console.error('[DEBUG] Полный ответ:', JSON.stringify(response, null, 2))
      process.exit(1)
    }

    const competitions = normalizeCompetitions(response)
    const pages = response?.data?.pages || response?.paging?.pages || 1
    const totalItems = response?.data?.total || response?.paging?.total || competitions.length

    const durationMs = Date.now() - startedAt
    console.log(`Получено: ${competitions.length}, pages=${pages}, total=${totalItems}, за ${durationMs} мс`)
    if (page === 1 && competitions.length === 0) {
      console.log('[INFO] Ответ API пуст. Краткий дамп:', dumpResponseBrief(response))
    }

    if (page === 1 && competitions.length === 0 && process.env.DEBUG_LEAGUES === '1') {
      console.log('[DEBUG] Ключи ответа data:', Object.keys(response?.data || {}))
      console.log('[DEBUG] Пример ответа:', JSON.stringify(response, null, 2).slice(0, 2000))
    }

    if (page === 1) {
      total = totalItems
      console.log(`Всего соревнований по фильтру: ${total} (pages=${pages})`)
    }

    for (const comp of competitions) {
      const competition = comp?.competition || comp // некоторые эндпоинты заворачивают в { competition }
      if (!competition?.id) {
        console.log('  • пропуск записи без ID')
        continue
      }
      const doc = toLeagueDoc(competition)

      const ordinal = processed + 1
      const countryLabel = doc.countryName ? ` — ${doc.countryName}` : ''
      console.log(`  • [${ordinal}${total ? `/${total}` : ''}] ${doc.competitionId} ${doc.name}${countryLabel}`)

      const { action, id } = await upsertLeague(payload, doc)
      console.log(`    ↳ ${action.toUpperCase()} (payloadId=${id})`)

      processed += 1
      if (processed % 25 === 0) {
        console.log(`[PROGRESS] Обработано ${processed}${total ? `/${total}` : ''}`)
      }
    }

    // Переходим к следующей странице: если pages известно и больше текущей — идём дальше,
    // иначе — пытаемся идти, пока не получим пустую выборку
    if (pages && page < pages) {
      page += 1
    } else if (!pages) {
      if (competitions.length === 0) break
      page += 1
    } else {
      break
    }
  }

  if (processed === 0) {
    console.log('[DISCOVERY] Прямой список пуст. Пробуем обход через каталоги (federations/countries)…')
    const discovered = await discoverByFilters(payload, { pageSize })
    processed += discovered
    console.log(`[DISCOVERY] Добавлено из обхода: ${discovered}`)
  }

  console.log(`Готово. Импортировано/обновлено записей: ${processed}`)

  if (payload?.db?.drain) {
    await payload.db.drain()
  }
  process.exit(0)
}

main().catch(async (err) => {
  console.error('Ошибка импорта лиг:')
  console.error(err)
  try {
    const payload = globalThis?.payload
    if (payload?.db?.drain) await payload.db.drain()
  } catch {}
  process.exit(1)
})
