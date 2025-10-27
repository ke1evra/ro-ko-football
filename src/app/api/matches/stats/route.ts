import { NextRequest, NextResponse } from 'next/server'

const API_KEY = 'JFSoWhkq1FIky8SS'
const API_SECRET = 'qbjc7aeuFAJo1E5KjX8fetGg9oAIxtBY'
const BASE_URL = 'https://livescore-api.com/api-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('match_id')

    if (!matchId) {
      return NextResponse.json(
        { success: false, message: 'Параметр match_id обязателен' },
        { status: 400 },
      )
    }

    // Проверяем, что это число
    const matchIdNum = parseInt(matchId, 10)

    if (isNaN(matchIdNum)) {
      return NextResponse.json(
        { success: false, message: 'match_id должен быть числом' },
        { status: 400 },
      )
    }

    console.log(`[Match Stats API] Fetching stats for match ${matchIdNum}`)

    // Формируем URL для запроса статистики матча с русским языком
    const statsUrl = `${BASE_URL}/matches/stats.json?match_id=${matchIdNum}&lang=ru&key=${API_KEY}&secret=${API_SECRET}`

    console.log(`[Match Stats API] Making request to: ${statsUrl}`)

    const response = await fetch(statsUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'LiveScore-Client/1.0',
      },
      // Добавляем таймаут
      signal: AbortSignal.timeout(10000), // 10 секунд
    })

    if (!response.ok) {
      console.error(`[Match Stats API] HTTP error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        {
          success: false,
          message: `Ошибка API: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    console.log(`[Match Stats API] Response received:`, {
      success: data.success,
      hasData: !!data.data,
      statsCount: data.data?.stats ? Object.keys(data.data.stats).length : 0,
    })

    if (!data.success) {
      console.error(`[Match Stats API] API returned error:`, data)
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'API вернул ошибку',
        },
        { status: 400 },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Match Stats API] Error:', error)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { success: false, message: 'Превышено время ожидания запроса' },
          { status: 408 },
        )
      }

      return NextResponse.json(
        { success: false, message: `Ошибка сервера: ${error.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { success: false, message: 'Неизвестная ошибка сервера' },
      { status: 500 },
    )
  }
}
