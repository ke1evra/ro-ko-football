/**
 * Компонент ближайших матчей для конкретного соревнования
 * Использует externalId соревнования для получения расписания
 */

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Calendar } from 'lucide-react'

interface CompetitionFixturesProps {
  competitionExtId: string
  competitionName: string
}

export default async function CompetitionFixtures({
  competitionExtId,
  competitionName,
}: CompetitionFixturesProps) {
  try {
    // Для fixtures нам нужен league slug, но пока используем общий подход
    // В будущем можно создать отдельный API для fixtures по competition ID

    return (
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Расписание матчей для {competitionName} будет доступно после настройки API.
          <br />
          <span className="text-xs text-muted-foreground">Competition ID: {competitionExtId}</span>
        </AlertDescription>
      </Alert>
    )
  } catch (error) {
    console.error('Error loading fixtures:', error)

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Не удалось загрузить расписание матчей. Попробуйте обновить страницу.
        </AlertDescription>
      </Alert>
    )
  }
}
