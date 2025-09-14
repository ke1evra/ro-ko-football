import { NextRequest, NextResponse } from 'next/server'
import { customFetch } from '@/lib/http/livescore/customFetch'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url)
    const size = searchParams.get('size') || 'medium'

    const resolvedParams = await params
    const countryId = parseInt(resolvedParams.countryId)
    if (isNaN(countryId)) {
      return NextResponse.json({ error: 'Invalid country ID' }, { status: 400 })
    }

    // Используем прямой fetch для получения изображения флага
    const baseUrl = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'
    const apiKey = process.env.LIVESCORE_KEY || ''
    const apiSecret = process.env.LIVESCORE_SECRET || ''

    // Убеждаемся, что baseUrl заканчивается на /
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
    const url = new URL('countries/flag.json', normalizedBaseUrl)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('secret', apiSecret)
    url.searchParams.set('lang', 'ru')
    url.searchParams.set('country_id', countryId.toString())
    url.searchParams.set('size', size)

    const response = await fetch(url.toString())

    if (!response.ok) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
    }

    // Проверяем тип контента
    const contentType = response.headers.get('content-type')

    if (contentType?.startsWith('image/')) {
      // Если это изображение, возвращаем его напрямую
      const imageBuffer = await response.arrayBuffer()
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // Кэш на 24 часа
        },
      })
    }

    return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
  } catch (error) {
    console.error('Error fetching country flag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
