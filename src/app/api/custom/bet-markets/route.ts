import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })

    const markets = await payload.find({
      collection: 'bet-markets',
      limit: 100,
      depth: 1, // populate groups
    })

    return NextResponse.json(markets)
  } catch (error) {
    console.error('Error fetching markets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
