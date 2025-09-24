import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Calendar } from 'lucide-react'
import {
  getCompetitionsListJson,
  getCountriesListJson,
  getFederationsListJson,
  getFixturesMatchesJson,
} from '@/app/(frontend)/client'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import LeaguesGroupedSearch from '@/components/league/LeaguesGroupedSearch'

export const revalidate = 60 // кэш страницы на 1 минуту

interface LeaguesPageProps {
  searchParams: Promise<{
    country?: string
    federation?: string
    page?: string
  }>
}

interface CompetitionItem {
  id: number
  name: string
  country?: {
    id?: number
    name?: string
    flag?: string | null
  } | null
}

// Топ страны (фиксированный порядок) - на английском ка�� в API
const HIGHLIGHT_COUNTRY_ORDER_EN = [
  'England',
  'Italy', 
  'Spain',
  'France',
  'Russia',
  'Germany',
]

const HIGHLIGHT_COUNTRIES_EN = new Set(HIGHLIGHT_COUNTRY_ORDER_EN)

// Маппинг английских названий на русские для отображения
const COUNTRY_NAMES_RU: Record<string, string> = {
  'England': 'Англия',
  'Italy': 'Италия',
  'Spain': 'Испания', 
  'France': 'Франция',
  'Russia': 'Россия',
  'Germany': 'Германия',
}

// Паттерны для поиска топ-лиг
const LEAGUE_PATTERNS: Record<string, RegExp[]> = {
  England: [/premier\s*league/i, /премьер/i],
  Italy: [/serie\s*a/i, /серия\s*a/i],
  Spain: [/(la\s*liga|laliga|примера)/i],
  France: [/(ligue\s*1|лига\s*1)/i],
  Russia: [/российская|рпл|rfpl/i],
  Germany: [/bundesliga|бундеслига/i],
}

// Названия еврокубков
const UEFA_CHAMPIONS_LEAGUE_NAMES = new Set([
  'UEFA Champions League',
  'Лига чемпионов УЕФА',
  'Лига чемпионов',
])
const UEFA_EUROPA_LEAGUE_NAMES = new Set([
  'UEFA Europa League',
  'Лига Европы УЕФА',
  'Лига Европы',
])

function byName(a?: string | null, b?: string | null) {
  return (a || '').localeCompare(b || '', 'ru')
}

function matchByPatterns(name?: string, patterns: RegExp[] = []) {
  if (!name) return false
  return patterns.some((re) => re.test(name))
}

async function getCompetitions(
  countryId?: string,
  federationId?: string,
  page = 1,
): Promise<{
  competitions: CompetitionItem[]
  hasMore: boolean
  countryName?: string
  federationName?: string
}> {
  try {
    // Получаем соревнования (ограничиваем size для избежания таймаутов)
    const params = {
      page,
      size: !countryId && !federationId ? 100 : 50, // Уменьшили с 1000 до 100
      ...(countryId && { country_id: parseInt(countryId) }),
      ...(federationId && { federation_id: parseInt(federationId) }),
    }

    const response = await getCompetitionsListJson(params, {
      next: { revalidate: 60 },
      cache: 'no-store', // Отключаем кэш для избежания ошибок
    })

    const competitionsRaw = (response.data?.data?.competition || []) as Array<{
      id?: number | string
      name?: string
      countries?: Array<{ id?: number | string; name?: string; flag?: string | null }>
    }>
    const competitions = competitionsRaw
      .map((comp): CompetitionItem | null => {
        if (!comp?.id || !comp?.name) return null
        const country = comp.countries && comp.countries.length > 0 ? comp.countries[0] : undefined
        return {
          id: Number(comp.id),
          name: comp.name,
          country: country
            ? {
                id: country.id != null ? Number(country.id) : undefined,
                name: country.name,
                flag: country.flag ?? null,
              }
            : undefined,
        }
      })
      .filter((c): c is CompetitionItem => c !== null)

    // Получаем название страны если указан ID
    let countryName: string | undefined
    if (countryId) {
      try {
        const countryResponse = await getCountriesListJson(
          {},
          {
            next: { revalidate: 300 },
          },
        )

        const countriesRaw = (countryResponse.data?.data?.country || []) as Array<{
          id?: number | string
          name?: string
        }>
        const country = countriesRaw.find((c) => Number(c.id) === Number(countryId))
        countryName = country?.name
      } catch (error) {
        console.error('Ошибка загрузки названия страны:', error)
      }
    }

    // Получаем название федерации если указан ID
    let federationName: string | undefined
    if (federationId) {
      try {
        const fedResponse = await getFederationsListJson({
          next: { revalidate: 300 },
        })

        const federationsRaw = (fedResponse.data?.data?.data?.federation || []) as Array<{
          id?: number | string
          name?: string
        }>
        const federation = federationsRaw.find((f) => String(f.id) === String(federationId))
        federationName = federation?.name
      } catch (error) {
        console.error('Ошибка загрузки названия федерации:', error)
      }
    }

    return {
      competitions,
      hasMore: competitions.length === params.size,
      countryName,
      federationName,
    }
  } catch (error) {
    console.error('Ошибка загрузки соревнований:', error)
    return { competitions: [], hasMore: false }
  }
}

