import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') || 'recent'

    const payload = await getPayload({ config: await configPromise })

    // Получить все посты-прогнозы пользователя
    const postsResponse = await payload.find({
      collection: 'posts',
      where: {
        and: [{ postType: { equals: 'prediction' } }, { author: { equals: userId } }],
      },
      limit: 1000,
      depth: 2,
      sort: sort === 'recent' ? '-createdAt' : sort === 'oldest' ? 'createdAt' : undefined,
    })

    // Для каждого поста получить статистику
    const predictionsWithStats = await Promise.all(
      postsResponse.docs.map(async (post) => {
        const statsResponse = await payload.find({
          collection: 'predictionStats',
          where: { post: { equals: post.id } },
          limit: 1,
        })

        const stats = statsResponse.docs[0]

        return {
          id: post.id,
          title: post.title,
          createdAt: post.createdAt,
          status: stats?.status || 'pending',
          summary: stats?.summary || null,
        }
      }),
    )

    // Сортировка по лучшим/худшим если нужно
    let sorted = predictionsWithStats

    if (sort === 'best') {
      sorted = predictionsWithStats.sort((a, b) => {
        const aRate = a.summary?.hitRate || 0
        const bRate = b.summary?.hitRate || 0
        return bRate - aRate
      })
    } else if (sort === 'worst') {
      sorted = predictionsWithStats.sort((a, b) => {
        const aRate = a.summary?.hitRate || 0
        const bRate = b.summary?.hitRate || 0
        return aRate - bRate
      })
    }

    return NextResponse.json({
      success: true,
      predictions: sorted,
      total: sorted.length,
    })
  } catch (error) {
    console.error('Error fetching user predictions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
