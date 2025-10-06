'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Trophy,
  Clock,
  Target
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'

interface H2HData {
  success: boolean
  data: {
    team1: {
      id: string
      name: string
      stadium: string
      location: string
      overall_form: string[]
      h2h_form: string[]
    }
    team2: {
      id: string
      name: string
      stadium: string
      location: string
      overall_form: string[]
      h2h_form: string[]
    }
    team1_last_6: Array<{
      id: string
      date: string
      home_name: string
      away_name: string
      score: string
      ht_score: string
      ft_score: string
      et_score: string
      location: string
      scheduled: string
      competition: {
        id: string
        name: string
      }
      outcomes: {
        half_time: string | null
        full_time: string | null
        extra_time: string | null
      }
    }>
    team2_last_6: Array<{
      id: string
      date: string
      home_name: string
      away_name: string
      score: string
      ht_score: string
      ft_score: string
      et_score: string
      location: string
      scheduled: string
      competition: {
        id: string
        name: string
      }
      outcomes: {
        half_time: string | null
        full_time: string | null
        extra_time: string | null
      }
    }>
    h2h: Array<{
      id: string
      date: string
      home_name: string
      away_name: string
      score: string
      ht_score: string
      ft_score: string
      et_score: string
      location: string
      scheduled: string
      competition: {
        id: string
        name: string
      }
      outcomes: {
        half_time: string | null
        full_time: string | null
        extra_time: string | null
      }
    }>
    fixture: {
      id: string
      date: string
      time: string
      round: string
      home_name: string
      away_name: string
      location: string
      competition: {
        id: string
        name: string
      }
    }
  }
}

interface H2HBlockProps {
  homeTeamId: number
  awayTeamId: number
  homeTeamName: string
  awayTeamName: string
}

