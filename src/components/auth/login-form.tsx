'use client'

import { SubmitButton } from '@/components/auth/submit-button'
import Link from 'next/link'
import { toast } from 'sonner'

import { loginUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PasswordInput } from '@/components/ui/password-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

import type { LoginResponse } from '@/lib/auth'

export const LoginForm = () => {
  const [isPending, setIsPending] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)

    const res: LoginResponse = await loginUser({ email, password, rememberMe })

    setIsPending(false)

    if (res.error) {
      // Show error toast with specific error message
      switch (res.errorCode) {
        case 'INVALID_EMAIL':
          toast.error('Неверный email', {
            description: res.error,
          })
          break
        case 'INVALID_CREDENTIALS':
          toast.error('Неверные учетные данные', {
            description: 'Введенный email или пароль неверны',
          })
          break
        case 'AUTH_ERROR':
          toast.error('Ошибка аутентификации', {
            description: 'Попробуйте позже',
          })
          break
        default:
          toast.error('Вход не удался', {
            description: res.error || 'Что-то пошло не так',
          })
      }
    } else {
      toast.success('Добро пожаловать обратно!', {
        description: 'Перенаправление на панель управления...',
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Пароль"
          required
        />
      </div>

      <div className="text-xs text-muted-foreground">
        <Link href="/forgot-password" className="hover:underline">
          Забыли пароль?
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="remember-me"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
        />
        <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
          Запомнить меня на 30 дней
        </Label>
      </div>

      <SubmitButton loading={isPending} text="Войти" />
    </form>
  )
}
