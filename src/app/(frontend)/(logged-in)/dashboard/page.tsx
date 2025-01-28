import { Section, Container } from '@/components/craft'
import { getUser } from '@/lib/auth'
import { LogoutButton } from '@/components/auth/logout-button'

import type { User } from '@/payload-types'

export default async function Admin() {
  const user: User | null = await getUser()

  return (
    <Section>
      <Container className="grid gap-6">
        <h1>Welcome, {user?.email}</h1>
        <LogoutButton />
      </Container>
    </Section>
  )
}
