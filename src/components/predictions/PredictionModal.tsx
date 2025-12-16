'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Loader2, TrendingUp, X } from 'lucide-react'
import DynamicEventsForm, { PredictionOutcome } from './DynamicEventsForm'
import LexicalEditorWithToolbar from '@/components/LexicalEditorWithToolbar'
import { loginUser } from '@/lib/auth'
import { registerUser } from '@/lib/auth'
import { validatePassword, validateEmail } from '@/lib/validation'
import { PasswordInput } from '@/components/ui/password-input'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/app/(frontend)/AuthContext'

// Кастомная форма входа без HTML-формы
function LoginFormWrapper({
  onSuccess,
  onRefreshUser,
}: {
  onSuccess: () => void
  onRefreshUser: () => Promise<void>
}) {
  const [isPending, setIsPending] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  async function handleLogin() {
    if (isPending) return
    setIsPending(true)

    const res = await loginUser({ email, password, rememberMe })

    setIsPending(false)

    if (res.error) {
      switch (res.errorCode) {
        case 'INVALID_EMAIL':
          toast.error('Неверный email', { description: res.error })
          break
        case 'INVALID_CREDENTIALS':
          toast.error('Неверные учетные данные', {
            description: 'Введенный email или пароль неверны',
          })
          break
        case 'AUTH_ERROR':
          toast.error('Ошибка аутентификации', { description: 'Попробуйте позже' })
          break
        default:
          toast.error('Вход не удался', { description: res.error || 'Что-то пошло не так' })
      }
    } else {
      toast.success('Добро пожаловать обратно!')
      await onRefreshUser()
      onSuccess()
    }
  }

  return (
    <div className="grid gap-6 my-6">
      <div className="grid gap-2">
        <Label htmlFor="login-email">Электронная почта</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="Электронная почта"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="login-password">Пароль</Label>
        <PasswordInput
          id="login-password"
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

      <Button type="button" onClick={handleLogin} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Войти
      </Button>
    </div>
  )
}

