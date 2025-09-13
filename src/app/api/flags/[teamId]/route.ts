import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { teamId: string } }) {
  try {
    const teamId = params.teamId

    if (!teamId || isNaN(Number(teamId))) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })
    }

    // Получаем переменные окружения
    const apiKey = process.env.LIVESCORE_KEY
    const apiSecret = process.env.LIVESCORE_SECRET
    const apiBase = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'

    if (!apiKey || !apiSecret) {
      console.error('Missing LIVESCORE_KEY or LIVESCORE_SECRET')
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
    }

    // Строим URL для запроса флага
    const url = `${apiBase}/countries/flag.json?team_id=${teamId}&key=${apiKey}&secret=${apiSecret}`

    console.log('Fetching flag for team:', teamId)

    // Делаем запрос к livescore API
    const response = await fetch(url)

    if (!response.ok) {
      console.error('API response not ok:', response.status, response.statusText)
      return NextResponse.json({ error: 'Failed to fetch flag' }, { status: response.status })
    }

    // Получаем изображение как ArrayBuffer
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'

    console.log('Flag image received, size:', imageBuffer.byteLength, 'bytes')

    // Возвращаем изображение напрямую
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error fetching team flag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
