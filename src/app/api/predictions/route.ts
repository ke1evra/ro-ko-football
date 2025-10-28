import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { evaluateMany } from '@/lib/predictions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fixtureId = searchParams.get('fixtureId')
    const matchId = searchParams.get('matchId')
    const limit = parseInt(searchParams.get('limit') || '10')

    const payload = await getPayload({ config: await configPromise })

    // Строим условия фильтрации
    const whereConditions: any[] = [{ postType: { equals: 'prediction' } }]

    if (fixtureId) {
      whereConditions.push({ fixtureId: { equals: parseInt(fixtureId) } })
    }

    if (matchId) {
      whereConditions.push({ matchId: { equals: parseInt(matchId) } })
    }

    const predictionsRes = await payload.find({
      collection: 'posts',
      where: {
        and: whereConditions,
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

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const body = await request.json().catch(() => ({}))

    const matchId = body?.matchId ? Number(body.matchId) : null
    const fixtureId = body?.fixtureId ? Number(body.fixtureId) : null

    if (!matchId && !fixtureId) {
      return NextResponse.json({ error: 'Нужно передать matchId или fixtureId' }, { status: 400 })
    }

    // Находим матч
    const matchQuery = await payload.find({
      collection: 'matches',
      where: matchId ? { matchId: { equals: matchId } } : { fixtureId: { equals: fixtureId } },
      limit: 1,
      depth: 0,
    })

    if (!matchQuery.docs.length) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 })
    }

    const match = matchQuery.docs[0] as any

    // Проверяем завершённость
    if (match.status !== 'finished') {
      return NextResponse.json({ error: 'Матч не завершён' }, { status: 409 })
    }

    const resolvedMatchId = Number(match.matchId)

    // Ищем статистику матча
    const statsQuery = await payload.find({
      collection: 'matchStats',
      where: { matchId: { equals: resolvedMatchId } },
      limit: 1,
      depth: 0,
    })

    const matchStats = statsQuery.docs[0] || null

    // Ищем посты-прогнозы
    const postsQuery = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { postType: { equals: 'prediction' } },
          matchId
            ? { matchId: { equals: resolvedMatchId } }
            : { fixtureId: { equals: Number(match.fixtureId) || 0 } },
        ],
      },
      limit: 1000,
      depth: 0,
    })

    const posts = postsQuery.docs as any[]

    const results: any[] = []

    for (const post of posts) {
      const events: string[] = (post?.prediction?.events || []).map((e: any) => String(e.event))
      const coeffs: (number | undefined)[] = (post?.prediction?.events || []).map((e: any) =>
        typeof e.coefficient === 'number' ? e.coefficient : undefined,
      )

      const evalRes = evaluateMany(events, match, matchStats)

      // ROI
      let roi: number | undefined
      if (coeffs.length === evalRes.total && evalRes.total > 0) {
        let profit = 0
        evalRes.details.forEach((d, idx) => {
          const c = coeffs[idx]
          if (c && d.won != null) {
            profit += d.won ? c - 1 : -1
          }
        })
        roi = profit / evalRes.total
      }

      // Очки MVP (outcome=2, exact=5)
      let points = 0
      const breakdown: Record<string, any> = {}

      const outcome = post?.prediction?.outcome as 'home' | 'draw' | 'away' | undefined
      if (outcome) {
        const home = Number(match.homeScore)
        const away = Number(match.awayScore)
        const outcomeWon =
          (outcome === 'home' && home > away) ||
          (outcome === 'draw' && home === away) ||
          (outcome === 'away' && away > home)
        if (outcomeWon) points += 2
        breakdown.outcome = { predicted: outcome, won: outcomeWon, points: outcomeWon ? 2 : 0 }
      }

      const scoreHome = post?.prediction?.score?.home
      const scoreAway = post?.prediction?.score?.away
      if (typeof scoreHome === 'number' && typeof scoreAway === 'number') {
        const exactWon =
          Number(match.homeScore) === scoreHome && Number(match.awayScore) === scoreAway
        if (exactWon) points += 5
        breakdown.exact = {
          predicted: { home: scoreHome, away: scoreAway },
          won: exactWon,
          points: exactWon ? 5 : 0,
        }
      }

      const hitRate = evalRes.total > 0 ? evalRes.won / evalRes.total : 0

      // upsert по посту
      const existing = await payload.find({
        collection: 'predictionStats',
        where: { post: { equals: post.id } },
        limit: 1,
        depth: 0,
      })

      const details = evalRes.details.map((d, idx) => ({
        event: events[idx] || '',
        coefficient: coeffs[idx],
        result: d.won == null ? 'undecided' : d.won ? 'won' : 'lost',
        reason: d.reason,
      }))

      const doc = {
        post: post.id,
        author: post.author,
        matchId: resolvedMatchId,
        fixtureId: Number(match.fixtureId) || undefined,
        status: 'settled' as const,
        evaluatedAt: new Date().toISOString(),
        summary: {
          total: evalRes.total,
          won: evalRes.won,
          lost: evalRes.lost,
          undecided: evalRes.undecided,
          hitRate,
          roi,
        },
        details,
        scoring: {
          points,
          breakdown,
        },
      }

      let saved
      if (existing.docs.length > 0) {
        saved = await payload.update({
          collection: 'predictionStats',
          id: (existing.docs[0] as any).id,
          data: doc,
        })
      } else {
        saved = await payload.create({ collection: 'predictionStats', data: doc })
      }

      results.push({
        postId: post.id,
        statsId: (saved as any).id,
        summary: doc.summary,
        scoring: doc.scoring,
      })
    }

    return NextResponse.json({ ok: true, count: results.length, results })
  } catch (error) {
    console.error('[predictions POST settle] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
