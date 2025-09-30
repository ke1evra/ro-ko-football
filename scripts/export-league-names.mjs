#!/usr/bin/env node

/**
 * Экспорт названий лиг из Payload CMS в JSON.
 * Использование: pnpm leagues:names:export
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { getPayload } from 'payload'

// Загружаем переменные окружения из .env
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function exportLeagueNames() {
  console.log('🚀 Экспорт названий лиг...')

  try {
    // Динамический импорт конфига ПОСЛЕ загрузки .env
    const { default: config } = await import('../src/payload.config.ts')

    const payload = await getPayload({ config })
    console.log('✅ Подключение к Payload установлено')

    const result = await payload.find({
      collection: 'leagues',
      limit: 10000,
      sort: 'competitionId',
      depth: 0,
      overrideAccess: true,
    })

    console.log(`📊 Найдено лиг: ${result.docs.length}`)

    const exportData = {
      exportDate: new Date().toISOString(),
      totalLeagues: result.docs.length,
      leagues: result.docs.map((league) => ({
        id: league.id,
        competitionId: league.competitionId,
        name: league.name,
        customName: league.customName ?? null,
        countryName: league.countryName ?? null,
        countryId: league.countryId ?? null,
        tier: league.tier ?? null,
        isLeague: !!league.isLeague,
        isCup: !!league.isCup,
        active: league.active !== false,
      })),
    }

    const exportDir = path.join(process.cwd(), 'exports')
    try {
      await fs.access(exportDir)
    } catch {
      await fs.mkdir(exportDir, { recursive: true })
    }

    const filename = `league-names-${new Date().toISOString().split('T')[0]}.json`
    const filepath = path.join(exportDir, filename)
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf8')

    console.log('✅ Экс��орт завершён!')
    console.log(`📄 Файл сохранён: ${filepath}`)
    console.log(`📊 Экспортировано лиг: ${exportData.totalLeagues}`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Ошибка при экспорте:', error)
    process.exit(1)
  }
}

exportLeagueNames()
