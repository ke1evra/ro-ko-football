import { Container, Section } from '@/components/ds'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUser } from '@/lib/auth'
import { UserAvatarLink } from '@/components/UserAvatarLink'
import { extractTextFromLexical, truncateText } from '@/lib/lexical-utils'
import { PostsViewToggle } from '@/components/posts/PostsViewToggle'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

function formatMatchDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return dateString
  }
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>
}) {
  const { page: pageParam, view: viewParam } = await searchParams
  const page = Math.max(parseInt(pageParam || '1', 10) || 1, 1)
  const view = viewParam === 'grid' ? 'grid' : 'list'

  const payload = await getPayload({ config: await configPromise })
  const result = await payload.find({
    collection: 'posts',
    limit: PAGE_SIZE,
    page,
    sort: '-createdAt',
    depth: 3,
  })

  const user = await getUser()

  return (
    <Section>
      <Container className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Посты</h1>
          <div className="flex items-center gap-4">
            <PostsViewToggle currentView={view} currentPage={page} />
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
          <div
            className={
              view === 'grid'
                ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid gap-4'
            }
          >
            {result.docs.map((post) => {
              const author = typeof post.author === 'object' ? post.author : null
              return (
                <article
                  key={post.id}
                  className={
                    view === 'grid'
                      ? 'border rounded-md py-6 px-4 flex flex-col h-full hover:shadow-md transition-shadow relative overflow-hidden'
                      : 'border rounded-md p-4'
                  }
                >
                  {view === 'grid' &&
                    typeof post.prediction === 'object' &&
                    post.prediction?.outcomes?.[0]?.coefficient && (
                      <div className="absolute top-0 right-0 bg-black/70 text-white px-3 py-1 rounded-bl-md text-sm font-semibold">
                        {post.prediction.outcomes[0].coefficient}
                      </div>
                    )}
                  {view === 'grid' ? (
                    <div className="flex flex-col h-full">
                      <h2 className="text-base font-medium line-clamp-2 mb-1">
                        <Link href={`/posts/${post.slug}`} className="hover:underline">
                          {post.title}
                        </Link>
                      </h2>
                      {typeof post.prediction === 'object' &&
                        post.prediction?.outcomes?.[0]?.matchInfo?.startTime && (
                          <div className="text-xs text-muted-foreground mb-2">
                            <span className="font-medium">Начало:</span>{' '}
                            {post.prediction.outcomes[0].matchInfo.startTime &&
                              formatMatchDate(post.prediction.outcomes[0].matchInfo.startTime)}
                          </div>
                        )}
                      {post.content && (
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">
                          {truncateText(extractTextFromLexical(post.content), 150)}
                        </p>
                      )}
                      <div className="flex flex-col gap-3 mt-auto pt-3 border-t">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <UserAvatarLink user={author} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{author?.name || author?.email}</div>
                            <div className="text-xs">
                              {new Date(post.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/posts/${post.slug}`}
                          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-2 text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          Перейти
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <UserAvatarLink user={author} size="md" />
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
                            {truncateText(extractTextFromLexical(post.content), 220)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}

        <Pagination current={page} totalPages={result.totalPages} view={view} />
      </Container>
    </Section>
  )
}

function Pagination({
  current,
  totalPages,
  view,
}: {
  current: number
  totalPages: number
  view: string
}) {
  if (totalPages <= 1) return null
  const prev = current > 1 ? current - 1 : null
  const next = current < totalPages ? current + 1 : null
  const viewParam = view === 'grid' ? '&view=grid' : ''
  return (
    <nav className="flex items-center justify-between">
      <div>
        {prev ? (
          <Link className="underline" href={`/posts?page=${prev}${viewParam}`}>
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
          <Link className="underline" href={`/posts?page=${next}${viewParam}`}>
            Старее →
          </Link>
        ) : (
          <span className="text-muted-foreground">Старее →</span>
        )}
      </div>
    </nav>
  )
}
