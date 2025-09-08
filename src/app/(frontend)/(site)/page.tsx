import { Container, Section } from '@/components/ds'
import Link from 'next/link'

export default async function Home() {
  return (
    <Section>
      <Container className="space-y-4">
        <h1 className="text-2xl font-semibold">Добро пожаловать</h1>
        <p className="text-muted-foreground">Перейдите в ленту постов, чтобы посмотреть контент сообщества.</p>
        <div>
          <Link className="underline" href="/posts">Перейти к постам →</Link>
        </div>
      </Container>
    </Section>
  )
}
