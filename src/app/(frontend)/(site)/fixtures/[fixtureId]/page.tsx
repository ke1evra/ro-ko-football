import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import {
  getFixturesMatchesJson,
  getMatchesLiveJson,
} from '@/app/(frontend)/client'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import FixturePageClient from '@/components/fixtures/FixturePageClient'
import type { Metadata } from 'next'

export const revalidate = 300

type FixtureNormalized = {
  id: number
  date: string
  time: string
  home: { id: number; name: string }
  away: { id: number; name: string }
  competition?: { id: number; name: string }
  location?: string | null
  round?: string
  group_id?: number | null
  odds?: {
    pre?: { '1'?: number; '2'?: number; X?: number }
    live?: { '1'?: number | null; '2'?: number | null; X?: number | null }
  }
  h2h?: string
  status?: string
  time_status?: string | null
  match_id?: number
  scores?: {
    score?: string
    ht_score?: string
    ft_score?: string
    et_score?: string
    ps_score?: string
  }
  added?: string
  last_changed?: string
  outcomes?: {
    half_time?: string
    full_time?: string
    extra_time?: string
    penalty_shootout?: string
  }
  urls?: {
    events?: string
    statistics?: string
    lineups?: string
    head2head?: string
  }
}

async function findFixtureById(fixtureId: number): Promise<FixtureNormalized | null> {
  // Сначала пробуем точечный метод: live/предматч по fixture_id
  try {
    const liveResp = await getMatchesLiveJson({ fixture_id: fixtureId })
    const liveList = (liveResp.data?.data?.match || []) as Array<any>
    const m = liveList[0]
    if (m) {
      const homeName = m.home?.name || 'Команда дома'
      const awayName = m.away?.name || 'Команда гостей'
      return {
        id: Number(m.fixture_id || fixtureId),
        date: String(m.date || ''),
        time: String(m.time || ''),
        home: { id: Number(m.home?.id || '0'), name: homeName },
        away: { id: Number(m.away?.id || '0'), name: awayName },
        competition: m.competition
          ? { id: Number(m.competition.id || '0'), name: m.competition.name || '' }
          : undefined,
        location: typeof m.location === 'string' ? m.location : null,
        round:
          typeof m.round === 'string' ? m.round : m.round != null ? String(m.round) : undefined,
        group_id: m.group_id != null ? Number(m.group_id) : null,
        odds: m.odds,
        h2h: m.urls?.head2head || undefined,
        status: m.status,
        time_status: m.time_status ?? null,
        match_id: Number(m.id || 0) || undefined,
        scores: m.scores,
        added: m.added,
        last_changed: m.last_changed,
        outcomes: m.outcomes,
        urls: m.urls,
      }
    }
  } catch {
    // игнорируем и пробуем fixtures
  }

  // Фоллбэк: ищем в расписании ближайшей недели (fixtures)
  const now = new Date()
  const start = new Date(now.toISOString().split('T')[0])
  const end = new Date(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  )

  let page = 1
  const maxPages = 8

  while (page <= maxPages) {
    let resp: any
    try {
      resp = await getFixturesMatchesJson(
        { from: start, to: end, size: 100, page },
        { timeoutMs: 12000 },
      )
    } catch (e) {
      // Retry с большим таймаутом, если API медленный
      try {
        resp = await getFixturesMatchesJson(
          { from: start, to: end, size: 100, page },
          { timeoutMs: 20000 },
        )
      } catch {
        // Если повтор тоже не удался — прерываем поиск без ошибки
        break
      }
    }

    const fixtures = (resp.data?.data?.fixtures || []) as Array<any>

    const found = fixtures.find((fx) => Number(fx?.id) === fixtureId)
    if (found) {
      const fx = found
      const homeName = fx.home?.name || fx.home_team?.name || fx.home_name || 'Команда дома'
      const awayName = fx.away?.name || fx.away_team?.name || fx.away_name || 'Команда гостей'

      const normalized: FixtureNormalized = {
        id: Number(fx.id),
        date: String(fx.date || ''),
        time: String(fx.time || ''),
        home: { id: Number(fx.home?.id || fx.home_team?.id || fx.home_id || '0'), name: homeName },
        away: { id: Number(fx.away?.id || fx.away_team?.id || fx.away_id || '0'), name: awayName },
        competition: fx.competition
          ? { id: Number(fx.competition.id || '0'), name: fx.competition.name || '' }
          : undefined,
        location: typeof fx.location === 'string' ? fx.location : fx.venue?.name || null,
        round:
          typeof fx.round === 'string' ? fx.round : fx.round != null ? String(fx.round) : undefined,
        group_id: fx.group_id != null ? Number(fx.group_id) : null,
        odds: fx.odds,
        h2h: typeof fx.h2h === 'string' ? fx.h2h : undefined,
      }
      return normalized
    }

    const nextURL = resp.data?.data?.next_page as string | null | undefined
    if (!nextURL) break
    page += 1
  }

  return null
}

async function getPredictionsForFixture(fixtureId: number) {
  try {
    const payload = await getPayload({ config: await configPromise })
    
    const predictionsRes = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { postType: { equals: 'prediction' } },
          { fixtureId: { equals: fixtureId } }
        ]
      },
      sort: '-publishedAt',
      limit: 10,
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

    return withCounts
  } catch (error) {
    console.error('Ошибка загрузки прогнозов:', error)
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fixtureId: string }>
}): Promise<Metadata> {
  const { fixtureId } = await params
  const id = Number(fixtureId)
  if (!Number.isFinite(id)) {
    return { title: 'Матч не найден' }
  }

  const fx = await findFixtureById(id)
  if (!fx) return { title: `Матч #${id}` }

  const title = `${fx.home.name} vs ${fx.away.name}${fx.competition?.name ? ` — ${fx.competition.name}` : ''}`
  const description = `Матч: ${fx.home.name} — ${fx.away.name}. Турнир: ${fx.competition?.name || '—'}. Дата и время по местной зоне пользователя.`

  return {
    title,
    description,
  }
}

export default async function FixturePage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params
  const id = Number(fixtureId)

  if (!Number.isFinite(id)) {
    return (
      <Section>
        <Container>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Неверный идентификатор матча.</AlertDescription>
          </Alert>
        </Container>
      </Section>
    )
  }

  const [fx, predictions] = await Promise.all([
    findFixtureById(id),
    getPredictionsForFixture(id)
  ])

  if (!fx) {
    return (
      <Section>
        <Container className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Матч не найден в расписании на ближайшую неделю.</AlertDescription>
          </Alert>
          <Link href="/leagues">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />К лигам
            </Button>
          </Link>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container className="space-y-6">
        <FixturePageClient fx={fx} initialPredictions={predictions} />

        {/* Навигация */}
        <div className="flex items-center gap-2">
          <Link href="/leagues">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />К лигам
            </Button>
          </Link>
          {fx.competition?.id ? (
            <Link href={`/leagues/${fx.competition.id}`}>
              <Button variant="outline" size="sm">
                К турниру
              </Button>
            </Link>
          ) : null}
        </div>
      </Container>
    </Section>
  )
}