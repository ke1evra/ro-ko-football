'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

interface PredictionFormProps {
  matchId?: number
  fixtureId?: number
  matchData: any
}

interface PredictionData {
  title: string
  content: string
  outcome?: string
  scoreHome?: number
  scoreAway?: number
  foulsTotal?: number
  foulsOverUnder?: string
  cornersTotal?: number
  cornersHome?: number
  cornersAway?: number
  yellowCardsTotal?: number
  yellowCardsHome?: number
  yellowCardsAway?: number
}

export default function PredictionForm({ matchId, fixtureId, matchData }: PredictionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<PredictionData>({
    title: '',
    content: '',
  })

  const homeTeam = matchData?.home || matchData?.home_team || {}
  const awayTeam = matchData?.away || matchData?.away_team || {}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const predictionPayload = {
        title: formData.title,
        content: formData.content,
        postType: 'prediction',
        matchId,
        fixtureId,
        prediction: {
          outcome: formData.outcome,
          score: formData.scoreHome !== undefined && formData.scoreAway !== undefined ? {
            home: formData.scoreHome,
            away: formData.scoreAway,
          } : undefined,
          fouls: {
            total: formData.foulsTotal,
            overUnder: formData.foulsOverUnder,
          },
          corners: {
            total: formData.cornersTotal,
            home: formData.cornersHome,
            away: formData.cornersAway,
          },
          yellowCards: {
            total: formData.yellowCardsTotal,
            home: formData.yellowCardsHome,
            away: formData.yellowCardsAway,
          },
        },
        publishedAt: new Date().toISOString(),
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Важно для аутентификации
        body: JSON.stringify(predictionPayload),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходимо войти в систему для создания прогноза')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Ошибка ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Перенаправляем на страницу созданного прогноза
      if (result.doc?.slug) {
        router.push(`/posts/${result.doc.slug}`)
      } else if (result.doc?.id) {
        router.push(`/posts?pid=${result.doc.id}`)
      } else {
        router.push('/predictions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof PredictionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
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
            placeholder={`Прогноз на матч ${homeTeam.name || 'Дома'} - ${awayTeam.name || 'Гости'}`}
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

      {/* Исход матча */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Исход матча</CardTitle>
          <CardDescription>Кто победит в матче?</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={formData.outcome} onValueChange={(value) => updateFormData('outcome', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите исход" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Победа {homeTeam.name || 'хозяев'}</SelectItem>
              <SelectItem value="draw">Ничья</SelectItem>
              <SelectItem value="away">Победа {awayTeam.name || 'гостей'}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Счет */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Точный счет</CardTitle>
          <CardDescription>Прогноз точного счета матча</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scoreHome">{homeTeam.name || 'Дома'}</Label>
              <Input
                id="scoreHome"
                type="number"
                min="0"
                value={formData.scoreHome ?? ''}
                onChange={(e) => updateFormData('scoreHome', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="scoreAway">{awayTeam.name || 'Гости'}</Label>
              <Input
                id="scoreAway"
                type="number"
                min="0"
                value={formData.scoreAway ?? ''}
                onChange={(e) => updateFormData('scoreAway', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Фолы */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Фолы</CardTitle>
          <CardDescription>Прогноз по фолам в матче</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="foulsTotal">Общее количество фолов</Label>
            <Input
              id="foulsTotal"
              type="number"
              min="0"
              value={formData.foulsTotal ?? ''}
              onChange={(e) => updateFormData('foulsTotal', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="25"
            />
          </div>
          <div>
            <Label>Больше/меньше 25.5 фолов</Label>
            <Select value={formData.foulsOverUnder} onValueChange={(value) => updateFormData('foulsOverUnder', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите вариант" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="over">Больше 25.5</SelectItem>
                <SelectItem value="under">Меньше 25.5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Угловые */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Угловые</CardTitle>
          <CardDescription>Прогноз по угловым ударам</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cornersTotal">Всего угловых</Label>
              <Input
                id="cornersTotal"
                type="number"
                min="0"
                value={formData.cornersTotal ?? ''}
                onChange={(e) => updateFormData('cornersTotal', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="10"
              />
            </div>
            <div>
              <Label htmlFor="cornersHome">{homeTeam.name || 'Дома'}</Label>
              <Input
                id="cornersHome"
                type="number"
                min="0"
                value={formData.cornersHome ?? ''}
                onChange={(e) => updateFormData('cornersHome', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="6"
              />
            </div>
            <div>
              <Label htmlFor="cornersAway">{awayTeam.name || 'Гости'}</Label>
              <Input
                id="cornersAway"
                type="number"
                min="0"
                value={formData.cornersAway ?? ''}
                onChange={(e) => updateFormData('cornersAway', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="4"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Желтые карточки */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Желтые карточки</CardTitle>
          <CardDescription>Прогноз по желтым карточкам</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="yellowCardsTotal">Всего желтых карточек</Label>
              <Input
                id="yellowCardsTotal"
                type="number"
                min="0"
                value={formData.yellowCardsTotal ?? ''}
                onChange={(e) => updateFormData('yellowCardsTotal', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="4"
              />
            </div>
            <div>
              <Label htmlFor="yellowCardsHome">{homeTeam.name || 'Дома'}</Label>
              <Input
                id="yellowCardsHome"
                type="number"
                min="0"
                value={formData.yellowCardsHome ?? ''}
                onChange={(e) => updateFormData('yellowCardsHome', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="2"
              />
            </div>
            <div>
              <Label htmlFor="yellowCardsAway">{awayTeam.name || 'Гости'}</Label>
              <Input
                id="yellowCardsAway"
                type="number"
                min="0"
                value={formData.yellowCardsAway ?? ''}
                onChange={(e) => updateFormData('yellowCardsAway', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Кнопка отправки */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !formData.title || !formData.content}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Создание прогноза...' : 'Создать прогноз'}
        </Button>
      </div>
    </form>
  )
}