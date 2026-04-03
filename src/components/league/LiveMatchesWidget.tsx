/**
 * Виджет live-матчей для отображения текущих игр
 * Показывает матчи, которые идут прямо сейчас
 * 
 * Использует прямые вызовы функций API вместо HTTP fetch для избежания ECONNREFUSED в Docker
 */

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Clock, Zap } from 'lucide-react'
import { fetchLiveMatches } from '@/lib/api'

interface LiveMatchesWidgetProps {
  league: string
}

export default async function LiveMatchesWidget({ league }: LiveMatchesWidgetProps) {
  try {
    // Используем прямой вызов API функции вместо HTTP fetch
    const competitionId = Number(league)
    const result = await fetchLiveMatches({
      size: 50,
      ...(Number.isFinite(competitionId) && competitionId > 0 ? { competitionId } : {}),
    })

    if (result.error) {
      throw new Error(result.error)
    }

    const matches = result.matches || []

    // Если нет live-матчей
    if (matches.length === 0) {
      // Проверяем, есть ли ошибка в ответе
      const hasError = !!result.error

      return (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {hasError ? 'Сервис live-матчей временно недоступен' : 'Сейчас нет live-матчей'}
          </p>
          <p className="text-xs mt-1">
            Обновлено:{' '}
            {result.lastUpdated
              ? new Date(result.lastUpdated).toLocaleTimeString('ru-RU')
              : 'Неизвестно'}
          </p>
          {hasError && (
            <p className="text-xs mt-2 text-orange-600">
              Проверяем подключение к источнику данных...
            </p>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {/* Заголовок с количеством матчей */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">
              {matches.length} {matches.length === 1 ? 'матч' : 'матчей'}
            </span>
          </div>
          <Badge variant="destructive" className="animate-pulse">
            LIVE
          </Badge>
        </div>

        {/* Список live-матчей */}
        <div className="space-y-2">
          {matches.slice(0, 5).map((match: any) => (
            <LiveMatchCard key={match.id} match={match} />
          ))}
        </div>

        {/* Время последнего обновления */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Обновлено:{' '}
          {result.lastUpdated ? new Date(result.lastUpdated).toLocaleTimeString('ru-RU') : 'Неизвестно'}
        </div>

        {/* Ссылка на все live-матчи, если их много */}
        {matches.length > 5 && (
          <div className="text-center pt-2">
            <Link href="/live" className="text-sm text-primary hover:underline">
              Смотреть все live-матчи ({matches.length})
            </Link>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error loading live matches:', error)

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">Не удалось загрузить live-матчи</AlertDescription>
      </Alert>
    )
  }
}

// Компонент карточки live-матча
function LiveMatchCard({ match }: { match: any }) {
  const isLive = match.status === 'INPLAY'
  const isHalftime = match.status === 'HALFTIME'
  const isFinished = match.status === 'FINISHED'

  return (
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Статус и время */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={isLive ? 'destructive' : isHalftime ? 'secondary' : 'outline'}
            className={isLive ? 'animate-pulse' : ''}
          >
            {isLive && match.minute
              ? `${match.minute}'`
              : isHalftime
                ? 'HT'
                : isFinished
                  ? 'FT'
                  : match.status}
          </Badge>
          {match.competition && (
            <span className="text-xs text-muted-foreground">{match.competition.name}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{match.time}</div>
      </div>

      {/* Команды и счет */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{match.homeTeam.name}</span>
          <span className="text-lg font-bold min-w-[2rem] text-center">
            {match.score.home ?? '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{match.awayTeam.name}</span>
          <span className="text-lg font-bold min-w-[2rem] text-center">
            {match.score.away ?? '-'}
          </span>
        </div>
      </div>

      {/* Дополнительная информация */}
      {match.venue?.name && (
        <div className="text-xs text-muted-foreground mt-2 truncate">📍 {match.venue.name}</div>
      )}

      {/* Ссылка на детали матча */}
      <div className="mt-2">
        <Link
          href={`/matches-v2/match_${match.date || new Date().toISOString().split('T')[0]}_${match.homeTeam?.id || 0}_${match.awayTeam?.id || 0}_${match.id}_${match.id}`}
          className="text-xs text-primary hover:underline"
        >
          Подробнее →
        </Link>
      </div>
    </div>
  )
}
