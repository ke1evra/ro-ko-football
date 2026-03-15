#!/usr/bin/env node

/**
 * Синхронизация фикстур матчей
 * Запускается каждый час для обновления предстоящих матчей
 */

import { getPayload } from 'payload'
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.js'
import config from '../src/payload.config.js'

const BATCH_SIZE = 50 // Обрабатывать по 50 матчей за раз
const MAX_FIXTURES = 1000 // Максимум 1000 фикстур за раз

async function syncFixtures() {
  console.log('[sync-fixtures] Начинаем синхронизацию фикстур...')

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

    console.log(`[sync-fixtures] Найдено ${leagues.docs.length} активных лиг`)

    // Обрабатываем каждую лигу
    for (const league of leagues.docs) {
      try {
        console.log(`[sync-fixtures] Синхронизация лиги: ${league.name} (ID: ${league.leagueId})`)

        // Получаем фикстуры для этой лиги
        const fixturesData = await loggedFetch.get('/fixtures/matches.json', {
          leagueId: league.leagueId,
          status: 'all', // scheduled, live, finished
          limit: MAX_FIXTURES
        }, {
          source: 'script',
          ttl: 300000 // 5 минут кэш
        })

        if (!fixturesData?.Stages) {
          console.warn(`[sync-fixtures] Нет данных для лиги ${league.name}`)
          continue
        }

        // Обрабатываем фикстуры пачками
        for (const stage of fixturesData.Stages) {
          const fixtures = stage.Events || []

          console.log(`[sync-fixtures] Обработка ${fixtures.length} фикстур для стадии: ${stage.Snm}`)

          // Разбиваем на пачки
          for (let i = 0; i < fixtures.length; i += BATCH_SIZE) {
            const batch = fixtures.slice(i, i + BATCH_SIZE)

            await processFixturesBatch(payload, batch, league, stage)
            processed += batch.length

            // Небольшая пауза между пачками
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

      } catch (error) {
        console.error(`[sync-fixtures] Ошибка обработки лиги ${league.name}:`, error)
        errors++
      }
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-fixtures] Синхронизация завершена за ${duration}ms`)
    console.log(`[sync-fixtures] Обработано: ${processed}, Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`)

  } catch (error) {
    console.error('[sync-fixtures] Критическая ошибка:', error)
    process.exit(1)
  }
}

/**
 * Обрабатывает пачку фикстур
 */
async function processFixturesBatch(payload, fixtures, league, stage) {
  const operations = []

  for (const fixture of fixtures) {
    try {
      // Нормализуем данные фикстуры
      const normalizedFixture = normalizeFixture(fixture, league, stage)

      // Проверяем существует ли уже такая фикстура
      const existing = await payload.find({
        collection: 'fixtures',
        where: {
          fixtureId: { equals: normalizedFixture.fixtureId }
        },
        limit: 1
      })

      if (existing.docs.length > 0) {
        // Обновляем существующую
        operations.push({
          type: 'update',
          id: existing.docs[0].id,
          data: {
            ...normalizedFixture,
            lastSyncAt: new Date(),
            syncSource: 'fixtures'
          }
        })
      } else {
        // Создаём новую
        operations.push({
          type: 'create',
          data: {
            ...normalizedFixture,
            lastSyncAt: new Date(),
            syncSource: 'fixtures'
          }
        })
      }

    } catch (error) {
      console.error(`[sync-fixtures] Ошибка обработки фикстуры ${fixture.Eid}:`, error)
    }
  }

  // Выполняем операции
  for (const operation of operations) {
    try {
      if (operation.type === 'create') {
        await payload.create({
          collection: 'fixtures',
          data: operation.data
        })
        created++
      } else if (operation.type === 'update') {
        await payload.update({
          collection: 'fixtures',
          id: operation.id,
          data: operation.data
        })
        updated++
      }
    } catch (error) {
      console.error(`[sync-fixtures] Ошибка ${operation.type} фикстуры:`, error)
      errors++
    }
  }
}

/**
 * Нормализует данные фикстуры из API в формат Payload
 */
function normalizeFixture(fixture, league, stage) {
  return {
    fixtureId: fixture.Eid,
    date: fixture.Esd ? new Date(fixture.Esd * 1000) : null,
    time: fixture.Esd ? new Date(fixture.Esd * 1000).toISOString().split('T')[1].substring(0, 5) : null,

    // Команды
    homeTeam: {
      id: fixture.T1?.[0]?.ID,
      name: fixture.T1?.[0]?.Nm,
      logo: fixture.T1?.[0]?.Img
    },
    awayTeam: {
      id: fixture.T2?.[0]?.ID,
      name: fixture.T2?.[0]?.Nm,
      logo: fixture.T2?.[0]?.Img
    },

    // Соревнование
    competition: {
      id: stage.Sid,
      name: stage.Snm
    },
    league: league.id, // relationship

    // Статус
    status: normalizeStatus(fixture.Eps),

    // Дополнительная информация
    round: fixture.Rnd,
    group: fixture.Grp,

    // Стадион
    venue: fixture.Venue ? {
      name: fixture.Venue.StadiumName,
      city: fixture.Venue.CityName,
      country: fixture.Venue.CountryName
    } : null,

    // Коэффициенты (если есть)
    odds: fixture.Odds ? {
      pre: {
        home: fixture.Odds.Pre?.Home,
        draw: fixture.Odds.Pre?.Draw,
        away: fixture.Odds.Pre?.Away
      },
      live: fixture.Odds.Live ? {
        home: fixture.Odds.Live.Home,
        draw: fixture.Odds.Live.Draw,
        away: fixture.Odds.Live.Away
      } : null
    } : null,

    // История коэффициентов (если есть)
    oddsHistory: fixture.OddsHistory ? fixture.OddsHistory.map(odds => ({
      timestamp: new Date(odds.timestamp * 1000),
      odds: {
        pre: odds.Pre ? {
          home: odds.Pre.Home,
          draw: odds.Pre.Draw,
          away: odds.Pre.Away
        } : null,
        live: odds.Live ? {
          home: odds.Live.Home,
          draw: odds.Live.Draw,
          away: odds.Live.Away
        } : null
      },
      source: 'api'
    })) : []
  }
}

/**
 * Нормализует статус матча
 */
function normalizeStatus(apiStatus) {
  switch (apiStatus) {
    case 'NS': return 'scheduled'  // Not Started
    case 'LIVE': return 'live'     // Live
    case 'FT': return 'finished'   // Full Time
    case 'PST': return 'postponed' // Postponed
    case 'CANC': return 'cancelled' // Cancelled
    default: return 'scheduled'
  }
}

// Глобальные переменные для ст��тистики
let created = 0
let updated = 0
let errors = 0

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  syncFixtures()
    .then(() => {
      console.log('[sync-fixtures] Скрипт завершён успешно')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[sync-fixtures] Критическая ошибка:', error)
      process.exit(1)
    })
}

export { syncFixtures }