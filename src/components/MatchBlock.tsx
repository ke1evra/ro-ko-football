import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon } from 'lucide-react'
import PredictionButton from '@/components/predictions/PredictionButton'
import { TeamLogo } from '@/components/TeamLogo'
import { generateMatchUrl, generateLegacyMatchUrl, generateLegacyFixtureUrl } from '@/lib/match-url-utils'

export interface MatchData {
  id: string
  matchId?: number
  fixtureId?: number
  homeTeam: {
    id?: number | string
    name: string
    logo?: string
  }
  awayTeam: {
    id?: number | string
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
  // Генерируем URL для матча
  let matchUrl = '#'
  try {
    if (match.homeTeam.id && match.awayTeam.id && match.date) {
      matchUrl = generateMatchUrl({
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        homeTeamId: match.homeTeam.id,
        awayTeamId: match.awayTeam.id,
        date: match.date,
        fixtureId: match.fixtureId || match.matchId || 0,
        matchId: match.matchId,
      })
    } else if (match.matchId) {
      matchUrl = generateLegacyMatchUrl(match.matchId)
    } else if (match.fixtureId) {
      matchUrl = generateLegacyFixtureUrl(match.fixtureId)
    }
  } catch (error) {
    // Fallback на старый формат
    if (match.matchId) {
      matchUrl = generateLegacyMatchUrl(match.matchId)
    } else if (match.fixtureId) {
      matchUrl = generateLegacyFixtureUrl(match.fixtureId)
    }
  }

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
    <Link href={matchUrl}>
      <Card className="w-full max-w-md hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">{match.competition}</CardTitle>
          {getStatusBadge(match.status)}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TeamLogo 
                teamId={match.homeTeam.id} 
                teamName={match.homeTeam.name} 
                size="medium" 
              />
              <span className="font-bold">{match.homeTeam.name}</span>
            </div>
            <div className="text-xl font-bold">{score}</div>
            <div className="flex items-center space-x-2">
              <span className="font-bold">{match.awayTeam.name}</span>
              <TeamLogo 
                teamId={match.awayTeam.id} 
                teamName={match.awayTeam.name} 
                size="medium" 
              />
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
    </Link>
  )
}

export default MatchBlock