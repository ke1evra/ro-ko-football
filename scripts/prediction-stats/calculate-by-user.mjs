#!/usr/bin/env node
/**
 * Подсчёт статистики для прогнозов конкретного пользователя
 *
 * Использование:
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-user.mjs <userId>
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-user.mjs 67890abcdef
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-user.mjs 67890abcdef --force
 */

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import {
  calculatePredictionStats,
  savePredictionStats,
} from '../../src/lib/prediction-stats-calculator.js'

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

const { default: config } = await import('../../src/payload.config.js')

const args = process.argv.slice(2)
const userId = args[0]
const force = args.includes('--force')

if (!userId) {
  console.error('❌ Ошибка: укажите userId')
  console.log('Использование: node scripts/prediction-stats/calculate-by-user.mjs <userId>')
  process.exit(1)
}

async function main() {
  console.log(`🚀 Подсчёт ста��истики для пользователя ${userId}...\n`)

  const payload = await getPayload({ config })

  // Проверить существует ли пользователь
  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })
    console.log(`👤 Пользователь: ${user.name || user.email}\n`)
  } catch (error) {
    console.error(`❌ Пользователь с ID ${userId} не найден`)
    process.exit(1)
  }

  // Найти все прогнозы пользователя
  const predictions = await payload.find({
    collection: 'posts',
    where: {
      postType: { equals: 'prediction' },
      author: { equals: userId },
    },
    limit: 1000,
    depth: 2,
  })

  console.log(`📝 Найдено прогнозов: ${predictions.totalDocs}\n`)

  if (predictions.totalDocs === 0) {
    console.log('У пользователя нет прогнозов')
    process.exit(0)
  }

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

  process.exit(0)
}

main().catch((error) => {
  console.error('💥 Критическая ошибка:', error)
  process.exit(1)
})
