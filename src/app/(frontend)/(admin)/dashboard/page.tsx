import { Section, Container, Prose } from '@/components/ds'
import { LogoutButton } from '@/components/auth/logout-button'
import { AccountStats } from '@/components/dashboard/account-stats'
import { UserProfileCard } from '@/components/dashboard/user-profile-card'
import { EmailVerificationStatus } from '@/components/dashboard/email-verification-status'
import { SecurityOverview } from '@/components/dashboard/security-overview'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'

import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const user: User | null = await getUser()

  if (!user) {
    redirect('/login')
  }

  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date()
  const now = new Date()
  const accountAgeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Prose>
              <h1>Dashboard</h1>
              <p>Welcome back, {user.email.split('@')[0]}!</p>
            </Prose>
          </div>
          <LogoutButton />
        </div>

        {/* Account Stats Overview */}
        <div className="mb-8">
          <AccountStats user={user} accountAgeDays={accountAgeDays} />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Profile and Email Verification */}
          <div className="lg:col-span-2 space-y-6">
            <UserProfileCard user={user} accountAgeDays={accountAgeDays} />

            {/* Email Verification - Only show if not verified */}
            {!user.emailVerified && <EmailVerificationStatus user={user} />}
          </div>

          {/* Right Column - Security Overview */}
          <div className="lg:col-span-1">
            <SecurityOverview user={user} />
          </div>
        </div>

        {/* Email Verification for verified users - smaller card */}
        {user.emailVerified && (
          <div className="mt-6">
            <div className="max-w-md">
              <EmailVerificationStatus user={user} />
            </div>
          </div>
        )}
      </Container>
    </Section>
  )
}
