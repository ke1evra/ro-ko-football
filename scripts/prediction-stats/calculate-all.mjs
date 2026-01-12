#!/usr/bin/env node
/**
 * Массовый подсчёт статистики для всех прогнозов
 *
 * Использование:
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs --force  # Пересчитать все, включая существующие
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-all.mjs --loop --interval=600000  # Запуск в режиме постоянной работы
 */

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import {
  calculatePredictionStats,
  savePredictionStats,
} from '../../src/lib/prediction-stats-calculator.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Загрузка env из нескольких стандартных путей
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

const { default: config } = await import('../../src/payload.config.ts')

function parseArg(name, def = undefined) {
  const k = `--${name}=`
  const found = process.argv.find((a) => a.startsWith(k))
  if (found) return found.slice(k.length)
  return def
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

const args = process.argv.slice(2)
const force = hasFlag('force')
const loop = hasFlag('loop')
const interval = Number(parseArg('interval', 600000)) // 10 минут по умолчанию

async function runOnce(payload) {
  console.log('🚀 Запуск массового подсчёта статистики прогнозов...\n')

  // Найти все прогнозы
  const predictions = await payload.find({
    collection: 'posts',
    where: {
      postType: { equals: 'prediction' },
    },
    limit: 1000,
    depth: 2, // Подтянуть relationships
  })

  console.log(`📊 Найдено прогнозов: ${predictions.totalDocs}\n`)

  let processed = 0
  let created = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const post of predictions.docs) {
    try {
      // Проверить существует ли статистика
      if (!force) {
        const existing = await payload.find({
          collection: 'predictionStats',
          where: { post: { equals: post.id } },
          limit: 1,
        })

        if (existing.totalDocs > 0) {
          console.log(`⏭️  Пропуск ${post.id} (${post.title}) - статистика уже существует`)
          skipped++
          continue
        }
      }

      console.log(`🔄 Обработка ${post.id} (${post.title})...`)

      // Рассчитать статистику
      const statsData = await calculatePredictionStats(payload, post)

      if (!statsData) {
        console.log(`⚠️  Пропуск ${post.id} - не все матчи завершены или нет данных\n`)
        skipped++
        continue
      }

      // Сохранить
      const existingStats = await payload.find({
        collection: 'predictionStats',
        where: { post: { equals: post.id } },
        limit: 1,
      })

      await savePredictionStats(payload, statsData)

      if (existingStats.totalDocs > 0) {
        updated++
      } else {
        created++
      }

      processed++

      console.log(
        `   Результат: ${statsData.summary.won}/${statsData.summary.total} (${(statsData.summary.hitRate * 100).toFixed(1)}%)`,
      )
      console.log(`   ROI: ${(statsData.summary.roi * 100).toFixed(1)}%\n`)
    } catch (error) {
      console.error(`❌ Ошибка при обработке ${post.id}:`, error.message)
      errors++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📈 ИТОГИ:')
  console.log('='.repeat(50))
  console.log(`Всего прогнозов: ${predictions.totalDocs}`)
  console.log(`Обработано: ${processed}`)
  console.log(`Создано новых: ${created}`)
  console.log(`Обновлено: ${updated}`)
  console.log(`Пропущено: ${skipped}`)
  console.log(`Ошибок: ${errors}`)
  console.log('='.repeat(50))

  return { processed, created, updated, skipped, errors }
}

async function runLoop(payload, interval) {
  console.log(`[LOOP] Запуск в режиме постоянной работы с интервалом ${interval / 1000} сек`)

  let iteration = 0
  while (true) {
    iteration++
    console.log(`\n[LOOP] === Итерация ${iteration} ===`)

    try {
      await runOnce(payload)
    } catch (error) {
      console.error(`[LOOP] Ошибка в итерации ${iteration}:`, error.message)
      if (process.env.DEBUG === '1') {
        console.error('[DEBUG] Полная ошибка:', error)
      }
    }

    console.log(`[LOOP] Ожидание ${interval / 1000} сек до следующей итерации...`)
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

async function main() {
  const payload = await getPayload({ config })

  if (loop) {
    await runLoop(payload, interval)
  } else {
    await runOnce(payload)
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('💥 Критическая ошибка:', error)
  process.exit(1)
})