// Кастомная форма регистрации без HTML-формы
function RegisterFormWrapper({
  onSuccess,
  onRefreshUser,
}: {
  onSuccess: () => void
  onRefreshUser: () => Promise<void>
}) {
  const [isPending, setIsPending] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(
    null,
  )

  useEffect(() => {
    if (!password) {
      setPasswordFeedback(null)
      setPasswordStrength(null)
      return
    }

    const validation = validatePassword(password)

    if (!validation.valid) {
      setPasswordFeedback(validation.error || null)
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

  async function handleRegister() {
    if (isPending) return
    setIsPending(true)

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

    const res = await registerUser({ email, password })

    setIsPending(false)

    if (res.error) {
      switch (res.errorCode) {
        case 'EMAIL_EXISTS':
          toast.error('Email уже существует', {
            description:
              'Аккаунт с таким email уже существует. Войдите или используйте другой email.',
          })
          break
        case 'VALIDATION_ERROR':
          toast.error('Ошибка валидации', { description: res.error })
          break
        case 'REGISTRATION_FAILED':
          toast.error('Регистрация не удалась', {
            description: 'Не удалось создать аккаунт. Попробуйте снова.',
          })
          break
        default:
          toast.error('Регистрация не удалась', { description: res.error || 'Что-то пошло не так' })
      }
    } else {
      toast.success('Аккаунт создан!')
      await onRefreshUser()
      onSuccess()
    }
  }

  return (
    <div className="grid gap-6 my-6">
      <div className="grid gap-2">
        <Label htmlFor="register-email">Электронная почта</Label>
        <Input
          id="register-email"
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
        <Label htmlFor="register-password">Пароль</Label>
        <PasswordInput
          id="register-password"
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
              />
              <div
                className={`h-full w-1/3 ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-500' : 'bg-gray-200'}`}
              />
              <div
                className={`h-full w-1/3 rounded-r ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            </div>
            {passwordFeedback && <p className="text-xs text-amber-600 mt-1">{passwordFeedback}</p>}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Пар��ль должен содержать не менее 8 символов, включая заглавные и строчные буквы, цифры и
          специальные символы.
        </div>
      </div>

      <Button type="button" onClick={handleRegister} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Зарегистрироваться
      </Button>
    </div>
  )
}

interface PredictionModalProps {
  isOpen: boolean
  onClose: () => void
  fixtureId?: number
  matchId?: number
  matchData: {
    home: { name: string }
    away: { name: string }
    competition?: { name: string }
    date: string
    time: string
  }
  onPredictionCreated?: () => void
}

interface PredictionData {
  title: string
  content: any
  outcome: PredictionOutcome | null
}

export default function PredictionModal({
  isOpen,
  onClose,
  fixtureId,
  matchId,
  matchData,
  onPredictionCreated,
}: PredictionModalProps) {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const mountedRef = useRef(false)

  const [formData, setFormData] = useState<PredictionData>({
    title: `Прогноз на матч ${matchData.home.name} - ${matchData.away.name}`,
    content: null,
    outcome: null,
  })

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      console.log('[PredictionModal] mount, isOpen =', isOpen)
    } else {
      console.log('[PredictionModal] isOpen changed to', isOpen)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      console.log('[PredictionModal] isOpen true → checkAuthentication')
      void checkAuthentication()
    }
  }, [isOpen])

  const checkAuthentication = async () => {
    try {
      console.log('[PredictionModal] checkAuthentication start')
      const response = await fetch('/api/users/me', {
        credentials: 'include',
      })
      console.log('[PredictionModal] /api/users/me status =', response.status)
      setIsAuthenticated(response.ok)
    } catch (err) {
      console.log('[PredictionModal] checkAuthentication error', err)
      setIsAuthenticated(false)
    }
  }

  const handleCreatePrediction = async () => {
    console.log('[PredictionModal] handleCreatePrediction click')
    if (isSubmitting) {
      console.log('[PredictionModal] already submitting, skip')
      return
    }
    if (!formData.outcome) {
      console.log('[PredictionModal] no outcome selected, skip')
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      const userResponse = await fetch('/api/users/me', {
        credentials: 'include',
      })

      console.log(
        '[PredictionModal] /api/users/me in handleCreatePrediction status =',
        userResponse.status,
      )

      if (!userResponse.ok) {
        throw new Error('Необходимо войти в систему для создания прогноза')
      }

      const userData = await userResponse.json()

      if (!userData.user || !userData.user.id) {
        throw new Error('Не удалось получить информацию о пользователе')
      }

      const predictionPayload = {
        title: formData.title,
        content: formData.content,
        postType: 'prediction',
        author: userData.user.id,
        prediction: {
          outcomes: [formData.outcome],
        },
        publishedAt: new Date().toISOString(),
      }

      console.log('[PredictionModal] sending prediction payload', predictionPayload)

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(predictionPayload),
      })

      console.log('[PredictionModal] /api/posts status =', response.status)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходимо войти в систему для создания прогноза')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Ошибка ${response.status}: ${response.statusText}`)
      }

      await response.json()

      console.log('[PredictionModal] prediction created successfully')
      toast.success('Прогноз создан!', {
        description: 'Ваш прогноз успешно опубликован',
      })

      // Закрываем модалку только после успеха
      onClose()

      if (onPredictionCreated) {
        onPredictionCreated()
      }
    } catch (err) {
      console.log('[PredictionModal] handleCreatePrediction error', err)
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof PredictionData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSelectedOutcomeChange = (outcome: PredictionOutcome | null) => {
    console.log('[PredictionModal] selected outcome changed', outcome)
    updateFormData('outcome', outcome)
  }

  if (!isOpen) {
    console.log('[PredictionModal] render null because isOpen = false')
    return null
  }

  console.log('[PredictionModal] render modal, isAuthenticated =', isAuthenticated)

  const isCreateDisabled = isSubmitting || !formData.title || !formData.content || !formData.outcome

  return (
    <>
      {/* Overlay - клик закрывает модалку */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Контейнер модалки - клики НЕ всплывают */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-background rounded-lg border shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-background border-b p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <div>
                <h2 className="text-lg font-semibold">
                  {isAuthenticated ? 'Создать прогноз' : 'Вход в систему'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {matchData.home.name} — {matchData.away.name}
                  {matchData.competition?.name && ` • ${matchData.competition.name}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {isAuthenticated === null ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Проверка авторизации...</span>
              </div>
            ) : isAuthenticated ? (
              <div className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Основная информация */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Заголовок прогноза</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => updateFormData('title', e.target.value)}
                      placeholder={`Прогноз на матч ${matchData.home.name} - ${matchData.away.name}`}
                      className="bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Описание и обоснование</Label>
                    <LexicalEditorWithToolbar
                      value={formData.content}
                      onChange={(value) => {
                        console.log('[PredictionModal] content change')
                        updateFormData('content', value)
                      }}
                      placeholder="Опишите ваш прогноз и его обоснование..."
                      className="bg-white"
                    />
                  </div>
                </div>

                <Separator />

                <DynamicEventsForm
                  matchData={matchData}
                  fixtureId={fixtureId}
                  onSelectedOutcomeChange={handleSelectedOutcomeChange}
                  selectedOutcome={formData.outcome}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Для создания прогноза необходимо войти в систему или зарегистрироваться.
                  </AlertDescription>
                </Alert>

                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Вход</TabsTrigger>
                    <TabsTrigger value="register">Регистрация</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login" className="space-y-4">
                    <LoginFormWrapper
                      onSuccess={() => {
                        console.log(
                          '[PredictionModal/LoginForm] success → set isAuthenticated true',
                        )
                        setIsAuthenticated(true)
                      }}
                      onRefreshUser={refreshUser}
                    />
                    <div className="flex justify-center">
                      <Button variant="outline" onClick={checkAuthentication}>
                        Уже авторизированы? Проверить авторизацию
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="register" className="space-y-4">
                    <RegisterFormWrapper
                      onSuccess={() => {
                        console.log(
                          '[PredictionModal/RegisterForm] success → set isAuthenticated true',
                        )
                        setIsAuthenticated(true)
                      }}
                      onRefreshUser={refreshUser}
                    />
                    <div className="flex justify-center">
                      <Button variant="outline" onClick={checkAuthentication}>
                        Уже авторизированы? Проверить авторизацию
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          {/* Footer — всегда видим */}
          {isAuthenticated && (
            <div className="border-t bg-background px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Отмена
              </Button>
              <Button type="button" onClick={handleCreatePrediction} disabled={isCreateDisabled}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Создание прогноза...' : 'Создать прогноз'}
              </Button>
            </div>
          )}

          {!isAuthenticated && (
            <div className="border-t bg-background px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
