import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Flag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { customFetch } from '@/lib/http/livescore/customFetch'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 300 // 5 минут

interface Country {
  id: number
  name: string
  flag?: string
  code?: string
}

interface CountriesPageProps {
  searchParams: {
    federation?: string
    page?: string
  }
}

function extractCountries(raw: unknown): Country[] {
  const pickArrays = (obj: unknown): unknown[] => {
    const arrs: unknown[] = []
    if (Array.isArray(obj)) arrs.push(obj)
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>
      if (Array.isArray(o.countries)) arrs.push(o.countries)
      if (o.data && typeof o.data === 'object') {
        const d = o.data as Record<string, unknown>
        if (Array.isArray(d.countries)) arrs.push(d.countries)
        if (Array.isArray(d.data)) arrs.push(d.data)
        if (d.data && typeof d.data === 'object') {
          const dd = d.data as Record<string, unknown>
          if (Array.isArray(dd.countries)) arrs.push(dd.countries)
        }
      }
    }
    return arrs
  }

  const candidates = pickArrays(raw)
  for (const arr of candidates) {
    if (Array.isArray(arr)) {
      const mapped: Country[] = arr
        .map((item: unknown) => {
          const country = item as any
          const id = typeof country.id === 'number' ? country.id : undefined
          const name = typeof country.name === 'string' ? country.name : undefined
          const flag = typeof country.flag === 'string' ? country.flag : undefined
          const code = typeof country.code === 'string' ? country.code : undefined

          if (!id || !name) return null
          return { id, name, flag, code }
        })
        .filter((v): v is Country => Boolean(v))

      if (mapped.length) return mapped
    }
  }
  return []
}

function extractFederations(raw: unknown): Array<{ id: number; name: string }> {
  const pickArrays = (obj: unknown): unknown[] => {
    const arrs: unknown[] = []
    if (Array.isArray(obj)) arrs.push(obj)
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>
      if (Array.isArray(o.federations)) arrs.push(o.federations)
      if (o.data && typeof o.data === 'object') {
        const d = o.data as Record<string, unknown>
        if (Array.isArray(d.federations)) arrs.push(d.federations)
        if (Array.isArray(d.data)) arrs.push(d.data)
      }
    }
    return arrs
  }

  const candidates = pickArrays(raw)
  for (const arr of candidates) {
    if (Array.isArray(arr)) {
      const mapped = arr
        .map((item: unknown) => {
          const fed = item as any
          const id = typeof fed.id === 'number' ? fed.id : undefined
          const name = typeof fed.name === 'string' ? fed.name : undefined
          if (!id || !name) return null
          return { id, name }
        })
        .filter((item): item is { id: number; name: string } => Boolean(item))

      if (mapped.length) return mapped
    }
  }
  return []
}

async function getCountries(federationId?: string, page = 1): Promise<{
  countries: Country[]
  hasMore: boolean
  federationName?: string
}> {
  try {
    // Строим URL с параметрами
    const url = new URL('countries/list.json', 'https://example.com')
    url.searchParams.set('page', page.toString())
    url.searchParams.set('size', '20')
    url.searchParams.set('lang', 'ru')
    
    if (federationId) {
      url.searchParams.set('federation_id', federationId)
    }

    const pathWithQuery = url.pathname + url.search
    const res = await customFetch(pathWithQuery, {
      next: { revalidate: 300 },
    } as RequestInit)
    
    let raw: unknown
    try {
      raw = await res.json()
    } catch {
      raw = null
    }
    
    const countries = extractCountries(raw)

    // Получаем название федерации если указан ID
    let federationName
    if (federationId) {
      try {
        const fedRes = await customFetch('federations/list.json', {
          next: { revalidate: 300 },
        } as RequestInit)
        
        let fedRaw: unknown
        try {
          fedRaw = await fedRes.json()
        } catch {
          fedRaw = null
        }
        
        const federations = extractFederations(fedRaw)
        const federation = federations.find((f) => f.id === parseInt(federationId))
        federationName = federation?.name
      } catch (error) {
        console.error('Ошибка загрузки названия федерации:', error)
      }
    }

    return {
      countries,
      hasMore: countries.length === 20, // Если получили полную страницу, возможно есть еще
      federationName,
    }
  } catch (error) {
    console.error('Ошибка загрузки стран:', error)
    return { countries: [], hasMore: false }
  }
}

export default async function CountriesPage({ searchParams }: CountriesPageProps) {
  const federationId = searchParams.federation
  const page = parseInt(searchParams.page || '1')
  
  const { countries, hasMore, federationName } = await getCountries(federationId, page)

  const breadcrumbItems = federationName 
    ? [
        { label: 'Федерации', href: '/federations' },
        { label: federationName, href: `/countries?federation=${federationId}` },
        { label: 'Страны' }
      ]
    : [
        { label: 'Страны' }
      ]

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />
        
        <header>
          <div className="flex items-center gap-4 mb-4">
            {federationId && (
              <Link href="/federations">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  К федерациям
                </Button>
              </Link>
            )}
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight">
            {federationName ? `Страны федерации ${federationName}` : 'Все страны'}
          </h1>
          <p className="text-muted-foreground">
            Выберите страну для просмотра лиг и соревнований
          </p>
        </header>

        {countries.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Не удалось загрузить список стран. Попробуйте обновить страницу.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {countries.map((country) => (
                <Link
                  key={country.id}
                  href={`/leagues?country=${country.id}`}
                  className="block"
                >
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {country.flag ? (
                            <CountryFlagImage
                              countryId={country.id}
                              countryName={country.name}
                              size="large"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Flag className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {country.name}
                          </CardTitle>
                          {country.code && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {country.code}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        Просмотреть лиги этой страны
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Пагинация */}
            {(page > 1 || hasMore) && (
              <div className="flex justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/countries?${new URLSearchParams({
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
                    href={`/countries?${new URLSearchParams({
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
            <Link href="/leagues" className="text-primary hover:underline">
              Все лиги
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