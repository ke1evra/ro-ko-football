'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPassword, getUser } from '@/lib/auth'
import { Section, Container } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { AuthBox } from '@/components/auth/auth-box'
import { toast } from 'sonner'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')

  const searchParams = useSearchParams()
  const router = useRouter()

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getUser()
        if (user) {
          toast.info('Already Signed In', {
            description: 'You are already signed in. Redirecting to dashboard...',
          })
          router.push('/dashboard')
        }
      } catch (_error) {
        // User is not authenticated, continue with reset flow
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    const emailParam = searchParams.get('email')

    if (tokenParam && emailParam) {
      setToken(tokenParam)
      setEmail(decodeURIComponent(emailParam))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password !== confirmPassword) {
      toast.error('Passwords do not match', {
        description: 'Please make sure both passwords are the same.',
      })
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      toast.error('Password too short', {
        description: 'Password must be at least 8 characters long.',
      })
      setIsLoading(false)
      return
    }

    try {
      const result = await resetPassword(token, email, password)

      if (result.success) {
        setIsSuccess(true)
        toast.success('Password Reset Successfully!', {
          description: 'You can now sign in with your new password.',
        })
      } else {
        switch (result.errorCode) {
          case 'INVALID_OR_EXPIRED_TOKEN':
            toast.error('Invalid or Expired Link', {
              description: 'This reset link has expired. Please request a new one.',
            })
            break
          case 'INVALID_PASSWORD':
            toast.error('Invalid Password', {
              description: result.error || 'Please enter a valid password',
            })
            break
          default:
            toast.error('Reset Failed', {
              description: result.error || 'Something went wrong. Please try again.',
            })
        }
      }
    } catch (_error) {
      toast.error('Reset Failed', {
        description: 'Something went wrong. Please try again.',
      })
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
              <Link href="/forgot-password" className="text-foreground hover:underline">
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
          <p className="text-muted-foreground mb-4">Enter your new password below.</p>

          {isSuccess ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">Your password has been reset successfully.</p>
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
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

              <Button type="submit" className="w-full" disabled={isLoading}>
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
    <Suspense
      fallback={
        <Section>
          <Container>
            <AuthBox>
              <h1>Loading...</h1>
            </AuthBox>
          </Container>
        </Section>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
