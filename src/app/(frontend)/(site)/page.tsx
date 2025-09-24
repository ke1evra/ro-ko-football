import Link from 'next/link'

import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Calendar, MessageSquare, ThumbsUp, Newspaper, Activity, TrendingUp } from 'lucide-react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import PredictionButton from '@/components/predictions/PredictionButton'

import {
  getCompetitionsListJson,
  getFixturesMatchesJson,
  getMatchesLiveJson,
} from '@/app/(frontend)/client'
import { 
  getPriorityLeagueIds, 
  sortMatchesByLeaguePriority,
  isPriorityLeague,
  getAllPriorityLeagues
} from '@/lib/highlight-competitions'
import WeekFixturesGrouped from '@/components/home/WeekFixturesGrouped'

export const revalidate = 120

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

async function getPriorityLeagueMatches() {
  // Заглушка для серверного рендеринга - данные будут загружены на клиенте
  return { matches: [], rawData: { fixtures: [], message: 'Данные загружаются на клиенте' } }
}

async function getTopUpcomingMatches() {
  // Заглушка для серверного рендеринга - данные будут загружены на клиенте
  return []
}

async function getLiveMatchesTop() {
  // Заглушка для серверного рендеринга - данные будут загружены на клиенте
  return []
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { page } = await searchParams
  const [{ items, page: curPage, totalPages }, topUpcoming, liveTop, priorityMatches] = await Promise.all([
    getPostsPage(page),
    getTopUpcomingMatches(),
    getLiveMatchesTop(),
    getPriorityLeagueMatches(),
  ])

  const breadcrumbItems = [{ label: 'Главная' }]
  const priorityLeagues = getAllPriorityLeagues()

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
                  <Link className="underline" href="/predictions">Прогнозы</Link>
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
                    <div className="flex items-start justify-between mb-2">
                      <Link href={post.slug ? `/posts/${post.slug}` : `/posts?pid=${post.id}`} className="flex-1">
                        <h3 className="text-lg font-semibold">{post.title}</h3>
                        {post.publishedAt ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(post.publishedAt).toLocaleDateString('ru-RU')}
                          </div>
                        ) : null}
                      </Link>
                      {(post as any).postType === 'prediction' && (
                        <div className="ml-2 flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          <TrendingUp className="h-3 w-3" />
                          Прогноз
                        </div>
                      )}
                    </div>
                    
                    <Link href={post.slug ? `/posts/${post.slug}` : `/posts?pid=${post.id}`} className="block">
                      {post.content ? (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
                      ) : null}
                    </Link>
                    
                    {/* Показываем краткую информацию о прогнозе */}
                    {(post as any).postType === 'prediction' && (post as any).prediction && (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                        <div className="flex items-center gap-4">
                          {(post as any).prediction.outcome && (
                            <span>
                              <strong>Исход:</strong> {
                                (post as any).prediction.outcome === 'home' ? 'Победа хозяев' :
                                (post as any).prediction.outcome === 'draw' ? 'Ничья' :
                                (post as any).prediction.outcome === 'away' ? 'Победа гостей' : 'Не указан'
                              }
                            </span>
                          )}
                          {(post as any).prediction.score?.home !== undefined && 
                           (post as any).prediction.score?.away !== undefined && (
                            <span>
                              <strong>Счет:</strong> {(post as any).prediction.score.home}:{(post as any).prediction.score.away}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
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

            {/* Блок с матчами приоритетных лиг перенесен в лейаут */}

            {/* Debug блок с сырыми данными API */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">🔧 Debug: API Response</CardTitle>
                <CardDescription className="text-xs">
                  Сырые данные от API для отладки (будет убрано в продакшене)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">1. Приоритетные лиги (серверная версия):</h4>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(priorityLeagues, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">2. ID приоритетных лиг:</h4>
                    <pre className="text-xs bg-muted p-2 rounded">
                      {JSON.stringify(getPriorityLeagueIds(), null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">3. Статистика матчей:</h4>
                    <pre className="text-xs bg-muted p-2 rounded">
                      {JSON.stringify({
                        totalMatches: priorityMatches.matches.length,
                        hasRawData: !!priorityMatches.rawData,
                        apiStatus: priorityMatches.rawData ? 'success' : 'error',
                        apiUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/fixtures?size=50`,
                        sampleMatch: priorityMatches.matches[0] || null,
                      }, null, 2)}
                    </pre>
                  </div>

                  {priorityMatches.rawData && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">4. Полный ответ API fixtures:</h4>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-60 overflow-y-auto">
                        {JSON.stringify(priorityMatches.rawData, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium mb-2">5. Обработанные матчи (первые 5):</h4>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                      {JSON.stringify(priorityMatches.matches.slice(0, 5), null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">6. Топ матчи для правой колонки:</h4>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(topUpcoming, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">7. Live матчи:</h4>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                      {JSON.stringify(liveTop, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">8. Матчи по приоритетным лигам:</h4>
                    <div className="space-y-3">
                      {priorityLeagues.map((league) => {
                        const leagueMatches = priorityMatches.matches.filter(
                          (m: any) => m.competition?.id === league.id
                        )
                        return (
                          <div key={league.id} className="border rounded p-2">
                            <h5 className="text-xs font-medium mb-1">
                              {league.description} (ID: {league.id}, Приоритет: {league.priority})
                            </h5>
                            <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                              {JSON.stringify({
                                leagueInfo: league,
                                matchesCount: leagueMatches.length,
                                matches: leagueMatches.slice(0, 3), // Показываем первые 3 матча
                              }, null, 2)}
                            </pre>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
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
                    {topUpcoming.map((m: any) => (
                      <li key={m.fixtureId} className="border rounded p-2 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <Link href={`/fixtures/${m.fixtureId}`} className="flex-1 min-w-0">
                            <div className="truncate font-medium">{m.home} — {m.away}</div>
                            <div className="text-muted-foreground truncate">{m.competitionName}</div>
                          </Link>
                          <div className="text-right text-muted-foreground">
                            <div>{new Date(`${m.date}T${m.time || '00:00'}Z`).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit' })}</div>
                            <div className="text-xs">{m.time || '—'}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <PredictionButton fixtureId={m.fixtureId} size="sm" />
                        </div>
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