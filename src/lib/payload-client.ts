import { getPayload } from 'payload'
import configPromise from '@payload-config'

let cachedPayload: any = null

/**
 * Получает экземпляр Payload клиента
 */
export async function getPayloadClient() {
  if (cachedPayload) {
    return cachedPayload
  }

  try {
    cachedPayload = await getPayload({ config: await configPromise })
    return cachedPayload
  } catch (error) {
    console.error('[getPayloadClient] Error initializing Payload:', error)
    throw error
  }
}

/**
 * Ищет матч по matchId через прямой запрос к Payload
 */
export async function findMatchByMatchId(matchId: number) {
  console.log(`[findMatchByMatchId] Поиск матча matchId=${matchId} через Payload клиент`)

  try {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'matches',
      where: {
        matchId: {
          equals: matchId,
        },
      },
      limit: 1,
    })

    console.log(`[findMatchByMatchId] Результат поиска:`, {
      totalDocs: result.totalDocs,
      docsCount: result.docs.length,
    })

    if (result.docs.length > 0) {
      const match = result.docs[0]
      console.log(`[findMatchByMatchId] ✓ Найден матч:`, {
        payloadId: match.id,
        matchId: match.matchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        date: match.date,
      })

      // Проверяем соответствие
      if (match.matchId === matchId) {
        return match
      } else {
        console.error(
          `[findMatchByMatchId] 🚨 Найден матч с неправильным matchId: ${match.matchId} вместо ${matchId}`,
        )
        return null
      }
    }

    console.log(`[findMatchByMatchId] ✗ Матч с matchId=${matchId} не найден`)
    return null
  } catch (error) {
    console.error('[findMatchByMatchId] Error:', error)
    return null
  }
}

/**
 * Ищет матч по дате и ID команд через прямой запрос к Payload
 */
export async function findMatchByTeamsAndDate(
  homeTeamId: number,
  awayTeamId: number,
  date: string,
) {
  console.log(`[findMatchByTeamsAndDate] Поиск матча через Payload клиент:`, {
    homeTeamId,
    awayTeamId,
    date,
  })

  try {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'matches',
      where: {
        and: [
          {
            date: {
              equals: new Date(date).toISOString(),
            },
          },
          {
            homeTeamId: {
              equals: homeTeamId,
            },
          },
          {
            awayTeamId: {
              equals: awayTeamId,
            },
          },
        ],
      },
      limit: 1,
    })

    console.log(`[findMatchByTeamsAndDate] Результат поиска:`, {
      totalDocs: result.totalDocs,
      docsCount: result.docs.length,
    })

    if (result.docs.length > 0) {
      const match = result.docs[0]
      console.log(`[findMatchByTeamsAndDate] ✓ Найден матч:`, {
        payloadId: match.id,
        matchId: match.matchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        date: match.date,
      })
      return match
    }

    console.log(`[findMatchByTeamsAndDate] ✗ Матч не найден`)
    return null
  } catch (error) {
    console.error('[findMatchByTeamsAndDate] Error:', error)
    return null
  }
}

/**
 * Ищет фикстуру по fixtureId через прямой запрос к Payload
 */
export async function findFixtureById(fixtureId: number) {
  console.log(`[findFixtureById] Поиск фикстуры fixtureId=${fixtureId} через Payload клиент`)

  try {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'fixtures',
      where: {
        fixtureId: {
          equals: fixtureId,
        },
      },
      limit: 1,
      depth: 1,
    })

    console.log(`[findFixtureById] Результат поиска:`, {
      totalDocs: result.totalDocs,
      docsCount: result.docs.length,
    })

    if (result.docs.length > 0) {
      const fixture = result.docs[0]
      console.log(`[findFixtureById] ✓ Найдена фикстура:`, {
        payloadId: fixture.id,
        fixtureId: fixture.fixtureId,
        homeTeam: fixture.homeTeam?.name,
        awayTeam: fixture.awayTeam?.name,
        date: fixture.date,
      })

      if (fixture.fixtureId === fixtureId) {
        return fixture
      } else {
        console.error(
          `[findFixtureById] 🚨 Найдена фикстура с неправильным fixtureId: ${fixture.fixtureId} вместо ${fixtureId}`,
        )
        return null
      }
    }

    console.log(`[findFixtureById] ✗ Фикстура с fixtureId=${fixtureId} не найдена`)
    return null
  } catch (error) {
    console.error('[findFixtureById] Error:', error)
    return null
  }
}

