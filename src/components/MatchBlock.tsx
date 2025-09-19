import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon } from 'lucide-react'
import PredictionButton from '@/components/predictions/PredictionButton'

export interface MatchData {
  id: string
  matchId?: number
  fixtureId?: number
  homeTeam: {
    name: string
    logo?: string
  }
  awayTeam: {
    name: string
    logo?: string
  }
  score?: {
    home: number
    away: number
  }
  date: string
  status: 'scheduled' | 'live' | 'finished'
  competition: string
}

interface MatchBlockProps {
  match: MatchData
}

const MatchBlock: React.FC<MatchBlockProps> = ({ match }) => {
  const getStatusBadge = (status: MatchData['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Запланирован</Badge>
      case 'live':
        return (
          <Badge variant="default" className="bg-green-500">
            В прямом эфире
          </Badge>
        )
      case 'finished':
        return <Badge variant="outline">Завершён</Badge>
      default:
        return null
    }
  }

  const score = match.score ? `${match.score.home} - ${match.score.away}` : 'TBD'

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{match.competition}</CardTitle>
        {getStatusBadge(match.status)}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {match.homeTeam.logo && (
              <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-8 h-8" />
            )}
            <span className="font-bold">{match.homeTeam.name}</span>
          </div>
          <div className="text-xl font-bold">{score}</div>
          <div className="flex items-center space-x-2">
            <span className="font-bold">{match.awayTeam.name}</span>
            {match.awayTeam.logo && (
              <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-8 h-8" />
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-muted-foreground text-sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {new Date(match.date).toLocaleString('ru-RU', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
          {match.status === 'scheduled' && (
            <PredictionButton 
              matchId={match.matchId}
              fixtureId={match.fixtureId}
              size="sm"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MatchBlock