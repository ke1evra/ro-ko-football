'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, TrendingUp, MessageSquare, ThumbsUp } from 'lucide-react'
import { LocalDateTime } from '@/components/LocalDateTime'
import PredictionModal from '@/components/predictions/PredictionModal'
import { CountryFlagImage } from '@/components/CountryFlagImage'

import { TeamLogo } from '@/components/TeamLogo'
import H2HBlock from '@/components/fixtures/H2HBlock'
import ComparativeTeamAnalysis from '@/components/fixtures/ComparativeTeamAnalysis'

// Вспомогательный маппер статуса времени на русский
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
    try {
      const response = await fetch(`/api/predictions?fixtureId=${fx.id}`)
      if (response.ok) {
        const data = await response.json()
        setPredictions(data)
      }
    } catch (error) {
      console.error('Ошибк�� обновления прогнозов:', error)
    }
  }

  // Проверяем, является ли матч запланированным (будущим)
  const isScheduled =
    !fx.status || fx.status.toLowerCase() === 'scheduled' || fx.status.toLowerCase() === 'ns'

  // Отладочная информация
  console.log('[FixturePageClient] Fixture data:', {
    id: fx.id,
    homeId: fx.home.id,
    homeName: fx.home.name,
    awayId: fx.away.id,
    awayName: fx.away.name,
    status: fx.status,
    isScheduled,
  })

  // Предматчевые коэффициенты (нормализация)
  const preOdds = fx?.odds?.pre || fx?.odds?.Pre || null
  const oHome =
    preOdds?.['1'] != null
      ? Number(preOdds['1'])
      : preOdds?.home != null
        ? Number(preOdds.home)
        : NaN
  const oDraw =
    preOdds?.['X'] != null
      ? Number(preOdds['X'])
      : preOdds?.draw != null
        ? Number(preOdds.draw)
        : NaN
  const oAway =
    preOdds?.['2'] != null
      ? Number(preOdds['2'])
      : preOdds?.away != null
        ? Number(preOdds.away)
        : NaN

  // Разбор основного счёта в виде "H - A" или "H:A"
  const scoreStr = typeof fx?.scores?.score === 'string' ? fx.scores.score : ''
  const scoreMatch = scoreStr.match(/(\d+)\s*[-:]\s*(\d+)/)
  const homeScoreBig: string | null = scoreMatch ? scoreMatch[1] : null
  const awayScoreBig: string | null = scoreMatch ? scoreMatch[2] : null

  // Лайв-статус и метка минут/периода
  const statusUpper = String(fx?.status || '').toUpperCase()
  const isLive =
    statusUpper.includes('IN PLAY') ||
    statusUpper === 'LIVE' ||
    /^\d+(\+\d+)?$/.test(String(fx?.time_status || ''))
  const minuteLabel = timeStatusRu(fx?.time_status) || undefined

  // Countdown до начала матча (для запланированных)
  let countdownText: string | undefined
  try {
    if (isScheduled && fx?.date) {
      const baseDate = String(fx.date)
      const rawTime = typeof fx?.time === 'string' ? fx.time : '00:00'
      const timeWithSec = /^\d{2}:\d{2}$/.test(rawTime) ? `${rawTime}:00` : rawTime
      const isoStart = `${baseDate}T${timeWithSec}Z`
      const startMs = new Date(isoStart).getTime()
      const diffMs = startMs - Date.now()
      if (Number.isFinite(diffMs) && diffMs > 0) {
        const totalMin = Math.floor(diffMs / 60000)
        const h = Math.floor(totalMin / 60)
        const m = totalMin % 60
        countdownText = h > 0 ? `Через ${h} ч ${m} мин` : `Через ${m} мин`
      }
    }
  } catch {
    // no-op
  }

  const fmtOdd = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '—')

  function computeWidths(h: number, d: number, a: number) {
    const inv = [h, d, a].map((x) => (Number.isFinite(x) && x > 0 ? 1 / x : 0))
    const total = inv[0] + inv[1] + inv[2]
    if (total <= 0) return { wh: 0, wd: 0, wa: 0 }
    return { wh: inv[0] / total, wd: inv[1] / total, wa: inv[2] / total }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Детали матча */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center gap-2 text-center">
              <span className="text-xs text-muted-foreground text-small">
                {fx.competition.name || 'Матч'}
                {fx.round && `, тур ${fx.round}`}
              </span>
              <span className="text-xs text-muted-foreground text-small opacity-30">—</span>
              <div className="flex justify-center gap-2">
                {/* Дата, время и обратный отсчёт под счётом */}
                <div className="flex  items-center gap-1 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <LocalDateTime date={fx.date} time={fx.time} utc showTime={false} />
                  </div>
                  {isScheduled && fx.time && (
                    <div className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <LocalDateTime date={fx.date} time={fx.time} utc showDate={false} />
                    </div>
                  )}
                  {countdownText && (
                    <div className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <span className="text-xs text-muted-foreground text-small opacity-30">—</span>
                      <span>{countdownText}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Главный ряд: команды слева/справа и крупный счёт по центру */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
              {/* Домашняя команда */}
              <div className="flex items-center justify-end gap-3">
                <TeamLogo teamId={fx.home.id} teamName={fx.home.name} size="large" />
                <Link
                  href={`/teams/${fx.home.id}`}
                  className="text-3xl font-semibold hover:text-primary max-w-64"
                >
                  {fx.home.name}
                </Link>
              </div>
              {/* Футер с коэффициентами */}
              {(Number.isFinite(oHome) || Number.isFinite(oDraw) || Number.isFinite(oAway)) && (
                <div className="flex items-center justify-between gap-4 py-4 flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className="border-2 border-border rounded px-3 py-2 text-center">
                      <span className="font-semibold text-sm">{fmtOdd(oHome)}</span>
                    </div>
                    {/*<span className="text-xs text-muted-foreground ">{fx.home.name}</span>*/}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="border-2 border-border rounded px-3 py-2 text-center">
                      <i className="opacity-30">x&nbsp;</i>
                      <span className="font-semibold text-sm">{fmtOdd(oDraw)}</span>
                    </div>
                    {/*<span className="text-xs text-muted-foreground ">Ничья</span>*/}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="border-2 border-border rounded px-3 py-2 text-center">
                      <span className="font-semibold text-sm">{fmtOdd(oAway)}</span>
                    </div>
                    {/*<span className="text-xs text-muted-foreground ">{fx.away.name}</span>*/}
                  </div>
                </div>
              )}

              {/* Гостевая команда */}
              <div className="flex items-center justify-start gap-3">
                <Link
                  href={`/teams/${fx.away.id}`}
                  className="text-3xl font-semibold hover:text-primary max-w-64 flex justify-center"
                >
                  {fx.away.name}
                </Link>
                <TeamLogo teamId={fx.away.id} teamName={fx.away.name} size="large" />
              </div>
            </div>

            {/* Место проведения */}
            {fx.location ? (
              <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{fx.location}</span>
              </div>
            ) : null}

            {/* Дополнительные детали счёта */}
            {fx.scores?.ht_score ||
            fx.scores?.ft_score ||
            fx.scores?.et_score ||
            fx.scores?.ps_score ? (
              <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-2">
                {fx.scores.ht_score ? <span>HT: {fx.scores.ht_score}</span> : null}
                {fx.scores.ft_score ? <span>FT: {fx.scores.ft_score}</span> : null}
                {fx.scores.et_score ? <span>ET: {fx.scores.et_score}</span> : null}
                {fx.scores.ps_score ? <span>PS: {fx.scores.ps_score}</span> : null}
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

            {/* Кнопка добавить прогноз */}
            {isScheduled && (
              <div className="pt-4 border-t">
                <Button onClick={() => setIsPredictionModalOpen(true)} className="w-full">
                  Добавить прогноз
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Аналитический виджет сравнительной статистики на всю ширину */}
        <ComparativeTeamAnalysis
          home={{ id: fx.home.id, name: fx.home.name }}
          away={{ id: fx.away.id, name: fx.away.name }}
        />

        {/* H2H блок - показываем для всех матчей */}
        <H2HBlock
          homeTeamId={fx.home.id}
          awayTeamId={fx.away.id}
          homeTeamName={fx.home.name}
          awayTeamName={fx.away.name}
        />

        {/* Прогнозы на матч */}
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
                <Button variant="outline" size="sm" onClick={() => setIsPredictionModalOpen(true)}>
                  Оставить прогноз
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {predictions.length > 0 ? (
              <div className="space-y-4">
                {predictions.map(({ post, commentsCount, rating }) => (
                  <article
                    key={post.id}
                    className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  >
                    <Link
                      href={post.slug ? `/posts/${post.slug}` : `/posts?pid=${post.id}`}
                      className="block"
                    >
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
                            <strong>Исход:</strong>{' '}
                            {(post as any).prediction.outcome === 'home'
                              ? 'Победа хозяев'
                              : (post as any).prediction.outcome === 'draw'
                                ? 'Ничья'
                                : (post as any).prediction.outcome === 'away'
                                  ? 'Победа гостей'
                                  : 'Не указан'}
                          </div>
                        )}
                        {(post as any).prediction.score?.home !== undefined &&
                          (post as any).prediction.score?.away !== undefined && (
                            <div>
                              <strong>Счет:</strong> {(post as any).prediction.score.home}:
                              {(post as any).prediction.score.away}
                            </div>
                          )}
                        {(post as any).prediction.events &&
                          (post as any).prediction.events.length > 0 && (
                            <div>
                              <strong>События:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(post as any).prediction.events
                                  .slice(0, 3)
                                  .map((event: any, idx: number) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs px-1 py-0"
                                    >
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
                      <Link
                        href={
                          post.slug
                            ? `/posts/${post.slug}#comments`
                            : `/posts?pid=${post.id}#comments`
                        }
                      >
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPredictionModalOpen(true)}
                  >
                    Оставить прогноз
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
