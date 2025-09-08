import { Container, Section } from '@/components/ds'
import { NewPostForm } from './post-new-form'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const user = await getUser()
  if (!user) redirect('/login?error=auth')

  return (
    <Section>
      <Container className="space-y-6">
        <h1 className="text-2xl font-semibold">Новый пост</h1>
        <NewPostForm />
      </Container>
    </Section>
  )
}
