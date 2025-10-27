import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { getPayload } from 'payload'
import config from '@/payload.config'
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

// Топ страны (фиксированный порядок) - теперь на русском как в CMS
const HIGHLIGHT_COUNTRY_ORDER_RU = ['Англия', 'Италия', 'Испания', 'Франция', 'Россия', 'Германия']

const HIGHLIGHT_COUNTRIES_RU = new Set(HIGHLIGHT_COUNTRY_ORDER_RU)

// Паттерны для поиска топ-лиг (теперь по русским названиям стран)
const LEAGUE_PATTERNS: Record<string, RegExp[]> = {
  Англия: [/premier\s*league/i, /премьер/i],
  Италия: [/serie\s*a/i, /серия\s*a/i],
  Испания: [/(la\s*liga|laliga|примера)/i],
  Франция: [/(ligue\s*1|лига\s*1)/i],
  Россия: [/российская|рпл|rfpl/i],
  Германия: [/bundesliga|бундеслига/i],
}

function byName(a?: string | null, b?: string | null) {
  return (a || '').localeCompare(b || '', 'ru')
}

function matchByPatterns(name?: string, patterns: RegExp[] = []) {
  if (!name) return false
  return patterns.some((re) => re.test(name))
}

async function getSidebarLeagues(): Promise<CompetitionItem[]> {
  try {
    const payload = await getPayload({ config })

    // Получаем настройки сайдбара
    const sidebarSettings = await payload.findGlobal({
      slug: 'sidebarLeagues',
      depth: 2, // Получаем связанные лиги
      overrideAccess: true,
    })

    if (!sidebarSettings?.enabled || !sidebarSettings?.leagues) {
      return []
    }

    // Фильтруем и сортируем лиги
    const enabledLeagues = sidebarSettings.leagues
      .filter((item: any) => item.enabled && item.league)
      .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))
      .slice(0, sidebarSettings.maxItems || 15)

    // Преобразуем в формат CompetitionItem
    const competitions: CompetitionItem[] = enabledLeagues.map((item: any) => ({
      id: item.league.competitionId,
      name: item.customName || item.league.customName || item.league.name,
      country:
        item.league.countryId && item.league.countryName
          ? {
              id: item.league.countryId,
              name: item.league.countryName,
              flag: null,
            }
          : null,
    }))

    return competitions
  } catch (error) {
    console.error('Ошибка загрузки лиг сайдбара:', error)
    return []
  }
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
    const payload = await getPayload({ config })

    // Строим условия фильтрации
    const where: any = { active: { equals: true } }

    if (countryId) {
      where.countryId = { equals: parseInt(countryId) }
    }

    if (federationId) {
      where.federations = {
        contains: {
          id: { equals: parseInt(federationId) },
        },
      }
    }

    const limit = !countryId && !federationId ? 100 : 50
    const offset = (page - 1) * limit

    // Получаем лиги из CMS
    const result = await payload.find({
      collection: 'leagues',
      where,
      limit: limit + 1, // +1 для проверки hasMore
      page: undefined, // Используем offset вместо page
      sort: ['priority', 'name'],
      depth: 0,
      overrideAccess: true,
    })

    const hasMore = result.docs.length > limit
    const leagues = hasMore ? result.docs.slice(0, limit) : result.docs

    // Преобразуем в формат CompetitionItem
    const competitions: CompetitionItem[] = leagues.map((league) => ({
      id: league.competitionId,
      name: league.customName || league.name,
      country:
        league.countryId && league.countryName
          ? {
              id: league.countryId,
              name: league.countryName,
              flag: null, // Флаги пока не храним в CMS
            }
          : null,
    }))

    // Получаем название страны и федерации для breadcrumbs
    let countryName: string | undefined
    let federationName: string | undefined

    if (countryId && competitions.length > 0) {
      countryName = competitions.find((c) => c.country?.id === parseInt(countryId))?.country?.name
    }

    if (federationId && leagues.length > 0) {
      const leagueWithFederation = leagues.find((l) =>
        l.federations?.some((f: any) => f.id === parseInt(federationId)),
      )
      if (leagueWithFederation?.federations) {
        const federation = leagueWithFederation.federations.find(
          (f: any) => f.id === parseInt(federationId),
        )
        federationName = federation?.name
      }
    }

    return {
      competitions,
      hasMore,
      countryName,
      federationName,
    }
  } catch (error) {
    console.error('Ошибка загрузки лиг из CMS:', error)
    return { competitions: [], hasMore: false }
  }
}

