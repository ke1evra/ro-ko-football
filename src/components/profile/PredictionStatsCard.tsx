'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PredictionStatsCardProps {
  stats: {
    total: number
    won: number
    lost: number
    undecided: number
    hitRate: number
    roi: number
  }
}

export function PredictionStatsCard({ stats }: PredictionStatsCardProps) {
  const hitRatePercent = (stats.hitRate * 100).toFixed(1)
  const roiPercent = (stats.roi * 100).toFixed(1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Статистика прогнозов</CardTitle>
        <CardDescription>Общие показатели по всем прогнозам</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Всего прогнозов */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Всего событий</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>

          {/* Выиграло */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Выиграло</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-green-600">{stats.won}</p>
              <Badge variant="outline" className="text-green-600 border-green-600">
                {stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(0) : 0}%
              </Badge>
            </div>
          </div>

          {/* Проиграло */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Проиграло</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-red-600">{stats.lost}</p>
              <Badge variant="outline" className="text-red-600 border-red-600">
                {stats.total > 0 ? ((stats.lost / stats.total) * 100).toFixed(0) : 0}%
              </Badge>
            </div>
          </div>

          {/* Hit Rate */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Hit Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{hitRatePercent}%</p>
              <Badge variant="secondary">Точность</Badge>
            </div>
          </div>

          {/* ROI */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">ROI</p>
            <div className="flex items-baseline gap-2">
              <p
                className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {roiPercent}%
              </p>
              <Badge variant={stats.roi >= 0 ? 'default' : 'destructive'}>
                {stats.roi >= 0 ? 'Прибыль' : 'Убыток'}
              </Badge>
            </div>
          </div>

          {/* Не определено */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Не определено</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-amber-600">{stats.undecided}</p>
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                {stats.total > 0 ? ((stats.undecided / stats.total) * 100).toFixed(0) : 0}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">Распределение результатов</p>
          <div className="flex h-2 gap-1 rounded-full overflow-hidden bg-muted">
            {stats.total > 0 && (
              <>
                {stats.won > 0 && (
                  <div
                    className="bg-green-600"
                    style={{ width: `${(stats.won / stats.total) * 100}%` }}
                  />
                )}
                {stats.lost > 0 && (
                  <div
                    className="bg-red-600"
                    style={{ width: `${(stats.lost / stats.total) * 100}%` }}
                  />
                )}
                {stats.undecided > 0 && (
                  <div
                    className="bg-amber-600"
                    style={{ width: `${(stats.undecided / stats.total) * 100}%` }}
                  />
                )}
              </>
            )}
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-600" />
              <span>Выиграло</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-600" />
              <span>Проиграло</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-600" />
              <span>Не определено</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
