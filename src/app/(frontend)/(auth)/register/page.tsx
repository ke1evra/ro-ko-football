import { RegisterForm } from '@/components/auth/register-form'
import { Section, Container } from '@/components/ds'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

import Link from 'next/link'

import type { User } from '@/payload-types'

export default async function RegisterPage() {
  const user: User | null = await getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <Section>
      <Container>
        <h1>Sign Up</h1>
        <RegisterForm />
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <Link className="text-foreground" href="/login">
            Login Now
          </Link>
        </p>
      </Container>
    </Section>
  )
}
