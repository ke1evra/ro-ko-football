'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/lib/auth'
import { Section, Container } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { AuthBox } from '@/components/auth/auth-box'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await forgotPassword(email)
      
      if (result.success) {
        setIsSuccess(true)
        toast.success('Email Sent!', {
          description: 'If an account with that email exists, we\'ve sent you a password reset link.',
        })
      } else {
        switch (result.errorCode) {
          case 'INVALID_EMAIL':
            toast.error('Invalid Email', {
              description: result.error || 'Please enter a valid email address',
            })
            break
          default:
            toast.error('Request Failed', {
              description: result.error || 'Something went wrong. Please try again.',
            })
        }
      }
    } catch (_error) {
      toast.error('Request Failed', {
        description: 'Something went wrong. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Section>
      <Container>
        <AuthBox>
          <h1>Forgot Password</h1>
          <p className="text-muted-foreground mb-4">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {isSuccess ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Check your email for the password reset link.
              </p>
              <Link
                href="/login"
                className="text-foreground hover:underline"
              >
                Return to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-6 my-6">
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full focus:outline-none border-b pb-2 h-8"
                required
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <p className="text-muted-foreground">
                Remember your password?{' '}
                <Link className="text-foreground" href="/login">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </AuthBox>
      </Container>
    </Section>
  )
}