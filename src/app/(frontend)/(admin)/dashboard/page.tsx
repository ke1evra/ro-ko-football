import { Section, Container, Prose } from '@/components/ds'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'

import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const user: User | null = await getUser()

  if (!user) {
    redirect('/login')
  }

  return <ToDelete user={user} />
}

const ToDelete = ({ user }: { user: User }) => {
  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date()
  const now = new Date()
  const accountAgeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  return (
    <Section>
      <Container className="font-mono space-y-4">
        <h1>Payload Starter Dashboard</h1>
        <p>
          You are: <span className="text-orange-500">{user.email}</span>
        </p>
        <p>Your created your account on {createdAt.toLocaleDateString()}</p>
        <p>Your account is {accountAgeDays} days old</p>
        <p>You have the role of {user.role}</p>
      </Container>
    </Section>
  )
}
