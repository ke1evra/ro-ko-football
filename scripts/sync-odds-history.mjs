#!/usr/bin/env node

/**
 * Синхронизация истории коэффициентов
 * Запускается каждые 30 секунд для обновления коэффициентов активных матчей
 */

import { getPayload } from 'payload'
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.js'
import config from '../src/payload.config.js'

const BATCH_SIZE = 20 // Обрабатывать по 20 матчей за раз
const MAX_ACTIVE_FIXTURES = 200 // Максимум 200 активных фикстур

async function syncOddsHistory() {
  console.log('[sync-odds-history] Начинаем синхронизацию истории коэффициентов...')

  const startTime = Date.now()
  let processed = 0
  let updated = 0
  let errors = 0

  try {
    // Инициализируем Payload
    const payload = await getPayload({ config })

    // Получаем активные фикстуры (запланированные и live)
    const activeFixtures = await payload.find({
      collection: 'fixtures',
      where: {
        status: {
          in: ['scheduled', 'live'],
        },
      },
      limit: MAX_ACTIVE_FIXTURES,
      sort: 'date', // Сначала ближайшие матчи
    })

    console.log(`[sync-odds-history] Найдено ${activeFixtures.docs.length} активных фикстур`)

    // Обрабатываем фикстуры пачками
    for (let i = 0; i < activeFixtures.docs.length; i += BATCH_SIZE) {
      const batch = activeFixtures.docs.slice(i, i + BATCH_SIZE)

      await processOddsBatch(payload, batch)
      processed += batch.length

      // Небольшая пауза между пачками
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-odds-history] Синхронизация завершена за ${duration}ms`)
    console.log(
      `[sync-odds-history] Обработано: ${processed}, Обновлено: ${updated}, Ошибок: ${errors}`,
    )
  } catch (error) {
    console.error('[sync-odds-history] Критическая ошибка:', error)
    process.exit(1)
  }
}

/**
 * Обрабатывает пачку фикстур для обновления коэффициентов
 */
async function processOddsBatch(payload, fixtures) {
  for (const fixture of fixtures) {
    try {
      // Получаем свежие коэффициенты для этого матча
      const oddsData = await loggedFetch.get(
        '/odds/history.json',
        {
          matchId: fixture.fixtureId,
          hours: 24, // Последние 24 часа
        },
        {
          source: 'script',
          ttl: 30000, // 30 секунд кэш
        },
      )

      if (!oddsData?.odds) {
        continue // Нет данных о коэффициентах
      }

      // Нормализуем историю коэффициентов
      const newOddsHistory = normalizeOddsHistory(oddsData.odds, fixture.oddsHistory || [])

      // Проверяем, есть ли новые коэффициенты
      if (newOddsHistory.length > (fixture.oddsHistory?.length || 0)) {
        // Обновляем текущие коэффициенты и историю
        const currentOdds = newOddsHistory[newOddsHistory.length - 1]?.odds

        await payload.update({
          collection: 'fixtures',
          id: fixture.id,
          data: {
            odds: currentOdds,
            oddsHistory: newOddsHistory,
            lastSyncAt: new Date(),
            syncSource: 'odds-history',
          },
        })

        updated++
        console.log(`[sync-odds-history] Обновлены коэффициенты для матча ${fixture.fixtureId}`)
      }
    } catch (error) {
      console.error(`[sync-odds-history] Ошибка обработки матча ${fixture.fixtureId}:`, error)
      errors++
    }
  }
}

/**
 * Нормализует историю коэффициентов из API
 */
function normalizeOddsHistory(apiOdds, existingHistory) {
  const normalized = [...existingHistory] // Копируем существующую историю

  // Обрабатываем новые коэффициенты
  for (const oddsEntry of apiOdds) {
    const timestamp = new Date(oddsEntry.timestamp * 1000)
    const existingIndex = normalized.findIndex(
      (entry) => entry.timestamp.getTime() === timestamp.getTime(),
    )

    const normalizedEntry = {
      timestamp,
      odds: {
        pre: oddsEntry.Pre
          ? {
              home: oddsEntry.Pre.Home,
              draw: oddsEntry.Pre.Draw,
              away: oddsEntry.Pre.Away,
            }
          : null,
        live: oddsEntry.Live
          ? {
              home: oddsEntry.Live.Home,
              draw: oddsEntry.Live.Draw,
              away: oddsEntry.Live.Away,
            }
          : null,
      },
      source: 'api',
    }

    if (existingIndex >= 0) {
      // Обновляем существующую запись
      normalized[existingIndex] = normalizedEntry
    } else {
      // Добавляем новую запись
      normalized.push(normalizedEntry)
    }
  }

  // Сортируем по времени (новые в конце)
  normalized.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Ограничиваем историю последними 100 записями
  return normalized.slice(-100)
}

// Глобальные переменные для статистики
let updated = 0
let errors = 0

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  syncOddsHistory()
    .then(() => {
      console.log('[sync-odds-history] Скрипт завершён успешно')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[sync-odds-history] Критическая ошибка:', error)
      process.exit(1)
    })
}

export { syncOddsHistory }
