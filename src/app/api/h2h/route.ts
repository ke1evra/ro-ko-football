import { NextRequest, NextResponse } from 'next/server'

const API_KEY = 'JFSoWhkq1FIky8SS'
const API_SECRET = 'qbjc7aeuFAJo1E5KjX8fetGg9oAIxtBY'
const BASE_URL = 'https://livescore-api.com/api-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const team1 = searchParams.get('team1')
    const team2 = searchParams.get('team2')

    if (!team1 || !team2) {
      return NextResponse.json(
        { success: false, message: 'Параметры team1 и team2 обязательны' },
        { status: 400 },
      )
    }

    // Проверяем, что это числа
    const team1Id = parseInt(team1, 10)
    const team2Id = parseInt(team2, 10)

    if (isNaN(team1Id) || isNaN(team2Id)) {
      return NextResponse.json(
        { success: false, message: 'team1 и team2 должны быть числами' },
        { status: 400 },
      )
    }

    console.log(`[H2H API] Fetching H2H data for teams ${team1Id} vs ${team2Id}`)

    // Формируем URL для запроса H2H данных
    const h2hUrl = `${BASE_URL}/teams/head2head.json?team1_id=${team1Id}&team2_id=${team2Id}&key=${API_KEY}&secret=${API_SECRET}`

    console.log(`[H2H API] Making request to: ${h2hUrl}`)

    const response = await fetch(h2hUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'LiveScore-Client/1.0',
      },
      // Добавляем таймаут
      signal: AbortSignal.timeout(10000), // 10 секунд
    })

    if (!response.ok) {
      console.error(`[H2H API] HTTP error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        {
          success: false,
          message: `Ошибка API: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    console.log(`[H2H API] Response received:`, {
      success: data.success,
      hasData: !!data.data,
      team1Name: data.data?.team1?.name,
      team2Name: data.data?.team2?.name,
      h2hCount: data.data?.h2h?.length || 0,
      team1LastMatches: data.data?.team1_last_6?.length || 0,
      team2LastMatches: data.data?.team2_last_6?.length || 0,
    })

    if (!data.success) {
      console.error(`[H2H API] API returned error:`, data)
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'API вернул ошибку',
        },
        { status: 400 },
      )
    }

    // Проверяем наличие данных
    if (!data.data) {
      return NextResponse.json(
        {
          success: false,
          message: 'Данные H2H не найдены',
        },
        { status: 404 },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[H2H API] Error:', error)

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
