import { redirect } from 'next/navigation'
import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, LogIn } from 'lucide-react'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { getFixturesMatchesJson, getMatchesHistoryJson } from '@/app/(frontend)/client'
import PredictionForm from '@/components/predictions/PredictionForm'
import MatchInfo from '@/components/predictions/MatchInfo'
import Link from 'next/link'

interface CreatePredictionPageProps {
  searchParams: Promise<{
    matchId?: string
    fixtureId?: string
  }>
}

async function getMatchData(matchId?: string, fixtureId?: string) {
  try {
    if (fixtureId) {
      // Для фикстуры используем getFixturesMatchesJson с фильтром по ID
      const response = await getFixturesMatchesJson({ size: 1 }, { next: { revalidate: 60 } })

      const fixtures = response.data?.data?.fixtures || []
      const fixture = fixtures.find((f: any) => f.id === parseInt(fixtureId))

      if (fixture) {
        return {
          type: 'fixture' as const,
          data: fixture,
        }
      }
    }

    if (matchId) {
      // Для матча используем getMatchesHistoryJson
      const response = await getMatchesHistoryJson({ size: 1 }, { next: { revalidate: 60 } })

      const matches = response.data?.data?.match || []
      const match = matches.find((m: any) => m.id === parseInt(matchId))

      if (match) {
        return {
          type: 'match' as const,
          data: match,
        }
      }
    }

    return { type: null, data: null }
  } catch (error) {
    console.error('Ошибка загрузки данных матча:', error)
    return { type: null, data: null }
  }
}

export default async function CreatePredictionPage({ searchParams }: CreatePredictionPageProps) {
  const resolvedSearchParams = await searchParams
  const { matchId, fixtureId } = resolvedSearchParams

  if (!matchId && !fixtureId) {
    redirect('/leagues')
  }

  // Создаем фиктивные данные матча для демонстрации
  const mockMatchData = {
    id: fixtureId || matchId,
    home: { name: 'Манчестер Юнайтед', id: null },
    away: { name: 'Ливерпуль', id: null },
    home_team: { name: 'Манчестер Юнайтед', id: null },
    away_team: { name: 'Ливерпуль', id: null },
    competition: { name: 'Премьер-лига', id: 1 },
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
    venue: { name: 'Олд Траффорд', city: 'Манчестер' },
  }

  const matchData = {
    type: fixtureId ? ('fixture' as const) : ('match' as const),
    data: mockMatchData,
  }

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Прогнозы', href: '/predictions' },
    { label: 'Создать прогноз' },
  ]

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} />

        <header>
          <h1 className="text-3xl font-bold tracking-tight">Создать прогноз</h1>
          <p className="text-muted-foreground">Сделайте свой прогноз на исход матча и статистику</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Информация о матче */}
          <Card>
            <CardHeader>
              <CardTitle>Информация о матче</CardTitle>
              <CardDescription>Данные о предстоящем матче</CardDescription>
            </CardHeader>
            <CardContent>
              <MatchInfo matchData={matchData.data} type={matchData.type} />
            </CardContent>
          </Card>

          {/* Форма прогноза */}
          <Card>
            <CardHeader>
              <CardTitle>Ваш прогноз</CardTitle>
              <CardDescription>Заполните поля для создания прогноза</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Для создания прогноза необходимо войти в систему</span>
                  <Button asChild size="sm">
                    <Link href="/login">
                      <LogIn className="h-4 w-4 mr-2" />
                      Войти
                    </Link>
                  </Button>
                </AlertDescription>
              </Alert>

              <PredictionForm
                matchId={matchId ? parseInt(matchId) : undefined}
                fixtureId={fixtureId ? parseInt(fixtureId) : undefined}
                matchData={matchData.data}
              />
            </CardContent>
          </Card>
        </div>
      </Container>
    </Section>
  )
}
