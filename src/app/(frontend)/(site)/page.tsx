import Link from 'next/link'

import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Calendar, MessageSquare, ThumbsUp, Newspaper, Activity } from 'lucide-react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import {
  getCompetitionsListJson,
  getFixturesMatchesJson,
  getMatchesLiveJson,
} from '@/app/(frontend)/client'

export const revalidate = 120

// Страны для топ-6 лиг
const TOP_COUNTRIES_RU = new Set(['Англия', 'Германия', 'Италия', 'Испания', 'Франция', 'Россия'])
const TOP_COUNTRIES_EN = new Set(['England', 'Germany', 'Italy', 'Spain', 'France', 'Russia'])
const TOP_LEAGUE_NAME_PATTERNS = [
  'Premier League',
  'Bundesliga',
  'Serie A',
  'La Liga',
  'Ligue 1',
  'Премьер',
  'РПЛ',
]

type SearchParams = Promise<{ page?: string }>

async function getPostsPage(pageParam?: string) {
  const page = Math.max(1, Number(pageParam || 1) || 1)
  const limit = 10
  const payload = await getPayload({ config: await configPromise })

  const postsRes = await payload.find({
    collection: 'posts',
    sort: '-publishedAt',
    limit,
    page,
  })

  // Подсчёт комментариев (totalDocs) для каждого поста
  const withCounts = await Promise.all(
    postsRes.docs.map(async (post) => {
      try {
        const commentsRes = await payload.find({
          collection: 'comments',
          where: { post: { equals: post.id } },
          limit: 1,
          depth: 0,
        })
        const commentsCount = commentsRes?.totalDocs ?? 0
        // Рейтинг — заглушка (0). При необходимости можно агрегировать из commentVotes
        return { post, commentsCount, rating: 0 }
      } catch {
        return { post, commentsCount: 0, rating: 0 }
      }
    }),
  )

  return {
    items: withCounts,
    page,
    totalPages: postsRes.totalPages || 1,
  }
}

async function getTopUpcomingMatches() {
  // Получаем Competitions и выбираем топ‑лиги по странам/названиям
  const compsRes = await getCompetitionsListJson({ size: 1000 })
  const comps = ((compsRes.data as any)?.data?.competition || []) as Array<{
    id?: number | string
    name?: string
    countries?: Array<{ id?: number | string; name?: string }>
  }>

  let topCompIds = comps
    .filter((c) => {
      const country = c.countries?.[0]?.name
      const name = c.name || ''
      if (country && (TOP_COUNTRIES_RU.has(country) || TOP_COUNTRIES_EN.has(country))) return true
      return TOP_LEAGUE_NAME_PATTERNS.some((p) => name.includes(p))
    })
    .map((c) => Number(c.id))
    .filter((v) => Number.isFinite(v))

  // Если ничего не нашли — возьмём топ-6 первых по имени (временный фолбэк)
  if (topCompIds.length === 0) {
    topCompIds = comps
      .filter((c) => c.name)
      .slice(0, 6)
      .map((c) => Number(c.id))
      .filter((v) => Number.isFinite(v))
  }

  const compIdSet = new Set<number>(topCompIds)

  const now = new Date()
  const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const fixturesRes = await getFixturesMatchesJson({ from: now, to, size: 500 })
  const fixtures = (((fixturesRes.data as any)?.data?.fixtures || []) as any[])
    .filter((fx) => compIdSet.has(Number(fx?.competition?.id)))
    .map((fx) => ({
      fixtureId: Number(fx.id),
      competitionId: Number(fx.competition?.id || 0) || undefined,
      date: String(fx.date || ''),
      time: String(fx.time || ''),
      competitionName: String(fx.competition?.name || ''),
      home: fx.home?.name || fx.home_team?.name || fx.home_name || 'Команда дома',
      away: fx.away?.name || fx.away_team?.name || fx.away_name || 'Команда гостей',
    }))
    .filter((m) => m.fixtureId && m.date)
    .sort(
      (a, b) => new Date(`${a.date}T${a.time || '00:00'}Z`).getTime() - new Date(`${b.date}T${b.time || '00:00'}Z`).getTime(),
    )
    .slice(0, 5)

  return fixtures
}

