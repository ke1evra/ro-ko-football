import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Flag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getCountriesListJson, getFederationsListJson } from '@/app/(frontend)/client'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 300 // 5 минут

interface Country {
  id: number
  name: string
  flag?: string | null
  fifa_code?: string | null
  uefa_code?: string | null
}

interface CountriesPageProps {
  searchParams: Promise<{
    federation?: string
    page?: string
  }>
}

async function getCountries(federationId?: string, page = 1): Promise<{
  countries: Country[]
  hasMore: boolean
  federationName?: string
}> {
  try {
    // Получаем все страны (API не поддерживает пагинацию)
    const params = {
      ...(federationId && { federation_id: parseInt(federationId) }),
    }

    const response = await getCountriesListJson(params, {
      next: { revalidate: 300 },
    })
    
    const allCountries = (response.data?.data?.country || [])
      .map((country) => {
        if (!country.id || !country.name) return null
        return {
          id: country.id,
          name: country.name,
          flag: country.flag,
          fifa_code: country.fifa_code,
          uefa_code: country.uefa_code,
        }
      })
      .filter((country): country is Country => Boolean(country))
      .sort((a, b) => a.name.localeCompare(b.name)) // Сортируем по алфавиту

    // Реализуем пагинацию на клиенте
    const pageSize = 20
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const countries = allCountries.slice(startIndex, endIndex)
    const hasMore = endIndex < allCountries.length

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
      countries,
      hasMore,
      federationName,
    }
  } catch (error) {
    console.error('Ошибка загрузки стран:', error)
    return { countries: [], hasMore: false }
  }
}

export default async function CountriesPage({ searchParams }: CountriesPageProps) {
  const resolvedSearchParams = await searchParams
  const federationId = resolvedSearchParams.federation
  const page = parseInt(resolvedSearchParams.page || '1')
  
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
                          <CountryFlagImage
                            countryId={country.id}
                            countryName={country.name}
                            size="large"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {country.name}
                          </CardTitle>
                          {(country.fifa_code || country.uefa_code) && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {country.fifa_code || country.uefa_code}
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