import { Section, Container, Prose } from '@/components/ds'
import { LogoutButton } from '@/components/auth/logout-button'

import Link from 'next/link'

import { getUser } from '@/lib/auth'

import type { User } from '@/payload-types'

export default async function Admin() {
  const user: User | null = await getUser()

  return (
    <Section>
      <Container className="grid gap-6 grid-cols-[1fr_auto]">
        <ToDelete user={user} />
        <LogoutButton />
      </Container>
    </Section>
  )
}

const ToDelete = ({ user }: { user: User | null }) => {
  return (
    <Prose isSpaced>
      <h3>Welcome, {user?.email}</h3>
      <p className="text-muted-foreground">
        This is the admin dashboard. You cannot access this page if you are not logged in.
      </p>
      <Link href="/">&larr; Back to home</Link>
    </Prose>
  )
}
