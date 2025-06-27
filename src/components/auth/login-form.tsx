'use client'

import { SubmitButton } from '@/components/auth/submit-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

import { loginUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { LoginResponse } from '@/lib/auth'

export const LoginForm = () => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const res: LoginResponse = await loginUser({ email, password, rememberMe })

    setIsPending(false)

    if (res.error) {
      setError(res.error)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <form className="grid gap-6 my-6" onSubmit={handleSubmit}>
      <input
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        className="w-full focus:outline-none border-b pb-2 h-8"
        required
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        autoComplete="current-password"
        className="w-full focus:outline-none border-b pb-2 h-8"
        required
      />
      <div className="text-xs text-muted-foreground">
        <Link href="/forgot-password" className="hover:underline">
          Forgot password?
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="remember-me"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
          Remember me for 30 days
        </label>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm ml-2">{error}</AlertDescription>
        </Alert>
      )}

      <SubmitButton loading={isPending} text="Login" />
    </form>
  )
}
