import { Section, Container } from '@/components/ds'
import { LoginForm } from '@/components/auth/login-form'
import { AuthBox } from '@/components/auth/auth-box'

import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

import Link from 'next/link'

import type { User } from '@/payload-types'

export default async function LoginPage() {
  const user: User | null = await getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <Section>
      <Container>
        <AuthBox>
          <h1>Login</h1>
          <LoginForm />
          <p className="text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link className="text-foreground" href="/register">
              Sign Up Now
            </Link>
          </p>
        </AuthBox>
      </Container>
    </Section>
  )
}
