#!/usr/bin/env node

/**
 * Синхронизация сезонов лиг
 * Запускается раз в день для обновления информации о сезонах
 */

import { getPayload } from 'payload'
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.js'
import config from '../src/payload.config.js'

async function syncSeasons() {
  console.log('[sync-seasons] Начинаем синхронизацию сезонов...')

  const startTime = Date.now()
  let processed = 0
  let created = 0
  let updated = 0
  let errors = 0

  try {
    // Инициализируем Payload
    const payload = await getPayload({ config })

    // Получаем все активные лиги
    const leagues = await payload.find({
      collection: 'leagues',
      where: {
        active: { equals: true }
      },
      limit: 100
    })

    console.log(`[sync-seasons] Найдено ${leagues.docs.length} активных лиг`)

    // Обрабатываем каждую лигу
    for (const league of leagues.docs) {
      try {
        console.log(`[sync-seasons] Синхронизация сезонов лиги: ${league.name} (ID: ${league.leagueId})`)

        // Получаем сезоны для этой лиги
        const seasonsData = await loggedFetch.get('/seasons/list.json', {
          leagueId: league.leagueId
        }, {
          source: 'script',
          ttl: 3600000 // 1 час кэш (данные меняются редко)
        })

        if (!seasonsData?.seasons) {
          console.warn(`[sync-seasons] Нет данных о сезонах для лиги ${league.name}`)
          continue
        }

        // Обрабатываем сезоны
        await processLeagueSeasons(payload, seasonsData.seasons, league)
        processed++

      } catch (error) {
        console.error(`[sync-seasons] Ошибка обработки лиги ${league.name}:`, error)
        errors++
      }
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-seasons] Синхронизация завершена за ${duration}ms`)
    console.log(`[sync-seasons] Обработано: ${processed}, Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`)

  } catch (error) {
    console.error('[sync-seasons] Критическая ошибка:', error)
    process.exit(1)
  }
}

/**
 * Обрабатывает сезоны для конкретной лиги
 */
async function processLeagueSeasons(payload, seasons, league) {
  for (const season of seasons) {
    try {
      // Нормализуем данные сезона
      const normalizedSeason = {
        seasonId: season.id,
        name: season.name,
        startDate: season.startDate ? new Date(season.startDate) : null,
        endDate: season.endDate ? new Date(season.endDate) : null,
        isCurrent: season.isCurrent || false,
        league: league.id, // relationship
        lastSyncAt: new Date()
      }

      // Проверяем существует ли уже такой сезон
      const existing = await payload.find({
        collection: 'seasons',
        where: {
          seasonId: { equals: normalizedSeason.seasonId }
        },
        limit: 1
      })

      if (existing.docs.length > 0) {
        // Обновляем существующую запись
        await payload.update({
          collection: 'seasons',
          id: existing.docs[0].id,
          data: normalizedSeason
        })
        updated++
      } else {
        // Создаём новую запись
        await payload.create({
          collection: 'seasons',
          data: normalizedSeason
        })
        created++

        console.log(`[sync-seasons] Создан сезон: ${normalizedSeason.name} для лиги ${league.name}`)
      }

    } catch (error) {
      console.error(`[sync-seasons] Ошибка обработки сезона ${season.name}:`, error)
      errors++
    }
  }
}

// Глобальные переменные для статистики
let created = 0
let updated = 0
let errors = 0

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  syncSeasons()
    .then(() => {
      console.log('[sync-seasons] Скрипт завершён успешно')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[sync-seasons] Критическая ошибка:', error)
      process.exit(1)
    })
}

export { syncSeasons }