function selectTopLeagues(competitions: CompetitionItem[]): CompetitionItem[] {
  const byCountry = new Map<string, CompetitionItem>()

  console.log('=== ОТЛАДКА ВЫБОРА ТОП-ЛИГ ===')
  console.log('Всего соревнований:', competitions.length)
  console.log('Ищем страны:', HIGHLIGHT_COUNTRY_ORDER_RU)

  // Показываем примеры соревнований по целевым странам
  const byCountryDebug = new Map<string, CompetitionItem[]>()
  for (const c of competitions) {
    const country = (c.country?.name || '').trim()
    if (HIGHLIGHT_COUNTRIES_RU.has(country)) {
      if (!byCountryDebug.has(country)) byCountryDebug.set(country, [])
      byCountryDebug.get(country)!.push(c)
    }
  }

  console.log('Найденные соревнования по целевым странам:')
  for (const [country, comps] of byCountryDebug.entries()) {
    console.log(
      `${country}: ${comps.length} соревнований`,
      comps.slice(0, 5).map((c) => c.name),
    )
  }

  // Выбираем по паттернам названий
  for (const c of competitions) {
    const country = (c.country?.name || '').trim()
    if (!HIGHLIGHT_COUNTRIES_RU.has(country)) continue
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
    if (!HIGHLIGHT_COUNTRIES_RU.has(country)) continue
    if (byCountry.has(country)) continue
    if (c.country?.id) {
      console.log(`✓ Найдена лига фолбэком для ${country}:`, c.name)
      byCountry.set(country, c)
    }
  }

  const result = HIGHLIGHT_COUNTRY_ORDER_RU.map((country) => byCountry.get(country)).filter(
    Boolean,
  ) as CompetitionItem[]
  console.log('=== ИТОГОВЫЕ ТОП-ЛИГИ ===')
  console.log(result.map((c) => ({ name: c.name, country: c.country?.name })))

  return result
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

  // Получаем лиги из сайдбара для отображения в верхнем блоке
  const sidebarLeagues = !countryId && !federationId ? await getSidebarLeagues() : []

  // Если нет фильтров, показываем подсвеченные лиги
  let highlight: CompetitionItem[] = []
  let rest: CompetitionItem[] = []

  if (!countryId && !federationId) {
    // Объединяем лиги из сайдбара с автоматически выбранными топ-лигами
    const autoTopLeagues = selectTopLeagues(competitions)

    // Создаём Set для быстрой проверки дубликатов
    const sidebarIds = new Set(sidebarLeagues.map((l) => l.id))
    const autoIds = new Set(autoTopLeagues.map((l) => l.id))

    // Сначала лиги из сайдбара, затем автоматические (без дубликатов)
    highlight = [
      ...sidebarLeagues,
      ...autoTopLeagues.filter((league) => !sidebarIds.has(league.id)),
    ]

    // Исключаем все топ-лиги из общего списка
    const allTopIds = new Set(highlight.map((l) => l.id))
    rest = competitions.filter((c) => !allTopIds.has(c.id))
  } else {
    // При фильтрации показываем все как обычный список
    rest = competitions
  }

  // Сортировка по стране/названию
  rest.sort((a, b) => byName(a.country?.name, b.country?.name) || byName(a.name, b.name))

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
              ? 'Сначала — топ‑лиги, затем все остальные лиги с поиском и группировкой.'
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
                      <Link
                        key={competition.id}
                        href={`/leagues/${competition.id}`}
                        className="block"
                      >
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
                                {competition.country.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
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
