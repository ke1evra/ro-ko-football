import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Trophy, Target, TrendingUp } from 'lucide-react'

interface PredictionData {
  outcome?: 'home' | 'draw' | 'away'
  score?: {
    home?: number
    away?: number
  }
  fouls?: {
    total?: number
    overUnder?: 'over' | 'under'
  }
  corners?: {
    total?: number
    home?: number
    away?: number
  }
  yellowCards?: {
    total?: number
    home?: number
    away?: number
  }
  events?: Array<{
    event: string
    coefficient: number
  }>
  matchInfo?: {
    home?: string
    away?: string
    competition?: string
    date?: string
    time?: string
  }
}

interface PredictionPreviewProps {
  prediction: PredictionData
  className?: string
}

function formatOutcome(outcome: string): string {
  switch (outcome) {
    case 'home':
      return 'П1'
    case 'draw':
      return 'X'
    case 'away':
      return 'П2'
    default:
      return outcome
  }
}

function formatDateTime(date?: string, time?: string): string {
  if (!date) return ''
  
  try {
    const matchDate = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    const matchDateStr = matchDate.toDateString()
    const todayStr = today.toDateString()
    const tomorrowStr = tomorrow.toDateString()
    
    let dateLabel = ''
    if (matchDateStr === todayStr) {
      dateLabel = 'Сегодня'
    } else if (matchDateStr === tomorrowStr) {
      dateLabel = 'Завтра'
    } else {
      dateLabel = matchDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
      })
    }
    
    if (time) {
      return `${dateLabel} в ${time}`
    }
    
    return dateLabel
  } catch {
    return date + (time ? ` ${time}` : '')
  }
}

export default function PredictionPreview({ prediction, className = '' }: PredictionPreviewProps) {
  const { matchInfo, events, outcome, score, fouls, corners, yellowCards } = prediction
  
  // Проверяем, есть ли информация для отображения в левой колонке (исход и счёт)
  const hasOutcomeInfo = outcome || (score && score.home !== undefined && score.away !== undefined)
  
  // Проверяем, есть ли информация для отображения в правой колонке (статистика)
  const hasStatsInfo = 
    (fouls && fouls.total !== undefined) ||
    (corners && corners.total !== undefined) ||
    (yellowCards && yellowCards.total !== undefined)
  
  // Проверяем, есть ли основные прогнозы для отображения
  const hasMainPredictions = hasOutcomeInfo || hasStatsInfo
  
  // Если нет никакой информации для отображения, не показываем компонент
  const hasMatchInfo = matchInfo && (matchInfo.home || matchInfo.away)
  const hasEvents = events && events.length > 0
  
  if (!hasMatchInfo && !hasEvents && !hasMainPredictions) {
    return null
  }
  
  return (
    <div className={`bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20 ${className}`}>
      {/* Информация о матче */}
      {hasMatchInfo && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {matchInfo.competition || 'Матч'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">
              {matchInfo.home} vs {matchInfo.away}
            </div>
            
            {(matchInfo.date || matchInfo.time) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {formatDateTime(matchInfo.date, matchInfo.time)}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* События и коэффициенты */}
      {hasEvents && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">События</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {events.map((event, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-primary/10 text-primary hover:bg-primary/20"
              >
                {event.event} 
                <span className="ml-1 font-bold">
                  {event.coefficient.toFixed(2)}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Основные прогнозы */}
      {hasMainPredictions && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Исход и счёт */}
          {hasOutcomeInfo && (
            <div>
              {outcome && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-muted-foreground">Исход:</span>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    {formatOutcome(outcome)}
                  </Badge>
                </div>
              )}
              
              {score && score.home !== undefined && score.away !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Счёт:</span>
                  <span className="font-semibold">{score.home}:{score.away}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Статистика */}
          {hasStatsInfo && (
            <div className="space-y-1">
              {fouls && fouls.total !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Фолы:</span>
                  <span>{fouls.total}</span>
                  {fouls.overUnder && (
                    <Badge variant="outline" className="text-xs">
                      {fouls.overUnder === 'over' ? 'ТБ 25.5' : 'ТМ 25.5'}
                    </Badge>
                  )}
                </div>
              )}
              
              {corners && corners.total !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Угловые:</span>
                  <span>{corners.total}</span>
                  {corners.home !== undefined && corners.away !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      ({corners.home}:{corners.away})
                    </span>
                  )}
                </div>
              )}
              
              {yellowCards && yellowCards.total !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">ЖК:</span>
                  <span>{yellowCards.total}</span>
                  {yellowCards.home !== undefined && yellowCards.away !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      ({yellowCards.home}:{yellowCards.away})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}