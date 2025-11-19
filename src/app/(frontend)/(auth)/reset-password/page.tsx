'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPassword, getUser } from '@/lib/auth'
import { Section, Container } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { AuthBox } from '@/components/auth/auth-box'
import { PasswordInput } from '@/components/ui/password-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
          toast.info('Уже вошли в систему', {
            description: 'Вы уже вошли в систему. Перенаправление на панель управления...',
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
      toast.error('Пароли не совпадают', {
        description: 'Убедитесь, что оба пароля одинаковые.',
      })
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      toast.error('Пароль слишком короткий', {
        description: 'Пароль должен содержать не менее 8 символов.',
      })
      setIsLoading(false)
      return
    }

    try {
      const result = await resetPassword(token, email, password)

      if (result.success) {
        setIsSuccess(true)
        toast.success('Пароль успешно сброшен!', {
          description: 'Теперь вы можете войти с новым паролем.',
        })
      } else {
        switch (result.errorCode) {
          case 'INVALID_OR_EXPIRED_TOKEN':
            toast.error('Неверная или истекшая ссылка', {
              description: 'Эта ссылка для сброса истекла. Запросите новую.',
            })
            break
          case 'INVALID_PASSWORD':
            toast.error('Неверный пароль', {
              description: result.error || 'Введите корректный пароль',
            })
            break
          default:
            toast.error('Сброс не удался', {
              description: result.error || 'Что-то пошло не так. Попробуйте снова.',
            })
        }
      }
    } catch (_error) {
      toast.error('Сброс не удался', {
        description: 'Что-то пошло не так. Попробуйте снова.',
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
            <h1>Неверная ссылка для сброса</h1>
            <p className="text-muted-foreground mb-4">
              Эта ссылка для сброса пароля недействительна или истекла.
            </p>
            <div className="text-center">
              <Link href="/forgot-password" className="text-foreground hover:underline">
                Запросить новый сброс пароля
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
          <h1>Сброс пароля</h1>
          <p className="text-muted-foreground mb-4">Введите новый пароль ниже.</p>

          {isSuccess ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">Ваш пароль успешно сброшен.</p>
              <Button asChild>
                <Link href="/login">Войти</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-6 my-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Электронная почта</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Новый пароль</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="Новый пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Подтвердите новый пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Сброс...' : 'Сбросить пароль'}
              </Button>

              <p className="text-muted-foreground">
                <Link className="text-foreground" href="/login">
                  Вернуться к входу
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
              <h1>Загрузка...</h1>
            </AuthBox>
          </Container>
        </Section>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
