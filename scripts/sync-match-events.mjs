#!/usr/bin/env node

/**
 * Синхронизация событий матчей
 * Работает в режиме "вперёд/назад/луп" для обработки live матчей
 */

import { getPayload } from 'payload'
import { loggedFetch } from '../src/lib/http/livescore/logged-fetch.js'
import config from '../src/payload.config.js'

const BATCH_SIZE = 10 // Обрабатывать по 10 матчей за раз
const MAX_LIVE_MATCHES = 50 // Максимум 50 live матчей

async function syncMatchEvents() {
  console.log('[sync-match-events] Начинаем синхронизацию событий матчей...')

  const startTime = Date.now()
  let processed = 0
  let created = 0
  let updated = 0
  let errors = 0

  try {
    // Инициализируем Payload
    const payload = await getPayload({ config })

    // Получаем live матчи
    const liveMatches = await payload.find({
      collection: 'matches',
      where: {
        status: { equals: 'live' }
      },
      limit: MAX_LIVE_MATCHES
    })

    console.log(`[sync-match-events] Найдено ${liveMatches.docs.length} live матчей`)

    // Обрабатываем матчи пачками
    for (let i = 0; i < liveMatches.docs.length; i += BATCH_SIZE) {
      const batch = liveMatches.docs.slice(i, i + BATCH_SIZE)

      await processMatchesBatch(payload, batch)
      processed += batch.length

      // Пауза между пачками
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-match-events] Синхронизация завершена за ${duration}ms`)
    console.log(`[sync-match-events] Обработано: ${processed}, Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`)

  } catch (error) {
    console.error('[sync-match-events] Критическая ошибка:', error)
    process.exit(1)
  }
}

/**
 * Обрабатывает пачку матчей
 */
async function processMatchesBatch(payload, matches) {
  for (const match of matches) {
    try {
      // Получаем события матча
      const eventsData = await loggedFetch.get('/matches/events.json', {
        matchId: match.matchId
      }, {
        source: 'script',
        ttl: 15000 // 15 секунд кэш для live данных
      })

      if (!eventsData?.events) {
        continue // Нет событий
      }

      // Обрабатываем события
      await processMatchEvents(payload, match, eventsData.events)

    } catch (error) {
      console.error(`[sync-match-events] Ошибка обработки матча ${match.matchId}:`, error)
      errors++
    }
  }
}

/**
 * Обрабатывает события конкретного матча
 */
async function processMatchEvents(payload, match, events) {
  for (const event of events) {
    try {
      // Проверяем, существует ли уже такое событие
      const existing = await payload.find({
        collection: 'matchEvents',
        where: {
          match: { equals: match.id },
          minute: { equals: event.Minute },
          type: { equals: normalizeEventType(event.Type) }
        },
        limit: 1
      })

      const normalizedEvent = {
        match: match.id, // relationship
        minute: event.Minute,
        type: normalizeEventType(event.Type),
        team: event.IsHome ? 'home' : 'away',
        player: event.Player ? {
          id: event.Player.Id,
          name: event.Player.Name
        } : null,
        assistPlayer: event.AssistPlayer?.Name || null,
        playerOut: event.PlayerOut?.Name || null,
        playerIn: event.PlayerIn?.Name || null,
        description: event.Description || null,
        lastSyncAt: new Date()
      }

      if (existing.docs.length > 0) {
        // Обновляем существующее событие
        await payload.update({
          collection: 'matchEvents',
          id: existing.docs[0].id,
          data: normalizedEvent
        })
        updated++
      } else {
        // Создаём новое событие
        await payload.create({
          collection: 'matchEvents',
          data: normalizedEvent
        })
        created++

        console.log(`[sync-match-events] Новое событие: ${normalizedEvent.type} в матче ${match.matchId}`)
      }

    } catch (error) {
      console.error(`[sync-match-events] Ошибка обработки события матча ${match.matchId}:`, error)
      errors++
    }
  }
}

/**
 * Нормализует тип события из API
 */
function normalizeEventType(apiType) {
  switch (apiType) {
    case 'goal':
    case 'Goal':
      return 'goal'
    case 'yellow':
    case 'Yellow Card':
      return 'yellow'
    case 'red':
    case 'Red Card':
      return 'red'
    case 'substitution':
    case 'Substitution':
      return 'substitution'
    case 'own_goal':
    case 'Own Goal':
      return 'own_goal'
    case 'penalty':
    case 'Penalty':
      return 'penalty'
    case 'var':
    case 'VAR':
      return 'var'
    default:
      return 'other'
  }
}

// Глобальные переменные для статистики
let created = 0
let updated = 0
let errors = 0

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  syncMatchEvents()
    .then(() => {
      console.log('[sync-match-events] Скрипт завершён успешно')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[sync-match-events] Критическая ошибка:', error)
      process.exit(1)
    })
}

export { syncMatchEvents }