function selectTopLeagues(competitions: CompetitionItem[]): CompetitionItem[] {
  const byCountry = new Map<string, CompetitionItem>()

  console.log('=== ОТЛАДКА ВЫБОРА ТОП-ЛИГ ===')
  console.log('Всего соревнований:', competitions.length)
  console.log('Ищем страны:', HIGHLIGHT_COUNTRY_ORDER_EN)
  
  // Показываем примеры соревнований по целевым странам
  const byCountryDebug = new Map<string, CompetitionItem[]>()
  for (const c of competitions) {
    const country = (c.country?.name || '').trim()
    if (HIGHLIGHT_COUNTRIES_EN.has(country)) {
      if (!byCountryDebug.has(country)) byCountryDebug.set(country, [])
      byCountryDebug.get(country)!.push(c)
    }
  }
  
  console.log('Найденные соревнования по целевым странам:')
  for (const [country, comps] of byCountryDebug.entries()) {
    console.log(`${country}: ${comps.length} соревнований`, comps.slice(0, 5).map(c => c.name))
  }

  // Выбираем по паттернам названий
  for (const c of competitions) {
    const country = (c.country?.name || '').trim()
    if (!HIGHLIGHT_COUNTRIES_EN.has(country)) continue
    if (byCountry.has(country)) continue
    
    const patterns = LEAGUE_PATTERNS[country]
    if (patterns && matchByPatterns(c.name, patterns)) {
      console.log(`✓ Найдена лига по паттерну для ${country}:`, c.name)
      byCountry.set(country, c)
    }
  }

  // Фолбэк: первый турнир по стране (только с country.id)
  for (const c of competitions) {
    const country = (c.country?.name || '').trim()
    if (!HIGHLIGHT_COUNTRIES_EN.has(country)) continue
    if (byCountry.has(country)) continue
    if (c.country?.id) {
      console.log(`✓ Найдена лига фолбэком для ${country}:`, c.name)
      byCountry.set(country, c)
    }
  }

  const result = HIGHLIGHT_COUNTRY_ORDER_EN.map((country) => byCountry.get(country)).filter(Boolean) as CompetitionItem[]
  console.log('=== ИТОГОВЫЕ ТОП-ЛИГИ ===')
  console.log(result.map(c => ({ name: c.name, country: c.country?.name })))
  
  return result
}

async function getTodayEuropeanFixtures() {
  try {
    const today = new Date()
    const resp = await getFixturesMatchesJson(
      { date: today, size: 200, lang: 'ru' as any },
      { next: { revalidate: 60 } },
    )
    const fixtures = (resp.data?.data?.fixtures || []) as any[]
    const byComp: Record<'ucl' | 'uel', any[]> = { ucl: [], uel: [] }

    for (const fx of fixtures) {
      const compName: string = fx.competition?.name || ''
      if (UEFA_CHAMPIONS_LEAGUE_NAMES.has(compName) || /champions/i.test(compName)) {
        byComp.ucl.push(fx)
      }
      if (UEFA_EUROPA_LEAGUE_NAMES.has(compName) || /europa/i.test(compName)) {
        byComp.uel.push(fx)
      }
    }

    return byComp
  } catch (e) {
    console.error('Ошибка загрузки расписания на сегодня:', e)
    return { ucl: [], uel: [] }
  }
}

