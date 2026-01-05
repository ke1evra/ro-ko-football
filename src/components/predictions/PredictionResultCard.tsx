'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, HelpCircle, TrendingUp } from 'lucide-react'

interface PredictionResult {
  total: number
  won: number
  lost: number
  undecided: number
  hitRate: number
  roi: number
  points: number
}

interface PredictionResultCardProps {
  result: PredictionResult | null
  status: 'pending' | 'settled'
}

export function PredictionResultCard({ result, status }: PredictionResultCardProps) {
  if (!result) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-600" />
            Результат прогноза
          </CardTitle>
          <CardDescription>Статистика ещё не рассчитана</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-amber-700">
            {status === 'pending'
              ? 'Результат будет доступен после завершения матча'
              : 'Результат не удалось рассчитать'}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hitRatePercent = (result.hitRate * 100).toFixed(1)
  const roiPercent = (result.roi * 100).toFixed(1)
  const isPositive = result.roi >= 0

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Результат прогноза
        </CardTitle>
        <CardDescription>Статистика по всем событиям</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Основные метрики */}
        <div className="grid grid-cols-2 gap-4">
          {/* Выиграло */}
          <div className="space-y-2 p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 uppercase">Выиграло</span>
            </div>
            <div className="text-2xl font-bold text-green-700">{result.won}</div>
            <div className="text-xs text-green-600">
              {result.total > 0 ? ((result.won / result.total) * 100).toFixed(0) : 0}% от всех
            </div>
          </div>

          {/* Проиграло */}
          <div className="space-y-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-700 uppercase">Проиграло</span>
            </div>
            <div className="text-2xl font-bold text-red-700">{result.lost}</div>
            <div className="text-xs text-red-600">
              {result.total > 0 ? ((result.lost / result.total) * 100).toFixed(0) : 0}% от всех
            </div>
          </div>

          {/* Hit Rate */}
          <div className="space-y-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <span className="text-xs font-medium text-blue-700 uppercase">Hit Rate</span>
            <div className="text-2xl font-bold text-blue-700">{hitRatePercent}%</div>
            <div className="text-xs text-blue-600">Точность прогноза</div>
          </div>

          {/* ROI */}
          <div
            className={`space-y-2 p-3 rounded-lg border ${
              isPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'
            }`}
          >
            <span
              className={`text-xs font-medium uppercase ${
                isPositive ? 'text-emerald-700' : 'text-orange-700'
              }`}
            >
              ROI
            </span>
            <div
              className={`text-2xl font-bold ${
                isPositive ? 'text-emerald-700' : 'text-orange-700'
              }`}
            >
              {roiPercent}%
            </div>
            <div className={`text-xs ${isPositive ? 'text-emerald-600' : 'text-orange-600'}`}>
              {isPositive ? 'Прибыль' : 'Убыток'}
            </div>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Всего событий</span>
            <Badge variant="outline">{result.total}</Badge>
          </div>

          {result.undecided > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Не определено</span>
              <Badge variant="secondary">{result.undecided}</Badge>
            </div>
          )}

          {result.points > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Начислено очков</span>
              <Badge className="bg-primary">{result.points}</Badge>
            </div>
          )}
        </div>

        {/* Прогресс-бар */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">Распределение результатов</p>
          <div className="flex h-2 gap-1 rounded-full overflow-hidden bg-muted">
            {result.total > 0 && (
              <>
                {result.won > 0 && (
                  <div
                    className="bg-green-600"
                    style={{ width: `${(result.won / result.total) * 100}%` }}
                  />
                )}
                {result.lost > 0 && (
                  <div
                    className="bg-red-600"
                    style={{ width: `${(result.lost / result.total) * 100}%` }}
                  />
                )}
                {result.undecided > 0 && (
                  <div
                    className="bg-amber-600"
                    style={{ width: `${(result.undecided / result.total) * 100}%` }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
