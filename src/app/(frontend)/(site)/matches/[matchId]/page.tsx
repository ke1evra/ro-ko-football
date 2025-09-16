import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, Calendar, Clock, MapPin, Trophy } from 'lucide-react'
import { LocalDateTime } from '@/components/LocalDateTime'
import {
  getMatchesLiveJson,
  getMatchesHistoryJson,
  getScoresEventsJson,
  getMatchesLineupsJson,
  getMatchesStatsJson,
  getTeamsHead2HeadJson,
} from '@/app/(frontend)/client'
import type { Metadata } from 'next'

export const revalidate = 60

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

function ruEventLabel(label?: string, fallback?: string): string | undefined {
  if (label) return label
  if (!fallback) return undefined
  const key = fallback.toUpperCase()
  const map: Record<string, string> = {
    GOAL: '⚽ Гол',
    OWN_GOAL: '🥅 Автогол',
    PENALTY: '🟢 Пенальти',
    MISSED_PENALTY: '🔴 Нереализованный пенальти',
    YELLOW_CARD: '🟨 Жёлтая карточка',
    RED_CARD: '🟥 Красная карточка',
    SUBSTITUTION: '🔁 Замена',
    START: '⏱️ Начало',
    END: '⏱️ Конец матча',
    CORNER: '🚩 Угловой',
    OFFSIDE: '📐 Офсайд',
    FOUL: '🚫 Фол',
    THROW_IN: '↔️ Аут',
    SHOT_ON_TARGET: '🎯 Удар в створ',
    SHOT_OFF_TARGET: '🥏 Удар мимо',
  }
  return map[key] || fallback
}

// Маппинг и сортировка метрик статистики
type StatInfo = { key: string; labelRu: string; emoji: string; weight: number }
function normalizeStatKey(k: string): string {
  const raw = k
  const s = k.toLowerCase().replace(/\s+/g, '').replace(/_/g, '')
  // Владение
  if (s.includes('posses') || s.includes('possesion') || s.includes('posession') || s.includes('possession')) return 'possession'
  // Удары (total)
  if (/(^|total)shots?/.test(s) || s === 'shots' || s.includes('shotstotal')) return 'shots'
  // Удары в створ
  if (s.includes('ontarget') || s.includes('ongoal')) return 'shots_on_target'
  // Удары мимо
  if (s.includes('offtarget') || s.includes('offgoal')) return 'shots_off_target'
  if (s.includes('blocked')) return 'shots_blocked'
  if (s.includes('insidebox') || s.includes('inthebox')) return 'shots_inside_box'
  if (s.includes('outsidebox') || s.includes('outofbox')) return 'shots_outside_box'
  // Угловые
  if (s.includes('corner')) return 'corners'
  // Карточки
  if (s.includes('yellow')) return 'yellow_cards'
  if (s.includes('red')) return 'red_cards'
  // Офсайды
  if (s.includes('offside')) return 'offsides'
  // Фолы (с учётом опечаток)
  if (s.includes('foul') || s.includes('faul')) return 'fouls'
  // Ауты
  if (s.includes('throwin') || s.includes('throwins') || s.includes('throw')) return 'throw_ins'
  // Сэйвы
  if (s.includes('save')) return 'saves'
  // Пенальти (счёт пенальти/назначенные)
  if (s.includes('penalt')) return 'penalties'
  // Атаки
  if (s === 'attacks' || s.includes('attack') && !s.includes('danger')) return 'attacks'
  if (s.includes('dangerousattack')) return 'dangerous_attacks'
  return raw
}
function statKeyInfo(k: string): StatInfo {
  const n = normalizeStatKey(k)
  switch (n) {
    case 'possession':
      return { key: k, labelRu: 'Владение мячом', emoji: '🕹️', weight: 5 }
    case 'shots':
      return { key: k, labelRu: 'Удары', emoji: '🥅', weight: 10 }
    case 'shots_on_target':
      return { key: k, labelRu: 'Удары в створ', emoji: '🎯', weight: 20 }
    case 'corners':
      return { key: k, labelRu: 'Угловые', emoji: '🚩', weight: 30 }
    case 'yellow_cards':
      return { key: k, labelRu: 'Жёлтые карточки', emoji: '🟨', weight: 40 }
    case 'offsides':
      return { key: k, labelRu: 'Офсайды', emoji: '📐', weight: 50 }
    case 'fouls':
      return { key: k, labelRu: 'Фолы', emoji: '🚫', weight: 60 }
    case 'throw_ins':
      return { key: k, labelRu: 'Ауты', emoji: '↔️', weight: 70 }
    // Дополнительные распространённые метрики
    case 'shots_off_target':
      return { key: k, labelRu: 'Удары мимо', emoji: '🥏', weight: 200 }
    case 'shots_blocked':
      return { key: k, labelRu: 'Заблокированные удары', emoji: '🧱', weight: 201 }
    case 'shots_inside_box':
      return { key: k, labelRu: 'Удары из штрафной', emoji: '🧨', weight: 202 }
    case 'shots_outside_box':
      return { key: k, labelRu: 'Удары из‑за штрафной', emoji: '📍', weight: 203 }
    case 'red_cards':
      return { key: k, labelRu: 'Красные карточки', emoji: '🟥', weight: 210 }
    case 'saves':
      return { key: k, labelRu: 'Сэйвы', emoji: '🧤', weight: 220 }
    case 'penalties':
      return { key: k, labelRu: 'Пенальти', emoji: '🟢', weight: 230 }
    case 'attacks':
      return { key: k, labelRu: 'Атаки', emoji: '⚔️', weight: 240 }
    case 'dangerous_attacks':
      return { key: k, labelRu: 'Опасные атаки', emoji: '🔥', weight: 250 }
    default: {
      const pretty = k
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace('Fauls', 'Фолы')
        .replace('Possesion', 'Владение мячом')
        .replace('Possession', 'Владение мячом')
      return { key: k, labelRu: pretty, emoji: '•', weight: 1000 }
    }
  }
}

