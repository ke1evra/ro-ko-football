'use client'

import { SubmitButton } from '@/components/auth/submit-button'

import { loginUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { LoginResponse } from '@/lib/auth'

export const LoginForm = () => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const res: LoginResponse = await loginUser({ email, password })

    setIsPending(false)

    if (res.error) {
      setError(res.error || 'Email or password is incorrect')
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
        className="focus:outline-none border-b pb-2"
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        autoComplete="current-password"
        className="focus:outline-none border-b pb-2"
      />
      {error && <p className="text-red-500">{error}</p>}
      <SubmitButton loading={isPending} text="Login" />
    </form>
  )
}