// Компонент для отображения формы команды
function FormIndicator({ 
  form, 
  title, 
  matches, 
  teamName 
}: { 
  form: string[], 
  title: string,
  matches?: any[],
  teamName?: string
}) {
  const getFormColor = (result: string) => {
    switch (result) {
      case 'W': return 'bg-green-500 hover:bg-green-600'
      case 'L': return 'bg-red-500 hover:bg-red-600'
      case 'D': return 'bg-yellow-500 hover:bg-yellow-600'
      default: return 'bg-gray-400 hover:bg-gray-500'
    }
  }

  const getFormText = (result: string) => {
    switch (result) {
      case 'W': return 'В'
      case 'L': return 'П'
      case 'D': return 'Н'
      default: return '?'
    }
  }

  // Функция для определения результата матча для команды
  const getMatchResult = (match: any, teamName: string) => {
    const isHome = match.home_name === teamName
    const isAway = match.away_name === teamName
    
    if (!isHome && !isAway) return 'D' // Если команда не участвует
    
    const outcome = match.outcomes?.full_time
    if (!outcome) return 'D'
    
    if (outcome === 'X') return 'D' // Ничья
    if (outcome === '1') return isHome ? 'W' : 'L' // Победа хозяев
    if (outcome === '2') return isAway ? 'W' : 'L' // Победа гостей
    
    return 'D'
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="flex gap-1">
        {form.map((result, index) => {
          const match = matches?.[index]
          const matchId = match?.id
          
          const FormCircle = (
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white transition-colors ${getFormColor(result)} ${matchId ? 'cursor-pointer' : ''}`}
              title={match ? `${match.home_name} - ${match.away_name} (${match.score || match.ft_score || '—'})` : ''}
            >
              {getFormText(result)}
            </div>
          )

          // Если есть ID матча, оборачиваем в ссылку
          if (matchId) {
            return (
              <Link key={index} href={`/matches-v2/match_${match.date || new Date().toISOString().split('T')[0]}_${match.home?.id || 0}_${match.away?.id || 0}_${matchId}_${matchId}`}>
                {FormCircle}
              </Link>
            )
          }

          return <div key={index}>{FormCircle}</div>
        })}
      </div>
    </div>
  )
}

// Компонент для отображения матча
function MatchItem({ match, highlightTeam }: { match: any, highlightTeam?: string }) {
  const isHome = match.home_name === highlightTeam
  const isAway = match.away_name === highlightTeam
  
  const getResultColor = (outcome: string | null, isTeamMatch: boolean) => {
    if (!isTeamMatch || !outcome) return 'text-muted-foreground'
    
    switch (outcome) {
      case '1': return isHome ? 'text-green-600' : 'text-red-600'
      case '2': return isAway ? 'text-green-600' : 'text-red-600'
      case 'X': return 'text-yellow-600'
      default: return 'text-muted-foreground'
    }
  }

  const resultColor = getResultColor(match.outcomes?.full_time, isHome || isAway)

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isHome ? 'text-primary' : ''}`}>
            {match.home_name}
          </span>
          <span className="text-muted-foreground">—</span>
          <span className={`font-medium ${isAway ? 'text-primary' : ''}`}>
            {match.away_name}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(match.date), 'd MMM yyyy', { locale: ru })}</span>
          {match.competition?.name && (
            <>
              <Trophy className="h-3 w-3" />
              <span>{match.competition.name}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className={`font-bold ${resultColor}`}>
          {match.score || match.ft_score || '—'}
        </div>
        {match.ht_score && (
          <div className="text-xs text-muted-foreground">
            ({match.ht_score})
          </div>
        )}
      </div>
    </div>
  )
}

export default function H2HBlock({ homeTeamId, awayTeamId, homeTeamName, awayTeamName }: H2HBlockProps) {
  const [h2hData, setH2hData] = useState<H2HData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchH2HData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/h2h?team1=${homeTeamId}&team2=${awayTeamId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Ошибка получения данных H2H')
      }
      
      setH2hData(data)
    } catch (err) {
      console.error('Ошибка загрузки H2H данных:', err)
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[H2HBlock] Component mounted with:', { homeTeamId, awayTeamId, homeTeamName, awayTeamName })
    if (homeTeamId && awayTeamId) {
      fetchH2HData()
    }
  }, [homeTeamId, awayTeamId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Личные встречи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Личные встречи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchH2HData} variant="outline" size="sm">
              Попробовать снова
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!h2hData) {
    return null
  }

  const { team1, team2, team1_last_6, team2_last_6, h2h } = h2hData.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Личные встречи
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Форма команд - всегда видна сверху */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold">{team1.name}</h3>
              <div className="text-xs text-muted-foreground space-y-1">
                {team1.stadium && (
                  <div className="flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{team1.stadium}</span>
                  </div>
                )}
              </div>
            </div>
            
            <FormIndicator 
              form={team1.overall_form} 
              title="Общая форма (последние 6 матчей)"
              matches={team1_last_6}
              teamName={team1.name}
            />
            
            <FormIndicator 
              form={team1.h2h_form} 
              title="Форма в личных встречах"
              matches={h2h.slice(0, team1.h2h_form.length)}
              teamName={team1.name}
            />
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold">{team2.name}</h3>
              <div className="text-xs text-muted-foreground space-y-1">
                {team2.stadium && (
                  <div className="flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{team2.stadium}</span>
                  </div>
                )}
              </div>
            </div>
            
            <FormIndicator 
              form={team2.overall_form} 
              title="Общая форма (последние 6 матчей)"
              matches={team2_last_6}
              teamName={team2.name}
            />
            
            <FormIndicator 
              form={team2.h2h_form} 
              title="Форма в личных встречах"
              matches={h2h.slice(0, team2.h2h_form.length)}
              teamName={team2.name}
            />
          </div>
        </div>

        <Separator />

        {/* Вкладки с дополнительной информацией */}
        <Tabs defaultValue="h2h" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="h2h">Личные встречи</TabsTrigger>
            <TabsTrigger value="recent">Последние матчи</TabsTrigger>
          </TabsList>

          {/* Личные встречи */}
          <TabsContent value="h2h" className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">
                {team1.name} vs {team2.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Последние {h2h.length} встреч
              </p>
            </div>
            
            <div className="space-y-2">
              {h2h.map((match) => (
                <MatchItem 
                  key={match.id} 
                  match={match}
                />
              ))}
            </div>
            
            {h2h.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Личные встречи не найдены</p>
              </div>
            )}
          </TabsContent>

          {/* Последние матчи */}
          <TabsContent value="recent" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-center">{team1.name}</h3>
                <div className="space-y-2">
                  {team1_last_6.map((match) => (
                    <MatchItem 
                      key={match.id} 
                      match={match}
                      highlightTeam={team1.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-center">{team2.name}</h3>
                <div className="space-y-2">
                  {team2_last_6.map((match) => (
                    <MatchItem 
                      key={match.id} 
                      match={match}
                      highlightTeam={team2.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}