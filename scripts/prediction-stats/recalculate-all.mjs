#!/usr/bin/env node
/**
 * Пересчёт всей существующей статистики (force mode)
 * 
 * Использование:
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/recalculate-all.mjs
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/recalculate-all.mjs --confirm  # Без подтверждения
 */

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'readline'
import { getPayload } from 'payload'
import { calculatePredictionStats, savePredictionStats } from '../../src/lib/prediction-stats-calculator.ts'

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

const args = process.argv.slice(2)
const skipConfirm = args.includes('--confirm')

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function main() {
  console.log('🔄 ПЕРЕСЧЁТ ВСЕЙ СТАТИСТИКИ ПРОГНОЗОВ\n')
  console.log('⚠️  ВНИМАНИЕ: Это действие пересчитает ВСЮ существующую статистику!')
  console.log('   Это может занять продолжительное время.\n')
  
  if (!skipConfirm) {
    const confirmed = await confirm('Продолжить? (y/n): ')
    if (!confirmed) {
      console.log('Отменено')
      process.exit(0)
    }
  }
  
  console.log('\n🚀 Запуск пересчёта...\n')
  
  const payload = await getPayload({ config })
  
  // Найти все прогнозы
  const predictions = await payload.find({
    collection: 'posts',
    where: {
      postType: { equals: 'prediction' },
    },
    limit: 1000,
    depth: 2,
  })
  
  console.log(`📊 Найдено прогнозов: ${predictions.totalDocs}\n`)
  
  let processed = 0
  let created = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  
  for (const post of predictions.docs) {
    try {
      console.log(`🔄 Обработка ${post.id} (${post.title})...`)
      
      // Рассчитать статистику
      const statsData = await calculatePredictionStats(payload, post)
      
      if (!statsData) {
        console.log(`⚠️  Пропуск ${post.id} - не все матчи завершены или нет данных\n`)
        skipped++
        continue
      }
      
      // Проверить существует ли статистика
      const existingStats = await payload.find({
        collection: 'predictionStats',
        where: { post: { equals: post.id } },
        limit: 1,
      })
      
      // Сохранить (создать или обновить)
      await savePredictionStats(payload, statsData)
      
      if (existingStats.totalDocs > 0) {
        updated++
      } else {
        created++
      }
      
      processed++
      
      console.log(`   Результат: ${statsData.summary.won}/${statsData.summary.total} (${(statsData.summary.hitRate * 100).toFixed(1)}%)`)
      console.log(`   ROI: ${(statsData.summary.roi * 100).toFixed(1)}%\n`)
      
    } catch (error) {
      console.error(`❌ Ошибка при обработке ${post.id}:`, error.message)
      errors++
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📈 ИТОГИ ПЕРЕСЧЁТА:')
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
