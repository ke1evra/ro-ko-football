'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatarLink } from '@/components/UserAvatarLink'
import { TrendingUp, ArrowRight, Loader2 } from 'lucide-react'
import type { User } from '@/payload-types'

interface PredictorStats {
  total: number
  won: number
  lost: number
  undecided: number
  hitRate: number
  roi: number
}

interface PredictorCardProps {
  author: User | null
  currentPostId: string
}

export function PredictorCard({ author, currentPostId }: PredictorCardProps) {
  const [stats, setStats] = useState<PredictorStats | null>(null)
  const [recentPredictions, setRecentPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!author?.id) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Получить статистику
        const statsResponse = await fetch(`/api/predictions/stats/${author.id}`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.stats)
        }

        // Получить последние прогнозы
        const predictionsResponse = await fetch(
          `/api/predictions/user/${author.id}?sort=recent&limit=3`,
        )
        if (predictionsResponse.ok) {
          const predictionsData = await predictionsResponse.json()
          setRecentPredictions(
            predictionsData.predictions.filter((p: any) => p.id !== currentPostId).slice(0, 3),
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [author?.id, currentPostId])

  if (!author) {
    return null
  }

  const hitRatePercent = stats ? (stats.hitRate * 100).toFixed(1) : '—'
  const roiPercent = stats ? (stats.roi * 100).toFixed(1) : '—'

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />О прогнозисте
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Информация о пользователе */}
        <div className="flex items-center gap-4">
          <UserAvatarLink user={author} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{author.name || author.email}</h3>
            {author.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2">{author.bio}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              {author.rating && author.rating > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Рейтинг: {author.rating}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Статистика */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">Ошибка загрузки статистики</div>
        ) : stats ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 p-2 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Hit Rate
                </div>
                <div className="text-xl font-bold text-primary">{hitRatePercent}%</div>
              </div>

              <div className="space-y-1 p-2 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground uppercase font-semibold">ROI</div>
                <div
                  className={`text-xl font-bold ${
                    stats.roi >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {roiPercent}%
                </div>
              </div>

              <div className="space-y-1 p-2 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Всего</div>
                <div className="text-xl font-bold">{stats.total}</div>
              </div>

              <div className="space-y-1 p-2 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Выиграло
                </div>
                <div className="text-xl font-bold text-green-600">{stats.won}</div>
              </div>
            </div>

            {/* Ссылка на профиль */}
            {author.username && (
              <Link href={`/profile/${author.username}`} className="block">
                <Button variant="outline" className="w-full gap-2">
                  Полный профиль
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        ) : null}

        {/* Последние прогнозы */}
        {recentPredictions.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-sm">Последние прогнозы</h4>
            <div className="space-y-2">
              {recentPredictions.map((prediction) => (
                <Link
                  key={prediction.id}
                  href={`/posts/${prediction.id}`}
                  className="block p-3 rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{prediction.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(prediction.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    {prediction.summary && (
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        {prediction.summary.won}/{prediction.summary.total}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Ссылка на все прогнозы */}
            <Link href={`/predictions?author=${author.id}`} className="block">
              <Button variant="ghost" size="sm" className="w-full gap-2 text-primary">
                Все прогнозы
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Социальные сети */}
        {(author.links?.website || author.links?.twitter || author.links?.github) && (
          <div className="space-y-2 pt-4 border-t">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Контакты</p>
            <div className="flex gap-2 flex-wrap">
              {author.links?.website && (
                <a
                  href={author.links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Сайт
                </a>
              )}
              {author.links?.twitter && (
                <a
                  href={author.links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  X/Twitter
                </a>
              )}
              {author.links?.github && (
                <a
                  href={author.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
