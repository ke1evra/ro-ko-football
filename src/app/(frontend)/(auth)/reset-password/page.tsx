'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/auth'
import { Section, Container } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { AuthBox } from '@/components/auth/auth-box'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')

  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    const emailParam = searchParams.get('email')
    
    if (tokenParam && emailParam) {
      setToken(tokenParam)
      setEmail(decodeURIComponent(emailParam))
    } else {
      setMessage('Invalid reset link. Please request a new password reset.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long.')
      setIsLoading(false)
      return
    }

    try {
      const result = await resetPassword(token, email, password)
      
      if (result.success) {
        setIsSuccess(true)
        setMessage('Your password has been successfully reset. You can now sign in with your new password.')
      } else {
        setMessage(result.error || 'Something went wrong. Please try again or request a new reset link.')
      }
    } catch (_error) {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <Section>
        <Container>
          <AuthBox>
            <h1>Invalid Reset Link</h1>
            <p className="text-muted-foreground mb-4">
              This password reset link is invalid or has expired.
            </p>
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-foreground hover:underline"
              >
                Request a new password reset
              </Link>
            </div>
          </AuthBox>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container>
        <AuthBox>
          <h1>Reset Password</h1>
          <p className="text-muted-foreground mb-4">
            Enter your new password below.
          </p>

          {isSuccess ? (
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 p-4 dark:bg-green-950">
                <div className="text-sm text-green-800 dark:text-green-200">
                  {message}
                </div>
              </div>
              <div className="text-center">
                <Button asChild>
                  <Link href="/login">
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-6 my-6">
              <input
                type="email"
                value={email}
                disabled
                className="w-full focus:outline-none border-b pb-2 h-8 bg-muted text-muted-foreground"
              />

              <input
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full focus:outline-none border-b pb-2 h-8"
                required
              />

              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full focus:outline-none border-b pb-2 h-8"
                required
              />

              {message && !isSuccess && (
                <div className="rounded-md bg-red-50 p-4 dark:bg-red-950">
                  <div className="text-sm text-red-800 dark:text-red-200">
                    {message}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>

              <p className="text-muted-foreground">
                <Link className="text-foreground" href="/login">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </AuthBox>
      </Container>
    </Section>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Section>
        <Container>
          <AuthBox>
            <h1>Loading...</h1>
          </AuthBox>
        </Container>
      </Section>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}