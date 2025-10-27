import { getPayload } from 'payload'
import config from '@/payload.config'

let cachedPayload: any = null

/**
 * Получает экземпляр Payload клиента
 */
export async function getPayloadClient() {
  if (cachedPayload) {
    return cachedPayload
  }

  try {
    cachedPayload = await getPayload({ config })
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
