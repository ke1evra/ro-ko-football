import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { customFetch } from '@/lib/http/livescore/customFetch'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import type { Post } from '@/payload-types'
import { getFixturesMatchesJson, getMatchesLiveJson, getMatchesHistoryJson } from '@/app/(frontend)/client'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { LocalDateTime } from '@/components/LocalDateTime'
import { Badge } from '@/components/ui/badge'
import WeekFixturesGrouped from '@/components/home/WeekFixturesGrouped'

export const revalidate = 60

// Настройки подсветки главных лиг по странам (RU-названия)
const HIGHLIGHT_COUNTRIES_RU = new Set([
  'Англия',
  'Германия',
  'Италия',
  'Франция',
  'Испания',
  'Россия',
  'Португалия',
  'Бельгия',
  'Норвегия',
  'Швеция',
])

type Country = { id?: number; name?: string; flag?: string | null; teamId?: number | string }
export type Competition = {
  id: number
  name: string
  country?: Country | null
  teamId?: number | string
}

type RawCompetition = {
  id?: number | string
  name?: string
  countries?: { id?: number | string; name?: string; flag?: string | null }[]
  team_id?: number | string // ID команды для получения флага
}

type RawCountry = { id?: number | string; name?: string; flag?: string | null }

type PostLite = Pick<Post, 'id' | 'title' | 'slug' | 'publishedAt'>

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isNaN(n) ? undefined : n
  }
  return undefined
}

function extractCompetitions(raw: unknown): Competition[] {
  const pickArrays = (obj: unknown): unknown[] => {
    const arrs: unknown[] = []
    if (Array.isArray(obj)) arrs.push(obj)
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>
      if (Array.isArray(o.competitions)) arrs.push(o.competitions)
      if (o.data && typeof o.data === 'object') {
        const d = o.data as Record<string, unknown>
        if (Array.isArray(d.competitions)) arrs.push(d.competitions)
        if (Array.isArray(d.competition)) arrs.push(d.competition)
        if (d.data && typeof d.data === 'object') {
          const dd = d.data as Record<string, unknown>
          if (Array.isArray(dd.competitions)) arrs.push(dd.competitions)
        }
      }
    }
    return arrs
  }

  const candidates = pickArrays(raw)
  for (const arr of candidates) {
    if (Array.isArray(arr)) {
      const mapped: Competition[] = arr
        .map((item: unknown) => {
          const c = item as RawCompetition
          const id = toNumber(c.id)
          const name = typeof c.name === 'string' ? c.name : undefined
          const teamId = toNumber(c.team_id)
          const country =
            Array.isArray(c.countries) && c.countries.length > 0 ? c.countries[0] : undefined

          if (!id || !name) return null
          const countrySafe: Country | null = country
            ? {
                id: toNumber(country.id),
                name: typeof country.name === 'string' ? country.name : undefined,
                flag: typeof country.flag === 'string' ? country.flag : null,
                teamId: teamId,
              }
            : null

          return { id, name, country: countrySafe, teamId }
        })
        .filter((v): v is Competition => Boolean(v))

      if (mapped.length) return mapped
    }
  }
  return []
}

function extractCountries(raw: unknown): RawCountry[] {
  const out: RawCountry[] = []
  const pushFrom = (v: unknown) => {
    if (Array.isArray(v)) {
      for (const it of v) {
        const item = it as RawCountry
        out.push({ id: item?.id, name: item?.name, flag: item?.flag })
      }
    }
  }

  if (Array.isArray(raw)) pushFrom(raw)
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    pushFrom(o.countries)
    if (o.data && typeof o.data === 'object') {
      const d = o.data as Record<string, unknown>
      pushFrom(d.countries)
      if (d.data && typeof d.data === 'object') {
        const dd = d.data as Record<string, unknown>
        pushFrom(dd.countries)
      }
    }
  }

  return out
}

