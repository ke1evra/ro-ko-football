import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  try {
    const { countryId } = await params

    if (!countryId || isNaN(Number(countryId))) {
      return NextResponse.json({ error: 'Invalid country ID' }, { status: 400 })
    }

    const apiKey = process.env.LIVESCORE_KEY
    const apiSecret = process.env.LIVESCORE_SECRET
    const apiBase = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
    }

    const url = `${apiBase}/countries/flag.json?country_id=${countryId}&key=${apiKey}&secret=${apiSecret}`

    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch flag' }, { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error('Error fetching country flag by id:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}