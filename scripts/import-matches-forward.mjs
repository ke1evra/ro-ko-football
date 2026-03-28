#!/usr/bin/env node

/**
 * Синхронизация актуальных матчей (от последней дат�� в БД вперёд).
 * Предназначен для постоянной работы с периодическими запусками.
 *
 * Источник: matches/history.json API
 *
 * Запуск:
 *   node scripts/import-matches-forward.mjs [--days=7] [--pageSize=30] [--withStats] [--loop] [--interval=600000]
 *
 * Параметры:
 *   --days=N         Количество дней вперёд для синхронизации (по умолчанию 7)
 *   --pageSize=N     Размер страницы API (по умолчанию 30)
 *   --no-stats       Отключить загрузку статистики (по умолчанию статистика загружается)
 *   --loop           Запустить в режиме постоянной работы
 *   --interval=N     Интервал между синхронизациями в мс (по умолчанию 600000 = 10 мин)
 *
 * Логика:
 * - Находит последнюю дату матча в БД
 * - Синхронизирует матчи с этой даты на N дней вперёд
 * - Если БД пуста, начинает с сегодняшней даты
 *
 * Требования:
 * - В .env заданы DATABASE_URI, PAYLOAD_SECRET, LIVESCORE_KEY, LIVESCORE_SECRET
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { processHistoryPeriod } from './matches-history-sync.mjs'

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

async function getLatestMatchDate(payload) {
  try {
    const res = await payload.find({
      collection: 'matches',
      sort: '-date', // сортировка по убыванию даты
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (res.docs.length > 0) {
      return new Date(res.docs[0].date)
    }
  } catch (e) {
    console.error('[ERROR] Не удалось получить последнюю дату из БД:', e?.message || e)
  }
  return null
}

async function getPriorityCompetitionIds(payload) {
  try {
    const res = await payload.findGlobal({
      slug: 'topMatchesLeagues',
      depth: 2,
      overrideAccess: true,
    })
    const items = res?.leagues || []
    return items
      .filter((item) => item?.enabled !== false && item?.league?.competitionId)
      .map((item) => item.league.competitionId)
  } catch {
    return []
  }
}

async function syncMatches(payload, { days = 7, pageSize = 30, withStats = true } = {}) {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Нижняя граница: не дальше чем days дней назад от сегодня
  const minStartDate = new Date(today)
  minStartDate.setDate(today.getDate() - days)

  let startDate = today

  const latestDate = await getLatestMatchDate(payload)
  if (latestDate) {
    const candidate = new Date(latestDate)
    candidate.setUTCHours(0, 0, 0, 0)
    console.log(`[SYNC] Найдена последняя дата в БД: ${candidate.toLocaleDateString('ru-RU')}`)

    // Берём позднейшую из двух дат — чтобы не лезть дальше days дней назад
    if (candidate > minStartDate) {
      startDate = candidate
    } else {
      console.log(
        `[SYNC] Дата в БД (${candidate.toLocaleDateString('ru-RU')}) старше ${days} дней → стартуем с ${minStartDate.toLocaleDateString('ru-RU')}`,
      )
      startDate = minStartDate
    }
  } else {
    console.log(`[SYNC] В БД нет матчей, начинаем с сегодняшней даты`)
  }

  const dateRange = getDateRange(days, startDate)
  console.log(`[SYNC] Синхронизация матчей с ${dateRange.from} по ${dateRange.to}`)

  // Фильтр по приоритетным лигам из CMS — без него API тормозит (возвращает всё мировое расписание)
  const competitionIds = await getPriorityCompetitionIds(payload)
  if (competitionIds.length > 0) {
    console.log(`[SYNC] Фильтр по лигам: ${competitionIds.join(', ')}`)
  } else {
    console.log(`[SYNC] Фильтр по лигам: не задан (запрос без фильтра)`)
  }

  // Используем общий модуль для синхронизации
  const { processed, stats } = await processHistoryPeriod(payload, {
    from: dateRange.from,
    to: dateRange.to,
    pageSize,
    competitionIds: competitionIds.length > 0 ? competitionIds : undefined,
    withStats,
  })

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
  const pageSize = Number(parseArg('pageSize', 30))
  const loop = hasFlag('loop')
  const interval = Number(parseArg('interval', 600000)) // 10 минут по умолчанию
  // В loop-режиме stats отключены по умолчанию (можно включить через --with-stats)
  // В одиночном режиме stats включены по умолчанию (можно отключить через --no-stats)
  const withStats = loop ? hasFlag('with-stats') : !hasFlag('no-stats')

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

  console.log(`[CONFIG] days=${days}, pageSize=${pageSize}, withStats=${withStats}`)
  const options = { days, pageSize, withStats }

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
