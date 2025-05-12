'use client'

import { SubmitButton } from './submit-button'

import { registerUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { RegisterResponse } from '@/lib/auth'

export const RegisterForm = () => {
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

    const res: RegisterResponse = await registerUser({ email, password })

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
        autoComplete="email"
        placeholder="Email"
        className="focus:outline-none"
      />
      <input
        type="password"
        name="password"
        autoComplete="new-password"
        placeholder="Password"
        className="focus:outline-none"
      />
      {error && <p className="text-red-500">{error}</p>}
      <SubmitButton loading={isPending} text="Sign Up" />
    </form>
  )
}
