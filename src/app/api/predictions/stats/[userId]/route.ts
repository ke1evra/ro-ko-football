import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params

    const payload = await getPayload({ config: await configPromise })

    // Получить все статистики прогнозов пользователя
    const statsResponse = await payload.find({
      collection: 'predictionStats',
      where: { author: { equals: userId } },
      limit: 1000,
    })

    // Агрегировать статистику
    const totalStats = {
      total: 0,
      won: 0,
      lost: 0,
      undecided: 0,
      hitRate: 0,
      roi: 0,
      totalCoefficient: 0,
      settledCount: 0,
    }

    const allStats = statsResponse.docs

    if (allStats.length > 0) {
      allStats.forEach((stat) => {
        if (stat.summary) {
          totalStats.total += stat.summary.total || 0
          totalStats.won += stat.summary.won || 0
          totalStats.lost += stat.summary.lost || 0
          totalStats.undecided += stat.summary.undecided || 0
          totalStats.totalCoefficient += stat.summary.roi || 0
        }
        if (stat.status === 'settled') {
          totalStats.settledCount += 1
        }
      })

      // Рассчитать средние значения
      if (totalStats.total > 0) {
        totalStats.hitRate = totalStats.won / totalStats.total
      }

      if (allStats.length > 0) {
        totalStats.roi = totalStats.totalCoefficient / allStats.length
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: totalStats.total,
        won: totalStats.won,
        lost: totalStats.lost,
        undecided: totalStats.undecided,
        hitRate: totalStats.hitRate,
        roi: totalStats.roi,
      },
      metadata: {
        predictionsCount: allStats.length,
        settledCount: totalStats.settledCount,
        pendingCount: allStats.length - totalStats.settledCount,
      },
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
