'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Loader2, TrendingUp } from 'lucide-react'
import DynamicEventsForm from './DynamicEventsForm'
import LexicalEditorWithToolbar from '@/components/LexicalEditorWithToolbar'
import { SubmitButton } from '@/components/auth/submit-button'
import { loginUser } from '@/lib/auth'
import { registerUser } from '@/lib/auth'
import { validatePassword, validateEmail } from '@/lib/validation'
import { PasswordInput } from '@/components/ui/password-input'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/app/(frontend)/AuthContext'

// Кастомная форма входа без перенаправления
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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

// Кастомная форма регистрации без перенаправления
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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

interface PredictionEvent {
  id: string
  event: string
  coefficient: number
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
  events: PredictionEvent[]
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

  const [formData, setFormData] = useState<PredictionData>({
    title: `Прогноз на матч ${matchData.home.name} - ${matchData.away.name}`,
    content: null,
    events: [],
  })

  // Проверяем авторизацию при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      checkAuthentication()
    }
  }, [isOpen])

  const checkAuthentication = async () => {
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include',
      })
      setIsAuthenticated(response.ok)
    } catch (err) {
      setIsAuthenticated(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Сначала получаем информацию о текущем пользователе
      const userResponse = await fetch('/api/users/me', {
        credentials: 'include',
      })

      if (!userResponse.ok) {
        throw new Error('Необходимо войти в систему для создания прогноза')
      }

      const userData = await userResponse.json()

      if (!userData.user || !userData.user.id) {
        throw new Error('Не удалось получить информацию о пользователе')
      }

      const predictionPayload = {
        title: formData.title, // Используем оригинальный заголовок
        content: formData.content,
        postType: 'prediction',
        fixtureId,
        matchId,
        author: userData.user.id, // Добавляем ID автора
        prediction: {
          events: formData.events,
          // Добавляем информацию о матче
          matchInfo: {
            home: matchData.home.name,
            away: matchData.away.name,
            competition: matchData.competition?.name,
            date: matchData.date,
            time: matchData.time,
          },
        },
        publishedAt: new Date().toISOString(),
      }

      console.log('Sending prediction payload:', predictionPayload)

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(predictionPayload),
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходимо войти в систему для создания прогноза')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Ошибка ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      // Закрываем модальное окно
      onClose()

      // Обновляем список прогнозов
      if (onPredictionCreated) {
        onPredictionCreated()
      }

      // Показываем уведомление об успехе
      // Можно добавить toast notification здесь
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof PredictionData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleEventsChange = (events: PredictionEvent[]) => {
    updateFormData('events', events)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {isAuthenticated ? 'Создать прогноз' : 'Вход в систему'}
          </DialogTitle>
          <DialogDescription>
            {matchData.home.name} — {matchData.away.name}
            {matchData.competition?.name && ` • ${matchData.competition.name}`}
          </DialogDescription>
        </DialogHeader>

        {isAuthenticated === null ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Проверка авторизации...</span>
          </div>
        ) : isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={(value) => updateFormData('content', value)}
                  placeholder="Опишите ваш прогноз и его обоснование..."
                  className="bg-white"
                />
              </div>
            </div>

            <Separator />

            {/* Динамическая форма событий */}
            <DynamicEventsForm
              matchData={matchData}
              onEventsChange={handleEventsChange}
              initialEvents={formData.events}
            />

            {/* Кнопки */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.title || !formData.content}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Создание прогноза...' : 'Создать прогноз'}
              </Button>
            </div>
          </form>
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
                  onSuccess={() => setIsAuthenticated(true)}
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
                  onSuccess={() => setIsAuthenticated(true)}
                  onRefreshUser={refreshUser}
                />
                <div className="flex justify-center">
                  <Button variant="outline" onClick={checkAuthentication}>
                    Уже авторизированы? Проверить авторизацию
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
