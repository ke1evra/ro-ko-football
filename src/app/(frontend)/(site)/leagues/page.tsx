import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { getCompetitionsListJson, getCountriesListJson, getFederationsListJson } from '@/app/(frontend)/client'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 60 // кэш страницы на 1 минуту

interface LeaguesPageProps {
  searchParams: Promise<{
    country?: string
    federation?: string
    page?: string
  }>
}

interface Competition {
  id: number
  name: string
  country?: {
    id?: number
    name?: string
    flag?: string | null
  } | null
}

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

async function getCompetitions(countryId?: string, federationId?: string, page = 1): Promise<{
  competitions: Competition[]
  hasMore: boolean
  countryName?: string
  federationName?: string
}> {
  try {
    // Получаем соревнования
    const params = {
      page,
      size: 50,
      ...(countryId && { country_id: parseInt(countryId) }),
      ...(federationId && { federation_id: parseInt(federationId) }),
    }

    const response = await getCompetitionsListJson(params, {
      next: { revalidate: 60 },
    })
    
    const competitions = (response.data?.data?.competition || [])
      .map((comp) => {
        if (!comp.id || !comp.name) return null
        
        // Извлекаем информацию о стране из массива countries
        const country = comp.countries && comp.countries.length > 0 ? comp.countries[0] : null
        
        return {
          id: parseInt(comp.id),
          name: comp.name,
          country: country ? {
            id: parseInt(country.id),
            name: country.name,
            flag: country.flag,
          } : null,
        }
      })
      .filter((comp): comp is Competition => Boolean(comp))

    // Получаем название страны если указан ID
    let countryName
    if (countryId) {
      try {
        const countryResponse = await getCountriesListJson({}, {
          next: { revalidate: 300 },
        })
        
        const countries = countryResponse.data?.data?.country || []
        const country = countries.find((c) => c.id === parseInt(countryId))
        countryName = country?.name
      } catch (error) {
        console.error('Ошибка загрузки названия страны:', error)
      }
    }

    // Получаем название федерации если указан ID
    let federationName
    if (federationId) {
      try {
        const fedResponse = await getFederationsListJson({
          next: { revalidate: 300 },
        })
        
        const federations = fedResponse.data?.data?.federation || []
        const federation = federations.find((f) => f.id === federationId)
        federationName = federation?.name
      } catch (error) {
        console.error('Ошибка загрузки названия федерации:', error)
      }
    }

    return {
      competitions,
      hasMore: competitions.length === 50,
      countryName,
      federationName,
    }
  } catch (error) {
    console.error('Ошибка загрузки соревнований:', error)
    return { competitions: [], hasMore: false }
  }
}

function byName(a?: string | null, b?: string | null) {
  return (a || '').localeCompare(b || '', 'ru')
}

export default async function LeaguesPage({ searchParams }: LeaguesPageProps) {
  const resolvedSearchParams = await searchParams
  const countryId = resolvedSearchParams.country
  const federationId = resolvedSearchParams.federation
  const page = parseInt(resolvedSearchParams.page || '1')
  
  const { competitions, hasMore, countryName, federationName } = await getCompetitions(
    countryId,
    federationId,
    page
  )

  // Если нет фильтров, показываем подсвеченные лиги
  let highlight: Competition[] = []
  let rest: Competition[] = []

  if (!countryId && !federationId) {
    // Подсветка по странам для главной страницы лиг
    const byCountry = new Map<string, Competition>()
    for (const c of competitions) {
      const country = (c.country?.name || '').trim()
      if (HIGHLIGHT_COUNTRIES_RU.has(country) && !byCountry.has(country)) {
        byCountry.set(country, c)
      }
      if (byCountry.size >= 9) break
    }
    highlight = Array.from(byCountry.values())
    rest = competitions.filter((c) => !highlight.find((h) => h.id === c.id))
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
    const items = []
    
    if (federationName) {
      items.push({ label: 'Федерации', href: '/federations' })
      items.push({ label: federationName, href: `/countries?federation=${federationId}` })
    }
    
    if (countryName) {
      if (!federationName) {
        items.push({ label: 'Страны', href: '/countries' })
      }
      items.push({ label: countryName, href: `/leagues?country=${countryId}${federationId ? `&federation=${federationId}` : ''}` })
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
              ? 'Подсвечены основные лиги. Остальные доступны списком ниже.'
              : 'Выберите лигу для просмотра сезонов и турнирных таблиц'
            }
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
            {/* Подсвеченные лиги для главной страницы */}
            {highlight.length > 0 && (
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
                          <span className="text-xl" aria-hidden>⚽</span>
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
            )}

            {/* Все лиги списком */}
            {rest.length > 0 && (
              <section className="space-y-4">
                {highlight.length > 0 && (
                  <h2 className="text-xl font-semibold">Все лиги</h2>
                )}
                
                <div className="divide-y rounded-md border">
                  {rest.map((competition) => (
                    <Link
                      key={competition.id}
                      href={`/leagues/${competition.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                        {competition.country?.id ? (
                          <CountryFlagImage
                            countryId={competition.country.id}
                            countryName={competition.country.name}
                            size="medium"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm" aria-hidden>⚽</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{competition.name}</div>
                      </div>
                      {competition.country?.name && (
                        <div className="text-sm text-muted-foreground ml-auto">
                          {competition.country.name}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
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
                    <Button variant="outline">
                      Предыдущая страница
                    </Button>
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
                    <Button variant="outline">
                      Следующая страница
                    </Button>
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