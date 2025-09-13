import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { customFetch } from '@/lib/http/livescore/customFetch'
import type { Competition as ApiCompetition } from '@/app/(frontend)/client/types'

export const revalidate = 60 // кэш страницы на 1 минуту

// Временная константа для подсветки топ-лиг. Заполним ID после первичного осмотра API.
// Пример: [227 /* Premier League */, 67 /* Bundesliga */, ...]
const HIGHLIGHT_LEAGUE_IDS: number[] = []
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

// Расширенный тип для совместимости с существующим кодом
export type Competition = ApiCompetition & {
  // Вычисляемое поле для совместимости с существующим кодом
  country?: { id?: number; name?: string; flag?: string | null } | null
}

function extractCompetitions(raw: any): Competition[] {
  // На всякий случай поддерживаем несколько схем от��ета
  const candidates: any[] = []
  if (Array.isArray(raw)) candidates.push(raw)
  if (Array.isArray(raw?.competitions)) candidates.push(raw.competitions)
  if (Array.isArray(raw?.data?.competitions)) candidates.push(raw.data.competitions)
  if (Array.isArray(raw?.data?.competition)) candidates.push(raw.data.competition)
  if (Array.isArray(raw?.data?.data?.competitions)) candidates.push(raw.data.data.competitions)

  for (const arr of candidates) {
    if (Array.isArray(arr)) {
      // Преобразуем данные под ожидаемый формат
      return arr.map((item: any) => ({
        ...item,
        // Добавляем вычисляемое поле country из массива countries для совместимости
        country:
          item.countries && item.countries.length > 0
            ? {
                id: Number(item.countries[0].id),
                name: item.countries[0].name,
                flag: item.countries[0].flag,
              }
            : null,
      })) as Competition[]
    }
  }
  return []
}

async function getCompetitionsDetailed(): Promise<{
  list: Competition[]
  raw: any
  status: number
  ok: boolean
}> {
  const res = await customFetch('competitions/list.json?size=100', {
    // Кэшируем ответ фетча на 1 минуту, чтобы экономить лимит
    next: { revalidate: 60 },
  } as any)

  const status = res.status
  let raw: any
  try {
    raw = await res.json()
  } catch {
    try {
      const text = await res.text()
      raw = { text }
    } catch {
      raw = null
    }
  }

  const list: Competition[] = extractCompetitions(raw)
  return { list, raw, status, ok: res.ok }
}

function byName(a?: string | null, b?: string | null) {
  return (a || '').localeCompare(b || '', 'ru')
}

export default async function LeaguesPage() {
  const { list: competitions, raw, status, ok } = await getCompetitionsDetailed()

  // Вычислим подсветку: при наличии фиксированных ID используем их, иначе — по странам
  let highlight: Competition[] = []
  if (HIGHLIGHT_LEAGUE_IDS.length) {
    highlight = competitions.filter((c) => HIGHLIGHT_LEAGUE_IDS.includes(Number(c.id)))
  }
  if (highlight.length === 0) {
    const byCountry = new Map<string, Competition>()
    for (const c of competitions) {
      const country = (c.country?.name || '').trim()
      if (HIGHLIGHT_COUNTRIES_RU.has(country) && !byCountry.has(country)) {
        byCountry.set(country, c)
      }
      if (byCountry.size >= 10) break
    }
    highlight = Array.from(byCountry.values())
  }
  if (highlight.length === 0) {
    highlight = competitions.slice(0, 9)
  }

  const rest = competitions.filter((c) => !highlight.find((h) => h.id === c.id))

  // Сортировка остальных по стране/названию
  rest.sort((a, b) => byName(a.country?.name, b.country?.name) || byName(a.name, b.name))

  return (
    <Section>
      <Container className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Лиги</h1>
          <p className="text-sm text-muted-foreground">
            Подсвечены основные лиги. Остальные доступны списком ниже.
          </p>
        </header>

        {competitions.length === 0 ? (
          <p className="text-sm text-destructive">
            Нет данных соревнований. Проверьте ключи API/лимиты. Смотрите отладочный блок ниже.
          </p>
        ) : null}

        {/* Подсвеченные лиги: карточки по 3 в ряд */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {highlight.map((c) => (
            <Link
              key={c.id}
              href={`/leagues/${c.id}`}
              className="group border rounded-md p-4 flex items-center gap-3 hover:bg-accent transition-colors"
            >
              {/* Логотип: если у соревнования нет своего, используем флаг страны или фолбек */}
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                {c.country?.flag ? (
                  // Не используем next/image, чтобы не настраивать domains на этом шаге
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.country.flag} alt="flag" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl" aria-hidden>
                    ⚽
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                {c.country?.name ? (
                  <div className="text-xs text-muted-foreground truncate">{c.country.name}</div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>

        {/* Остальные лиги: простынка списком, менее подробно */}
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Все лиги</h2>
          <div className="divide-y rounded-md border">
            {rest.map((c) => (
              <Link
                key={c.id}
                href={`/leagues/${c.id}`}
                className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center overflow-hidden">
                  {c.country?.flag ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.country.flag} alt="flag" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm" aria-hidden>
                      ⚽
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{c.name}</div>
                </div>
                {c.country?.name ? (
                  <div className="text-xs text-muted-foreground ml-auto">{c.country.name}</div>
                ) : null}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Отладка ответа API</h2>
          <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
            <span>status: {status}</span>
            <span>ok: {String(ok)}</span>
            <span>competitions: {competitions.length}</span>
            <span>highlight: {highlight.length}</span>
            <span>rest: {rest.length}</span>
          </div>
          <pre className="text-xs overflow-auto rounded-md border p-3 bg-muted">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </section>
      </Container>
    </Section>
  )
}
