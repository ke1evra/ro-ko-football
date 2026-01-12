import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params

    const payload = await getPayload({ config: await configPromise })

    // Получить статистику прогноза
    const statsResponse = await payload.find({
      collection: 'predictionStats',
      where: { post: { equals: postId } },
      limit: 1,
    })

    const stats = statsResponse.docs[0]

    if (!stats) {
      return NextResponse.json({
        success: true,
        result: null,
        status: 'pending',
      })
    }

    return NextResponse.json({
      success: true,
      result: stats.summary || null,
      status: stats.status || 'pending',
      points: stats.scoring?.points || 0,
      evaluatedAt: stats.evaluatedAt,
    })
  } catch (error) {
    console.error('Error fetching prediction result:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
