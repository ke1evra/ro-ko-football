#!/usr/bin/env node
/**
 * Подсчёт статистики для конкретного прогноза
 * 
 * Использование:
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-post.mjs <postId>
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-post.mjs 67890abcdef
 *   node --loader @esbuild-kit/esm-loader scripts/prediction-stats/calculate-by-post.mjs 67890abcdef --force
 */

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
const postId = args[0]
const force = args.includes('--force')

if (!postId) {
  console.error('❌ Ошибка: укажите postId')
  console.log('Использование: node scripts/prediction-stats/calculate-by-post.mjs <postId>')
  process.exit(1)
}

async function main() {
  console.log(`🚀 Подсчёт статистики для прогноза ${postId}...\n`)
  
  const payload = await getPayload({ config })
  
  // Получить прогноз
  let post
  try {
    post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 2,
    })
  } catch (error) {
    console.error(`❌ Прогноз с ID ${postId} не найден`)
    process.exit(1)
  }
  
  console.log(`📝 Прогноз: ${post.title}`)
  console.log(`   Тип: ${post.postType}`)
  
  if (post.postType !== 'prediction') {
    console.error('❌ Это не прогноз')
    process.exit(1)
  }
  
  const outcomes = post.prediction?.outcomes || []
  console.log(`   Исходов: ${outcomes.length}\n`)
  
  if (outcomes.length === 0) {
    console.error('❌ В прогнозе нет исходов')
    process.exit(1)
  }
  
  // Проверить существует ли статистика
  if (!force) {
    const existing = await payload.find({
      collection: 'predictionStats',
      where: { post: { equals: post.id } },
      limit: 1,
    })
    
    if (existing.totalDocs > 0) {
      console.log('⚠️  Статистика уже существует. Используйте --force для пересчёта')
      console.log('\nТекущая статистика:')
      const stats = existing.docs[0]
      console.log(`   Результат: ${stats.summary.won}/${stats.summary.total} (${(stats.summary.hitRate * 100).toFixed(1)}%)`)
      console.log(`   ROI: ${(stats.summary.roi * 100).toFixed(1)}%`)
      console.log(`   Рассчитано: ${new Date(stats.evaluatedAt).toLocaleString('ru-RU')}`)
      process.exit(0)
    }
  }
  
  console.log('🔄 Расчёт статистики...\n')
  
  try {
    // Рассчитать статистику
    const statsData = await calculatePredictionStats(payload, post)
    
    if (!statsData) {
      console.log('⚠️  Не удалось рассчитать статистику')
      console.log('Возможные причины:')
      console.log('  - Не все матчи завершены')
      console.log('  - Нет данных о матчах')
      console.log('  - Отсутствуют fixtureId')
      process.exit(0)
    }
    
    // Сохранить
    await savePredictionStats(payload, statsData)
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ СТАТИСТИКА РАССЧИТАНА')
    console.log('='.repeat(50))
    console.log(`Всего исходов: ${statsData.summary.total}`)
    console.log(`Выиграло: ${statsData.summary.won}`)
    console.log(`Проиграло: ${statsData.summary.lost}`)
    console.log(`Не определено: ${statsData.summary.undecided}`)
    console.log(`Hit Rate: ${(statsData.summary.hitRate * 100).toFixed(1)}%`)
    console.log(`ROI: ${(statsData.summary.roi * 100).toFixed(1)}%`)
    console.log(`Очки: ${statsData.scoring.points}`)
    console.log('='.repeat(50))
    
    console.log('\nДетали:')
    statsData.details.forEach((detail, index) => {
      const icon = detail.result === 'won' ? '✅' : detail.result === 'lost' ? '❌' : '⚠️'
      console.log(`  ${index + 1}. ${icon} ${detail.event} @ ${detail.coefficient}`)
      if (detail.actualValue !== undefined && detail.expectedValue !== undefined) {
        console.log(`     Факт: ${detail.actualValue}, Ожидание: ${detail.expectedValue}`)
      }
      if (detail.reason) {
        console.log(`     Причина: ${detail.reason}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Ошибка при расчёте:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
  
  process.exit(0)
}

main().catch((error) => {
  console.error('💥 Критическая ошибка:', error)
  process.exit(1)
})
