import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.LIVESCORE_KEY
    const apiSecret = process.env.LIVESCORE_SECRET

    return NextResponse.json({
      message: 'Test API works',
      hasKey: !!apiKey,
      hasSecret: !!apiSecret,
      keyLength: apiKey?.length || 0,
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ error: 'Test failed' }, { status: 500 })
  }
}
