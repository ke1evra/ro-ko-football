import { Container, Section, Prose } from '@/components/ds'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CommentsTree } from './post-comments-tree'
import { UserAvatar } from '@/components/UserAvatar'

export const dynamic = 'force-dynamic'

export default async function PostPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const payload = await getPayload({ config: await configPromise })

  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })

  const post = docs[0]
  if (!post) return notFound()

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
            <UserAvatar user={post.author} size="md" />
            <div className="flex flex-col">
              <div className="text-sm font-medium">{post.author?.name || post.author?.email}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(post.createdAt), 'd MMMM yyyy', { locale: ru })}
              </div>
            </div>
          </div>
        </header>

        <Prose>
          <p>{String(post.content)}</p>
        </Prose>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Комментарии ({comments.totalDocs})</h2>
          <CommentsTree postId={post.id} comments={comments.docs as any[]} />
        </section>
      </Container>
    </Section>
  )
}

export async function generateStaticParams() {
  // Можно оставить пустым для dynamic; задел под ISR
  return []
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = params
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
