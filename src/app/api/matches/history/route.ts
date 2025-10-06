import { NextRequest, NextResponse } from 'next/server'

const API_KEY = 'JFSoWhkq1FIky8SS'
const API_SECRET = 'qbjc7aeuFAJo1E5KjX8fetGg9oAIxtBY'
const BASE_URL = 'https://livescore-api.com/api-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const teamId = searchParams.get('team_id')
    const matchId = searchParams.get('match_id')
    const competitionId = searchParams.get('competition_id')
    const size = searchParams.get('size') || '50'

    console.log(`[History API] Параметры запроса:`, {
      date,
      teamId,
      matchId,
      competitionId,
      size,
    })

    // Формируем URL для запроса истории матчей
    const params = new URLSearchParams()
    params.set('lang', 'ru')
    params.set('size', size)
    params.set('key', API_KEY)
    params.set('secret', API_SECRET)

    if (date) {
      params.set('date', date)
    }
    if (teamId) {
      params.set('team_id', teamId)
    }
    if (matchId) {
      params.set('match_id', matchId)
    }
    if (competitionId) {
      params.set('competition_id', competitionId)
    }

    const historyUrl = `${BASE_URL}/matches/history.json?${params.toString()}`

    console.log(`[History API] Запрос к LiveScore API:`, historyUrl.replace(API_SECRET, '***'))

    const response = await fetch(historyUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'LiveScore-Client/1.0',
      },
      // Добавляем таймаут
      signal: AbortSignal.timeout(10000), // 10 секунд
    })

    if (!response.ok) {
      console.error(`[History API] HTTP error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        {
          success: false,
          message: `Ошибка API: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    console.log(`[History API] Ответ получен:`, {
      success: data.success,
      hasData: !!data.data,
      matchesCount: data.data?.match?.length || 0,
    })

    if (!data.success) {
      console.error(`[History API] API вернул ошибку:`, data)
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'API вернул ошибку',
        },
        { status: 400 },
      )
    }

    // Нормализуем ответ для совместимости
    const matches = data.data?.match || []

    console.log(`[History API] Возвращаем ${matches.length} матчей`)

    return NextResponse.json({
      success: true,
      data: {
        matches,
        total: matches.length,
        page: 1,
        size: parseInt(size, 10),
      },
    })
  } catch (error) {
    console.error('[History API] Ошибка:', error)

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
