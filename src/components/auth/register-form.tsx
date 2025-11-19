'use client'

import { SubmitButton } from './submit-button'
import { toast } from 'sonner'

import { registerUser } from '@/lib/auth'
import { validatePassword, validateEmail } from '@/lib/validation'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { PasswordInput } from '@/components/ui/password-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { RegisterResponse } from '@/lib/auth'

export const RegisterForm = () => {
  const [isPending, setIsPending] = useState(false)
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

    // Client-side validation first
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      toast.error('Неверный email', {
        description: emailValidation.error || 'Введите корректный email',
      })
      setIsPending(false)
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      toast.error('Неверный пароль', {
        description: passwordValidation.error || 'Введите корректный пароль',
      })
      setIsPending(false)
      return
    }

    const res: RegisterResponse = await registerUser({ email, password })

    setIsPending(false)

    if (res.error) {
      // Show error toast with specific error message
      switch (res.errorCode) {
        case 'EMAIL_EXISTS':
          toast.error('Email уже существует', {
            description:
              'Аккаунт с таким email уже существует. Войдите или используйте другой email.',
          })
          break
        case 'VALIDATION_ERROR':
          toast.error('Ошибка валидации', {
            description: res.error,
          })
          break
        case 'REGISTRATION_FAILED':
          toast.error('Регистрация не удалась', {
            description: 'Не удалось создать аккаунт. Попробуйте снова.',
          })
          break
        default:
          toast.error('Регистрация не удалась', {
            description: res.error || 'Что-то пошло не так',
          })
      }
    } else {
      toast.success('Аккаунт создан!', {
        description:
          'Проверьте email для верификации аккаунта. Перенаправление на панель управления...',
      })
      router.push('/dashboard')
    }
  }

  return (
    <form className="grid gap-6 my-6" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="email">Электронная почта</Label>
        <Input
          id="email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="Электронная почта"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Пароль</Label>
        <PasswordInput
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Пароль"
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

        <div className="text-xs text-muted-foreground">
          Пароль должен содержать не менее 8 символов, включая заглавные и строчные буквы, цифры и
          специальные символы.
        </div>
      </div>

      <SubmitButton loading={isPending} text="Зарегистрироваться" />
    </form>
  )
}
