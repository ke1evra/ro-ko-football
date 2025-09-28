'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Trophy, TrendingUp, MessageSquare, ThumbsUp } from 'lucide-react'
import { LocalDateTime } from '@/components/LocalDateTime'
import PredictionButton from '@/components/predictions/PredictionButton'
import PredictionModal from '@/components/predictions/PredictionModal'
import { TeamLogo } from '@/components/TeamLogo'
import H2HBlock from '@/components/fixtures/H2HBlock'

// Вспомогательные мапперы статусов на русский
function statusRu(status?: string): string | undefined {
  if (!status) return undefined
  const s = status.toUpperCase()
  if (s.includes('NOT') || s === 'NS' || s.includes('SCHEDULED')) return 'Запланирован'
  if (s.includes('IN PLAY') || s === 'LIVE') return 'Идёт'
  if (s === 'HT' || s.includes('HALF TIME')) return 'Перерыв'
  if (s.includes('ADDED TIME')) return 'Добавленное время'
  if (s.includes('FINISHED') || s === 'FT') return 'Завершён'
  if (s.includes('POSTPONED')) return 'Отложен'
  if (s.includes('CANCELLED')) return 'Отменён'
  if (s.includes('ABANDONED')) return 'Прерван'
  return status
}

function timeStatusRu(timeStatus?: string | null): string | undefined {
  if (!timeStatus) return undefined
  const ts = String(timeStatus).toUpperCase()
  if (/^\d+$/.test(ts)) return `${ts}′`
  if (ts === 'HT') return 'Перерыв'
  if (ts === 'FT') return 'Завершён'
  if (ts === 'AET') return 'После доп. времени'
  if (ts === 'AP') return 'После пенальти'
  return timeStatus
}

interface FixturePageClientProps {
  fx: any
  initialPredictions: any[]
}

