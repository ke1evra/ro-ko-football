'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, TrendingUp } from 'lucide-react'
import DynamicEventsForm from './DynamicEventsForm'

interface PredictionEvent {
  id: string
  event: string
  coefficient: number
}

interface PredictionModalProps {
  isOpen: boolean
  onClose: () => void
  fixtureId: number
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
  content: string
  events: PredictionEvent[]
}

export default function PredictionModal({ 
  isOpen, 
  onClose, 
  fixtureId, 
  matchData, 
  onPredictionCreated 
}: PredictionModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<PredictionData>({
    title: `Прогноз на матч ${matchData.home.name} - ${matchData.away.name}`,
    content: '',
    events: [],
  })

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
    setFormData(prev => ({ ...prev, [field]: value }))
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
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Создать прогноз
          </DialogTitle>
          <DialogDescription>
            {matchData.home.name} — {matchData.away.name}
            {matchData.competition?.name && ` • ${matchData.competition.name}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Основная информация */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Заголовок прогноза</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder={`Прогноз на матч ${matchData.home.name} - ${matchData.away.name}`}
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Описание и обоснование</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => updateFormData('content', e.target.value)}
                placeholder="Опишите ваш прогноз и его обоснование..."
                rows={4}
                required
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
      </DialogContent>
    </Dialog>
  )
}