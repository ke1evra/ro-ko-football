import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { customFetch } from '@/lib/http/livescore/customFetch'
import { getPayload } from 'payload'
import config from '@payload-config'
import { FlagImage } from '@/components/FlagImage'

import { CountryFlagImage } from '@/components/CountryFlagImage'
import ApiTestPanel from '@/components/ApiTestPanel'

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

type PostLite = { id: string | number; title: string; slug?: string; publishedAt?: string }

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
    const res = await customFetch('countries/list.json', {
      next: { revalidate: 300 },
    } as RequestInit)
    let raw: unknown
    try {
      raw = await res.json()
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
  const res = await customFetch('competitions/list.json?size=60', {
    next: { revalidate: 60 },
  } as unknown as RequestInit)

  let raw: unknown
  try {
    raw = await res.json()
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

async function getRecentPosts(limit = 5): Promise<PostLite[]> {
  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'posts',
      sort: '-publishedAt',
      limit,
    })

    const safe: PostLite[] = docs
      .map((p: unknown) => {
        if (!p || typeof p !== 'object') return null
        const o = p as Record<string, unknown>
        const id = (o.id as string | number) ?? ''
        const title = typeof o.title === 'string' ? o.title : ''
        const slug = typeof o.slug === 'string' ? o.slug : undefined
        const publishedAt = typeof o.publishedAt === 'string' ? o.publishedAt : undefined
        if (!id || !title) return null
        return { id, title, slug, publishedAt }
      })
      .filter((v): v is PostLite => Boolean(v))

    return safe
  } catch {
    return []
  }
}

export default async function Home() {
  const [highlight, posts] = await Promise.all([getHighlightedCompetitions(), getRecentPosts(5)])

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
              href="/leagues"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Все лиги
            </Link>
            <Link
              href="/posts"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Посты сообщества
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Мой профиль
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
                      countryCode={c.country?.flag}
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
                          countryCode={c.country.flag}
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

        {/* Отладочная информация в dev режиме */}
        {process.env.NODE_ENV === 'development' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Отладка флагов (dev only)</h2>
            <div className="text-xs space-y-2">
              {highlight.slice(0, 3).map((c) => (
                <div key={c.id} className="border rounded p-2">
                  <div>
                    <strong>{c.name}</strong> ({c.country?.name})
                  </div>
                  <div>Flag URL: {c.country?.flag || 'нет'}</div>
                  {c.country?.flag && (
                    <div className="flex items-center gap-2 mt-1">
                      <span>Тест:</span>
                      <FlagImage
                        src={c.country.flag}
                        countryName={c.country.name}
                        size="small"
                        className="h-4 w-4 border"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {/* API тест-панель */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Тестирование API</h2>
          <ApiTestPanel />
        </section>
      </Container>
    </Section>
  )
}
