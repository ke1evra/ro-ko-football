/**
 * Компонент live-матчей для конкретного соревнования
 * Использует externalId соревнования для фильтрации матчей
 */

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Clock } from 'lucide-react'

interface CompetitionLiveMatchesProps {
  competitionExtId: string
  competitionName: string
}

export default async function CompetitionLiveMatches({ 
  competitionExtId, 
  competitionName 
}: CompetitionLiveMatchesProps) {
  try {
    // Получаем все live-матчи и фильтруем по соревнованию
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/live/all`,
      {
        next: { 
          revalidate: 60, // 1 минута для live данных
          tags: [`live-matches:${competitionExtId}`]
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch live matches: ${response.status}`)
    }

    const data = await response.json()
    
    // Фильтруем матчи по ID соревнования
    const competitionMatches = data.matches?.filter((match: any) => 
      match.competition?.id.toString() === competitionExtId
    ) || []

    if (competitionMatches.length === 0) {
      return (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Сейчас нет live-матчей в {competitionName}
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="space-y-3">
        {competitionMatches.map((match: any, index: number) => (
          <Card key={`${match.id || index}`} className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="space-y-2">
                {/* Статус матча */}
                <div className="flex items-center justify-between">
                  <Badge variant="destructive" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    LIVE
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {match.time || 'В игре'}
                  </span>
                </div>

                {/* Команды и счет */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{match.homeTeam?.name || 'Команда 1'}</span>
                    <span className="font-bold text-lg">{match.homeScore || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{match.awayTeam?.name || 'Команда 2'}</span>
                    <span className="font-bold text-lg">{match.awayScore || 0}</span>
                  </div>
                </div>

                {/* Дополнительная информация */}
                {match.venue && (
                  <div className="text-xs text-muted-foreground">
                    📍 {typeof match.venue === 'string' 
                      ? match.venue 
                      : [match.venue?.name, match.venue?.city].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        <div className="text-xs text-muted-foreground text-center">
          Обновлено: {new Date().toLocaleTimeString('ru-RU')}
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading live matches:', error)
    
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Не удалось загрузить live-матчи. Попробуйте обновить страницу.
        </AlertDescription>
      </Alert>
    )
  }
}