async function getLiveMatchesTop() {
  try {
    const liveRes = await getMatchesLiveJson({ page: 1 })
    const matches = (((liveRes.data as any)?.data?.match || []) as any[]).map((m) => ({
      matchId: Number(m.id || 0) || undefined,
      fixtureId: Number(m.fixture_id || 0) || undefined,
      compName: m.competition?.name || '',
      home: m.home?.name || 'Команда дома',
      away: m.away?.name || 'Команда гостей',
      score: (m.scores?.score as string) || '',
      time_status: m.time_status || m.status || 'LIVE',
    }))
    return matches.slice(0, 10)
  } catch {
    return []
  }
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { page } = await searchParams
  const [{ items, page: curPage, totalPages }, topUpcoming, liveTop] = await Promise.all([
    getPostsPage(page),
    getTopUpcomingMatches(),
    getLiveMatchesTop(),
  ])

  const breadcrumbItems = [{ label: 'Главная' }]

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Левая колонка — Новости (заглушка) */}
          <aside className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5" /> Новости
                </CardTitle>
                <CardDescription>Редакционная лента (UI-заглушка)</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="border rounded p-2 bg-muted/30">Новость {i}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Перелинковка</CardTitle>
                <CardDescription>Навигация по разделам</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Link className="underline" href="/leagues">Лиги</Link>
                  <Link className="underline" href="/countries">Страны</Link>
                  <Link className="underline" href="/posts">Посты</Link>
                  <Link className="underline" href="/leagues/7/matches">Матчи (пример)</Link>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Центральная колонка — Посты (пагинация для SEO) */}
          <main className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Посты сообщества</CardTitle>
                <CardDescription>
                  Страница {curPage} из {totalPages}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map(({ post, commentsCount, rating }) => (
                  <article key={post.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <Link href={post.slug ? `/posts/${post.slug}` : `/posts?pid=${post.id}`} className="block">
                      <h3 className="text-lg font-semibold">{post.title}</h3>
                      {post.publishedAt ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(post.publishedAt).toLocaleDateString('ru-RU')}
                        </div>
                      ) : null}
                      {post.content ? (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
                      ) : null}
                    </Link>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" /> {commentsCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" /> {rating}
                        </span>
                      </div>
                      <Link href={post.slug ? `/posts/${post.slug}#comments` : `/posts?pid=${post.id}#comments`}>
                        <Button variant="outline" size="sm">Комментировать</Button>
                      </Link>
                    </div>
                  </article>
                ))}

                <div className="pt-2 flex items-center justify-between">
                  <div>
                    {curPage > 1 ? (
                      <Link href={`/?page=${curPage - 1}`} className="underline">← Новее</Link>
                    ) : <span />}
                  </div>
                  <div>
                    {curPage < totalPages ? (
                      <Link href={`/?page=${curPage + 1}`} className="underline">Старее →</Link>
                    ) : <span />}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">SEO‑пагинация по страницам работает через параметр ?page</div>
              </CardContent>
            </Card>
          </main>

          {/* Правая колонка — Два блока */}
          <aside className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Ближайшие топ‑матчи
                </CardTitle>
                <CardDescription>Топ‑5 из 6 ведущих лиг (Англия, Германия, Италия, Испания, Франция, Россия)</CardDescription>
              </CardHeader>
              <CardContent>
                {topUpcoming.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Нет ближайших матчей</div>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {topUpcoming.map((m) => (
                      <li key={m.fixtureId} className="flex items-center justify-between border rounded p-2 hover:bg-accent/50 transition-colors">
                        <Link href={`/fixtures/${m.fixtureId}`} className="flex items-center justify-between gap-3 w-full">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{m.home} — {m.away}</div>
                            <div className="text-muted-foreground truncate">{m.competitionName}</div>
                          </div>
                          <div className="text-right text-muted-foreground ml-3">
                            <div>{new Date(`${m.date}T${m.time || '00:00'}Z`).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit' })}</div>
                            <div className="text-xs">{m.time || '—'}</div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" /> Live матчи
                </CardTitle>
                <CardDescription>Топ‑10 текущих матчей</CardDescription>
              </CardHeader>
              <CardContent>
                {liveTop.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Сейчас нет лайв‑матчей</div>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {liveTop.map((m, idx) => {
                      const href = m.matchId ? `/matches/${m.matchId}` : m.fixtureId ? `/fixtures/${m.fixtureId}` : '#'
                      return (
                        <li key={`${m.matchId ?? m.fixtureId ?? idx}`} className="flex items-center justify-between border rounded p-2 hover:bg-accent/50 transition-colors">
                          <Link href={href} className="flex items-center justify-between gap-3 w-full">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{m.home} — {m.away}</div>
                              <div className="text-muted-foreground truncate">{m.compName}</div>
                            </div>
                            <div className="text-right text-muted-foreground ml-3">
                              <div className="font-semibold">{m.score || m.time_status}</div>
                              <div className="text-xs">{m.time_status}</div>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </Container>
    </Section>
  )
}
