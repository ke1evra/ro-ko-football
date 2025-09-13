import { NextRequest, NextResponse } from 'next/server'
import { customFetch } from '@/lib/http/livescore/customFetch'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const size = searchParams.get('size') || 'medium'
    
    const resolvedParams = await params
    const countryId = parseInt(resolvedParams.countryId)
    if (isNaN(countryId)) {
      return NextResponse.json({ error: 'Invalid country ID' }, { status: 400 })
    }

    // Строим URL с параметрами
    const url = new URL('countries/flag.json', 'https://example.com')
    url.searchParams.set('country_id', countryId.toString())
    url.searchParams.set('size', size)

    const pathWithQuery = url.pathname + url.search
    const response = await customFetch(pathWithQuery, {
      method: 'GET',
    })

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

    // Если это JSON с URL
    try {
      const data = await response.json()
      
      // Если API возвращает URL изображения
      if (typeof data === 'string' && data.startsWith('http')) {
        return NextResponse.redirect(data)
      }

      // Если API возвращает объект с URL
      if (data && data.url && typeof data.url === 'string') {
        return NextResponse.redirect(data.url)
      }

      // Если API возвращает объект с flag
      if (data && data.flag && typeof data.flag === 'string') {
        return NextResponse.redirect(data.flag)
      }
    } catch {
      // Если не удалось распарсить JSON, возвращаем ошибку
    }

    return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
  } catch (error) {
    console.error('Error fetching country flag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}