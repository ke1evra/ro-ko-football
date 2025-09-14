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

export default async function UserPublicPage({ params }: { params: { username: string } }) {
  const payload = await getPayload({ config })

  // Находим пользователя по username
  const users = await payload.find({
    collection: 'users',
    where: { username: { equals: params.username } },
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
          <div className="mt-1">Рейтинг: {user.rating ?? 0}</div>
        </div>
      </div>

      {user.bio && (
        <div>
          <h2 className="text-xl font-semibold mb-2">О себе</h2>
          <p className="text-muted-foreground whitespace-pre-line">{user.bio}</p>
        </div>
      )}

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
