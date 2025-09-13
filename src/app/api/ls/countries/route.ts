import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.LIVESCORE_KEY
    const apiSecret = process.env.LIVESCORE_SECRET
    const apiBase = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
    }

    const url = `${apiBase}/countries/list.json?key=${apiKey}&secret=${apiSecret}`
    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch countries' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error fetching countries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}