import { AppNav } from '@/components/app/nav'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'

import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'

type AuthLayoutProps = {
  children: ReactNode
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const user: User | null = await getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="flex flex-col min-h-screen">
      <AppNav />
      <section className="flex-1">{children}</section>
    </main>
  )
}
