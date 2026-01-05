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
import { UserAvatarLink } from '@/components/UserAvatarLink'
import type { Post, User } from '@/payload-types'

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
            <UserAvatarLink user={author} size="md" />
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
            {/* Результат прогноза и информация о прогнозисте */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Результат - 2/3 ширины */}
              <div className="lg:col-span-2">
                <PredictionResultLoader postId={String(post.id)} />
              </div>

              {/* Информация о прогнозисте - 1/3 ширины */}
              <div className="lg:col-span-1">
                <PredictorCard author={author} currentPostId={String(post.id)} />
              </div>
            </div>

            {/* Вариант 1: Только инфа (без текста) - на всю ширину */}
            {layoutVariant === 'info-only' && outcomes.length > 0 && (
              <div className="space-y-6">
                {/* Единая карточка: матч + исходы */}
                <Card className="border-none shadow-lg overflow-hidden">
                  {/* Информация о матче - Hero секция */}
                  {outcomes[0].matchInfo && (
                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 border-b">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                            <Calendar className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium text-primary">
                              {outcomes[0].matchInfo.competition || 'Матч'}
                            </span>
                          </div>
                          <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                            {outcomes[0].matchInfo.home}
                            <span className="text-muted-foreground mx-3">—</span>
                            {outcomes[0].matchInfo.away}
                          </h2>
                          {(outcomes[0].matchInfo.date || outcomes[0].matchInfo.time) && (
                            <p className="text-sm text-muted-foreground">
                              {outcomes[0].matchInfo.date} {outcomes[0].matchInfo.time}
                            </p>
                          )}
                        </div>
                        {outcomes[0].fixtureId && (
                          <Link href={getMatchUrl(outcomes[0])}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Calendar className="h-4 w-4" />К матчу
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Заголовок прогноза */}
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        {isExpress ? 'Экспресс-прогноз' : 'Прогноз'}
                      </CardTitle>
                      {isExpress && (
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                          {outcomes.length}{' '}
                          {outcomes.length === 1
                            ? 'исход'
                            : outcomes.length < 5
                              ? 'исхода'
                              : 'исходов'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {outcomes.map((outcome, index) => (
                        <div
                          key={outcome.id || index}
                          className="group relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background p-5 transition-all hover:border-primary/40 hover:shadow-md"
                        >
                          {/* Номер исхода для экспресса */}
                          {isExpress && (
                            <div className="absolute top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                              {index + 1}
                            </div>
                          )}

                          <div
                            className={`flex flex-col items-center text-center ${isExpress ? 'pl-10 pr-5 py-5' : 'p-6'}`}
                          >
                            {/* Категория маркета - заметная */}
                            <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 bg-primary/15 border border-primary/30 rounded-full">
                              <Target className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                {outcome.marketName}
                              </span>
                            </div>

                            {/* Исход и коэффициент - центрированно */}
                            <div className="flex items-center justify-center gap-4">
                              <div className="text-2xl font-bold text-foreground leading-tight">
                                {outcome.outcomeName}
                                {outcome.value !== null && outcome.value !== undefined && (
                                  <span className="ml-2 text-primary">{outcome.value}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-muted-foreground uppercase">
                                  КФ
                                </span>
                                <div className="flex items-center justify-center rounded-lg bg-primary px-5 py-3 shadow-md">
                                  <span className="font-mono text-3xl font-bold text-primary-foreground tabular-nums">
                                    {outcome.coefficient}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Общий коэффициент для экспресса */}
                      {isExpress && (
                        <div className="mt-6 rounded-xl border-2 border-primary bg-primary/5 p-5">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Итоговый коэффициент
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Произведение всех коэффициентов
                              </p>
                            </div>
                            <div className="flex items-center justify-center min-w-[5rem] rounded-lg bg-primary px-5 py-3 shadow-md">
                              <span className="font-mono text-2xl font-bold text-primary-foreground">
                                {outcomes
                                  .reduce((acc, o) => acc * (o.coefficient || 1), 1)
                                  .toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                                className="flex flex-col gap-2 p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30 shadow-sm"
                              >
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                  {outcome.marketName}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-foreground">
                                    {outcome.outcomeName}
                                    {outcome.value !== null && outcome.value !== undefined
                                      ? ` ${outcome.value}`
                                      : ''}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">КФ</span>
                                    <Badge
                                      variant="default"
                                      className="font-mono text-sm px-2 py-0.5 bg-primary"
                                    >
                                      {outcome.coefficient}
                                    </Badge>
                                  </div>
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
