import Link from 'next/link'

import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Calendar, MessageSquare, ThumbsUp, TrendingUp } from 'lucide-react'
import Script from 'next/script'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import UpcomingAllMatchesWidget from '@/components/home/UpcomingAllMatchesWidget'
import LeaguesListWidget from '@/components/home/LeaguesListWidget'
import PredictionPreview from '@/components/posts/PredictionPreview'
import RichTextRenderer from '@/components/RichTextRenderer'
import { extractTextFromLexical, truncateText } from '@/lib/lexical-utils'

import {
  getCompetitionsListJson,
  getFixturesMatchesJson,
  getMatchesLiveJson,
} from '@/app/(frontend)/client'
import {
  getPriorityLeagueIds,
  sortMatchesByLeaguePriority,
  isPriorityLeague,
  getAllPriorityLeagues,
} from '@/lib/highlight-competitions'
import { getSidebarLeaguesForWidget } from '@/lib/leagues'
import WeekFixturesGrouped from '@/components/home/WeekFixturesGrouped'
import LiveMatchesWidget from '@/components/home/LiveMatchesWidget'
import { LiveIndicator } from '@/components/ui/live-indicator'
import YesterdaysMatchesWidget from '@/components/home/YesterdaysMatchesWidget'

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
  const [{ items, page: curPage, totalPages }, topUpcoming, liveTop, priorityMatches, leaguesSettings] =
    await Promise.all([
      getPostsPage(page),
      getTopUpcomingMatches(),
      getLiveMatchesTop(),
      getPriorityLeagueMatches(),
      getSidebarLeaguesForWidget(),
    ])

  const priorityLeagues = getAllPriorityLeagues()

  return (
    <Section>
      <Container className="space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Левая колонка — Новости (заглушка) */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Последние матчи из Payload */}
            <YesterdaysMatchesWidget />

            {/* Виджет лиг из CMS */}
            <Card>
              <CardContent className="p-4">
                <LeaguesListWidget settings={leaguesSettings} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Перелинковка</CardTitle>
                <CardDescription>Навигация по разделам</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Link className="underline" href="/leagues">
                    Лиги
                  </Link>
                  <Link className="underline" href="/countries">
                    Страны
                  </Link>
                  <Link className="underline" href="/posts">
                    Посты
                  </Link>
                  <Link className="underline" href="/predictions">
                    Прогнозы
                  </Link>
                  <Link className="underline" href="/leagues/7/matches">
                    Матчи (пример)
                  </Link>
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
                  <article
                    key={post.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Link
                        href={post.slug ? `/posts/${post.slug}` : `/posts?pid=${post.id}`}
                        className="flex-1"
                      >
                        <h3 className="text-lg font-semibold">{post.title}</h3>
                        {post.publishedAt ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(post.publishedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
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

                    <Link
                      href={post.slug ? `/posts/${post.slug}` : `/posts?pid=${post.id}`}
                      className="block"
                    >
                      {post.content ? (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {truncateText(extractTextFromLexical(post.content))}
                        </p>
                      ) : null}
                    </Link>

                    {/* Показываем расширенную информацию о прогнозе */}
                    {(post as any).postType === 'prediction' && (post as any).prediction && (
                      <div className="mt-3">
                        <PredictionPreview prediction={(post as any).prediction} />
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
                      <Link
                        href={
                          post.slug
                            ? `/posts/${post.slug}#comments`
                            : `/posts?pid=${post.id}#comments`
                        }
                      >
                        <Button variant="outline" size="sm">
                          Комментировать
                        </Button>
                      </Link>
                    </div>
                  </article>
                ))}

                <div className="pt-2 flex items-center justify-between">
                  <div>
                    {curPage > 1 ? (
                      <Link href={`/?page=${curPage - 1}`} className="underline">
                        ← Новее
                      </Link>
                    ) : (
                      <span />
                    )}
                  </div>
                  <div>
                    {curPage < totalPages ? (
                      <Link href={`/?page=${curPage + 1}`} className="underline">
                        Старее →
                      </Link>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  SEO‑пагинация по страницам работает через параметр ?page
                </div>
              </CardContent>
            </Card>

            {/* Блок с матчами приоритетных лиг перенесен в лейаут */}
          </main>

          {/* Правая колонка — Два блока */}
          <aside className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LiveIndicator size="small" />
                  Матчи
                </CardTitle>
                <div className="flex items-center justify-between">
                  <CardDescription>Топ‑10 текущих матчей</CardDescription>
                  <div
                    id="live-refresh-widget"
                    className="flex items-center gap-1 rounded border bg-background/80 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <button
                      type="button"
                      aria-label="Обновить"
                      id="live-refresh-btn"
                      className="hover:text-foreground transition-colors"
                    >
                      ↻
                    </button>
                    <span id="live-refresh-timer" className="tabular-nums">01:00</span>
                  </div>
                </div>
                <Script id="live-refresh-script" strategy="afterInteractive">{`
                  (function(){
                    try{
                      var nextAt = Date.now() + 60000;
                      var timerEl = document.getElementById('live-refresh-timer');
                      var btnEl = document.getElementById('live-refresh-btn');
                      function update(){
                        var s = Math.max(0, Math.ceil((nextAt - Date.now())/1000));
                        var mm = String(Math.floor(s/60)).padStart(2,'0');
                        var ss = String(s%60).padStart(2,'0');
                        if (timerEl) timerEl.textContent = mm+':'+ss;
                      }
                      var tick = setInterval(update, 1000);
                      function fire(){
                        try{ window.dispatchEvent(new CustomEvent('live:refresh-matches')); }catch(e){}
                      }
                      var poll = setInterval(function(){
                        nextAt = Date.now() + 60000;
                        fire();
                      }, 60000);
                      if (btnEl){
                        btnEl.addEventListener('click', function(){
                          nextAt = Date.now() + 60000;
                          fire();
                        });
                      }
                      update();
                      window.addEventListener('beforeunload', function(){
                        clearInterval(tick);
                        clearInterval(poll);
                      });
                    }catch(e){}
                  })();
                `}</Script>
              </CardHeader>
              <CardContent>
                <LiveMatchesWidget />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Ближайшие матчи
                </CardTitle>
                <CardDescription>Матчи топ-лиг на ближайшие 7 дней</CardDescription>
              </CardHeader>
              <CardContent>
                <UpcomingAllMatchesWidget />
              </CardContent>
            </Card>
          </aside>
        </div>
      </Container>
    </Section>
  )
}
