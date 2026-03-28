#!/usr/bin/env node

/**
 * Ручная синхронизация стран
 * Запускается по запросу администратора через админ-панель
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.ts'

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

async function syncCountries() {
  console.log('[sync-countries] Начинаем синхронизацию стран...')

  const startTime = Date.now()
  let processed = 0
  let created = 0
  let updated = 0
  let errors = 0

  try {
    // Проверяем переменные окружения
    if (!process.env.DATABASE_URI) {
      console.error('Ошибка: не задан DATABASE_URI в .env')
      process.exit(1)
    }
    if (!process.env.PAYLOAD_SECRET) {
      console.error('Ошибка: не задан PAYLOAD_SECRET в .env')
      process.exit(1)
    }

    // Инициализируем Payload
    const { default: config } = await import('../src/payload.config.ts')
    const payload = await getPayload({ config })

    // Получаем список всех стран
    const countriesData = await loggedFetch.get(
      '/countries/list.json',
      {},
      {
        source: 'script',
        ttl: 86400000, // 24 часа кэш (страны меняются очень редко)
      },
    )

    if (!countriesData?.countries) {
      console.error('[sync-countries] Нет данных о странах')
      process.exit(1)
    }

    console.log(`[sync-countries] Получено ${countriesData.countries.length} стран`)

    // Обрабатываем страны
    for (const country of countriesData.countries) {
      try {
        // Нормализуем данные страны
        const normalizedCountry = {
          countryId: country.id,
          name: country.name,
          flag: country.flag || null,
          fifaCode: country.fifaCode || null,
          lastSyncAt: new Date(),
        }

        // Проверяем существует ли уже такая страна
        const existing = await payload.find({
          collection: 'countries',
          where: {
            countryId: { equals: normalizedCountry.countryId },
          },
          limit: 1,
        })

        if (existing.docs.length > 0) {
          // Обновляем существующую страну
          await payload.update({
            collection: 'countries',
            id: existing.docs[0].id,
            data: normalizedCountry,
          })
          updated++
        } else {
          // Создаём новую страну
          await payload.create({
            collection: 'countries',
            data: normalizedCountry,
          })
          created++

          console.log(`[sync-countries] Создана страна: ${normalizedCountry.name}`)
        }

        processed++
      } catch (error) {
        console.error(`[sync-countries] Ошибка обработки страны ${country.name}:`, error)
        errors++
      }
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-countries] Синхронизация завершена за ${duration}ms`)
    console.log(
      `[sync-countries] Обработано: ${processed}, Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`,
    )
  } catch (error) {
    console.error('[sync-countries] Критическая ошибка:', error)
    process.exit(1)
  }
}

// Глобальные переменные для статистики
let created = 0
let updated = 0
let errors = 0

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  syncCountries()
    .then(() => {
      console.log('[sync-countries] Скрипт завершён успешно')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[sync-countries] Критическая ошибка:', error)
      process.exit(1)
    })
}

export { syncCountries }