async function getCountriesMap(): Promise<Map<string, string>> {
  try {
    const res = await customFetch({
      method: 'GET',
      url: '/countries/list.json',
      next: { revalidate: 300 },
    })
    let raw: unknown
    try {
      raw = res.data
    } catch {
      raw = null
    }
    const arr = extractCountries(raw)
    const map = new Map<string, string>()
    for (const c of arr) {
      const name = typeof c.name === 'string' ? c.name.trim() : ''
      const flag = typeof c.flag === 'string' ? c.flag : ''
      if (name && flag) map.set(name, flag)
    }
    return map
  } catch {
    return new Map<string, string>()
  }
}

async function getCompetitionsList(): Promise<Competition[]> {
  const res = await customFetch({
    method: 'GET',
    url: '/competitions/list.json',
    params: { size: 60 },
    next: { revalidate: 60 },
  })

  let raw: unknown
  try {
    raw = res.data
  } catch {
    raw = null
  }

  return extractCompetitions(raw)
}

async function getHighlightedCompetitions(): Promise<Competition[]> {
  // Параллельно получаем соревнования и страны
  const [competitions, countriesMap] = await Promise.all([getCompetitionsList(), getCountriesMap()])

  // Подставляем иконки стран, если их не прислали в competitions
  const competitionsWithFlags: Competition[] = competitions.map((c) => {
    const name = c.country?.name?.trim()
    const knownFlag = c.country?.flag
    const mapFlag = name ? countriesMap.get(name) : undefined
    return {
      ...c,
      country: {
        id: c.country?.id,
        name: c.country?.name,
        flag: knownFlag || mapFlag || null,
      },
    }
  })

  // Подсветка по странам, максимум 9
  const chosenByCountry = new Map<string, Competition>()
  for (const c of competitionsWithFlags) {
    const country = (c.country?.name || '').trim()
    if (country && HIGHLIGHT_COUNTRIES_RU.has(country) && !chosenByCountry.has(country)) {
      chosenByCountry.set(country, c)
      if (chosenByCountry.size >= 9) break
    }
  }
  let highlight = Array.from(chosenByCountry.values())
  if (highlight.length === 0) highlight = competitionsWithFlags.slice(0, 9)
  return highlight
}

interface MatchData {
  id: number
  date: string
  time: string
  home_team: { id: number; name: string }
  away_team: { id: number; name: string }
  competition?: { id: number; name: string }
  location?: string | null
  round?: string
  group_id?: number | null
  odds?: {
    pre?: { '1'?: number; '2'?: number; X?: number }
    live?: { '1'?: number | null; '2'?: number | null; X?: number | null }
  }
  h2h?: string
  // Для live и history
  status?: string
  time_status?: string | null
  scores?: {
    score?: string
    ht_score?: string
    ft_score?: string
    et_score?: string
    ps_score?: string
  }
  match_id?: number
  fixture_id?: number
}



async function getLiveMatches(): Promise<MatchData[]> {
  try {
    const resp = await getMatchesLiveJson(
      { size: 100 },
      { next: { revalidate: 60 } }
    )
    
    const matches = (resp.data?.data?.match || []) as Array<any>
    
    return matches.map((m: any) => ({
      id: Number(m.fixture_id || m.id || 0),
      match_id: Number(m.id || 0),
      fixture_id: Number(m.fixture_id || 0),
      date: String(m.date || ''),
      time: String(m.time || ''),
      home_team: {
        id: Number(m.home?.id || 0),
        name: m.home?.name || 'Команда дома',
      },
      away_team: {
        id: Number(m.away?.id || 0),
        name: m.away?.name || 'Команда гостей',
      },
      competition: m.competition
        ? { id: Number(m.competition.id || 0), name: m.competition.name || '' }
        : undefined,
      location: typeof m.location === 'string' ? m.location : null,
      round: typeof m.round === 'string' ? m.round : m.round != null ? String(m.round) : undefined,
      group_id: m.group_id != null ? Number(m.group_id) : null,
      status: m.status,
      time_status: m.time_status,
      scores: m.scores,
      odds: m.odds,
    }))
  } catch {
    return []
  }
}

