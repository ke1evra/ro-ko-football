import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Trophy } from 'lucide-react'
import { TeamFlagImage } from '@/components/TeamFlagImage'

interface MatchInfoProps {
  matchData: any
  type: 'match' | 'fixture' | null
}

export default function MatchInfo({ matchData, type }: MatchInfoProps) {
  if (!matchData) {
    return <div className="text-muted-foreground">Данные о матче недоступны</div>
  }

  const homeTeam = matchData.home || matchData.home_team || {}
  const awayTeam = matchData.away || matchData.away_team || {}
  const competition = matchData.competition || {}
  const venue = matchData.venue || {}

  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return 'Дата не указана'
    
    try {
      const dateObj = new Date(date)
      const dateStr = dateObj.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      
      if (time) {
        return `${dateStr} в ${time}`
      }
      
      return dateStr
    } catch {
      return date
    }
  }

  return (
    <div className="space-y-4">
      {/* Команды */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TeamFlagImage 
            teamId={homeTeam.id}
            teamName={homeTeam.name}
            size="medium"
            className="w-8 h-8"
          />
          <div>
            <div className="font-medium">{homeTeam.name || 'Команда дома'}</div>
            <div className="text-xs text-muted-foreground">Дома</div>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold">VS</div>
          {type === 'match' && matchData.scores?.score && (
            <div className="text-sm text-muted-foreground">
              {matchData.scores.score}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-medium">{awayTeam.name || 'Команда гостей'}</div>
            <div className="text-xs text-muted-foreground">В гостях</div>
          </div>
          <TeamFlagImage 
            teamId={awayTeam.id}
            teamName={awayTeam.name}
            size="medium"
            className="w-8 h-8"
          />
        </div>
      </div>

      {/* Статус матча */}
      {type === 'match' && matchData.time_status && (
        <div className="flex justify-center">
          <Badge variant="outline">
            {matchData.time_status}
          </Badge>
        </div>
      )}

      {/* Детали матча */}
      <div className="space-y-3 pt-4 border-t">
        {/* Турнир */}
        {competition.name && (
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{competition.name}</span>
          </div>
        )}

        {/* Дата и время */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDateTime(matchData.date, matchData.time)}
          </span>
        </div>

        {/* Место проведения */}
        {venue.name && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {venue.name}
              {venue.city && `, ${venue.city}`}
            </span>
          </div>
        )}
      </div>

      {/* Дополнительная информация для завершенных матчей */}
      {type === 'match' && matchData.stats && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Статистика матча</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {matchData.stats.corners_total && (
              <div>
                <span className="text-muted-foreground">Угловые:</span>
                <span className="ml-1">{matchData.stats.corners_total}</span>
              </div>
            )}
            {matchData.stats.cards_yellow_total && (
              <div>
                <span className="text-muted-foreground">Желтые карточки:</span>
                <span className="ml-1">{matchData.stats.cards_yellow_total}</span>
              </div>
            )}
            {matchData.stats.fouls_total && (
              <div>
                <span className="text-muted-foreground">Фолы:</span>
                <span className="ml-1">{matchData.stats.fouls_total}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}