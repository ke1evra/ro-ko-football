'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface PredictionItem {
  id: string
  title: string
  createdAt: string
  summary?: {
    total: number
    won: number
    lost: number
    undecided: number
    hitRate: number
    roi: number
  }
  status: 'pending' | 'settled'
}

interface UserPredictionsListProps {
  userId: string
}

export function UserPredictionsList({ userId }: UserPredictionsListProps) {
  const [predictions, setPredictions] = useState<PredictionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'best' | 'worst'>('recent')

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/predictions/user/${userId}?sort=${sortBy}`)

        if (!response.ok) {
          throw new Error('Ошибка загрузки прогнозов')
        }

        const data = await response.json()
        setPredictions(data.predictions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      } finally {
        setLoading(false)
      }
    }

    fetchPredictions()
  }, [userId, sortBy])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Прогнозы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Прогнозы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Прогнозы</CardTitle>
          <CardDescription>Здесь будут ваши прогнозы</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Вы ещё не создали ни одного прогноза</p>
            <Link href="/predictions">
              <Button>Создать прогноз</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Прогнозы</CardTitle>
            <CardDescription>{predictions.length} прогнозов</CardDescription>
          </div>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Новые сначала</SelectItem>
              <SelectItem value="oldest">Старые сначала</SelectItem>
              <SelectItem value="best">Лучшие</SelectItem>
              <SelectItem value="worst">Худшие</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {predictions.map((prediction) => (
            <Link key={prediction.id} href={`/posts/${prediction.id}`}>
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{prediction.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(prediction.createdAt), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Статус */}
                    <Badge variant={prediction.status === 'settled' ? 'default' : 'secondary'}>
                      {prediction.status === 'settled' ? 'Рассчитан' : 'В ожидании'}
                    </Badge>

                    {/* Статистика если есть */}
                    {prediction.summary && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {prediction.summary.won}/{prediction.summary.total}
                        </span>
                        <span
                          className={`font-medium ${
                            prediction.summary.hitRate >= 0.5 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {(prediction.summary.hitRate * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
