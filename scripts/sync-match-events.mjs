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
        status: { equals: 'live' },
      },
      limit: MAX_LIVE_MATCHES,
    })

    console.log(`[sync-match-events] Найдено ${liveMatches.docs.length} live матчей`)

    // Обрабатываем матчи пачками
    for (let i = 0; i < liveMatches.docs.length; i += BATCH_SIZE) {
      const batch = liveMatches.docs.slice(i, i + BATCH_SIZE)

      await processMatchesBatch(payload, batch)
      processed += batch.length

      // Пауза между пачками
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Выводим статистику
    const duration = Date.now() - startTime
    console.log(`[sync-match-events] Синхронизация завершена за ${duration}ms`)
    console.log(
      `[sync-match-events] Обработано: ${processed}, Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`,
    )
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
      const eventsData = await loggedFetch.get(
        '/scores/events.json',
        {
          id: match.matchId,
        },
        {
          source: 'script',
          ttl: 15000, // 15 секунд кэш для live данных
        },
      )

      if (!eventsData?.event || !Array.isArray(eventsData.event)) {
        continue // Нет событий
      }

      // Обрабатываем события
      await processMatchEvents(payload, match, eventsData.event)
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
          minute: { equals: event.time },
          type: { equals: normalizeEventType(event.event) },
        },
        limit: 1,
      })

      const normalizedEvent = {
        match: match.id, // relationship
        minute: event.time,
        type: normalizeEventType(event.event),
        team: event.is_home ? 'home' : 'away',
        player: event.player
          ? {
              id: event.player.id,
              name: event.player.name,
            }
          : null,
        assistPlayer: event.info?.name || null, // ассистент или заменяемый игрок
        playerOut: null, // для замен нужно дополнительная логика
        playerIn: null, // для замен нужно дополнительная логика
        description: event.label || null,
        lastSyncAt: new Date(),
      }

      if (existing.docs.length > 0) {
        // Обновляем существующее событие
        await payload.update({
          collection: 'matchEvents',
          id: existing.docs[0].id,
          data: normalizedEvent,
        })
        updated++
      } else {
        // Создаём новое событие
        await payload.create({
          collection: 'matchEvents',
          data: normalizedEvent,
        })
        created++

        console.log(
          `[sync-match-events] Новое событие: ${normalizedEvent.type} в матче ${match.matchId}`,
        )
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