/**
 * Ищет фикстуру по дате и ID команд через прямой запрос к Payload
 */
export async function findFixtureByTeamsAndDate(
  homeTeamId: number,
  awayTeamId: number,
  date: string,
) {
  console.log(`[findFixtureByTeamsAndDate] Поиск фикстуры через Payload клиент:`, {
    homeTeamId,
    awayTeamId,
    date,
  })

  try {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'fixtures',
      where: {
        and: [
          {
            date: {
              equals: new Date(date).toISOString(),
            },
          },
          {
            'homeTeam.id': {
              equals: homeTeamId,
            },
          },
          {
            'awayTeam.id': {
              equals: awayTeamId,
            },
          },
        ],
      },
      limit: 1,
      depth: 1,
    })

    console.log(`[findFixtureByTeamsAndDate] Результат поиска:`, {
      totalDocs: result.totalDocs,
      docsCount: result.docs.length,
    })

    if (result.docs.length > 0) {
      const fixture = result.docs[0]
      console.log(`[findFixtureByTeamsAndDate] ✓ Найдена фикстура:`, {
        payloadId: fixture.id,
        fixtureId: fixture.fixtureId,
        homeTeam: fixture.homeTeam?.name,
        awayTeam: fixture.awayTeam?.name,
        date: fixture.date,
      })
      return fixture
    }

    console.log(`[findFixtureByTeamsAndDate] ✗ Фикстура не найдена`)
    return null
  } catch (error) {
    console.error('[findFixtureByTeamsAndDate] Error:', error)
    return null
  }
}

/**
 * Интерфейс для состояния синхронизации фикстур
 */
export interface FixtureSyncState {
  id?: string // ID документа в Payload
  lastSyncDate: string
  nextSyncDate: string
  fixturesCount: number
  dateRangeStart: string
  dateRangeEnd: string
  isComplete: boolean
  hasNoMatches: boolean
  syncStatus: 'idle' | 'syncing' | 'completed' | 'failed' | 'no-matches'
  lastError?: string
  updatedAt: string
}

/**
 * Получает или создаёт состояние синхронизации фикстур
 * Диапазон: 10 дней вперед от текущей даты (включая сегодня)
 * Пример: сегодня 27 марта → диапазон 27 марта - 6 апреля (10 дней)
 */
