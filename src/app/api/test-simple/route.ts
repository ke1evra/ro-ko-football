import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  console.log('[test-simple] Simple test endpoint called')
  
  return NextResponse.json({
    success: true,
    message: 'API работает',
    timestamp: new Date().toISOString(),
    cheatsheet: {
      "ucl": 2,
      "uel": 3,
      "eng": 148,
      "ger": 175,
      "ita": 207,
      "fra": 168,
      "esp": 302,
      "rus": 271
    }
  })
}