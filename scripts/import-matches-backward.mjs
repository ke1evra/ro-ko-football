#!/usr/bin/env node

/**
 * Ретроспективная синхронизация матчей (от текущей даты назад), через общий модуль.
 * Использует посуточную пагинацию (from/to + page, size=30) и корректные параметры API.
 *
 * Запуск:
 *   node scripts/import-matches-backward.mjs \
 *     [--days=30] [--pageSize=30] [--maxDays=3650] [--loop] [--interval=86400000] \
 *     [--startDate=YYYY-MM-DD] [--competitions=1,2] [--teams=19,7] [--withStats] [--maxRequests=45000]
 *
 * Параметры:
 *   --days=N         Размер блока дней за одну итерацию (по умолчанию 30)
 *   --pageSize=N     Размер страницы API (по умолчанию 30)
 *   --maxDays=N      Максимальная глубина (по умолчанию 3650 ~ 10 лет)
 *   --startDate=...  Начать с этой даты (если не задана — earliestInDB - 1 день)
 *   --competitions   CSV ids соревнований (competition_id)
 *   --teams          CSV ids команд (team_id)
 *   --no-stats       Отключить загрузку статистики (по умолчанию статистика загружается)
 *   --loop           Фоновый режим
 *   --interval=ms    Интервал между итерациями в loop (по умолчанию 24ч)
 *   --maxRequests=N  Лимит HTTP-запросов к API за запуск (по умолчанию 45000)
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { processHistoryPeriod, setRequestBudget } from './matches-history-sync.mjs'

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

const mask = (v) =>
  typeof v === 'string' && v.length > 6 ? `${v.slice(0, 3)}***${v.slice(-2)}` : v ? 'set' : 'empty'

function parseArg(name, def = undefined) {
  const k = `--${name}=`
  const found = process.argv.find((a) => a.startsWith(k))
  if (found) return found.slice(k.length)
  return def
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function formatDateISO(d) {
  const x = new Date(d)
  return x.toISOString().split('T')[0]
}

async function getEarliestMatchDate(payload) {
  try {
    const res = await payload.find({
      collection: 'matches',
      sort: 'date',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (res.docs.length > 0) {
      return new Date(res.docs[0].date)
    }
  } catch (e) {
    console.error('[ERROR] Не удалось получить самую раннюю дату из БД:', e?.message || e)
  }
  return null
}

async function runOnce(
  payload,
  { days, pageSize, maxDays, startDate, competitions, teams, withStats = true, maxRequests },
) {
  console.log('\n' + '='.repeat(60))
  console.log('РЕТРОСПЕКТИВНАЯ СИНХРОНИЗАЦИЯ МАТЧЕЙ')
  console.log('='.repeat(60))

  // Устанавливаем бюджет HTTP-запросов на этот запуск
  const budget = Number(maxRequests)
  setRequestBudget(budget)
  console.log(`[INFO] Лимит запросов: ${Number.isFinite(budget) ? budget : '∞'}`)

  // Определяем «текущую» дату, с которой начнём идти назад
  let current = startDate ? new Date(startDate) : new Date()
  if (!startDate) {
    const earliest = await getEarliestMatchDate(payload)
    if (earliest) {
      current = new Date(earliest)
      current.setDate(current.getDate() - 1) // на день раньше самой ранней
    }
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() - Number(maxDays))

  console.log(`[INFO] Стартовая дата: ${current.toLocaleDateString('ru-RU')}`)
  console.log(`[INFO] Минимальная дата: ${minDate.toLocaleDateString('ru-RU')}`)
  console.log(`[INFO] Размер блока: ${days} дней, pageSize=${pageSize}`)
  if (competitions) console.log(`[INFO] Фильтр competitions: ${competitions}`)
  if (teams) console.log(`[INFO] Фильтр teams: ${teams}`)

  let iteration = 0
  let totalProcessed = 0
  const totalStats = { created: 0, skipped: 0, errors: 0 }

  while (current >= minDate) {
    iteration++
    const blockEnd = new Date(current) // более поздняя дата
    const blockStart = new Date(current)
    blockStart.setDate(blockStart.getDate() - (Number(days) - 1)) // более ранняя дата в блоке

    const from = formatDateISO(blockStart)
    const to = formatDateISO(blockEnd)

    console.log(`\n[SYNC] === Итерация ${iteration} ===`)
    console.log(`[SYNC] Период: ${from} - ${to}`)

    const { processed, stats, exhausted } = await processHistoryPeriod(payload, {
      from,
      to,
      pageSize: Number(pageSize),
      competitionIds: competitions,
      teamIds: teams,
      withStats,
    })

    totalProcessed += processed
    totalStats.created += stats.created
    totalStats.skipped += stats.skipped
    totalStats.errors += stats.errors

    console.log(
      `[SYNC] Итерация ${iteration} завершена: обработано=${processed}, создано=${stats.created}, пропущено=${stats.skipped}, ошибок=${stats.errors}`,
    )

    if (exhausted) {
      console.warn('[SYNC] Останов по лимиту запросов')
      break
    }

    // Сдвигаем курсор назад на целый блок (на день до начала текущего блока)
    current = new Date(blockStart)
    current.setDate(current.getDate() - 1)

    if (current < minDate) {
      console.log(`[SYNC] Достигнута минимальная дата ${minDate.toLocaleDateString('ru-RU')}`)
      break
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('РЕТРОСПЕКТИВНАЯ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА')
  console.log('='.repeat(60))
  console.log(`📊 Итого:`)
  console.log(`   • Обработано: ${totalProcessed}`)
  console.log(`   • ✅ Создано: ${totalStats.created}`)
  console.log(`   • ≡ Пропущено: ${totalStats.skipped}`)
  console.log(`   • ❌ Ошибок: ${totalStats.errors}`)
  return { totalProcessed, totalStats }
}

async function runLoop(payload, options, interval) {
  console.log(`[LOOP] Режим постоянной работы, интервал ${Math.round(interval / 1000)}с`)
  let iter = 0
  while (true) {
    iter++
    console.log(`\n[LOOP] === Цикл ${iter} ===`)
    try {
      await runOnce(payload, options)
    } catch (e) {
      console.error('[LOOP] Ошибка итерации:', e?.message || e)
    }
    await new Promise((r) => setTimeout(r, interval))
  }
}

async function main() {
  console.log('[INIT] Загрузка окружения:')
  console.log(`       DATABASE_URI: ${process.env.DATABASE_URI ? 'set' : 'empty'}`)
  console.log(`       PAYLOAD_SECRET: ${process.env.PAYLOAD_SECRET ? 'set' : 'empty'}`)
  console.log(`       LIVESCORE_KEY: ${mask(process.env.LIVESCORE_KEY)}`)
  console.log(`       LIVESCORE_SECRET: ${mask(process.env.LIVESCORE_SECRET)}`)

  const days = Number(parseArg('days', 30))
  const pageSize = Number(parseArg('pageSize', 30))
  const maxDays = Number(parseArg('maxDays', 3650))
  const startDate = parseArg('startDate')
  const competitions = parseArg('competitions') // CSV строка
  const teams = parseArg('teams') // CSV строка
  const withStats = !hasFlag('no-stats') // по умолчанию true, отключается флагом --no-stats
  const loop = hasFlag('loop')
  const interval = Number(parseArg('interval', 86400000))
  const maxRequests = Number(parseArg('maxRequests', 10000))

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

  console.log(
    `[CONFIG] days=${days}, pageSize=${pageSize}, withStats=${withStats}, maxRequests=${maxRequests}`,
  )
  const options = {
    days,
    pageSize,
    maxDays,
    startDate,
    competitions,
    teams,
    withStats,
    maxRequests,
  }

  if (loop) {
    await runLoop(payload, options, interval)
  } else {
    await runOnce(payload, options)
    if (payload?.db?.drain) await payload.db.drain()
    process.exit(0)
  }
}

main().catch(async (err) => {
  console.error('Ошибка ретроспективной синхронизации матчей:')
  console.error(err)
  try {
    const payload = globalThis?.payload
    if (payload?.db?.drain) await payload.db.drain()
  } catch {}
  process.exit(1)
})
