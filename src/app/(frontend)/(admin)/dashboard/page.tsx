import { Section, Container } from '@/components/ds'
import { LogoutButton } from '@/components/auth/logout-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertCircle, User as UserIcon } from 'lucide-react'

import Link from 'next/link'

import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

import type { User } from '@/payload-types'

export default async function Admin() {
  const user: User | null = await getUser()

  // Double protection - middleware + server component check
  if (!user) {
    redirect('/login')
  }

  // Calculate account age
  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date()
  const now = new Date()
  const accountAgeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <>
      <Section>
        <Container>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <LogoutButton />
          </div>

          <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <UserProfile user={user} accountAgeDays={accountAgeDays} />
            </div>

            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Account Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account type</span>
                    <span className="font-medium capitalize">{user.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account age</span>
                    <span className="font-medium">{accountAgeDays} days</span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
                <div className="space-y-2">
                  <Link href="/" className="block text-primary hover:underline">
                    Home
                  </Link>
                  <Link href="#" className="block text-primary hover:underline">
                    Account Settings
                  </Link>
                  <Link href="#" className="block text-primary hover:underline">
                    Help & Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}

const UserProfile = ({ user, accountAgeDays }: { user: User; accountAgeDays: number }) => {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 rounded-full p-3">
          <UserIcon className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Welcome, {user.email}</h2>
          <p className="text-muted-foreground text-sm">
            Member for {accountAgeDays} {accountAgeDays === 1 ? 'day' : 'days'}
          </p>
        </div>
      </div>

      <p className="text-muted-foreground">
        This is your secure dashboard where you can manage your account settings and access
        protected features.
      </p>
    </div>
  )
}
