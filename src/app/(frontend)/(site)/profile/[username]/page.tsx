import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, Twitter, Github } from 'lucide-react'

function pickAvatar(user: any): string | undefined {
  const rel = user?.avatar
  if (rel && typeof rel === 'object' && 'url' in rel && typeof rel.url === 'string') {
    return rel.url
  }
  if (typeof user?.avatarUrl === 'string') return user.avatarUrl
  return undefined
}

export default async function UserPublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const payload = await getPayload({ config: await configPromise })

  const { username } = await params

  // Пытаемся найти пользователя по username, если не найдено - по ID
  let users = await payload.find({
    collection: 'users',
    where: { username: { equals: username } },
    depth: 1,
    limit: 1,
  })

  // Если не найдено по username, пытаемся найти по ID
  if (users.docs.length === 0) {
    users = await payload.find({
      collection: 'users',
      where: { id: { equals: username } },
      depth: 1,
      limit: 1,
    })
  }

  if (users.docs.length === 0) {
    return (
      <Section>
        <Container className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Пользователь не найден</h1>
          <p className="text-muted-foreground mb-6">Пользователь не существует</p>
          <Link href="/">
            <Button>На главную</Button>
          </Link>
        </Container>
      </Section>
    )
  }

  const user = users.docs[0]
  const userId = user.id

  // Получаем посты пользователя
  const posts = await payload.find({
    collection: 'posts',
    where: { author: { equals: userId } },
    sort: '-publishedAt',
    limit: 10,
  })

  // Получаем комментарии пользователя
  const comments = await payload.find({
    collection: 'comments',
    where: { author: { equals: userId } },
    sort: '-createdAt',
    limit: 10,
  })

  // Получаем рассчитанные статистики прогнозов
  const predStats = await payload.find({
    collection: 'predictionStats',
    where: { author: { equals: userId } },
    sort: '-evaluatedAt',
    limit: 10,
    depth: 1,
  })

  // Суммарный рейтинг по очкам (MVP: outcome=2, exact=5)
  const totalPoints = predStats.docs.reduce(
    (acc: number, s: any) => acc + (Number(s?.scoring?.points) || 0),
    0,
  )

  const avatar = pickAvatar(user)
  const links = user.links || {}

  return (
    <Section>
      <Container className="space-y-8">
        {/* Заголовок профиля */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={String(user.name || user.username || '')}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-muted" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{user.name || user.username}</h1>
                <p className="text-lg text-muted-foreground">@{user.username}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Рейтинг</div>
                <div className="text-3xl font-bold">{totalPoints}</div>
              </div>
            </div>

            {/* Социальные сети */}
            {(links.website || links.twitter || links.github) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {links.website && (
                  <a href={links.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Globe className="h-4 w-4" />
                      Сайт
                    </Button>
                  </a>
                )}
                {links.twitter && (
                  <a
                    href={`https://twitter.com/${links.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <Twitter className="h-4 w-4" />
                      Twitter
                    </Button>
                  </a>
                )}
                {links.github && (
                  <a
                    href={`https://github.com/${links.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <Github className="h-4 w-4" />
                      GitHub
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Биография */}
        {user.bio && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground whitespace-pre-line">{user.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Статистика прогнозов */}
        {predStats.docs.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Статистика прогнозов</h2>
            <div className="space-y-3">
              {predStats.docs.map((s: any) => {
                const post = s?.post as any
                const title = post?.title || 'Прогноз'
                const href = post?.slug ? `/posts/${post.slug}` : undefined
                const sum = s?.summary || {}
                const hitRate =
                  typeof sum?.hitRate === 'number' ? `${Math.round(sum.hitRate * 100)}%` : '—'
                const roi = typeof sum?.roi === 'number' ? `${Math.round(sum.roi * 100)}%` : '—'
                return (
                  <Card key={s.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          {href ? (
                            <Link href={href} className="font-medium hover:underline text-lg">
                              {title}
                            </Link>
                          ) : (
                            <span className="font-medium text-lg">{title}</span>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {s.evaluatedAt ? new Date(s.evaluatedAt).toLocaleString('ru-RU') : ''}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs">Событий</div>
                            <div className="font-semibold">{sum?.total ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Выиграло</div>
                            <div className="font-semibold text-green-600">{sum?.won ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Проиграло</div>
                            <div className="font-semibold text-red-600">{sum?.lost ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Hit-rate</div>
                            <div className="font-semibold">{hitRate}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">ROI</div>
                            <div
                              className={`font-semibold ${typeof sum?.roi === 'number' && sum.roi > 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {roi}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Очков</div>
                            <div className="font-semibold">{s?.scoring?.points ?? 0}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Посты */}
        {posts.docs.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Посты</h2>
            <div className="space-y-3">
              {posts.docs.map((p) => (
                <Card key={p.id}>
                  <CardContent className="pt-6">
                    <Link href={`/posts/${p.slug}`} className="font-medium hover:underline text-lg">
                      {p.title}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleString('ru-RU') : ''}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Комментарии */}
        {comments.docs.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Комментарии</h2>
            <div className="space-y-3">
              {comments.docs.map((c) => (
                <Card key={c.id}>
                  <CardContent className="pt-6">
                    <p className="text-sm whitespace-pre-line mb-3">{c.content}</p>
                    <div className="text-xs text-muted-foreground">
                      К посту:{' '}
                      <Link
                        href={`/posts/${(c as any).post?.slug ?? ''}`}
                        className="underline hover:no-underline"
                      >
                        {typeof (c as any).post === 'object' && (c as any).post?.title
                          ? (c as any).post?.title
                          : 'Пост'}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Пусто */}
        {posts.docs.length === 0 && comments.docs.length === 0 && predStats.docs.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">Нет активности</p>
            </CardContent>
          </Card>
        )}
      </Container>
    </Section>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const payload = await getPayload({ config: await configPromise })

  const users = await payload.find({
    collection: 'users',
    where: { username: { equals: username } },
    limit: 1,
  })

  const user = users.docs[0]

  return {
    title: user ? `${user.name || user.username} — Профиль` : 'Профиль',
    description: user?.bio || `Профиль пользователя ${username}`,
  }
}