async function getRecentMatches(): Promise<MatchData[]> {
  try {
    const now = new Date()
    const to = new Date(now.toISOString().split('T')[0])
    const from = new Date(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    
    const resp = await getMatchesHistoryJson(
      { from, to, size: 100 },
      { next: { revalidate: 60 } }
    )
    
    const matches = (resp.data?.data?.match || []) as Array<any>
    
    return matches.map((m: any) => ({
      id: Number(m.fixture_id || m.id || 0),
      match_id: Number(m.id || 0),
      fixture_id: Number(m.fixture_id || 0),
      date: String(m.date || ''),
      time: String(m.time || ''),
      home_team: {
        id: Number(m.home?.id || 0),
        name: m.home?.name || 'Команда дома',
      },
      away_team: {
        id: Number(m.away?.id || 0),
        name: m.away?.name || 'Команда гостей',
      },
      competition: m.competition
        ? { id: Number(m.competition.id || 0), name: m.competition.name || '' }
        : undefined,
      location: typeof m.location === 'string' ? m.location : null,
      round: typeof m.round === 'string' ? m.round : m.round != null ? String(m.round) : undefined,
      group_id: m.group_id != null ? Number(m.group_id) : null,
      status: m.status || 'FINISHED',
      time_status: m.time_status,
      scores: m.scores,
      odds: m.odds,
    }))
  } catch {
    return []
  }
}

async function getUpcomingMatches(): Promise<MatchData[]> {
  try {
    const now = new Date()
    const start = new Date(now.toISOString().split('T')[0])
    const end = new Date(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])



    // Загружаем несколько страниц, чтобы покрыть неделю
    const fixturesRaw: any[] = []
    let page = 1
    let hasNext = true
    const maxPages = 5

    while (hasNext && page <= maxPages) {
      const resp = await getFixturesMatchesJson(
        { from: start, to: end, size: 100, page },
        { next: { revalidate: 60 } },
      )
      const chunk = (resp.data?.data?.fixtures || []) as Array<any>
      fixturesRaw.push(...chunk)
      const nextURL = resp.data?.data?.next_page as string | null | undefined
      hasNext = Boolean(nextURL)
      page += 1
    }

    const fixtures = fixturesRaw
    


    const mapped: MatchData[] = fixtures
      .map((fx: any) => {
        const homeTeam = fx.home?.name || fx.home_team?.name || fx.home_name || 'Команда дома'
        const awayTeam = fx.away?.name || fx.away_team?.name || fx.away_name || 'Команда гостей'
        
        return {
          id: Number(fx.id),
          date: String(fx.date || ''),
          time: String(fx.time || ''),
          home_team: {
            id: Number(fx.home?.id || fx.home_team?.id || fx.home_id || '0'),
            name: homeTeam,
          },
          away_team: {
            id: Number(fx.away?.id || fx.away_team?.id || fx.away_id || '0'),
            name: awayTeam,
          },
          competition: fx.competition
            ? { id: Number(fx.competition.id || '0'), name: fx.competition.name || '' }
            : undefined,
          location: typeof fx.location === 'string' ? fx.location : fx.venue?.name || null,
          round: typeof fx.round === 'string' ? fx.round : fx.round != null ? String(fx.round) : undefined,
          group_id: fx.group_id != null ? Number(fx.group_id) : null,
          odds: fx.odds,
          h2h: typeof fx.h2h === 'string' ? fx.h2h : undefined,
        }
      })
      .filter((m: MatchData) => Boolean(m.id && m.date))



    mapped.sort(
      (a: MatchData, b: MatchData) =>
        new Date(`${a.date}T${a.time || '00:00'}Z`).getTime() -
        new Date(`${b.date}T${b.time || '00:00'}Z`).getTime(),
    )

    return mapped
  } catch (error) {
    console.error('[DEBUG] Ошибка загрузки матчей:', error)
    return []
  }
}

async function getRecentPosts(limit = 5): Promise<PostLite[]> {
  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'posts',
      sort: '-publishedAt',
      limit,
    })

    // Используем нативные типы Payload
    return docs
      .filter((post): post is Post => Boolean(post.id && post.title))
      .map(
        (post): PostLite => ({
          id: post.id,
          title: post.title,
          slug: post.slug || undefined,
          publishedAt: post.publishedAt || undefined,
        }),
      )
  } catch {
    return []
  }
}