export async function getOrCreateFixtureSyncState(): Promise<FixtureSyncState> {
  console.log('[getOrCreateFixtureSyncState] Получение состояния синхронизации фикстур')

  try {
    const payload = await getPayloadClient()

    // Пытаемся найти существующее состояние
    const result = await payload.find({
      collection: 'fixture_sync_states',
      limit: 1,
    })

    if (result.docs.length > 0) {
      const state = result.docs[0]
      console.log('[getOrCreateFixtureSyncState] ✓ Найдено существующее состояние:', {
        lastSyncDate: state.lastSyncDate,
        fixturesCount: state.fixturesCount,
        syncStatus: state.syncStatus,
        dateRangeStart: state.dateRangeStart,
        dateRangeEnd: state.dateRangeEnd,
        daysInRange:
          state.dateRangeEnd && state.dateRangeStart
            ? Math.ceil(
                (new Date(state.dateRangeEnd).getTime() -
                  new Date(state.dateRangeStart).getTime()) /
                  (24 * 60 * 60 * 1000),
              ) + 1
            : 0,
      })
      return state as FixtureSyncState
    }

    // Создаём новое состояние
    console.log('[getOrCreateFixtureSyncState] Создание нового состояния синхронизации')
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // Правильный расчет: 10 дней вперед означает 9 дней + сегодня = 10 дней всего
    const tenDaysLater = new Date(today)
    tenDaysLater.setDate(today.getDate() + 9)

    const dateRangeStart = today.toISOString().split('T')[0]
    const dateRangeEnd = tenDaysLater.toISOString().split('T')[0]
    const daysInRange =
      Math.ceil((tenDaysLater.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)) + 1

    const newState: FixtureSyncState = {
      lastSyncDate: new Date().toISOString(),
      nextSyncDate: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // +2 минуты
      fixturesCount: 0,
      dateRangeStart,
      dateRangeEnd,
      isComplete: false,
      hasNoMatches: false,
      syncStatus: 'idle',
      updatedAt: new Date().toISOString(),
    }

    const created = await payload.create({
      collection: 'fixture_sync_states',
      data: newState,
    })

    console.log('[getOrCreateFixtureSyncState] ✓ Создано новое состояние:', {
      id: created.id,
      syncStatus: created.syncStatus,
      dateRange: `${dateRangeStart} to ${dateRangeEnd}`,
      daysInRange,
    })

    return created as FixtureSyncState
  } catch (error) {
    console.error('[getOrCreateFixtureSyncState] Error:', error)
    throw error
  }
}

/**
 * Обновляет состояние синхронизации фикстур
 */
export async function updateFixtureSyncState(
  stateId: string,
  updates: Partial<FixtureSyncState>,
): Promise<FixtureSyncState> {
  console.log('[updateFixtureSyncState] Обновление состояния синхронизации:', {
    stateId,
    updates: {
      syncStatus: updates.syncStatus,
      fixturesCount: updates.fixturesCount,
      hasNoMatches: updates.hasNoMatches,
    },
  })

  try {
    const payload = await getPayloadClient()

    const updated = await payload.update({
      collection: 'fixture_sync_states',
      id: stateId,
      data: {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    })

    console.log('[updateFixtureSyncState] ✓ Состояние обновлено:', {
      syncStatus: updated.syncStatus,
      fixturesCount: updated.fixturesCount,
    })

    return updated as FixtureSyncState
  } catch (error) {
    console.error('[updateFixtureSyncState] Error:', error)
    throw error
  }
}

/**
 * Проверяет, нужна ли синхронизация фикстур
 */
export async function shouldSyncFixtures(): Promise<boolean> {
  console.log('[shouldSyncFixtures] Проверка необходимости синхронизации')

  try {
    const state = await getOrCreateFixtureSyncState()

    const nextSyncTime = new Date(state.nextSyncDate).getTime()
    const now = Date.now()

    const shouldSync = now >= nextSyncTime

    console.log('[shouldSyncFixtures] Результат:', {
      shouldSync,
      nextSyncTime: new Date(nextSyncTime).toISOString(),
      now: new Date(now).toISOString(),
      timeDiff: Math.round((nextSyncTime - now) / 1000),
    })

    return shouldSync
  } catch (error) {
    console.error('[shouldSyncFixtures] Error:', error)
    return false
  }
}

/**
 * Проверяет, есть ли фикстуры в диапазоне дат
 */
export async function checkFixturesInDateRange(
  dateStart: string,
  dateEnd: string,
): Promise<{ count: number; hasMatches: boolean }> {
  console.log('[checkFixturesInDateRange] Проверка фикстур в диапазоне:', {
    dateStart,
    dateEnd,
  })

  try {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'fixtures',
      where: {
        and: [
          {
            date: {
              greater_than_equal: new Date(dateStart).toISOString(),
            },
          },
          {
            date: {
              less_than_equal: new Date(dateEnd).toISOString(),
            },
          },
        ],
      },
      limit: 1,
    })

    const count = result.totalDocs
    const hasMatches = count > 0

    console.log('[checkFixturesInDateRange] Результат:', {
      count,
      hasMatches,
    })

    return { count, hasMatches }
  } catch (error) {
    console.error('[checkFixturesInDateRange] Error:', error)
    return { count: 0, hasMatches: false }
  }
}

