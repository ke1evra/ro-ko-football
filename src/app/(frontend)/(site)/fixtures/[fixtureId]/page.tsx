import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import {
  getMatchesLiveJson,
  getMatchesHistoryJson,
  getFixturesMatchesJson,
} from '@/app/(frontend)/client'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import FixturePageClient from '@/components/fixtures/FixturePageClient'
import { getTopMatchesLeagueIds } from '@/lib/leagues'
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
  console.log(`[findFixtureById] Searching for fixture ${fixtureId}`)
  
  // Используем те же параметры, что и виджет: диапазон дат + приоритетные лиги
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 7)
  
  // Получаем ID лиг из CMS
  let priorityLeagueIds: number[] = []
  try {
    priorityLeagueIds = await getTopMatchesLeagueIds()
    console.log(`[findFixtureById] Priority leagues from CMS:`, priorityLeagueIds)
  } catch (error) {
    console.error(`[findFixtureById] Error loading leagues from CMS:`, error)
    priorityLeagueIds = []
  }
  
  // Сначала проверим, есть ли этот матч в общем списке fixtures (используем те же параметры, что и виджет)
  try {
    console.log(`[findFixtureById] Checking general fixtures API with same params as widget`)
    
    const params: any = {
      size: 100,
      lang: 'ru' as const,
      from: today.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
    }
    
    // Добавляем фильтр по лигам только если есть приоритетные лиги
    if (priorityLeagueIds.length > 0) {
      params.competition_id = priorityLeagueIds.join(',')
    }
    
    console.log(`[findFixtureById] Using params:`, params)
    
    const fixturesResp = await getFixturesMatchesJson(params)
    
    const fixturesList = (fixturesResp.data?.data?.fixtures || []) as Array<any>
    console.log(`[findFixtureById] General fixtures API returned ${fixturesList.length} fixtures`)
    
    // Ищем матч по ID в общем списке fixtures
    const foundFixture = fixturesList.find((fx) => Number(fx?.id) === fixtureId)
    if (foundFixture) {
      console.log(`[findFixtureById] Found fixture in general fixtures API`)
      const fx = foundFixture
      const homeName = fx.home_name || fx.home?.name || fx.home_team?.name || 'Команда дома'
      const awayName = fx.away_name || fx.away?.name || fx.away_team?.name || 'Команда гостей'
      
      return {
        id: Number(fx.id),
        date: String(fx.date || ''),
        time: String(fx.time || ''),
        home: { id: Number(fx.home_id || fx.home?.id || fx.home_team?.id || '0'), name: homeName },
        away: { id: Number(fx.away_id || fx.away?.id || fx.away_team?.id || '0'), name: awayName },
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
    }
  } catch (error) {
    console.error(`[findFixtureById] Error in general fixtures API:`, error)
  }

  // Если не найден в приоритетных лигах, пробуем поиск без фильтра по лигам
  if (priorityLeagueIds.length > 0) {
    try {
      console.log(`[findFixtureById] Trying general fixtures API without league filter`)
      
      const paramsNoFilter = {
        size: 100,
        lang: 'ru' as const,
        from: today.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        // Убираем фильтр по лигам
      }
      
      console.log(`[findFixtureById] Using params without filter:`, paramsNoFilter)
      
      const fixturesResp = await getFixturesMatchesJson(paramsNoFilter)
      
      const fixturesList = (fixturesResp.data?.data?.fixtures || []) as Array<any>
      console.log(`[findFixtureById] General fixtures API (no filter) returned ${fixturesList.length} fixtures`)
      
      // Ищем матч по ID в общем списке fixtures
      const foundFixture = fixturesList.find((fx) => Number(fx?.id) === fixtureId)
      if (foundFixture) {
        console.log(`[findFixtureById] Found fixture in general fixtures API (no filter)`)
        const fx = foundFixture
        const homeName = fx.home_name || fx.home?.name || fx.home_team?.name || 'Команда дома'
        const awayName = fx.away_name || fx.away?.name || fx.away_team?.name || 'Команда гостей'
        
        return {
          id: Number(fx.id),
          date: String(fx.date || ''),
          time: String(fx.time || ''),
          home: { id: Number(fx.home_id || fx.home?.id || fx.home_team?.id || '0'), name: homeName },
          away: { id: Number(fx.away_id || fx.away?.id || fx.away_team?.id || '0'), name: awayName },
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
      }
    } catch (error) {
      console.error(`[findFixtureById] Error in general fixtures API (no filter):`, error)
    }
  }

  // Если не найден в общем списке, пробуем live API
  try {
    console.log(`[findFixtureById] Trying live matches API with fixture_id=${fixtureId}`)
    const liveResp = await getMatchesLiveJson({ 
      fixture_id: fixtureId,
      lang: 'ru'
    })
    const liveList = (liveResp.data?.data?.match || []) as Array<any>
    console.log(`[findFixtureById] Live API returned ${liveList.length} matches`)
    
    const m = liveList[0]
    if (m) {
      console.log(`[findFixtureById] Found match in live API`)
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
  } catch (error) {
    console.error(`[findFixtureById] Error in live API:`, error)
  }

  // Если не найден в live, ищем в history
  try {
    console.log(`[findFixtureById] Trying history matches API with fixture_id=${fixtureId}`)
    const now = new Date()
    const historyStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // 90 дней назад
    const historyEnd = new Date() // до сегодня
    
    const historyResp = await getMatchesHistoryJson({
      from: historyStart,
      to: historyEnd,
      size: 100,
      lang: 'ru'
    })
    
    const historyList = (historyResp.data?.data?.match || []) as Array<any>
    console.log(`[findFixtureById] History API returned ${historyList.length} matches`)
    
    // Ищем матч по fixture_id в истории
    const historyMatch = historyList.find((m) => Number(m?.fixture_id) === fixtureId)
    if (historyMatch) {
      console.log(`[findFixtureById] Found match in history API`)
      const m = historyMatch
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
  } catch (error) {
    console.error(`[findFixtureById] Error in history API:`, error)
  }

  console.log(`[findFixtureById] Fixture ${fixtureId} not found in any API`)
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
            <AlertDescription>
              Матч #{id} не найден.
            </AlertDescription>
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