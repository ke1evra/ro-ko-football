/**
 * Серверный компонент турнирной таблицы
 * Загружает начальные данные и передает их клиентскому компоненту с поллингом
 */

import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import StandingsTableClient from './StandingsTableClient'
import type { StandingsResponse } from '@/lib/live-score-api/dto'

interface StandingsTableProps {
  league: string
  season: string
  view?: 'all' | 'home' | 'away'
  round?: string
}

export default async function StandingsTable({
  league,
  season,
  view = 'all',
  round,
}: StandingsTableProps) {
  try {
    // Получаем начальные данные турнирной таблицы
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/standings/${league}/${season}?view=${view}${round ? `&round=${round}` : ''}`,
      {
        next: {
          revalidate: 30, // 30 секунд для серверного кэша
          tags: [`standings:${league}:${season}`],
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch standings: ${response.status}`)
    }

    const data: StandingsResponse = await response.json()

    // Передаем данные клиентскому компоненту
    return (
      <StandingsTableClient
        league={league}
        season={season}
        view={view}
        round={round}
        initialData={data}
      />
    )
  } catch (error) {
    console.error('Error loading standings:', error)

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Не удалось загрузить турнирную таблицу. Попробуйте обновить страницу.
        </AlertDescription>
      </Alert>
    )
  }
}
