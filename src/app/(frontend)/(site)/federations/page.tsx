import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Globe } from 'lucide-react'
import Link from 'next/link'
import { getFederationsListJson } from '@/app/(frontend)/client'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 300 // 5 минут

interface Federation {
  id: string
  name: string
}

async function getFederations(): Promise<Federation[]> {
  try {
    const response = await getFederationsListJson({
      next: { revalidate: 300 },
    })

    // Извлекаем федерации из структуры data.data.federation
    const federations = response.data?.data?.federation || []

    return federations
      .map((fed) => {
        if (!fed.id || !fed.name) return null
        return {
          id: fed.id,
          name: fed.name,
        }
      })
      .filter((fed): fed is Federation => Boolean(fed))
  } catch (error) {
    console.error('Ошибка загрузки федераций:', error)
    return []
  }
}

export default async function FederationsPage() {
  const federations = await getFederations()

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={[{ label: 'Федерации' }]} className="mb-4" />

        <header>
          <h1 className="text-3xl font-bold tracking-tight">Футбольные федерации</h1>
          <p className="text-muted-foreground">Выберите федерацию для просмотра стран и лиг</p>
        </header>

        {federations.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Не удалось загрузить список федераций. Попробуйте обновить страницу.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {federations.map((federation) => (
              <Link
                key={federation.id}
                href={`/countries?federation=${federation.id}`}
                className="block"
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{federation.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>Просмотреть страны и лиги этой федерации</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Навигация по сайту</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/countries" className="text-primary hover:underline">
              Все страны
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
