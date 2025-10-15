import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'

function pickAvatar(user: any): string | undefined {
  const rel = user?.avatar
  if (rel && typeof rel === 'object' && 'url' in rel && typeof rel.url === 'string') {
    return rel.url
  }
  if (typeof user?.avatarUrl === 'string') return user.avatarUrl
  return undefined
}

export default async function UserPublicPage({ params }: { params: Promise<{ username: string }> }) {
  const payload = await getPayload({ config })

  const { username } = await params
  // Находим пользователя по username
  const users = await payload.find({
    collection: 'users',
    where: { username: { equals: username } },
    depth: 1,
    limit: 1,
  })

  if (users.docs.length === 0) {
    return <div className="container p-6">Пользователь не найден</div>
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

  return (
    <div className="container p-6 space-y-8">
      <div className="flex items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={String(user.name || user.username || '')} className="h-16 w-16 rounded-full" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-muted" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{user.name || user.username}</h1>
          <div className="text-sm text-muted-foreground">@{user.username}</div>
          <div className="mt-1">Рейтинг: {totalPoints}</div>
        </div>
      </div>

      {user.bio && (
        <div>
          <h2 className="text-xl font-semibold mb-2">О себе</h2>
          <p className="text-muted-foreground whitespace-pre-line">{user.bio}</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-2">Прогнозы — статистика</h2>
        <div className="space-y-2">
          {predStats.docs.map((s: any) => {
            const post = s?.post as any
            const title = post?.title || 'Прогноз'
            const href = post?.slug ? `/posts/${post.slug}` : undefined
            const sum = s?.summary || {}
            const hitRate = typeof sum?.hitRate === 'number' ? `${Math.round(sum.hitRate * 100)}%` : '—'
            const roi = typeof sum?.roi === 'number' ? `${Math.round(sum.roi * 100)}%` : '—'
            return (
              <div key={s.id} className="border rounded p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    {href ? (
                      <Link href={href} className="font-medium hover:underline">
                        {title}
                      </Link>
                    ) : (
                      <span className="font-medium">{title}</span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {s.evaluatedAt ? new Date(s.evaluatedAt).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="text-sm grid grid-cols-2 gap-x-6 gap-y-1 text-right min-w-[320px]">
                    <div className="text-muted-foreground">Событий</div>
                    <div>{sum?.total ?? '—'}</div>
                    <div className="text-muted-foreground">Выиграло</div>
                    <div>{sum?.won ?? '—'}</div>
                    <div className="text-muted-foreground">Проиграло</div>
                    <div>{sum?.lost ?? '—'}</div>
                    <div className="text-muted-foreground">Не определено</div>
                    <div>{sum?.undecided ?? '—'}</div>
                    <div className="text-muted-foreground">Hit‑rate</div>
                    <div>{hitRate}</div>
                    <div className="text-muted-foreground">ROI</div>
                    <div>{roi}</div>
                    <div className="text-muted-foreground">Очков</div>
                    <div>{s?.scoring?.points ?? 0}</div>
                  </div>
                </div>
              </div>
            )
          })}
          {predStats.docs.length === 0 && (
            <div className="text-muted-foreground">Нет рассчитанных прогнозов</div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Посты</h2>
        <div className="space-y-2">
          {posts.docs.map((p) => (
            <div key={p.id} className="border rounded p-3">
              <Link href={`/posts/${p.slug}`} className="font-medium hover:underline">
                {p.title}
              </Link>
              <div className="text-xs text-muted-foreground">
                {p.publishedAt ? new Date(p.publishedAt).toLocaleString() : ''}
              </div>
            </div>
          ))}
          {posts.docs.length === 0 && <div className="text-muted-foreground">Нет постов</div>}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Комментарии</h2>
        <div className="space-y-2">
          {comments.docs.map((c) => (
            <div key={c.id} className="border rounded p-3">
              <div className="text-sm whitespace-pre-line">{c.content}</div>
              <div className="text-xs text-muted-foreground mt-1">
                К посту:{' '}
                <Link href={`/posts/${(c as any).post?.slug ?? ''}`} className="underline">
                  {typeof (c as any).post === 'object' && (c as any).post?.title
                    ? (c as any).post?.title
                    : 'Пост'}
                </Link>
              </div>
            </div>
          ))}
          {comments.docs.length === 0 && (
            <div className="text-muted-foreground">Нет комментариев</div>
          )}
        </div>
      </div>
    </div>
  )
}
