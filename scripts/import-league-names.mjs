#!/usr/bin/env node

/**
 * Импорт переведённых названий лиг в Payload CMS.
 * Обновляет поле customName по competitionId. Всегда перезаписывает (включая null).
 * Использование:
 *   pnpm leagues:names:import exports/league-names-YYYY-MM-DD-translated.json
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { getPayload } from 'payload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Загружаем .env до импорта конфига
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function importLeagueNames() {
  let input = process.argv[2]
  let filePath

  if (!input) {
    // Пытаемся найти последний файл в exports с суффиксом -translated.json
    const exportsDir = path.resolve(process.cwd(), 'exports')
    try {
      const files = await fs.readdir(exportsDir)
      const translated = files
        .filter((f) => /^league-names-.*-translated\.json$/.test(f))
        .map((f) => path.join(exportsDir, f))

      if (translated.length > 0) {
        // Выбираем самый свежий по времени изменения
        const withStat = await Promise.all(
          translated.map(async (p) => ({ p, stat: await fs.stat(p) })),
        )
        withStat.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
        filePath = withStat[0].p
        console.log(
          `ℹ️ Файл не указан. Использую последний переведённый: ${path.basename(filePath)}`,
        )
      } else {
        // Нет переведённых файлов — попробуем найти последний оригинальный и проверить наличие перевода
        const originals = files
          .filter((f) => /^league-names-.*\.json$/.test(f) && !/-translated\.json$/.test(f))
          .map((f) => path.join(exportsDir, f))
        if (originals.length > 0) {
          const withStatOrig = await Promise.all(
            originals.map(async (p) => ({ p, stat: await fs.stat(p) })),
          )
          withStatOrig.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
          const candidate = withStatOrig[0].p
          const translatedCandidate = candidate.replace(/\.json$/, '-translated.json')
          try {
            await fs.access(translatedCandidate)
            filePath = translatedCandidate
            console.log(
              `ℹ️ Файл не указан. Найден последний оригинал и соответствующий перевод: ${path.basename(filePath)}`,
            )
          } catch {
            console.error('❌ Переведённые файлы не найдены. Сначала запустите перевод:')
            console.error('   pnpm leagues:names:translate:latest')
            process.exit(1)
          }
        } else {
          console.error('❌ Не найдены файлы экспорта в папке exports. Сначала выполните экспорт:')
          console.error('   pnpm leagues:names:export')
          process.exit(1)
        }
      }
    } catch (e) {
      console.error('❌ Не удалось прочитать папку exports:', e?.message || e)
      process.exit(1)
    }
  } else {
    filePath = path.resolve(input)
  }

  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(raw)

    if (!Array.isArray(data.leagues)) {
      throw new Error('Неверный формат JSON: отсутствует массив leagues')
    }

    // Динамический импорт конфига после dotenv
    const { default: config } = await import('../src/payload.config.ts')
    const payload = await getPayload({ config })

    let updated = 0
    let skipped = 0
    let notFound = 0
    let errors = 0

    for (const league of data.leagues) {
      try {
        if (typeof league.competitionId !== 'number') {
          skipped++
          continue
        }

        const existing = await payload.find({
          collection: 'leagues',
          where: { competitionId: { equals: league.competitionId } },
          limit: 1,
          overrideAccess: true,
        })

        if (!existing.docs.length) {
          notFound++
          console.warn(
            `⚠️  Не найдена лига competitionId=${league.competitionId} (${league.name || 'unknown'})`,
          )
          continue
        }

        const doc = existing.docs[0]
        await payload.update({
          collection: 'leagues',
          id: doc.id,
          data: { customName: league.customName ?? null },
          overrideAccess: true,
        })

        updated++
      } catch (e) {
        errors++
        console.error(
          `❌ Ошибка при обновлении competitionId=${league?.competitionId}:`,
          e?.message || e,
        )
      }
    }

    console.log('\n🎉 Импорт завершён!')
    console.log('📊 Статистика:')
    console.log(`   • Обновлено: ${updated}`)
    console.log(`   • Пропущено (некорректные записи): ${skipped}`)
    console.log(`   • Не найдено в БД: ${notFound}`)
    console.log(`   • Ошибок: ${errors}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Ошибка при импорте:', error)
    process.exit(1)
  }
}

importLeagueNames()
