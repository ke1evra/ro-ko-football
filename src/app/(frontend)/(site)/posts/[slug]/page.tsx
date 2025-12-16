import { Container, Section, Prose } from '@/components/ds'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CommentsTree } from './post-comments-tree'
import { UserAvatar } from '@/components/UserAvatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Target, Calendar } from 'lucide-react'
import Link from 'next/link'
import RichTextRenderer from '@/components/RichTextRenderer'
import { generateMatchUrl, generateLegacyFixtureUrl } from '@/lib/match-url-utils'
import type { Post, User } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: await configPromise })

  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })

  const post = docs[0] as Post
  if (!post) return notFound()

  const isPrediction = post.postType === 'prediction'
  const author = typeof post.author === 'object' ? (post.author as User) : null
  const outcomes = isPrediction && post.prediction?.outcomes ? post.prediction.outcomes : []

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
        <header className="space-y-4">
          <h1 className="text-2xl font-semibold">{post.title}</h1>
          <div className="flex items-center gap-3">
            <UserAvatar user={author} size="md" />
            <div className="flex flex-col">
              <div className="text-sm font-medium">{author?.name || author?.email}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(post.createdAt), 'd MMMM yyyy', { locale: ru })}
              </div>
            </div>
          </div>
        </header>

        {/* Макет для прогнозов */}
        {isPrediction ? (
          <>
            {/* Вариант 1: Только инфа (без текста) - на всю ширину */}
            {layoutVariant === 'info-only' && outcomes.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Детали прогноза
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Информация о матче */}
                    {outcomes[0].matchInfo && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-xl font-semibold">
                            {outcomes[0].matchInfo.home} — {outcomes[0].matchInfo.away}
                          </div>
                          {outcomes[0].matchInfo.competition && (
                            <div className="text-sm text-muted-foreground">
                              {outcomes[0].matchInfo.competition}
                            </div>
                          )}
                          {(outcomes[0].matchInfo.date || outcomes[0].matchInfo.time) && (
                            <div className="text-sm text-muted-foreground">
                              {outcomes[0].matchInfo.date} {outcomes[0].matchInfo.time}
                            </div>
                          )}
                        </div>
                        {outcomes[0].fixtureId && (
                          <Link
                            href={getMatchUrl(outcomes[0])}
                            className="text-primary hover:underline flex items-center gap-1 text-sm"
                          >
                            <Calendar className="h-4 w-4" />
                            Перейти к матчу
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Исходы */}
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        {isExpress ? `Экспресс (${outcomes.length} исхода)` : 'Исход прогноза'}
                      </h4>
                      <div className="space-y-2">
                        {outcomes.map((outcome, index) => (
                          <div
                            key={outcome.id || index}
                            className="flex flex-col gap-1 p-3 bg-background rounded border"
                          >
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">
                              {outcome.marketName}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {outcome.outcomeName}
                                {outcome.value !== null && outcome.value !== undefined
                                  ? ` ${outcome.value}`
                                  : ''}
                              </span>
                              <Badge variant="secondary" className="font-mono text-xs">
                                {outcome.coefficient}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                      {isExpress && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Общий коэффициент:</span>
                            <Badge variant="default" className="font-mono">
                              {outcomes
                                .reduce((acc, o) => acc * (o.coefficient || 1), 1)
                                .toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Вариант 2 и 3: С текстом - 2/3 контент + 1/3 детали */}
            {layoutVariant !== 'info-only' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Контент прогноза - 2/3 ширины */}
                <div className="lg:col-span-2">
                  <Prose>
                    <RichTextRenderer value={post.content} />
                  </Prose>
                </div>

                {/* Детали прогноза - 1/3 ширины */}
                <div className="lg:col-span-1">
                  {outcomes.length > 0 && (
                    <Card className="border-primary/20 bg-primary/5 sticky top-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          Детали прогноза
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Информация о матче */}
                        {outcomes[0].matchInfo && (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="text-lg font-semibold">
                                {outcomes[0].matchInfo.home} — {outcomes[0].matchInfo.away}
                              </div>
                              {outcomes[0].matchInfo.competition && (
                                <div className="text-sm text-muted-foreground">
                                  {outcomes[0].matchInfo.competition}
                                </div>
                              )}
                              {(outcomes[0].matchInfo.date || outcomes[0].matchInfo.time) && (
                                <div className="text-sm text-muted-foreground">
                                  {outcomes[0].matchInfo.date} {outcomes[0].matchInfo.time}
                                </div>
                              )}
                            </div>
                            {outcomes[0].fixtureId && (
                              <Link
                                href={getMatchUrl(outcomes[0])}
                                className="text-primary hover:underline flex items-center gap-1 text-sm"
                              >
                                <Calendar className="h-4 w-4" />
                                Перейти к матчу
                              </Link>
                            )}
                          </div>
                        )}

                        {/* Исходы прогноза */}
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            {isExpress ? `Экспресс (${outcomes.length})` : 'Исход прогноза'}
                          </h4>
                          <div className="space-y-2">
                            {outcomes.map((outcome, index) => (
                              <div
                                key={outcome.id || index}
                                className="flex flex-col gap-1 p-3 bg-background rounded border"
                              >
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                                  {outcome.marketName}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {outcome.outcomeName}
                                    {outcome.value !== null && outcome.value !== undefined
                                      ? ` ${outcome.value}`
                                      : ''}
                                  </span>
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {outcome.coefficient}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Общий коэффициент для экспресса */}
                          {isExpress && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">Общий кф:</span>
                                <Badge variant="default" className="font-mono">
                                  {outcomes
                                    .reduce((acc, o) => acc * (o.coefficient || 1), 1)
                                    .toFixed(2)}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Обычный макет для не-прогнозов */
          <Prose>
            <RichTextRenderer value={post.content} />
          </Prose>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Комментарии ({comments.totalDocs})</h2>
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