/**
 * Отмечает, что матчей нет в диапазоне дат
 */
export async function markNoMatchesInDateRange(
  dateStart: string,
  dateEnd: string,
): Promise<FixtureSyncState> {
  console.log('[markNoMatchesInDateRange] Отметка отсутствия матчей:', {
    dateStart,
    dateEnd,
  })

  try {
    const state = await getOrCreateFixtureSyncState()

    const updated = await updateFixtureSyncState(state.id as string, {
      hasNoMatches: true,
      syncStatus: 'no-matches',
      fixturesCount: 0,
      dateRangeStart: dateStart,
      dateRangeEnd: dateEnd,
      isComplete: true,
      nextSyncDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24 часа
    })

    console.log('[markNoMatchesInDateRange] ✓ Отмечено отсутствие матчей')

    return updated
  } catch (error) {
    console.error('[markNoMatchesInDateRange] Error:', error)
    throw error
  }
}

/**
 * Отмечает успешную синхронизацию фикстур
 */
export async function markFixturesSyncComplete(
  fixturesCount: number,
  dateStart: string,
  dateEnd: string,
): Promise<FixtureSyncState> {
  console.log('[markFixturesSyncComplete] Отметка завершения синхронизации:', {
    fixturesCount,
    dateStart,
    dateEnd,
  })

  try {
    const state = await getOrCreateFixtureSyncState()

    const updated = await updateFixtureSyncState(state.id as string, {
      syncStatus: 'completed',
      fixturesCount,
      dateRangeStart: dateStart,
      dateRangeEnd: dateEnd,
      isComplete: true,
      hasNoMatches: false,
      lastSyncDate: new Date().toISOString(),
      nextSyncDate: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // +2 минуты
    })

    console.log('[markFixturesSyncComplete] ✓ Синхронизация отмечена как завершённая')

    return updated
  } catch (error) {
    console.error('[markFixturesSyncComplete] Error:', error)
    throw error
  }
}

/**
 * Отмечает ошибку синхронизации
 */
export async function markFixturesSyncFailed(errorMessage: string): Promise<FixtureSyncState> {
  console.log('[markFixturesSyncFailed] Отметка ошибки синхронизации:', {
    errorMessage,
  })

  try {
    const state = await getOrCreateFixtureSyncState()

    const updated = await updateFixtureSyncState(state.id as string, {
      syncStatus: 'failed',
      lastError: errorMessage,
      nextSyncDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // +5 минут
    })

    console.log('[markFixturesSyncFailed] ✓ Ошибка отмечена')

    return updated
  } catch (error) {
    console.error('[markFixturesSyncFailed] Error:', error)
    throw error
  }
}

/**
 * Получает статистику синхронизации фикстур
 */
export async function getFixtureSyncStats(): Promise<{
  state: FixtureSyncState
  isOutdated: boolean
  daysSinceSync: number
  nextSyncIn: number
}> {
  console.log('[getFixtureSyncStats] Получение статистики синхронизации')

  try {
    const state = await getOrCreateFixtureSyncState()

    const lastSyncTime = new Date(state.lastSyncDate).getTime()
    const now = Date.now()
    const daysSinceSync = Math.floor((now - lastSyncTime) / (24 * 60 * 60 * 1000))
    const isOutdated = daysSinceSync > 7

    const nextSyncTime = new Date(state.nextSyncDate).getTime()
    const nextSyncIn = Math.max(0, Math.round((nextSyncTime - now) / 1000))

    const stats = {
      state,
      isOutdated,
      daysSinceSync,
      nextSyncIn,
    }

    console.log('[getFixtureSyncStats] Статистика:', {
      isOutdated,
      daysSinceSync,
      nextSyncIn,
      syncStatus: state.syncStatus,
    })

    return stats
  } catch (error) {
    console.error('[getFixtureSyncStats] Error:', error)
    throw error
  }
}