export default function FixturePageClient({ fx, initialPredictions }: FixturePageClientProps) {
  const [predictions, setPredictions] = useState(initialPredictions)
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false)

  const handlePredictionCreated = async () => {
    // Перезагружаем прогнозы после создания нового
    try {
      const response = await fetch(`/api/predictions?fixtureId=${fx.id}`)
      if (response.ok) {
        const data = await response.json()
        setPredictions(data)
      }
    } catch (error) {
      console.error('Ошибка обновления прогнозов:', error)
    }
  }

  // Проверяем, является ли матч запланированным (будущим)
  const isScheduled = !fx.status || fx.status.toLowerCase() === 'scheduled' || fx.status.toLowerCase() === 'ns'

  // Отладочная информация
  console.log('[FixturePageClient] Fixture data:', {
    id: fx.id,
    homeId: fx.home.id,
    homeName: fx.home.name,
    awayId: fx.away.id,
    awayName: fx.away.name,
    status: fx.status,
    isScheduled
  })

  return (
    <>
      {/* Шапка */}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <LocalDateTime date={fx.date} time={fx.time} utc />
          {fx.competition?.name ? (
            <Badge variant="outline" className="ml-2">
              {fx.competition.name}
            </Badge>
          ) : null}
          {fx.round ? (
            <Badge variant="secondary" className="ml-2">
              Тур {fx.round}
            </Badge>
          ) : null}
          {fx.group_id ? (
            <Badge variant="secondary" className="ml-2">
              Группа {fx.group_id}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              {fx.home.name} — {fx.away.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              {fx.status ? <Badge variant="secondary">{statusRu(fx.status) || fx.status}</Badge> : null}
              <Clock className="h-4 w-4" />
              <LocalDateTime date={fx.date} time={fx.time} utc showDate={false} />
            </div>
            {isScheduled && (
              <PredictionButton 
                fixtureId={fx.id} 
                size="default" 
                mode="modal"
                onModalOpen={() => setIsPredictionModalOpen(true)}
              />
            )}
          </div>
        </div>

        {/* Время и обновления */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="font-medium">Начало:</span>{' '}
            <LocalDateTime date={fx.date} time={fx.time} utc />
          </span>
          {typeof fx.time_status !== 'undefined' ? (
            <span>
              <span className="font-medium">Сейчас:</span> {timeStatusRu(fx.time_status) || '—'}
            </span>
          ) : null}
          {fx.last_changed ? (
            <span>
              <span className="font-medium">Обновлено:</span>{' '}
              <LocalDateTime dateTime={fx.last_changed.replace(' ', 'T')} utc />
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка - Детали матча */}
        <div className="lg:col-span-2 space-y-6">
          {/* Детали */}
          <Card>
            <CardHeader>
              <CardTitle>Детали матча</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Команды */}
              <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/teams/${fx.home.id}`}
                    className="text-lg font-semibold hover:text-primary"
                  >
                    {fx.home.name}
                  </Link>
                  <TeamLogo 
                    teamId={fx.home.id} 
                    teamName={fx.home.name} 
                    size="large" 
                  />
                </div>
                <div className="text-center text-muted-foreground font-bold text-xl">vs</div>
                <div className="flex items-center justify-start gap-3">
                  <TeamLogo 
                    teamId={fx.away.id} 
                    teamName={fx.away.name} 
                    size="large" 
                  />
                  <Link
                    href={`/teams/${fx.away.id}`}
                    className="text-lg font-semibold hover:text-primary"
                  >
                    {fx.away.name}
                  </Link>
                </div>
              </div>

              {/* Место проведения */}
              {fx.location ? (
                <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{fx.location}</span>
                </div>
              ) : null}

              {/* Текущий счёт (если матч live/завершён) */}
              {fx.scores?.score ? (
                <div className="text-sm">
                  <div className="font-medium mb-1">Счёт</div>
                  <div className="text-muted-foreground">{fx.scores.score}</div>
                  <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-2">
                    {fx.scores.ht_score ? <span>HT: {fx.scores.ht_score}</span> : null}
                    {fx.scores.ft_score ? <span>FT: {fx.scores.ft_score}</span> : null}
                    {fx.scores.et_score ? <span>ET: {fx.scores.et_score}</span> : null}
                    {fx.scores.ps_score ? <span>PS: {fx.scores.ps_score}</span> : null}
                  </div>
                </div>
              ) : null}

              {/* Коэффициенты */}
              {fx.odds?.pre && (fx.odds.pre['1'] || fx.odds.pre.X || fx.odds.pre['2']) ? (
                <div className="text-sm">
                  <div className="font-medium mb-1">Прематчевые коэффициенты</div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {fx.odds.pre['1'] != null ? (
                      <Badge variant="outline">1 {fx.odds.pre['1']}</Badge>
                    ) : null}
                    {fx.odds.pre.X != null ? (
                      <Badge variant="outline">X {fx.odds.pre.X}</Badge>
                    ) : null}
                    {fx.odds.pre['2'] != null ? (
                      <Badge variant="outline">2 {fx.odds.pre['2']}</Badge>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* H2H */}
              {fx.h2h ? (
                <div className="text-sm">
                  <a
                    href={fx.h2h}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    История встреч (H2H)
                  </a>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* H2H блок - показываем для всех матчей */}
          <H2HBlock
            homeTeamId={fx.home.id}
            awayTeamId={fx.away.id}
            homeTeamName={fx.home.name}
            awayTeamName={fx.away.name}
          />
        </div>

        {/* Правая колонка - Прогнозы */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Прогнозы на матч
              </CardTitle>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {predictions.length > 0 ? `${predictions.length} прогнозов` : 'Пока нет прогнозов'}
                </p>
                {isScheduled && (
                  <PredictionButton 
                    fixtureId={fx.id} 
                    size="sm" 
                    variant="outline" 
                    mode="modal"
                    onModalOpen={() => setIsPredictionModalOpen(true)}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {predictions.length > 0 ? (
                <div className="space-y-4">
                  {predictions.map(({ post, commentsCount, rating }) => (
                    <article key={post.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                      <Link href={post.slug ? `/posts/${post.slug}` : `/posts?pid=${post.id}`} className="block">
                        <h4 className="font-medium text-sm line-clamp-2 mb-2">{post.title}</h4>
                        {post.publishedAt && (
                          <div className="text-xs text-muted-foreground mb-2">
                            {new Date(post.publishedAt).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </Link>
                      
                      {/* Краткая информация о прогнозе */}
                      {(post as any).prediction && (
                        <div className="mb-3 p-2 bg-muted/50 rounded text-xs space-y-1">
                          {(post as any).prediction.outcome && (
                            <div>
                              <strong>Исход:</strong> {
                                (post as any).prediction.outcome === 'home' ? 'Победа хозяев' :
                                (post as any).prediction.outcome === 'draw' ? 'Ничья' :
                                (post as any).prediction.outcome === 'away' ? 'Победа гостей' : 'Не указан'
                              }
                            </div>
                          )}
                          {(post as any).prediction.score?.home !== undefined && 
                           (post as any).prediction.score?.away !== undefined && (
                            <div>
                              <strong>Счет:</strong> {(post as any).prediction.score.home}:{(post as any).prediction.score.away}
                            </div>
                          )}
                          {(post as any).prediction.events && (post as any).prediction.events.length > 0 && (
                            <div>
                              <strong>События:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(post as any).prediction.events.slice(0, 3).map((event: any, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                                    {event.event} {event.coefficient}
                                  </Badge>
                                ))}
                                {(post as any).prediction.events.length > 3 && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    +{(post as any).prediction.events.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {commentsCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" /> {rating}
                          </span>
                        </div>
                        <Link href={post.slug ? `/posts/${post.slug}#comments` : `/posts?pid=${post.id}#comments`}>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            Обсудить
                          </Button>
                        </Link>
                      </div>
                    </article>
                  ))}
                  
                  {predictions.length >= 10 && (
                    <div className="text-center">
                      <Link href={`/predictions?fixtureId=${fx.id}`}>
                        <Button variant="outline" size="sm">
                          Все прогнозы
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Пока никто не сделал прогноз на этот матч
                  </p>
                  {isScheduled && (
                    <PredictionButton 
                      fixtureId={fx.id} 
                      size="default" 
                      mode="modal"
                      onModalOpen={() => setIsPredictionModalOpen(true)}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Модальное окно прогноза */}
      {isScheduled && (
        <PredictionModal
          isOpen={isPredictionModalOpen}
          onClose={() => setIsPredictionModalOpen(false)}
          fixtureId={fx.id}
          matchData={{
            home: { name: fx.home.name },
            away: { name: fx.away.name },
            competition: fx.competition,
            date: fx.date,
            time: fx.time,
          }}
          onPredictionCreated={handlePredictionCreated}
        />
      )}
    </>
  )
}