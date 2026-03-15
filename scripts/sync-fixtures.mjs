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
  console.log('[sync-fixtures] === НОВАЯ ВЕРСИЯ СКРИПТА ===')

  const startTime = Date.now()
  let processed = 0
  let created = 0
  let updated = 0
  let errors = 0

  try {
    // Инициализируем Payload
    const payload = await getPayload({ config })

    // Получаем лиги из глобала TopMatchesLeagues
    let topMatches
    try {
      console.log('[sync-fixtures] Пытаемся получить глобал TopMatchesLeagues с depth=2...')
      topMatches = await payload.findGlobal({ 
        slug: 'topMatchesLeagues', 
        depth: 2, 
        draft: false,
        overrideAccess: true 
      })
      console.log('[sync-fixtures] Глобал получен успешно')
      console.log('[sync-fixtures] topMatches:', JSON.stringify(topMatches, null, 2))
    } catch (e) {
      console.error('[sync-fixtures] ОШИБКА при получении глобала TopMatchesLeagues:')
      console.error('[sync-fixtures] Сообщение:', e?.message || e)
      console.error('[sync-fixtures] Стек:', e?.stack || 'нет стека')
      topMatches = null
    }

    let leagueItems = Array.isArray(topMatches?.leagues) ? topMatches.leagues : []
    
    console.log('[sync-fixtures] ===== ДИАГНОСТИКА ГЛОБАЛА =====')
    console.log(`[sync-fixtures] topMatches объект: ${topMatches ? 'существует' : 'null'}`)
    console.log(`[sync-fixtures] topMatches.enabled: ${topMatches?.enabled}`)
    console.log(`[sync-fixtures] topMatches.leagues тип: ${typeof topMatches?.leagues}`)
    console.log(`[sync-fixtures] topMatches.leagues is array: ${Array.isArray(topMatches?.leagues)}`)
    console.log(`[sync-fixtures] leagueItems.length: ${leagueItems.length}`)
    if (leagueItems.length > 0) {
      console.log(`[sync-fixtures] первая лига: ${JSON.stringify(leagueItems[0], null, 2)}`)
    }
    console.log('[sync-fixtures] ===== КОНЕЦ ДИАГНОСТИКИ =====')

    // Если лиги не загружены с depth=2, получаем их напрямую из коллекции
    if (leagueItems.length === 0 && topMatches?.leagues && Array.isArray(topMatches.leagues)) {
      console.log('[sync-fixtures] Лиги не загружены с depth=2, получаем их напрямую ��з коллекции...')
      const leagueIds = topMatches.leagues
        .filter((item) => item?.league)
        .map((item) => (typeof item.league === 'string' ? item.league : item.league.id || item.league._id))
      
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
          const leagueId = typeof item.league === 'string' ? item.league : item.league.id || item.league._id
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
        competitionId: item.league.competitionId,
        name: item.league.displayName || item.league.name || `League ${item.league.competitionId}`,
      }))

    console.log(`[sync-fixtures] Отфильтровано лиг с competitionId: ${enabledLeagueIds.length}`)

    if (!topMatches?.enabled || enabledLeagueIds.length === 0) {
      console.warn('[sync-fixtures] TopMatchesLeagues пуст или выключен. Завершаем без синхронизации (0 лиг).')
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
        console.log(`[sync-fixtures] Синхронизация лиги: ${league.name} (competitionId: ${league.competitionId})`)

        // Получаем фикстуры для этой лиги
        const fixturesData = await loggedFetch.get(
          '/fixtures/matches.json',
          {
            competition_id: league.competitionId,
            limit: MAX_FIXTURES,
          },
          {
            source: 'script',
            ttl: 300000, // 5 минут кэш
          },
        )

        if (!fixturesData?.Stages) {
          console.warn(`[sync-fixtures] Нет данных для лиги ${league.name}`)
          continue
        }

        // Обрабатываем фикстуры пачками
        for (const stage of fixturesData.Stages) {
          const fixtures = stage.Events || []

          console.log(
            `[sync-fixtures] Обработка ${fixtures.length} фикстур для стадии: ${stage.Snm}`,
          )

          // Разбиваем на пачки
          for (let i = 0; i < fixtures.length; i += BATCH_SIZE) {
            const batch = fixtures.slice(i, i + BATCH_SIZE)

            await processFixturesBatch(payload, batch, league, stage)
            processed += batch.length

            // Небольшая пауза между пачками
            await new Promise((resolve) => setTimeout(resolve, 100))
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
      console.error(`[sync-fixtures] Ошибка обработки фикстуры ${fixture.Eid}:`, error)
    }
  }

  // Выполняем операции
  for (const operation of operations) {
    try {
      if (operation.type === 'create') {
        await payload.create({
          collection: 'fixtures',
          data: operation.data,
        })
        created++
      } else if (operation.type === 'update') {
        await payload.update({
          collection: 'fixtures',
          id: operation.id,
          data: operation.data,
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
    time: fixture.Esd
      ? new Date(fixture.Esd * 1000).toISOString().split('T')[1].substring(0, 5)
      : null,

    // Команды
    homeTeam: {
      id: fixture.T1?.[0]?.ID,
      name: fixture.T1?.[0]?.Nm,
      logo: fixture.T1?.[0]?.Img,
    },
    awayTeam: {
      id: fixture.T2?.[0]?.ID,
      name: fixture.T2?.[0]?.Nm,
      logo: fixture.T2?.[0]?.Img,
    },

    // Соревнование
    competition: {
      id: stage.Sid,
      name: stage.Snm,
    },
    league: league.id, // relationship

    // Статус
    status: normalizeStatus(fixture.Eps),

    // Дополнительная информация
    round: fixture.Rnd,
    group: fixture.Grp,

    // Стадион
    venue: fixture.Venue
      ? {
          name: fixture.Venue.StadiumName,
          city: fixture.Venue.CityName,
          country: fixture.Venue.CountryName,
        }
      : null,

    // Коэффициенты (если есть)
    odds: fixture.Odds
      ? {
          pre: {
            home: fixture.Odds.Pre?.Home,
            draw: fixture.Odds.Pre?.Draw,
            away: fixture.Odds.Pre?.Away,
          },
          live: fixture.Odds.Live
            ? {
                home: fixture.Odds.Live.Home,
                draw: fixture.Odds.Live.Draw,
                away: fixture.Odds.Live.Away,
              }
            : null,
        }
      : null,

    // История коэффициентов (если есть)
    oddsHistory: fixture.OddsHistory
      ? fixture.OddsHistory.map((odds) => ({
          timestamp: new Date(odds.timestamp * 1000),
          odds: {
            pre: odds.Pre
              ? {
                  home: odds.Pre.Home,
                  draw: odds.Pre.Draw,
                  away: odds.Pre.Away,
                }
              : null,
            live: odds.Live
              ? {
                  home: odds.Live.Home,
                  draw: odds.Live.Draw,
                  away: odds.Live.Away,
                }
              : null,
          },
          source: 'api',
        }))
      : [],
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

/**
 * Нормализует статус матча
 */
function normalizeStatus(apiStatus) {
  switch (apiStatus) {
    case 'NS':
      return 'scheduled' // Not Started
    case 'LIVE':
      return 'live' // Live
    case 'FT':
      return 'finished' // Full Time
    case 'PST':
      return 'postponed' // Postponed
    case 'CANC':
      return 'cancelled' // Cancelled
    default:
      return 'scheduled'
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
