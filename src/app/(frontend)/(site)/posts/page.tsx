import { Container, Section } from '@/components/ds'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(parseInt(params?.page || '1', 10) || 1, 1)

  const payload = await getPayload({ config: await configPromise })
  const result = await payload.find({
    collection: 'posts',
    limit: PAGE_SIZE,
    page,
    sort: '-createdAt',
    depth: 1,
  })

  return (
    <Section>
      <Container className="space-y-6">
        <h1 className="text-2xl font-semibold">Посты</h1>

        <div className="grid gap-4">
          {result.docs.map((post: any) => (
            <article key={post.id} className="border rounded-md p-4">
              <h2 className="text-lg font-medium">
                <Link href={`/posts/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <div className="text-sm text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString('ru-RU')} · {post?.author?.email}
              </div>
              {post.content && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {String(post.content).slice(0, 220)}
                </p>
              )}
            </article>
          ))}
        </div>

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
