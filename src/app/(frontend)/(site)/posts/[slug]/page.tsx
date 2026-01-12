import { Container, Section, Prose } from '@/components/ds'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CommentsTree } from './post-comments-tree'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, Target, Calendar } from 'lucide-react'
import Link from 'next/link'
import RichTextRenderer from '@/components/RichTextRenderer'
import { generateMatchUrl, generateLegacyFixtureUrl } from '@/lib/match-url-utils'
import { PredictionResultLoader } from '@/components/predictions/PredictionResultLoader'
import { PredictorCard } from '@/components/predictions/PredictorCard'
import { MatchResult } from '@/components/predictions/MatchResult'
import { UserAvatarLink } from '@/components/UserAvatarLink'
import type { Post, User, OutcomeGroup } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: await configPromise })

  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 3,
  })

  const post = docs[0] as Post
  if (!post) return notFound()

  const isPrediction = post.postType === 'prediction'
  const author = typeof post.author === 'object' ? (post.author as User) : null
  const outcomes = isPrediction && post.prediction?.outcomes ? post.prediction.outcomes : []

  // Получаем данные матча из Payload (если есть fixtureId)
  let matchData = null
  if (isPrediction && outcomes.length > 0 && outcomes[0].fixtureId) {
    try {
      const fixtureId = outcomes[0].fixtureId
      console.log('[PostPage] Fetching match data for fixtureId:', fixtureId)
      const matchesResult = await payload.find({
        collection: 'matches',
        where: { fixtureId: { equals: fixtureId } },
        limit: 1,
      })
      console.log('[PostPage] Matches found:', matchesResult.docs.length)
      if (matchesResult.docs.length > 0) {
        const match = matchesResult.docs[0] as any
        console.log('[PostPage] Match data:', {
          status: match.status,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
        })
        if (match.status === 'finished' && match.homeScore !== null && match.awayScore !== null) {
          matchData = {
            home: match.homeTeam,
            away: match.awayTeam,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homeScoreHalftime: match.homeScoreHalftime,
            awayScoreHalftime: match.awayScoreHalftime,
          }
          console.log('[PostPage] Match data set:', matchData)
        } else {
          console.log('[PostPage] Match not finished or missing scores')
        }
      } else {
        console.log('[PostPage] No match found in Payload for fixtureId:', fixtureId)
      }
    } catch (error) {
      console.error('[PostPage] Error fetching match data:', error)
    }
  } else {
    console.log('[PostPage] Skipping match data fetch:', {
      isPrediction,
      hasOutcomes: outcomes.length > 0,
      hasFixtureId: outcomes.length > 0 ? !!outcomes[0].fixtureId : false,
    })
  }

  // Проверяем есть ли текстовое содержание
  const hasContent =
    post.content &&
    typeof post.content === 'object' &&
    'root' in post.content &&
    post.content.root?.children?.length > 0 &&
    post.content.root.children.some((child: any) => child.children && child.children.length > 0)

  // Определяем вариант отображения
  const isExpress = outcomes.length > 1
  const layoutVariant = !hasContent ? 'info-only' : isExpress ? 'express' : 'single'

  // Генерируем URL матча
  const getMatchUrl = (outcome: (typeof outcomes)[0]) => {
    const matchInfo = outcome.matchInfo
    if (!matchInfo || !outcome.fixtureId) {
      return generateLegacyFixtureUrl(outcome.fixtureId || 0)
    }

    // Если есть все данные для полного URL
    if (
      matchInfo.homeTeamId &&
      matchInfo.awayTeamId &&
      matchInfo.date &&
      matchInfo.home &&
      matchInfo.away
    ) {
      return generateMatchUrl({
        homeTeamName: matchInfo.home,
        awayTeamName: matchInfo.away,
        homeTeamId: matchInfo.homeTeamId,
        awayTeamId: matchInfo.awayTeamId,
        date: matchInfo.date,
        fixtureId: outcome.fixtureId,
      })
    }

    // Fallback на старый формат
    return generateLegacyFixtureUrl(outcome.fixtureId)
  }

  const comments = await payload.find({
    collection: 'comments',
    where: { post: { equals: post.id } },
    sort: 'createdAt',
    depth: 1,
    limit: 1000,
  })

  return (
    <Section>
      <Container className="space-y-6">
        {/* Компактный header */}
        <header className="flex items-start justify-between gap-4 pb-4 border-b">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold mb-2">{post.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {author && (
                <>
                  <UserAvatarLink user={author} size="sm" />
                  <span className="font-medium">{author.name || author.email}</span>
                  <span>•</span>
                </>
              )}
              <span>{format(new Date(post.createdAt), 'd MMMM yyyy', { locale: ru })}</span>
            </div>
          </div>
        </header>

        {/* Макет для прогнозов */}
        {isPrediction ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Левая колонка: Детали прогноза + контент */}
            <div className="lg:col-span-2 space-y-6">
              {/* Детали прогноза - всегда сверху */}
              {outcomes.length > 0 && (
                <Card>
                  {/* Информация о матче */}
                  {outcomes[0].matchInfo && (
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          {outcomes[0].matchInfo.competition && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/20 rounded text-xs font-medium text-primary">
                              <Calendar className="h-3 w-3" />
                              {outcomes[0].matchInfo.competition}
                          </div>
                          )}
                          <h2 className="text-xl font-bold leading-tight">
                            {outcomes[0].matchInfo.home} — {outcomes[0].matchInfo.away}
                          </h2>
                          {(outcomes[0].matchInfo.date || outcomes[0].matchInfo.time) && (
                            <p className="text-sm text-muted-foreground">
                              {outcomes[0].matchInfo.date} {outcomes[0].matchInfo.time}
                            </p>
                          )}
                        </div>
                        {outcomes[0].fixtureId && (
                          <Link href={getMatchUrl(outcomes[0])}>
                            <Button variant="outline" size="sm" className="gap-2 shrink-0">
                              <Calendar className="h-4 w-4" />
                              К матчу
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Результат матча, если матч завершён */}
                  {matchData ? (
                    <div className="px-4 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                      <MatchResult
                        home={matchData.home}
                        away={matchData.away}
                        homeScore={matchData.homeScore}
                        awayScore={matchData.awayScore}
                        homeScoreHalftime={matchData.homeScoreHalftime}
                        awayScoreHalftime={matchData.awayScoreHalftime}
                      />
                    </div>
                  ) : null}

                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-4 w-4 text-primary" />
                        {isExpress ? `Экспресс-прогноз (${outcomes.length})` : 'Исход прогноза'}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {outcomes.map((outcome, index) => {
                      const outcomeGroup =
                        typeof outcome.outcomeGroup === 'object' && outcome.outcomeGroup !== null
                          ? (outcome.outcomeGroup as OutcomeGroup)
                          : null
                      const outcomeGroupName = outcomeGroup?.name

                      return (
                        <div
                          key={outcome.id || index}
                          className="p-4 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
                        >
                          {/* Маркет и группа исходов */}
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Badge variant="default" className="text-xs font-semibold bg-primary text-primary-foreground">
                              {outcome.marketName}
                            </Badge>
                            {outcomeGroupName && (
                              <>
                                <span className="text-muted-foreground text-xs">/</span>
                                <Badge variant="secondary" className="text-xs">
                                  {outcomeGroupName}
                                </Badge>
                              </>
                            )}
                          {isExpress && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                #{index + 1}
                              </Badge>
                                )}
                              </div>

                          {/* Исход и коэффициент */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-baseline gap-2">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-xl font-bold text-foreground">{outcome.outcomeName}</span>
                              </div>
                              {outcome.value !== null && outcome.value !== undefined && (
                                <Badge variant="outline" className="text-base text-primary font-semibold border-primary/50">
                                  {outcome.value}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground uppercase">КФ</span>
                              <Badge className="font-mono text-base px-3 py-1 bg-primary">
                                    {outcome.coefficient}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                      {/* Общий коэффициент для экспресса */}
                      {isExpress && (
                      <div className="pt-3 mt-3 border-t">
                          <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                                Итоговый коэффициент
                              </span>
                          <Badge className="font-mono text-base px-3 py-1 bg-primary">
                            {outcomes.reduce((acc, o) => acc * (o.coefficient || 1), 1).toFixed(2)}
                          </Badge>
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Контент (текст), если есть */}
              {hasContent && (
                <div className="prose max-w-none">
                    <RichTextRenderer value={post.content} />
                                </div>
                              )}
                            </div>

            {/* Правая колонка: Результат прогноза + О прогнозисте */}
            <div className="lg:col-span-1 space-y-4">
              {/* Результат прогноза - компактно */}
              <PredictionResultLoader postId={String(post.id)} />

              {/* О прогнозисте */}
              <PredictorCard author={author} currentPostId={String(post.id)} />
                </div>
              </div>
        ) : (
          /* Обычный макет для не-прогнозов */
          <Prose>
            <RichTextRenderer value={post.content} />
          </Prose>
        )}

        {/* Комментарии */}
        <section className="space-y-3 pt-6 border-t">
          <h2 className="text-lg font-semibold">Комментарии ({comments.totalDocs})</h2>
          <CommentsTree postId={String(post.id)} comments={comments.docs as any[]} />
        </section>
      </Container>
    </Section>
  )
}

export async function generateStaticParams() {
  // Можно оставить пустым для dynamic; задел под ISR
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: await configPromise })
  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const post = docs[0]
  return {
    title: post ? `${post.title} — Пост` : 'Пост',
    description: post ? `${post.title}` : 'Детали поста',
  }
}
