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
import { TrendingUp, Target, Trophy, Calendar } from 'lucide-react'
import Link from 'next/link'

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

  const post = docs[0]
  if (!post) return notFound()

  // Добавляем логирование для отладки
  console.log('[PostPage] Post data:', JSON.stringify(post, null, 2))
  console.log('[PostPage] Post type:', (post as any).postType)
  console.log('[PostPage] Prediction data:', (post as any).prediction)

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
            <UserAvatar user={typeof post.author === 'object' ? (post.author as any) : null} size="md" />
            <div className="flex flex-col">
              <div className="text-sm font-medium">
                {typeof post.author === 'object'
                  ? (post.author as any)?.name || (post.author as any)?.email
                  : ''}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(post.createdAt), 'd MMMM yyyy', { locale: ru })}
              </div>
            </div>
          </div>
        </header>

        {/* Макет для прогнозов: 2/3 контент + 1/3 детали */}
        {(post as any).postType === 'prediction' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Контент прогноза - 2/3 ширины */}
            <div className="lg:col-span-2">
              <Prose>
                <p>{String(post.content)}</p>
              </Prose>
            </div>

            {/* Детали прогноза - 1/3 ширины */}
            <div className="lg:col-span-1">
              {(post as any).prediction && (
                <Card className="border-primary/20 bg-primary/5 sticky top-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Детали прогноза
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Информация о матче */}
                    {(post as any).prediction.matchInfo && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-lg font-semibold">
                            {(post as any).prediction.matchInfo.home} — {(post as any).prediction.matchInfo.away}
                          </div>
                          {(post as any).prediction.matchInfo.competition && (
                            <div className="text-sm text-muted-foreground">
                              {(post as any).prediction.matchInfo.competition}
                            </div>
                          )}
                          {((post as any).prediction.matchInfo.date || (post as any).prediction.matchInfo.time) && (
                            <div className="text-sm text-muted-foreground">
                              {(post as any).prediction.matchInfo.date} {(post as any).prediction.matchInfo.time}
                            </div>
                          )}
                        </div>
                        {(post as any).fixtureId && (
                          <Link 
                            href={`/fixtures/${(post as any).fixtureId}`}
                            className="text-primary hover:underline flex items-center gap-1 text-sm"
                          >
                            <Calendar className="h-4 w-4" />
                            Перейти к матчу
                          </Link>
                        )}
                      </div>
                    )}

                    {/* События прогноза */}
                    {(post as any).prediction.events && (post as any).prediction.events.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          События прогноза
                        </h4>
                        <div className="space-y-2">
                          {(post as any).prediction.events.map((event: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                              <span className="font-medium">{event.event}</span>
                              <Badge variant="secondary" className="font-mono text-xs">
                                {event.coefficient}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* Обычный макет для не-прогнозов */
          <Prose>
            <p>{String(post.content)}</p>
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
