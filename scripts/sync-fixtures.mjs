#!/usr/bin/env node

/**
 * Синхронизация фикстур матчей
 * Запускается каждый час для обновления предстоящих матчей
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

const BATCH_SIZE = 50 // Обрабатывать по 50 матчей за раз
const SYNC_DAYS = 7 // Синхронизировать фикстуры на ближайшие 7 дней

const mask = (v) =>
  typeof v === 'string' && v.length > 6 ? `${v.slice(0, 3)}***${v.slice(-2)}` : v ? 'set' : 'empty'

async function syncFixtures() {
  console.log('[sync-fixtures] Начинаем синхронизацию фикстур...')

  const startTime = Date.now()
  let processed = 0
  // created, updated, errors — module-level, shared with processFixturesBatch
  created = 0
  updated = 0
  errors = 0

  try {
    // Выводим информацию о переменных окружения
    console.log('[INIT] Загрузка окружения:')
    console.log(`       DATABASE_URI: ${process.env.DATABASE_URI ? 'set' : 'empty'}`)
    console.log(`       PAYLOAD_SECRET: ${process.env.PAYLOAD_SECRET ? 'set' : 'empty'}`)
    console.log(`       LIVESCORE_KEY: ${mask(process.env.LIVESCORE_KEY)}`)
    console.log(`       LIVESCORE_SECRET: ${mask(process.env.LIVESCORE_SECRET)}`)

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
    console.log('[STEP] Подключение к базе и подготовка Payload Local API')
    const { default: config } = await import('../src/payload.config.ts')
    const payload = await getPayload({ config })

    // Получаем лиги из глобала TopMatchesLeagues
    let topMatches
    try {
      console.log('[sync-fixtures] Пытаемся получить глобал TopMatchesLeagues с depth=2...')
      topMatches = await payload.findGlobal({
        slug: 'topMatchesLeagues',
        depth: 2,
        draft: false,
        overrideAccess: true,
      })
      console.log('[sync-fixtures] Глобал получен успешно')
    } catch (e) {
      console.error('[sync-fixtures] ОШИБКА при получении глобала TopMatchesLeagues:')
      console.error('[sync-fixtures] Сообщение:', e?.message || e)
      console.error('[sync-fixtures] Стек:', e?.stack || 'нет стека')
      topMatches = null
    }

    let leagueItems = Array.isArray(topMatches?.leagues) ? topMatches.leagues : []

    // Если лиги не загружены с depth=2, получаем их напрямую из коллекции
    if (leagueItems.length === 0 && topMatches?.leagues && Array.isArray(topMatches.leagues)) {
      console.log(
        '[sync-fixtures] Лиги не загружены с depth=2, получаем их напрямую ��з коллекции...',
      )
      const leagueIds = topMatches.leagues
        .filter((item) => item?.league)
        .map((item) =>
          typeof item.league === 'string' ? item.league : item.league.id || item.league._id,
        )

      if (leagueIds.length > 0) {
        const leaguesFromDb = await payload.find({
          collection: 'leagues',
          where: {
            id: { in: leagueIds },
          },
          limit: leagueIds.length,
          depth: 0,
          overrideAccess: true,
        })

        leagueItems = topMatches.leagues.map((item) => {
          const leagueId =
            typeof item.league === 'string' ? item.league : item.league.id || item.league._id
          const leagueData = leaguesFromDb.docs.find((doc) => doc.id === leagueId)
          return {
            ...item,
            league: leagueData || item.league,
          }
        })

        console.log(`[sync-fixtures] Загружено ${leagueItems.length} лиг из коллекции`)
      }
    }

    const enabledLeagueIds = leagueItems
      .filter((item) => item?.enabled !== false && item?.league?.competitionId)
      .map((item) => ({
        id: item.league.id, // Payload document ID for relationship
        competitionId: item.league.competitionId,
        name: item.league.displayName || item.league.name || `League ${item.league.competitionId}`,
      }))

    console.log(`[sync-fixtures] Отфильтровано лиг с competitionId: ${enabledLeagueIds.length}`)

    if (!topMatches?.enabled || enabledLeagueIds.length === 0) {
      console.warn(
        '[sync-fixtures] TopMatchesLeagues пуст или выключен. Завершаем без синхронизации (0 лиг).',
      )
      const duration = Date.now() - startTime
      console.log(`[sync-fixtures] Синхронизация завершена за ${duration}ms`)
      console.log(
        `[sync-fixtures] Обработано: ${processed}, Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`,
      )
      return
    }

    console.log(
      `[sync-fixtures] Используем глобал TopMatchesLeagues: ${enabledLeagueIds.length} лиг -> [${enabledLeagueIds
        .map((l) => l.competitionId)
        .join(', ')}]`,
    )

    // Обрабатываем каждую лигу из глобала
    for (const league of enabledLeagueIds) {
      try {
        console.log(
          `[sync-fixtures] Синхронизация лиги: ${league.name} (competitionId: ${league.competitionId})`,
        )

        // Запрашиваем фикстуры по одному дню (без даты API отдаёт весь сезон — очень медленно)
        const allFixtures = []
        const today = new Date()

        for (let dayOffset = 0; dayOffset < SYNC_DAYS; dayOffset++) {
          const date = new Date(today)
          date.setUTCDate(today.getUTCDate() + dayOffset)
          const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD

          let pageData
          try {
            pageData = await loggedFetch.get(
              '/fixtures/list.json',
              {
                competition_id: league.competitionId,
                date: dateStr,
              },
              {
                source: 'script',
                ttl: 300000, // 5 минут кэш
              },
            )
          } catch (dateErr) {
            console.warn(
              `[sync-fixtures] Ошибка запроса на дату ${dateStr} (лига ${league.name}): ${dateErr.message}`,
            )
            continue
          }

          if (pageData?.success === false) {
            console.warn(
              `[sync-fixtures] API отказал для даты ${dateStr}: ${pageData.error || 'unknown error'}`,
            )
            continue
          }

          const fixtures = pageData?.data?.fixtures
          if (fixtures && fixtures.length > 0) {
            allFixtures.push(...fixtures)
          }
        }

        if (allFixtures.length === 0) {
          console.warn(`[sync-fixtures] Нет данных для лиги ${league.name}`)
          continue
        }

        console.log(
          `[sync-fixtures] Обработка ${allFixtures.length} фикстур для лиги: ${league.name}`,
        )

        // Разбиваем на пачки
        for (let i = 0; i < allFixtures.length; i += BATCH_SIZE) {
          const batch = allFixtures.slice(i, i + BATCH_SIZE)

          await processFixturesBatch(payload, batch, league)
          processed += batch.length

          // Небольшая пауза между пачками
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`[sync-fixtures] Ошибка обработки лиги ${league.name}:`, error)
        errors++
      }
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-fixtures] Синхронизация завершена за ${duration}ms`)
    console.log(
      `[sync-fixtures] Обработано: ${processed}, Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`,
    )
  } catch (error) {
    console.error('[sync-fixtures] Критическая ошибка:', error)
    process.exit(1)
  }
}

/**
 * Обрабатывает пачку фикстур
 */
