#!/usr/bin/env node

/**
 * Ручная синхронизация турнирных таблиц
 * Запускается по запросу администратора через админ-панель
 */

import { getPayload } from 'payload'
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.js'
import config from '../src/payload.config.js'

async function syncStandings(leagueId = null, seasonId = null) {
  console.log('[sync-standings] Начинаем синхронизацию турнирных таблиц...')

  const startTime = Date.now()
  let processed = 0
  let created = 0
  let updated = 0
  let errors = 0

  try {
    // Инициализируем Payload
    const payload = await getPayload({ config })

    // Определяем какие лиги/сезоны синхронизировать
    let targetLeagues = []

    if (leagueId) {
      // Синхронизация конкретной лиги
      const league = await payload.findByID({
        collection: 'leagues',
        id: leagueId,
      })
      targetLeagues = [league]
    } else {
      // ��инхронизация всех активных лиг
      const leagues = await payload.find({
        collection: 'leagues',
        where: {
          active: { equals: true },
        },
        limit: 50,
      })
      targetLeagues = leagues.docs
    }

    console.log(`[sync-standings] Синхронизация ${targetLeagues.length} лиг`)

    // Обрабатываем каждую лигу
    for (const league of targetLeagues) {
      try {
        console.log(`[sync-standings] Синхронизация таблицы лиги: ${league.name}`)

        // Определяем сезон для синхронизации
        let targetSeason = null

        if (seasonId) {
          // Конкретный сезон
          targetSeason = await payload.findByID({
            collection: 'seasons',
            id: seasonId,
          })
        } else {
          // Текущий сезон лиги
          const currentSeason = await payload.find({
            collection: 'seasons',
            where: {
              league: { equals: league.id },
              isCurrent: { equals: true },
            },
            limit: 1,
          })

          if (currentSeason.docs.length > 0) {
            targetSeason = currentSeason.docs[0]
          }
        }

        if (!targetSeason) {
          console.warn(`[sync-standings] Не найден текущий сезон для лиги ${league.name}`)
          continue
        }

        // Получаем таблицу
        const standingsData = await loggedFetch.get(
          '/competitions/standings.json',
          {
            leagueId: league.leagueId,
            seasonId: targetSeason.seasonId,
          },
          {
            source: 'script',
            ttl: 1800000, // 30 минут кэш (тяжёлые данные)
          },
        )

        if (!standingsData?.standings) {
          console.warn(`[sync-standings] Нет данных таблицы для лиги ${league.name}`)
          continue
        }

        // Обрабатываем таблицу
        await processLeagueStandings(payload, standingsData.standings, league, targetSeason)
        processed++
      } catch (error) {
        console.error(`[sync-standings] Ошибка обработки лиги ${league.name}:`, error)
        errors++
      }
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-standings] Синхронизация завершена за ${duration}ms`)
    console.log(
      `[sync-standings] Обработано: ${processed}, Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`,
    )
  } catch (error) {
    console.error('[sync-standings] Критическая ошибка:', error)
    process.exit(1)
  }
}

/**
 * Обрабатывает таблицу для конкретной лиги и сезона
 */
async function processLeagueStandings(payload, standings, league, season) {
  for (const standing of standings) {
    try {
      // Нормализуем данные команды в таблице
      const normalizedStanding = {
        league: league.id, // relationship
        season: season.id, // relationship
        position: standing.position,
        team: {
          id: standing.team.id,
          name: standing.team.name,
        },
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        points: standing.points,
        form: standing.form || '',
        lastSyncAt: new Date(),
      }

      // Проверяем существует ли уже такая запись
      const existing = await payload.find({
        collection: 'standings',
        where: {
          league: { equals: league.id },
          season: { equals: season.id },
          'team.id': { equals: standing.team.id },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        // Обновляем существующую запись
        await payload.update({
          collection: 'standings',
          id: existing.docs[0].id,
          data: normalizedStanding,
        })
        updated++
      } else {
        // Создаём новую запись
        await payload.create({
          collection: 'standings',
          data: normalizedStanding,
        })
        created++
      }
    } catch (error) {
      console.error(`[sync-standings] Ошибка обработки команды ${standing.team.name}:`, error)
      errors++
    }
  }

  console.log(`[sync-standings] Обновлена таблица лиги ${league.name} (${standings.length} команд)`)
}

// Глобальные переменные для статистики
let created = 0
let updated = 0
let errors = 0

// Обработка аргументов командной строки
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {}

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '')
    const value = args[i + 1]
    options[key] = value
  }

  return options
}

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs()

  syncStandings(args.leagueId, args.seasonId)
    .then(() => {
      console.log('[sync-standings] Скрипт завершён успешно')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[sync-standings] Критическая ошибка:', error)
      process.exit(1)
    })
}

export { syncStandings }