export default async function Home() {
  const [highlight, posts, live, recent, upcoming] = await Promise.all([
    getHighlightedCompetitions(),
    getRecentPosts(5),
    getLiveMatches(),
    getRecentMatches(),
    getUpcomingMatches(),
  ])

  return (
    <Section>
      <Container className="space-y-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Футбольные лиги, матчи и комьюнити</h1>
          <p className="text-muted-foreground max-w-2xl">
            Обзор лиг и сезонов, таблицы, новости и посты. Переходите к лигам или читайте свежие
            материалы от сообщества.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/federations"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              🌍 Федерации
            </Link>
            <Link
              href="/countries"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              🏴 Страны
            </Link>
            <Link
              href="/leagues"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              🏆 Все лиги
            </Link>
            <Link
              href="/posts"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              📝 Посты сообщества
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              👤 Мой профиль
            </Link>
          </div>
        </header>

        {/* Популярные лиги */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Популярные лиги</h2>
            <Link href="/leagues" className="text-sm text-primary hover:underline">
              Смотреть все
            </Link>
          </div>
          {highlight.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Данные по лигам недоступны. Проверьте лимиты API или ключи.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {highlight.map((c) => (
                <Link
                  key={c.id}
                  href={`/leagues/${c.id}`}
                  className="group border rounded-md p-4 flex items-center gap-3 hover:bg-accent transition-colors"
                >
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                    <CountryFlagImage
                      countryId={c.country?.id}
                      countryName={c.country?.name}
                      size="large"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    {c.country?.name ? (
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <CountryFlagImage
                          countryId={c.country.id}
                          countryName={c.country.name}
                          size="small"
                          className="h-3 w-3 rounded-sm object-cover"
                        />
                        <span className="truncate">{c.country.name}</span>
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Текущие матчи */}
        {live.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">🔴 Идут сейчас</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {live.slice(0, 6).map((m) => (
                <Link
                  key={m.match_id || m.id}
                  href={`/matches/${m.match_id || m.id}`}
                  className="group rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="destructive" className="text-xs">
                      {m.time_status || m.status || 'LIVE'}
                    </Badge>
                    {m.competition?.name && (
                      <span className="text-xs text-muted-foreground truncate ml-2">
                        {m.competition.name}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{m.home_team.name}</span>
                      <span className="text-sm font-bold">{m.scores?.score?.split(' - ')[0] || '0'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{m.away_team.name}</span>
                      <span className="text-sm font-bold">{m.scores?.score?.split(' - ')[1] || '0'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Недавние результаты */}
        {recent.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Недавние результаты</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {recent.slice(0, 12).map((m) => (
                <Link
                  key={m.match_id || m.id}
                  href={`/matches/${m.match_id || m.id}`}
                  className="group rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      <LocalDateTime date={m.date} time={m.time} utc showTime={false} />
                    </span>
                    {m.competition?.name && (
                      <span className="text-xs text-muted-foreground truncate ml-2">
                        {m.competition.name}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{m.home_team.name}</span>
                      <span className="text-sm font-bold">{m.scores?.score?.split(' - ')[0] || '0'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{m.away_team.name}</span>
                      <span className="text-sm font-bold">{m.scores?.score?.split(' - ')[1] || '0'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Ближайшие матчи */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Ближайшие матчи</h2>
            <Link href="/leagues" className="text-sm text-primary hover:underline">
              К соревнованиям
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground">Нет ближайших матчей</div>
          ) : (
            <WeekFixturesGrouped matches={upcoming} />
          )}
        </section>

        {/* Свежие посты */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Свежие посты</h2>
            <Link href="/posts" className="text-sm text-primary hover:underline">
              Смотреть все
            </Link>
          </div>
          {posts.length === 0 ? (
            <div className="text-sm text-muted-foreground">Пока нет постов</div>
          ) : (
            <div className="divide-y rounded-md border">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={p.slug ? `/posts/${p.slug}` : '/posts'}
                  className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="truncate pr-3">{p.title}</div>
                  {p.publishedAt ? (
                    <div className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                      {new Date(p.publishedAt).toLocaleDateString('ru-RU')}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </section>
      </Container>
    </Section>
  )
}
