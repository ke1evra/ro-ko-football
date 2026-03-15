#!/usr/bin/env node

/**
 * Ручная синхронизация команд
 * Запускается по запросу администратора через админ-панель
 */

import { getPayload } from 'payload'
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.js'
import config from '../src/payload.config.js'

async function syncTeams(countryId = null) {
  console.log('[sync-teams] Начинаем синхронизацию команд...')

  const startTime = Date.now()
  let processed = 0
  let created = 0
  let updated = 0
  let errors = 0

  try {
    // Инициализируем Payload
    const payload = await getPayload({ config })

    // Определяем какие страны синхронизировать
    let targetCountries = []

    if (countryId) {
      // Синхронизация конкретной страны
      const country = await payload.findByID({
        collection: 'countries',
        id: countryId,
      })
      targetCountries = [country]
    } else {
      // Синхронизация всех стран
      const countries = await payload.find({
        collection: 'countries',
        limit: 50,
      })
      targetCountries = countries.docs
    }

    console.log(`[sync-teams] Синхронизация команд из ${targetCountries.length} стран`)

    // Обрабатываем каждую страну
    for (const country of targetCountries) {
      try {
        console.log(`[sync-teams] Синхронизация команд страны: ${country.name}`)

        // Получаем команды для этой страны
        const teamsData = await loggedFetch.get(
          '/teams/list.json',
          {
            countryId: country.countryId,
          },
          {
            source: 'script',
            ttl: 3600000, // 1 час кэш (справочные данные)
          },
        )

        if (!teamsData?.teams) {
          console.warn(`[sync-teams] Нет данных о командах для страны ${country.name}`)
          continue
        }

        // Обрабатываем команды
        await processCountryTeams(payload, teamsData.teams, country)
        processed++
      } catch (error) {
        console.error(`[sync-teams] Ошибка обработки страны ${country.name}:`, error)
        errors++
      }
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-teams] Синхронизация завершена за ${duration}ms`)
    console.log(
      `[sync-teams] Обработано: ${processed}, Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`,
    )
  } catch (error) {
    console.error('[sync-teams] Критическая ошибка:', error)
    process.exit(1)
  }
}

/**
 * Обрабатывает команды для конкретной страны
 */
async function processCountryTeams(payload, teams, country) {
  for (const team of teams) {
    try {
      // Нормализуем данные команды
      const normalizedTeam = {
        teamId: team.id,
        name: team.name,
        country: {
          id: country.countryId,
          name: country.name,
        },
        logo: team.logo || null,
        stadium: team.stadium || null,
        lastSyncAt: new Date(),
      }

      // Проверяем существует ли уже такая команда
      const existing = await payload.find({
        collection: 'teams',
        where: {
          teamId: { equals: normalizedTeam.teamId },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        // Обновляем существующую команду
        await payload.update({
          collection: 'teams',
          id: existing.docs[0].id,
          data: normalizedTeam,
        })
        updated++
      } else {
        // Создаём новую команду
        await payload.create({
          collection: 'teams',
          data: normalizedTeam,
        })
        created++

        console.log(`[sync-teams] Создана команда: ${normalizedTeam.name}`)
      }
    } catch (error) {
      console.error(`[sync-teams] Ошибка обработки команды ${team.name}:`, error)
      errors++
    }
  }

  console.log(`[sync-teams] Обновлены команды страны ${country.name} (${teams.length} команд)`)
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

  syncTeams(args.countryId)
    .then(() => {
      console.log('[sync-teams] Скрипт завершён успешно')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[sync-teams] Критическая ошибка:', error)
      process.exit(1)
    })
}

export { syncTeams }
