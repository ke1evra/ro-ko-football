import Link from 'next/link'
import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, Calendar, User } from 'lucide-react'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { extractTextFromLexical, truncateText } from '@/lib/lexical-utils'

export const revalidate = 120

interface PredictionsPageProps {
  searchParams: Promise<{
    page?: string
  }>
}

async function getPredictions(page = 1) {
  const limit = 12
  
  try {
    const payload = await getPayload({ config: await configPromise })
    
    const result = await payload.find({
      collection: 'posts',
      where: {
        postType: { equals: 'prediction' }
      },
      sort: '-publishedAt',
      limit,
      page,
      depth: 2,
    })

    return {
      predictions: result.docs,
      totalPages: result.totalPages || 1,
      currentPage: page,
      hasNextPage: result.hasNextPage || false,
      hasPrevPage: result.hasPrevPage || false,
    }
  } catch (error) {
    console.error('Ошибка загрузки прогнозов:', error)
    return {
      predictions: [],
      totalPages: 1,
      currentPage: page,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
}

function getOutcomeLabel(outcome?: string) {
  switch (outcome) {
    case 'home': return 'Победа хозяев'
    case 'draw': return 'Ничья'
    case 'away': return 'Победа гостей'
    default: return 'Не указан'
  }
}

function getOutcomeVariant(outcome?: string) {
  switch (outcome) {
    case 'home': return 'default'
    case 'draw': return 'secondary'
    case 'away': return 'outline'
    default: return 'secondary'
  }
}

export default async function PredictionsPage({ searchParams }: PredictionsPageProps) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page || '1')
  
  const { predictions, totalPages, currentPage, hasNextPage, hasPrevPage } = await getPredictions(page)

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Прогнозы' }
  ]

  return (
    <Section>
      <Container className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} />
        
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Прогнозы</h1>
            <p className="text-muted-foreground">
              Прогнозы пользователей на футбольные матчи
            </p>
          </div>
          
          <Button asChild>
            <Link href="/leagues">
              <TrendingUp className="h-4 w-4 mr-2" />
              Создать прогноз
            </Link>
          </Button>
        </header>

        {predictions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Прогнозов пока нет. Станьте первым, кто создаст прогноз!
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {predictions.map((prediction: any) => (
                <Card key={prediction.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">
                          <Link 
                            href={`/posts/${prediction.slug}`}
                            className="hover:text-primary transition-colors"
                          >
                            {prediction.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {prediction.content 
                            ? truncateText(extractTextFromLexical(prediction.content), 100)
                            : ''
                          }
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Прогноз
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Прогноз исхода */}
                    {prediction.prediction?.outcome && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Исход:</div>
                        <Badge variant={getOutcomeVariant(prediction.prediction.outcome) as any}>
                          {getOutcomeLabel(prediction.prediction.outcome)}
                        </Badge>
                      </div>
                    )}

                    {/* Прогноз счета */}
                    {prediction.prediction?.score?.home !== undefined && 
                     prediction.prediction?.score?.away !== undefined && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Счет:</div>
                        <div className="font-mono text-lg">
                          {prediction.prediction.score.home} : {prediction.prediction.score.away}
                        </div>
                      </div>
                    )}

                    {/* Дополнительная статистика */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {prediction.prediction?.corners?.total && (
                        <div>
                          <span className="text-muted-foreground">Угловые:</span>
                          <span className="ml-1">{prediction.prediction.corners.total}</span>
                        </div>
                      )}
                      {prediction.prediction?.yellowCards?.total && (
                        <div>
                          <span className="text-muted-foreground">Желтые:</span>
                          <span className="ml-1">{prediction.prediction.yellowCards.total}</span>
                        </div>
                      )}
                      {prediction.prediction?.fouls?.total && (
                        <div>
                          <span className="text-muted-foreground">Фолы:</span>
                          <span className="ml-1">{prediction.prediction.fouls.total}</span>
                        </div>
                      )}
                      {prediction.prediction?.fouls?.overUnder && (
                        <div>
                          <span className="text-muted-foreground">Фолы 25.5:</span>
                          <span className="ml-1">
                            {prediction.prediction.fouls.overUnder === 'over' ? 'Больше' : 'Меньше'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Автор и дата */}
                    <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {typeof prediction.author === 'object' && prediction.author?.name 
                          ? prediction.author.name 
                          : 'Аноним'
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(prediction.publishedAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {hasPrevPage && (
                  <Button variant="outline" asChild>
                    <Link href={`/predictions?page=${currentPage - 1}`}>
                      Предыдущая
                    </Link>
                  </Button>
                )}
                
                <Badge variant="outline" className="px-3 py-1">
                  Страница {currentPage} из {totalPages}
                </Badge>
                
                {hasNextPage && (
                  <Button variant="outline" asChild>
                    <Link href={`/predictions?page=${currentPage + 1}`}>
                      Следующая
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </Container>
    </Section>
  )
}