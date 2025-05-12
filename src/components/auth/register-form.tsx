'use client'

import { SubmitButton } from './submit-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

import { registerUser } from '@/lib/auth'
import { validatePassword, validateEmail } from '@/lib/validation'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import type { RegisterResponse } from '@/lib/auth'

export const RegisterForm = () => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(
    null,
  )
  const router = useRouter()

  // Validate password as user types
  useEffect(() => {
    if (!password) {
      setPasswordFeedback(null)
      setPasswordStrength(null)
      return
    }

    const validation = validatePassword(password)

    if (!validation.valid) {
      setPasswordFeedback(validation.error || null)
      // Determine password strength
      if (password.length < 8) {
        setPasswordStrength('weak')
      } else if (
        password.length >= 8 &&
        (/[A-Z]/.test(password) || /[a-z]/.test(password)) &&
        /[0-9]/.test(password)
      ) {
        setPasswordStrength('medium')
      }
    } else {
      setPasswordFeedback(null)
      setPasswordStrength('strong')
    }
  }, [password])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    // Client-side validation first
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Please enter a valid email')
      setIsPending(false)
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Please enter a valid password')
      setIsPending(false)
      return
    }

    const res: RegisterResponse = await registerUser({ email, password })

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
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        placeholder="Email"
        className="w-full focus:outline-none border-b pb-2"
        required
      />

      <input
        type="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        placeholder="Password"
        className="w-full focus:outline-none border-b pb-2"
        required
      />

      {password && (
        <div className="mt-1">
          <div className="flex gap-1 h-1 mt-1">
            <div
              className={`h-full w-1/3 rounded-l ${passwordStrength ? 'bg-red-500' : 'bg-gray-200'}`}
            ></div>
            <div
              className={`h-full w-1/3 ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-500' : 'bg-gray-200'}`}
            ></div>
            <div
              className={`h-full w-1/3 rounded-r ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'}`}
            ></div>
          </div>
          {passwordFeedback && <p className="text-xs text-amber-600 mt-1">{passwordFeedback}</p>}
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-2">
        Password must be at least 8 characters with uppercase, lowercase, number, and special
        character.
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm ml-2">{error}</AlertDescription>
        </Alert>
      )}

      <SubmitButton loading={isPending} text="Sign Up" />
    </form>
  )
}