async function processFixturesBatch(payload, fixtures, league) {
  const operations = []

  for (const fixture of fixtures) {
    try {
      // Нормализуем данные фикстуры
      const normalizedFixture = normalizeFixture(fixture, league)

      // Проверяем существует ли уже такая фикстура
      const existing = await payload.find({
        collection: 'fixtures',
        where: {
          fixtureId: { equals: normalizedFixture.fixtureId },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        // Обновляем существующую - добавляем историю коэффициентов
        const existingFixture = existing.docs[0]
        const updatedOddsHistory = mergeOddsHistory(
          existingFixture.oddsHistory || [],
          normalizedFixture.oddsHistory || [],
        )

        operations.push({
          type: 'update',
          id: existing.docs[0].id,
          data: {
            ...normalizedFixture,
            oddsHistory: updatedOddsHistory,
            lastSyncAt: new Date(),
            syncSource: 'fixtures',
          },
        })
      } else {
        // Создаём новую
        operations.push({
          type: 'create',
          data: {
            ...normalizedFixture,
            lastSyncAt: new Date(),
            syncSource: 'fixtures',
          },
        })
      }
    } catch (error) {
      console.error(`[sync-fixtures] Ошибка обработки фикстуры ${fixture.id}:`, error)
    }
  }

  // Выполняем операции (overrideAccess т.к. коллекция закрыта для внешних записей)
  for (const operation of operations) {
    try {
      if (operation.type === 'create') {
        await payload.create({
          collection: 'fixtures',
          data: operation.data,
          overrideAccess: true,
        })
        created++
      } else if (operation.type === 'update') {
        await payload.update({
          collection: 'fixtures',
          id: operation.id,
          data: operation.data,
          overrideAccess: true,
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
 * Нормализует данные фикстуры из livescore-api.com в формат Payload
 *
 * Реальный формат ответа API:
 * { id, date, time, round, group_id, location,
 *   home: {id, name, logo}, away: {id, name, logo},
 *   competition: {id, name}, country, federation,
 *   odds: { pre: {"1":..., "X":..., "2":...}, live: {...} } }
 */
/**
 * Формат ответа /fixtures/list.json:
 * { id, date, time, round, group_id, location,
 *   home: {id, name, logo, stadium, country_id},
 *   away: {id, name, logo, stadium, country_id},
 *   competition: {id, name, ...}, country: {...}, federation: {...},
 *   odds: { pre: {"1":..., "X":..., "2":...}, live: {...} } }
 */
function normalizeFixture(fixture, league) {
  const dateStr = fixture.date
  const timeStr = fixture.time || '00:00:00'
  const matchDate = dateStr ? new Date(`${dateStr}T${timeStr}Z`) : null
  const timeFormatted = timeStr ? timeStr.substring(0, 5) : null

  return {
    fixtureId: fixture.id,
    date: matchDate,
    time: timeFormatted,

    homeTeam: {
      id: fixture.home?.id,
      name: fixture.home?.name,
      logo: fixture.home?.logo || null,
    },
    awayTeam: {
      id: fixture.away?.id,
      name: fixture.away?.name,
      logo: fixture.away?.logo || null,
    },

    competition: {
      id: fixture.competition?.id,
      name: fixture.competition?.name,
    },
    league: league.id,

    status: 'scheduled',

    round: fixture.round != null && fixture.round !== '' ? String(fixture.round) : null,
    group: fixture.group_id || null,

    venue: fixture.location
      ? {
          name: fixture.location,
          city: null,
          country: fixture.country?.name || null,
        }
      : null,

    odds: fixture.odds
      ? {
          pre: {
            home: fixture.odds.pre?.['1'] ?? null,
            draw: fixture.odds.pre?.['X'] ?? null,
            away: fixture.odds.pre?.['2'] ?? null,
          },
          live: fixture.odds.live
            ? {
                home: fixture.odds.live?.['1'] ?? null,
                draw: fixture.odds.live?.['X'] ?? null,
                away: fixture.odds.live?.['2'] ?? null,
              }
            : null,
        }
      : null,

    oddsHistory: [],
  }
}

/**
 * Объединяет историю коэффициентов
 */
function mergeOddsHistory(existingHistory, newHistory) {
  const merged = [...existingHistory]

  // Добавляем новые записи
  for (const newEntry of newHistory) {
    const existingIndex = merged.findIndex(
      (entry) => entry.timestamp.getTime() === newEntry.timestamp.getTime(),
    )

    if (existingIndex >= 0) {
      // Обновляем существующую запись
      merged[existingIndex] = newEntry
    } else {
      // Добавляем новую запись
      merged.push(newEntry)
    }
  }

  // Сортируем по времени (новые в конце)
  merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Ограничиваем историю последними 100 записями
  return merged.slice(-100)
}

// Глобальные переменные для статистики
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
