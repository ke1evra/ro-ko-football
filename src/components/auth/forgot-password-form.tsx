'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function ForgotPasswordForm() {
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
        toast.success('Email отправлен!', {
          description:
            'Если аккаунт с таким email существует, мы отправили вам ссылку для сброса пароля.',
        })
      } else {
        switch (result.errorCode) {
          case 'INVALID_EMAIL':
            toast.error('Неверный email', {
              description: result.error || 'Введите корректный адрес электронной почты',
            })
            break
          default:
            toast.error('Запрос не удался', {
              description: result.error || 'Что-то пошло не так. Попробуйте снова.',
            })
        }
      }
    } catch (_error) {
      toast.error('Запрос не удался', {
        description: 'Что-то пошло не так. Попробуйте снова.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center my-6">
        <p className="text-muted-foreground">Проверьте email на ссылку для сброса пароля.</p>
        <Link href="/login" className="text-foreground hover:underline">
          Вернуться к входу
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 my-6">
      <div className="grid gap-2">
        <Label htmlFor="email">Адрес электронной почты</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="Адрес электронной почты"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Отправка...' : 'Отправить ссылку для сброса'}
      </Button>
    </form>
  )
}
