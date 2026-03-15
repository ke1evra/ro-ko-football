#!/usr/bin/env node

/**
 * Ретроспективная синхронизация событий матчей
 * Ищет матчи без событий и скачивает их события
 */

import { getPayload } from 'payload'
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.js'
import config from '../src/payload.config.js'

const BATCH_SIZE = 20 // Обрабатывать по 20 матчей за раз
const MAX_MATCHES = 1000 // Максимум 1000 матчей за раз

async function syncMatchEventsRetro() {
  console.log('[sync-match-events-retro] Начинаем ретроспективную синхронизацию событий матчей...')

  const startTime = Date.now()
  let processed = 0
  let eventsCreated = 0
  let errors = 0

  try {
    // Инициализируем Payload
    const payload = await getPayload({ config })

    // Находим матчи, у которых еще нет событий
    // Ис��ользуем агрегацию для поиска матчей без связанных событий
    const matchesWithoutEvents = await payload.find({
      collection: 'matches',
      where: {
        // Матчи должны быть завершены или иметь статус, при котором могут быть события
        status: {
          in: ['finished', 'live', 'halftime'],
        },
      },
      limit: MAX_MATCHES,
      sort: '-date', // Сначала свежие матчи
    })

    console.log(`[sync-match-events-retro] Найдено ${matchesWithoutEvents.docs.length} потенциальных матчей`)

    // Фильтруем матчи, у которых действительно нет событий
    const matchesToProcess = []
    for (const match of matchesWithoutEvents.docs) {
      try {
        const existingEvents = await payload.find({
          collection: 'matchEvents',
          where: {
            match: { equals: match.id },
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })

        if (existingEvents.docs.length === 0) {
          matchesToProcess.push(match)
        }
      } catch (error) {
        console.warn(`[sync-match-events-retro] Ошибка проверки событий для матча ${match.matchId}:`, error?.message || error)
      }
    }

    console.log(`[sync-match-events-retro] Матчей без событий: ${matchesToProcess.length}`)

    // Обрабатываем матчи пачками
    for (let i = 0; i < matchesToProcess.length; i += BATCH_SIZE) {
      const batch = matchesToProcess.slice(i, i + BATCH_SIZE)

      const batchResult = await processMatchesBatch(payload, batch)
      processed += batch.length
      eventsCreated += batchResult.eventsCreated
      errors += batchResult.errors

      // Пауза между пачками
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-match-events-retro] Синхронизация завершена за ${duration}ms`)
    console.log(
      `[sync-match-events-retro] Обработано: ${processed}, Событий создано: ${eventsCreated}, Ошибок: ${errors}`,
    )
  } catch (error) {
    console.error('[sync-match-events-retro] Критическая ошибка:', error)
    process.exit(1)
  }
}

/**
 * Обрабатывает пачку матчей
 */
async function processMatchesBatch(payload, matches) {
  let eventsCreated = 0
  let errors = 0

  for (const match of matches) {
    try {
      console.log(`[sync-match-events-retro] Обработка матча ${match.matchId}: ${match.homeTeam} - ${match.awayTeam}`)

      // Получаем события матча
      const eventsData = await loggedFetch.get(
        '/scores/events.json',
        {
          id: match.matchId,
        },
        {
          source: 'script',
          ttl: 3600000, // 1 час кэш для ретроспективных данных
        },
      )

      if (!eventsData?.event || !Array.isArray(eventsData.event)) {
        console.log(`[sync-match-events-retro] Нет событий для матча ${match.matchId}`)
        continue
      }

      // Сохраняем события
      const eventsCount = await upsertMatchEvents(payload, match.id, eventsData.event)
      eventsCreated += eventsCount

      console.log(`[sync-match-events-retro] Создано ${eventsCount} событий для матча ${match.matchId}`)
    } catch (error) {
      console.error(`[sync-match-events-retro] Ошибка обработки матча ${match.matchId}:`, error)
      errors++
    }
  }

  return { eventsCreated, errors }
}

/**
 * Сохраняет события матча в коллекцию matchEvents
 */
async function upsertMatchEvents(payload, payloadMatchId, events) {
  let created = 0

  for (const event of events) {
    try {
      // Проверяем, существует ли уже такое событие
      const existing = await payload.find({
        collection: 'matchEvents',
        where: {
          match: { equals: payloadMatchId },
          minute: { equals: event.time },
          type: { equals: normalizeEventType(event.event) },
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      if (existing.docs.length > 0) {
        // Событие уже существует, пропускаем
        continue
      }

      const eventData = {
        match: payloadMatchId,
        minute: event.time,
        type: normalizeEventType(event.event),
        team: event.is_home ? 'home' : 'away',
        player: event.player
          ? {
              id: event.player.id || null,
              name: event.player.name,
            }
          : null,
        assistPlayer: event.info?.name || null,
        playerOut: null, // Для ретроспективных данных может не быть детальной информации
        playerIn: null,
        description: event.label || null,
        lastSyncAt: new Date().toISOString(),
      }

      await payload.create({
        collection: 'matchEvents',
        data: eventData,
        overrideAccess: true,
      })

      created++
    } catch (error) {
      console.warn(`[sync-match-events-retro] Ошибка сохранения события матча ${payloadMatchId}:`, error?.message || error)
    }
  }

  return created
}

/**
 * Нормализует тип события из API
 */
function normalizeEventType(apiType) {
  switch (apiType?.toUpperCase()) {
    case 'GOAL':
      return 'goal'
    case 'YELLOW CARD':
      return 'yellow'
    case 'RED CARD':
      return 'red'
    case 'SUBSTITUTION':
      return 'substitution'
    case 'OWN GOAL':
      return 'own_goal'
    case 'PENALTY':
      return 'penalty'
    case 'VAR':
      return 'var'
    default:
      return 'other'
  }
}

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  syncMatchEventsRetro()
    .then(() => {
      console.log('[sync-match-events-retro] Скрипт завершён успешно')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[sync-match-events-retro] Критическая ошибка:', error)
      process.exit(1)
    })
}

export { syncMatchEventsRetro }