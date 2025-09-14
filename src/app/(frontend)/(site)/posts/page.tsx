import { Container, Section } from '@/components/ds'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUser } from '@/lib/auth'
import { UserAvatar } from '@/components/UserAvatar'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const page = Math.max(parseInt(pageParam || '1', 10) || 1, 1)

  const payload = await getPayload({ config: await configPromise })
  const result = await payload.find({
    collection: 'posts',
    limit: PAGE_SIZE,
    page,
    sort: '-createdAt',
    depth: 2, // Увеличиваем depth для загрузки аватаров пользователей
  })

  const user = await getUser()

  return (
    <Section>
      <Container className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Посты</h1>
          {user ? (
            <Link
              href="/posts/new"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Новый пост
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-primary underline">
              Войти
            </Link>
          )}
        </div>

        {result.docs.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Постов пока нет.{' '}
            {user ? (
              <Link href="/posts/new" className="underline">
                Создать первый пост
              </Link>
            ) : (
              <>
                <Link href="/login" className="underline">
                  Войдите
                </Link>{' '}
                чтобы создать первый пост
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {result.docs.map((post) => {
              const author = typeof post.author === 'object' ? post.author : null
              return (
                <article key={post.id} className="border rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <UserAvatar user={author} size="md" />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-medium">
                        <Link href={`/posts/${post.slug}`} className="hover:underline">
                          {post.title}
                        </Link>
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{author?.name || author?.email}</span>
                        <span>·</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                      {post.content && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                          {String(post.content).slice(0, 220)}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <Pagination current={page} totalPages={result.totalPages} />
      </Container>
    </Section>
  )
}

function Pagination({ current, totalPages }: { current: number; totalPages: number }) {
  if (totalPages <= 1) return null
  const prev = current > 1 ? current - 1 : null
  const next = current < totalPages ? current + 1 : null
  return (
    <nav className="flex items-center justify-between">
      <div>
        {prev ? (
          <Link className="underline" href={`/posts?page=${prev}`}>
            ← Новее
          </Link>
        ) : (
          <span className="text-muted-foreground">← Новее</span>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        Стр. {current} из {totalPages}
      </div>
      <div>
        {next ? (
          <Link className="underline" href={`/posts?page=${next}`}>
            Старее →
          </Link>
        ) : (
          <span className="text-muted-foreground">Старее →</span>
        )}
      </div>
    </nav>
  )
}
