import { Section, Container } from '@/components/ds'
import { LoginForm } from '@/components/auth/login-form'
import { AuthBox } from '@/components/auth/auth-box'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

import Link from 'next/link'
import { CheckCircle, AlertCircle } from 'lucide-react'

import type { User } from '@/payload-types'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const user: User | null = await getUser()

  if (user) {
    redirect('/dashboard')
  }

  const params = await searchParams

  const getSuccessMessage = (type: string) => {
    switch (type) {
      case 'email-verified':
        return 'Email verified successfully! You can now sign in.'
      default:
        return 'Success!'
    }
  }

  const getErrorMessage = (type: string) => {
    switch (type) {
      case 'invalid-verification-link':
        return 'Invalid verification link. Please try again.'
      case 'verification-link-expired':
        return 'Verification link has expired. Please request a new one.'
      case 'verification-failed':
        return 'Email verification failed. Please try again.'
      default:
        return 'An error occurred. Please try again.'
    }
  }

  return (
    <Section>
      <Container>
        <AuthBox>
          <h1>Login</h1>
          
          {params.success && (
            <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {getSuccessMessage(params.success)}
              </AlertDescription>
            </Alert>
          )}

          {params.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {getErrorMessage(params.error)}
              </AlertDescription>
            </Alert>
          )}

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
