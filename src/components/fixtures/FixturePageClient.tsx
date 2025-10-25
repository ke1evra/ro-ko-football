'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Trophy, TrendingUp, MessageSquare, ThumbsUp } from 'lucide-react'
import { LocalDateTime } from '@/components/LocalDateTime'
import PredictionModal from '@/components/predictions/PredictionModal'

import { TeamLogo } from '@/components/TeamLogo'
import H2HBlock from '@/components/fixtures/H2HBlock'
import ComparativeTeamAnalysis from '@/components/fixtures/ComparativeTeamAnalysis'

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

  const widths = computeWidths(oHome, oDraw, oAway)
  const minOdd = Math.min(...[oHome, oDraw, oAway].filter((x) => Number.isFinite(x)))
  const fav = {
    home: Number.isFinite(oHome) && oHome === minOdd,
    draw: Number.isFinite(oDraw) && oDraw === minOdd,
    away: Number.isFinite(oAway) && oAway === minOdd,
  }
  // Проценты ширины сегментов для позиционирования подписи X (минимум 6%)
  const whPct = Math.max(6, widths.wh * 100)
  const wdPct = Math.max(6, widths.wd * 100)
  const waPct = Math.max(6, widths.wa * 100)

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
              {fx.status ? (
                <Badge variant="secondary">{statusRu(fx.status) || fx.status}</Badge>
              ) : null}
              <Clock className="h-4 w-4" />
              <LocalDateTime date={fx.date} time={fx.time} utc showDate={false} />
            </div>
            {isScheduled && (
              <Button variant="outline" size="sm" onClick={() => setIsPredictionModalOpen(true)}>
                Оставить прогноз
              </Button>
            )}
          </div>
        </div>

        {/* Время и обновления — мини‑виджеты */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Дата (локально) */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-[11px]">
            <Calendar className="h-3 w-3" />
            <LocalDateTime date={fx.date} time={fx.time} utc showTime={false} />
          </div>

          {/* Время (локально) */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-[11px]">
            <Clock className="h-3 w-3" />
            <LocalDateTime date={fx.date} time={fx.time} utc showDate={false} />
          </div>

          {/* До начала (для запланированных) */}
          {countdownText && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px]">
              <Clock className="h-3 w-3" />
              <span>{countdownText}</span>
            </div>
          )}

          {/* Обновлено */}
          {fx.last_changed && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-[10px] text-muted-foreground">
              <span>Обновлено:</span>
              <LocalDateTime dateTime={fx.last_changed.replace(' ', 'T')} utc showDate={false} />
            </div>
          )}
        </div>
      </header>

      <div className="space-y-6">
        {/* Детали матча */}
        <Card>
          <CardHeader>
            <CardTitle>Детали матча</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Главный ряд: команды слева/справа и крупный счёт по центру */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
              {/* Домашняя команда */}
              <div className="flex items-center justify-end gap-3">
                <Link
                  href={`/teams/${fx.home.id}`}
                  className="text-lg font-semibold hover:text-primary truncate"
                >
                  {fx.home.name}
                </Link>
                <TeamLogo teamId={fx.home.id} teamName={fx.home.name} size="large" />
              </div>

              {/* Центральный счёт и минуты */}
              <div className="flex items-center justify-center">
                <div
                  className="text-5xl md:text-6xl font-extrabold tabular-nums leading-none"
                  aria-live={isLive ? 'polite' : undefined}
                >
                  {homeScoreBig != null && awayScoreBig != null ? (
                    <>
                      <span className="opacity-90">{homeScoreBig}</span>
                      <span className="opacity-30 mx-3">-</span>
                      <span className="opacity-90">{awayScoreBig}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">vs</span>
                  )}
                </div>
                {minuteLabel && (
                  <span
                    className={`${isLive ? 'bg-red-50 text-red-700' : minuteLabel === 'Перерыв' ? 'bg-amber-50 text-amber-700' : minuteLabel === 'Завершён' ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'} ml-3 text-[10px] px-2 py-1 rounded`}
                  >
                    {minuteLabel}
                  </span>
                )}
              </div>

              {/* Гостевая команда */}
              <div className="flex items-center justify-start gap-3">
                <TeamLogo teamId={fx.away.id} teamName={fx.away.name} size="large" />
                <Link
                  href={`/teams/${fx.away.id}`}
                  className="text-lg font-semibold hover:text-primary truncate"
                >
                  {fx.away.name}
                </Link>
              </div>
            </div>

            {/* Предматчевые коэффициенты — заметная линия распределения на отдельной строке */}
            {(Number.isFinite(oHome) || Number.isFinite(oDraw) || Number.isFinite(oAway)) && (
              <div className="mt-3 space-y-1">
                <div className="h-3 rounded-full overflow-hidden border border-border bg-muted/40 flex">
                  <div
                    className={`${fav.home ? 'bg-primary' : 'bg-primary/60'} h-full`}
                    style={{ width: `${whPct}%` }}
                  />
                  <div
                    className={`${fav.draw ? 'bg-amber-500' : 'bg-amber-400'} h-full`}
                    style={{ width: `${wdPct}%` }}
                  />
                  <div
                    className={`${fav.away ? 'bg-blue-600' : 'bg-blue-400'} h-full`}
                    style={{ width: `${waPct}%` }}
                  />
                </div>
                <div className="relative mt-1 text-xs text-muted-foreground">
                  {/* Левые/правые подписи у краёв линии */}
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <span className="font-medium"></span> {fmtOdd(oHome)}
                    </div>
                    <div className="text-right">
                      <span className="font-medium"></span> {fmtOdd(oAway)}
                    </div>
                  </div>
                  {/* Центровка X относительно жёлтого сегмента линии */}
                  <div
                    className="absolute left-0 top-0 w-0 translate-x-[-50%] pointer-events-none"
                    style={{ left: `${whPct + wdPct / 2}%` }}
                  >
                    <div className="text-center">
                      <span className="font-medium opacity-30">X&nbsp;</span>
                      <span className="font-medium">{fmtOdd(oDraw)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

        {/* H2H блок - показываем для всех матчей */}
        <H2HBlock
          homeTeamId={fx.home.id}
          awayTeamId={fx.away.id}
          homeTeamName={fx.home.name}
          awayTeamName={fx.away.name}
        />

        {/* Аналитический виджет сравнительной статистики на всю ширину */}
        <ComparativeTeamAnalysis
          home={{ id: fx.home.id, name: fx.home.name }}
          away={{ id: fx.away.id, name: fx.away.name }}
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
