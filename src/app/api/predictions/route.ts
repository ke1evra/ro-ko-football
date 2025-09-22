import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fixtureId = searchParams.get('fixtureId')
    const matchId = searchParams.get('matchId')
    const limit = parseInt(searchParams.get('limit') || '10')

    const payload = await getPayload({ config: await configPromise })
    
    // Строим условия фильтрации
    const whereConditions: any[] = [
      { postType: { equals: 'prediction' } }
    ]

    if (fixtureId) {
      whereConditions.push({ fixtureId: { equals: parseInt(fixtureId) } })
    }

    if (matchId) {
      whereConditions.push({ matchId: { equals: parseInt(matchId) } })
    }

    const predictionsRes = await payload.find({
      collection: 'posts',
      where: {
        and: whereConditions
      },
      sort: '-publishedAt',
      limit,
      depth: 1,
    })

    // Подсчёт комментариев для каждого прогноза
    const withCounts = await Promise.all(
      predictionsRes.docs.map(async (post) => {
        try {
          const commentsRes = await payload.find({
            collection: 'comments',
            where: { post: { equals: post.id } },
            limit: 1,
            depth: 0,
          })
          const commentsCount = commentsRes?.totalDocs ?? 0
          return { post, commentsCount, rating: 0 }
        } catch {
          return { post, commentsCount: 0, rating: 0 }
        }
      }),
    )

    return NextResponse.json(withCounts)

  } catch (error) {
    console.error('Error fetching predictions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}