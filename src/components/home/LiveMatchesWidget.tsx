'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCwIcon, ClockIcon } from 'lucide-react'
import Image from 'next/image'

interface Team {
  id: string
  name: string
  shortName?: string
  logo?: {
    url: string
  }
}

interface Competition {
  id: string
  name: string
}

interface Match {
  id: string
  title: string
  status: 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed' | 'cancelled'
  minute?: number
  teamA?: Team | null
  teamB?: Team | null
  scoreA?: number
  scoreB?: number
  date: string
  competition?: Competition
}

interface LiveMatchesWidgetProps {
  initialMatches: Match[]
}

const LiveMatchesWidget: React.FC<LiveMatchesWidgetProps> = ({ initialMatches }) => {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const getStatusBadge = (status: string, minute?: number) => {
    switch (status) {
      case 'live':
        return (
          <Badge variant="default" className="bg-green-500 animate-pulse">
            {minute ? `${minute}'` : 'LIVE'}
          </Badge>
        )
      case 'halftime':
        return (
          <Badge variant="default" className="bg-orange-500">
            HT
          </Badge>
        )
      case 'finished':
        return <Badge variant="outline">FT</Badge>
      case 'scheduled':
        return <Badge variant="secondary">Скоро</Badge>
      case 'postponed':
        return <Badge variant="destructive">Отложен</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Отменён</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const refreshMatches = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/matches?limit=10&sort=-date&depth=2')
      if (response.ok) {
        const data = await response.json()
        setMatches(data.docs || [])
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Ошибка при обновлении матчей:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Автоматическое обновление каждую минуту
  useEffect(() => {
    const interval = setInterval(refreshMatches, 60000) // 60 секунд
    return () => clearInterval(interval)
  }, [])

  const liveMatches = matches.filter(
    (match) => match.status === 'live' || match.status === 'halftime',
  )

  const upcomingMatches = matches.filter((match) => match.status === 'scheduled').slice(0, 3)

  const recentMatches = matches.filter((match) => match.status === 'finished').slice(0, 2)

  const displayMatches = [...liveMatches, ...upcomingMatches, ...recentMatches].slice(0, 5)

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Матчи</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {lastUpdate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshMatches}
              disabled={isRefreshing}
              className="h-6 w-6 p-0"
            >
              <RefreshCwIcon className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Матчей пока нет</p>
        ) : (
          <>
            {displayMatches.map((match) => (
              <div key={match.id} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {match.competition && (
                      <Badge variant="outline" className="text-xs">
                        {match.competition.name}
                      </Badge>
                    )}
                  </div>
                  {getStatusBadge(match.status, match.minute)}
                </div>

                <div className="space-y-2">
                  {/* Команда А */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {match.teamA?.logo?.url ? (
                        <div className="relative w-4 h-4 flex-shrink-0">
                          <Image
                            src={match.teamA.logo.url}
                            alt={match.teamA.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-4 h-4 bg-gray-200 rounded-sm flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {match.teamA?.shortName || match.teamA?.name || 'Команда А'}
                      </span>
                    </div>
                    <span className="text-sm font-bold ml-2">{match.scoreA ?? '-'}</span>
                  </div>

                  {/* Команда Б */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {match.teamB?.logo?.url ? (
                        <div className="relative w-4 h-4 flex-shrink-0">
                          <Image
                            src={match.teamB.logo.url}
                            alt={match.teamB.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-4 h-4 bg-gray-200 rounded-sm flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {match.teamB?.shortName || match.teamB?.name || 'Команда Б'}
                      </span>
                    </div>
                    <span className="text-sm font-bold ml-2">{match.scoreB ?? '-'}</span>
                  </div>
                </div>

                {match.status === 'scheduled' && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <ClockIcon className="h-3 w-3" />
                    <span>{formatTime(match.date)}</span>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/matches">Все матчи</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default LiveMatchesWidget