export default async function LeaguesPage({ searchParams }: LeaguesPageProps) {
  const resolvedSearchParams = await searchParams
  const countryId = resolvedSearchParams.country
  const federationId = resolvedSearchParams.federation
  const page = parseInt(resolvedSearchParams.page || '1')

  const { competitions, hasMore, countryName, federationName } = await getCompetitions(
    countryId,
    federationId,
    page,
  )

  // Если нет фильтров, показываем подсвеченные лиги
  let highlight: CompetitionItem[] = []
  let rest: CompetitionItem[] = []

  if (!countryId && !federationId) {
    highlight = selectTopLeagues(competitions)
    rest = competitions.filter((c) => !highlight.find((h) => h.id === c.id))
  } else {
    // При фильтрации показываем все как обычный список
    rest = competitions
  }

  // Сортировка по стране/названию
  rest.sort((a, b) => byName(a.country?.name, b.country?.name) || byName(a.name, b.name))

  // Еврокубки на сегодня
  const euroToday = !countryId && !federationId ? await getTodayEuropeanFixtures() : { ucl: [], uel: [] }

  const getTitle = () => {
    if (countryName && federationName) {
      return `Лиги страны ${countryName} (${federationName})`
    }
    if (countryName) {
      return `Лиги страны ${countryName}`
    }
    if (federationName) {
      return `Лиги федерации ${federationName}`
    }
    return 'Футбольные лиги'
  }

  const getBackLink = () => {
    if (countryId) {
      return federationId ? `/countries?federation=${federationId}` : '/countries'
    }
    if (federationId) {
      return '/federations'
    }
    return null
  }

  const getBreadcrumbItems = () => {
    const items = [] as Array<{ label: string; href?: string }>

    if (federationName) {
      items.push({ label: 'Федерации', href: '/federations' })
      items.push({ label: federationName, href: `/countries?federation=${federationId}` })
    }

    if (countryName) {
      if (!federationName) {
        items.push({ label: 'Страны', href: '/countries' })
      }
      items.push({
        label: countryName,
        href: `/leagues?country=${countryId}${federationId ? `&federation=${federationId}` : ''}`,
      })
    }

    items.push({ label: 'Лиги' })
    return items
  }

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={getBreadcrumbItems()} className="mb-4" />

        <header>
          <div className="flex items-center gap-4 mb-4">
            {getBackLink() && (
              <Link href={getBackLink()!}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {countryId ? 'К странам' : 'К федерациям'}
                </Button>
              </Link>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{getTitle()}</h1>
          <p className="text-muted-foreground">
            {highlight.length > 0
              ? 'Сначала — топ‑лиги, затем еврокубки на сегодня (ЛЧ, ЛЕ). Ниже — все лиги с поиском.'
              : 'Выберите лигу для просмотра сезонов и турнирных таблиц'}
          </p>
        </header>

        {competitions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Не удалось загрузить список лиг. Попробуйте обновить страницу.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Топ‑лиги */}
            {highlight.length > 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Топ лиги</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {highlight.map((competition) => (
                      <Link key={competition.id} href={`/leagues/${competition.id}`} className="block">
                        <div className="group border rounded-md p-4 flex items-center gap-3 hover:bg-accent transition-colors">
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                            {competition.country?.id ? (
                              <CountryFlagImage
                                countryId={competition.country.id}
                                countryName={competition.country.name}
                                size="large"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xl" aria-hidden>
                                ⚽
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{competition.name}</div>
                            {competition.country?.name && (
                              <div className="text-xs text-muted-foreground truncate">
                                {COUNTRY_NAMES_RU[competition.country.name] || competition.country.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Еврокубки на сегодня (ЛЧ → ЛЕ) */}
                {(euroToday.ucl.length > 0 || euroToday.uel.length > 0) && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Еврокубки на сегодня</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* UCL */}
                      {euroToday.ucl.length > 0 && (
                        <div className="border rounded-md p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4" />
                            <span className="font-semibold">Лига чемпионов — сегодня</span>
                          </div>
                          <div className="space-y-2">
                            {euroToday.ucl.slice(0, 6).map((fx: any) => (
                              <div key={fx.id} className="flex items-center justify-between text-sm">
                                <div className="truncate flex-1 text-right pr-2">
                                  {fx.home?.name || fx.home_team?.name || fx.home_name}
                                </div>
                                <div className="px-2 text-muted-foreground">vs</div>
                                <div className="truncate flex-1 pl-2">
                                  {fx.away?.name || fx.away_team?.name || fx.away_name}
                                </div>
                                <div className="ml-3 text-muted-foreground tabular-nums">
                                  {fx.time || ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* UEL */}
                      {euroToday.uel.length > 0 && (
                        <div className="border rounded-md p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4" />
                            <span className="font-semibold">Лига Европы — сегодня</span>
                          </div>
                          <div className="space-y-2">
                            {euroToday.uel.slice(0, 6).map((fx: any) => (
                              <div key={fx.id} className="flex items-center justify-between text-sm">
                                <div className="truncate flex-1 text-right pr-2">
                                  {fx.home?.name || fx.home_team?.name || fx.home_name}
                                </div>
                                <div className="px-2 text-muted-foreground">vs</div>
                                <div className="truncate flex-1 pl-2">
                                  {fx.away?.name || fx.away_team?.name || fx.away_name}
                                </div>
                                <div className="ml-3 text-muted-foreground tabular-nums">
                                  {fx.time || ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Все лиги с поиском и группировкой по стране */}
            {rest.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Все лиги</h2>
                <LeaguesGroupedSearch items={rest} />
              </section>
            )}

            {/* Пагинация */}
            {(page > 1 || hasMore) && (
              <div className="flex justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/leagues?${new URLSearchParams({
                      ...(countryId && { country: countryId }),
                      ...(federationId && { federation: federationId }),
                      page: (page - 1).toString(),
                    }).toString()}`}
                  >
                    <Button variant="outline">Предыдущая страница</Button>
                  </Link>
                )}

                <Badge variant="outline" className="px-3 py-1">
                  Страница {page}
                </Badge>

                {hasMore && (
                  <Link
                    href={`/leagues?${new URLSearchParams({
                      ...(countryId && { country: countryId }),
                      ...(federationId && { federation: federationId }),
                      page: (page + 1).toString(),
                    }).toString()}`}
                  >
                    <Button variant="outline">Следующая страница</Button>
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Навигация по сайту</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/federations" className="text-primary hover:underline">
              Федерации
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/countries" className="text-primary hover:underline">
              Страны
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/api-test" className="text-primary hover:underline">
              Тестирование API
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}