type MatchNormalized = {
  id: number
  fixture_id?: number
  date: string
  time: string
  home: { id: number; name: string }
  away: { id: number; name: string }
  competition?: { id: number; name: string }
  location?: string | null
  round?: string
  group_id?: number | null
  odds?: {
    pre?: { '1'?: number; '2'?: number; X?: number }
    live?: { '1'?: number | null; '2'?: number | null; X?: number | null }
  }
  h2h?: string
  status?: string
  time_status?: string | null
  scores?: {
    score?: string
    ht_score?: string
    ft_score?: string
    et_score?: string
    ps_score?: string
  }
  added?: string
  last_changed?: string
  outcomes?: {
    half_time?: string
    full_time?: string
    extra_time?: string
    penalty_shootout?: string
  }
  urls?: {
    events?: string
    statistics?: string
    lineups?: string
    head2head?: string
  }
}

async function findMatchById(matchId: number): Promise<MatchNormalized | null> {
  // Сначала пробуем найти в live
  try {
    const liveResp = await getMatchesLiveJson()
    const liveList = (liveResp.data?.data?.match || []) as Array<any>
    const m = liveList.find((match: any) => Number(match.id) === matchId)

    if (m) {
      const homeName = m.home?.name || 'Команда дома'
      const awayName = m.away?.name || 'Команда гостей'
      return {
        id: Number(m.id),
        fixture_id: Number(m.fixture_id || 0) || undefined,
        date: String(m.date || ''),
        time: String(m.time || ''),
        home: { id: Number(m.home?.id || '0'), name: homeName },
        away: { id: Number(m.away?.id || '0'), name: awayName },
        competition: m.competition
          ? { id: Number(m.competition.id || '0'), name: m.competition.name || '' }
          : undefined,
        location: typeof m.location === 'string' ? m.location : null,
        round:
          typeof m.round === 'string' ? m.round : m.round != null ? String(m.round) : undefined,
        group_id: m.group_id != null ? Number(m.group_id) : null,
        odds: m.odds,
        h2h: m.urls?.head2head || undefined,
        status: m.status,
        time_status: m.time_status ?? null,
        scores: m.scores,
        added: m.added,
        last_changed: m.last_changed,
        outcomes: m.outcomes,
        urls: m.urls,
      }
    }
  } catch {
    // игнорируем и пробуем history
  }

  // Фоллбэк: ищем в истории за последнюю неделю
  try {
    const now = new Date()
    const to = new Date(now.toISOString().split('T')[0])
    const from = new Date(
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    )

    const historyResp = await getMatchesHistoryJson({ from, to })
    const historyList = (historyResp.data?.data?.match || []) as Array<any>
    const m = historyList.find((match: any) => Number(match.id) === matchId)

    if (m) {
      const homeName = m.home?.name || 'Команда дома'
      const awayName = m.away?.name || 'Команда гостей'
      return {
        id: Number(m.id),
        fixture_id: Number(m.fixture_id || 0) || undefined,
        date: String(m.date || ''),
        time: String(m.time || ''),
        home: { id: Number(m.home?.id || '0'), name: homeName },
        away: { id: Number(m.away?.id || '0'), name: awayName },
        competition: m.competition
          ? { id: Number(m.competition.id || '0'), name: m.competition.name || '' }
          : undefined,
        location: typeof m.location === 'string' ? m.location : null,
        round:
          typeof m.round === 'string' ? m.round : m.round != null ? String(m.round) : undefined,
        group_id: m.group_id != null ? Number(m.group_id) : null,
        odds: m.odds,
        h2h: m.urls?.head2head || undefined,
        status: m.status || 'FINISHED',
        time_status: m.time_status ?? null,
        scores: m.scores,
        added: m.added,
        last_changed: m.last_changed,
        outcomes: m.outcomes,
        urls: m.urls,
      }
    }
  } catch {
    // игнорируем
  }

  return null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>
}): Promise<Metadata> {
  const { matchId } = await params
  const id = Number(matchId)
  if (!Number.isFinite(id)) {
    return { title: 'Матч не найден' }
  }

  const match = await findMatchById(id)
  if (!match) return { title: `Матч #${id}` }

  const title = `${match.home.name} vs ${match.away.name}${match.competition?.name ? ` — ${match.competition.name}` : ''}`
  const description = `Матч: ${match.home.name} — ${match.away.name}. Турнир: ${match.competition?.name || '—'}. Дата и время по местной зоне пользователя.`

  return {
    title,
    description,
  }
}

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const id = Number(matchId)

  if (!Number.isFinite(id)) {
    return (
      <Section>
        <Container>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Неверный идентификат��р матча.</AlertDescription>
          </Alert>
        </Container>
      </Section>
    )
  }

  const match = await findMatchById(id)

  // Загружаем дочерние данные
  let events: Array<{
    id?: number
    time?: number
    label?: string
    event?: string
    is_home?: boolean
    is_away?: boolean
    player?: { name?: string } | null
    info?: { name?: string } | null
    sort?: number
  }> = []
  let lineups: {
    home?: import('@/app/(frontend)/client').Lineup
    away?: import('@/app/(frontend)/client').Lineup
  } = {}
  let stats: Record<string, string | null> | undefined
  let h2h:
    | {
        last_matches_between?: import('@/app/(frontend)/client').Match[]
        team1_last_matches?: import('@/app/(frontend)/client').Match[]
        team2_last_matches?: import('@/app/(frontend)/client').Match[]
      }
    | undefined

  if (match) {
    const settled = await Promise.allSettled([
      getScoresEventsJson({ id }),
      getMatchesLineupsJson({ match_id: id }),
      getMatchesStatsJson({ match_id: id }),
      getTeamsHead2HeadJson({ team1_id: match.home.id, team2_id: match.away.id }),
    ])

    const evRes = settled[0]
    if (evRes.status === 'fulfilled') {
      const e = (evRes.value.data?.data?.event || []) as typeof events
      events = e
        .slice()
        .sort((a, b) => (a.time ?? 0) - (b.time ?? 0) || (a.sort ?? 0) - (b.sort ?? 0))
    }

    const luRes = settled[1]
    if (luRes.status === 'fulfilled') {
      lineups = {
        home: luRes.value.data?.data?.home,
        away: luRes.value.data?.data?.away,
      }
    }

    const stRes = settled[2]
    if (stRes.status === 'fulfilled') {
      stats = stRes.value.data?.data as Record<string, string | null> | undefined
    }

    const h2hRes = settled[3]
    if (h2hRes.status === 'fulfilled') {
      h2h = h2hRes.value.data?.data as typeof h2h
    }
  }

  if (!match) {
    return (
      <Section>
        <Container className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Матч не найден в текущих или недавних матчах.</AlertDescription>
          </Alert>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              На главную
            </Button>
          </Link>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container className="space-y-6">
        {/* Шапка */}
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <LocalDateTime date={match.date} time={match.time} utc />
            {match.competition?.name ? (
              <Badge variant="outline" className="ml-2">
                {match.competition.name}
              </Badge>
            ) : null}
            {match.round ? (
              <Badge variant="secondary" className="ml-2">
                Тур {match.round}
              </Badge>
            ) : null}
            {match.group_id ? (
              <Badge variant="secondary" className="ml-2">
                Группа {match.group_id}
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">
                {match.home.name} — {match.away.name}
              </h1>
            </div>
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              {match.status ? (
                <Badge variant="secondary">{statusRu(match.status) || match.status}</Badge>
              ) : null}
              <Clock className="h-4 w-4" />
              <LocalDateTime date={match.date} time={match.time} utc showDate={false} />
            </div>
          </div>

          {/* Время и обновления */}
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <span className="font-medium">Начало:</span>{' '}
              <LocalDateTime date={match.date} time={match.time} utc />
            </span>
            {typeof match.time_status !== 'undefined' ? (
              <span>
                <span className="font-medium">Сейчас:</span>{' '}
                {timeStatusRu(match.time_status) || '—'}
              </span>
            ) : null}
            {match.last_changed ? (
              <span>
                <span className="font-medium">Обновлено:</span>{' '}
                <LocalDateTime dateTime={match.last_changed.replace(' ', 'T')} utc />
              </span>
            ) : null}
          </div>
        </header>

        {/* Детали */}
        <Card>
          <CardHeader>
            <CardTitle>Детали матча</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Команды */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3">
              <div className="text-right">
                <Link
                  href={`/teams/${match.home.id}`}
                  className="text-lg font-semibold hover:text-primary"
                >
                  {match.home.name}
                </Link>
              </div>
              <div className="text-center text-muted-foreground">vs</div>
              <div className="text-left">
                <Link
                  href={`/teams/${match.away.id}`}
                  className="text-lg font-semibold hover:text-primary"
                >
                  {match.away.name}
                </Link>
              </div>
            </div>

            {/* Место проведения */}
            {match.location ? (
              <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{match.location}</span>
              </div>
            ) : null}

            {/* Текущий счёт */}
            {match.scores?.score ? (
              <div className="text-sm">
                <div className="font-medium mb-1">Счёт</div>
                <div className="text-muted-foreground">{match.scores.score}</div>
                <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-2">
                  {match.scores.ht_score ? <span>1-й тайм: {match.scores.ht_score}</span> : null}
                  {match.scores.ft_score ? (
                    <span>Основное время: {match.scores.ft_score}</span>
                  ) : null}
                  {match.scores.et_score ? <span>Доп. время: {match.scores.et_score}</span> : null}
                  {match.scores.ps_score ? <span>Пенальти: {match.scores.ps_score}</span> : null}
                </div>
              </div>
            ) : null}

            {/* Коэффициенты */}
            {match.odds?.pre && (match.odds.pre['1'] || match.odds.pre.X || match.odds.pre['2']) ? (
              <div className="text-sm">
                <div className="font-medium mb-1">Прематчевые коэффициенты</div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {match.odds.pre['1'] != null ? (
                    <Badge variant="outline">1 {match.odds.pre['1']}</Badge>
                  ) : null}
                  {match.odds.pre.X != null ? (
                    <Badge variant="outline">X {match.odds.pre.X}</Badge>
                  ) : null}
                  {match.odds.pre['2'] != null ? (
                    <Badge variant="outline">2 {match.odds.pre['2']}</Badge>
                  ) : null}
                </div>
              </div>
            ) : null}

            {match.odds?.live &&
            (match.odds.live['1'] != null ||
              match.odds.live.X != null ||
              match.odds.live['2'] != null) ? (
              <div className="text-sm">
                <div className="font-medium mb-1">Live коэффициенты</div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {match.odds.live['1'] != null ? (
                    <Badge variant="outline">1 {match.odds.live['1']}</Badge>
                  ) : null}
                  {match.odds.live.X != null ? (
                    <Badge variant="outline">X {match.odds.live.X}</Badge>
                  ) : null}
                  {match.odds.live['2'] != null ? (
                    <Badge variant="outline">2 {match.odds.live['2']}</Badge>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Исходы по этапам */}
            {match.outcomes &&
            (match.outcomes.half_time ||
              match.outcomes.full_time ||
              match.outcomes.extra_time ||
              match.outcomes.penalty_shootout) ? (
              <div className="text-sm">
                <div className="font-medium mb-1">Исходы</div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  {match.outcomes.half_time ? (
                    <div>1-й тайм: {match.outcomes.half_time}</div>
                  ) : null}
                  {match.outcomes.full_time ? <div>Матч: {match.outcomes.full_time}</div> : null}
                  {match.outcomes.extra_time ? (
                    <div>Доп. время: {match.outcomes.extra_time}</div>
                  ) : null}
                  {match.outcomes.penalty_shootout ? (
                    <div>П��нальти: {match.outcomes.penalty_shootout}</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* События матча */}
        {events.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>События матча</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events.map((ev) => (
                  <div
                    key={ev.id ?? `${ev.time}-${ev.sort}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="text-muted-foreground w-14">{ev.time ? `${ev.time}'` : ''}</div>
                    <div className="flex-1 px-2">
                      <div className="font-medium truncate">{ruEventLabel(ev.label, ev.event)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[ev.player?.name, ev.info?.name].filter(Boolean).join(' / ')}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground w-20 text-right">
                      {ev.is_home ? 'Дома' : ev.is_away ? 'Гости' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Составы */}
        {lineups.home || lineups.away ? (
          <Card>
            <CardHeader>
              <CardTitle>Составы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="font-medium mb-2">{match.home.name}</div>
                  <div className="text-sm text-muted-foreground mb-1">Стартовый состав</div>
                  <div className="space-y-1 text-sm">
                    {lineups.home?.starting_lineup?.map((p, i) => (
                      <div key={`${p?.id ?? i}`} className="flex items-center gap-2">
                        {p?.number != null ? (
                          <span className="text-xs w-6 text-center">{p.number}</span>
                        ) : (
                          <span className="w-6" />
                        )}
                        <span className="truncate">{p?.name}</span>
                        {p?.position ? (
                          <span className="text-xs text-muted-foreground">({p.position})</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {lineups.home?.substitutes && lineups.home.substitutes.length > 0 ? (
                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground mb-1">Запасные</div>
                      <div className="space-y-1 text-sm">
                        {lineups.home.substitutes.map((p, i) => (
                          <div key={`${p?.id ?? i}`} className="flex items-center gap-2">
                            {p?.number != null ? (
                              <span className="text-xs w-6 text-center">{p.number}</span>
                            ) : (
                              <span className="w-6" />
                            )}
                            <span className="truncate">{p?.name}</span>
                            {p?.position ? (
                              <span className="text-xs text-muted-foreground">({p.position})</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="font-medium mb-2">{match.away.name}</div>
                  <div className="text-sm text-muted-foreground mb-1">Стартовый состав</div>
                  <div className="space-y-1 text-sm">
                    {lineups.away?.starting_lineup?.map((p, i) => (
                      <div key={`${p?.id ?? i}`} className="flex items-center gap-2">
                        {p?.number != null ? (
                          <span className="text-xs w-6 text-center">{p.number}</span>
                        ) : (
                          <span className="w-6" />
                        )}
                        <span className="truncate">{p?.name}</span>
                        {p?.position ? (
                          <span className="text-xs text-muted-foreground">({p.position})</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {lineups.away?.substitutes && lineups.away.substitutes.length > 0 ? (
                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground mb-1">Запасные</div>
                      <div className="space-y-1 text-sm">
                        {lineups.away.substitutes.map((p, i) => (
                          <div key={`${p?.id ?? i}`} className="flex items-center gap-2">
                            {p?.number != null ? (
                              <span className="text-xs w-6 text-center">{p.number}</span>
                            ) : (
                              <span className="w-6" />
                            )}
                            <span className="truncate">{p?.name}</span>
                            {p?.position ? (
                              <span className="text-xs text-muted-foreground">({p.position})</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Статистика */}
        {stats && Object.keys(stats).length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 text-sm">
                {(() => {
                  const map = new Map<string, { info: StatInfo; val: string }>()
                  for (const [k, vRaw] of Object.entries(stats ?? {})) {
                    if (!vRaw) continue
                    const norm = normalizeStatKey(k)
                    if (map.has(norm)) continue // избегаем дублей одного показателя
                    const info = statKeyInfo(k)
                    const val = String(vRaw)
                    map.set(norm, { info, val })
                  }

                  function parsePair(raw: string): { home: number; away: number; isPercent: boolean; textHome: string; textAway: string } {
                    const [hRaw, aRaw] = raw.split(':')
                    const clean = (s?: string) => String(s ?? '').trim()
                    const hasPct = clean(hRaw).includes('%') || clean(aRaw).includes('%')
                    const toNum = (s?: string) => {
                      const t = clean(s).replace('%', '')
                      const n = Number(t)
                      return Number.isFinite(n) ? n : 0
                    }
                    const h = toNum(hRaw)
                    const a = toNum(aRaw)
                    return {
                      home: h,
                      away: a,
                      isPercent: hasPct,
                      textHome: clean(hRaw),
                      textAway: clean(aRaw),
                    }
                  }

                  return Array.from(map.values())
                    .sort((a, b) => a.info.weight - b.info.weight || a.info.labelRu.localeCompare(b.info.labelRu, 'ru'))
                    .map(({ info, val }) => {
                      const pair = parsePair(val)
                      const total = pair.home + pair.away
                      const homePct = pair.isPercent
                        ? Math.max(0, Math.min(100, pair.home))
                        : total > 0
                          ? (pair.home / total) * 100
                          : 50
                      const awayPct = 100 - homePct
                      return (
                        <div key={info.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground truncate inline-flex items-center gap-2">
                              <span aria-hidden>{info.emoji}</span>
                              <span>{info.labelRu}</span>
                            </span>
                            <span className="tabular-nums text-right min-w-[90px]">
                              <span>{pair.textHome}</span>
                              <span className="text-muted-foreground"> : </span>
                              <span>{pair.textAway}</span>
                            </span>
                          </div>
                          <div className="h-2 w-full rounded bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${homePct}%` }} />
                            <div className="h-full bg-accent" style={{ width: `${awayPct}%` }} />
                          </div>
                        </div>
                      )
                    })
                })()}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Очные встречи (H2H) */}
        {h2h &&
        (h2h.last_matches_between?.length ||
          h2h.team1_last_matches?.length ||
          h2h.team2_last_matches?.length) ? (
          <Card>
            <CardHeader>
              <CardTitle>История встреч</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {h2h.last_matches_between && h2h.last_matches_between.length > 0 ? (
                <div>
                  <div className="font-medium mb-2">Последние очные матчи</div>
                  <div className="space-y-1 text-sm">
                    {h2h.last_matches_between.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          <LocalDateTime
                            date={m.date as unknown as string}
                            time={m.time as unknown as string}
                            utc
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[180px] text-right">{m.home?.name}</span>
                          <span className="text-muted-foreground">
                            {m.scores?.ft_score || m.scores?.score || 'vs'}
                          </span>
                          <span className="truncate max-w-[180px]">{m.away?.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {h2h.team1_last_matches && h2h.team1_last_matches.length > 0 ? (
                <div>
                  <div className="font-medium mb-2">Последние матчи — {match.home.name}</div>
                  <div className="space-y-1 text-sm">
                    {h2h.team1_last_matches.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          <LocalDateTime
                            date={m.date as unknown as string}
                            time={m.time as unknown as string}
                            utc
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[180px] text-right">{m.home?.name}</span>
                          <span className="text-muted-foreground">
                            {m.scores?.ft_score || m.scores?.score || 'vs'}
                          </span>
                          <span className="truncate max-w-[180px]">{m.away?.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {h2h.team2_last_matches && h2h.team2_last_matches.length > 0 ? (
                <div>
                  <div className="font-medium mb-2">Последние матчи — {match.away.name}</div>
                  <div className="space-y-1 text-sm">
                    {h2h.team2_last_matches.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          <LocalDateTime
                            date={m.date as unknown as string}
                            time={m.time as unknown as string}
                            utc
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[180px] text-right">{m.home?.name}</span>
                          <span className="text-muted-foreground">
                            {m.scores?.ft_score || m.scores?.score || 'vs'}
                          </span>
                          <span className="truncate max-w-[180px]">{m.away?.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Навигация */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              На главную
            </Button>
          </Link>
          {match.competition?.id ? (
            <Link href={`/leagues/${match.competition.id}`}>
              <Button variant="outline" size="sm">
                К турниру
              </Button>
            </Link>
          ) : null}
          {match.fixture_id ? (
            <Link href={`/fixtures/${match.fixture_id}`}>
              <Button variant="outline" size="sm">
                К расписанию
              </Button>
            </Link>
          ) : null}
        </div>
      </Container>
    </Section>
  )
}
