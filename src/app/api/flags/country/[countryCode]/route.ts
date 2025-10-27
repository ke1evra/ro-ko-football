import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ countryCode: string }> },
) {
  try {
    const { countryCode } = await params

    if (!countryCode || countryCode.length < 2) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 })
    }

    // Получаем переменные окружения
    const apiKey = process.env.LIVESCORE_KEY
    const apiSecret = process.env.LIVESCORE_SECRET
    const apiBase = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'

    if (!apiKey || !apiSecret) {
      console.error('Missing LIVESCORE_KEY or LIVESCORE_SECRET')
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
    }

    // Строим URL для запроса флага страны
    // Используем прямой URL к изображению флага
    const flagUrl = `${apiBase}/countries/flag/${countryCode.toUpperCase()}.png?key=${apiKey}&secret=${apiSecret}`

    console.log('Fetching flag for country:', countryCode)

    // Делаем запрос к livescore API
    const response = await fetch(flagUrl)

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
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800', // Кэш на 24 часа
      },
    })
  } catch (error) {
    console.error('Error fetching country flag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
