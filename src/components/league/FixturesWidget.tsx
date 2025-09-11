/**
 * Виджет ближайших матчей (fixtures)
 * Показывает предстоящие игры с группировкой по дням
 */

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Calendar, MapPin } from 'lucide-react'
import type { FixturesResponse } from '@/lib/live-score-api/dto'

interface FixturesWidgetProps {
  league: string
  season: string
  date?: string
}

export default async function FixturesWidget({ league, season, date }: FixturesWidgetProps) {
  try {
    // Получаем ближайшие матчи
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/fixtures/${league}/${season}${date ? `?date=${date}` : ''}`,
      {
        next: { 
          revalidate: 120, // 2 минуты
          tags: [`fixtures:${league}:${season}`]
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch fixtures: ${response.status}`)
    }

    const data: FixturesResponse = await response.json()

    // Если нет предстоящих матчей
    if (!data.fixtures || data.fixtures.length === 0) {
      // Проверяем, есть ли ошибка в ответе
      const hasError = 'error' in data && data.error
      
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {hasError ? 'Сервис расписания матчей временно недоступен' : 'Нет предстоящих матчей'}
          </p>
          <p className="text-xs mt-1">
            Обновлено: {new Date(data.lastUpdated).toLocaleTimeString('ru-RU')}
          </p>
          {hasError && (
            <p className="text-xs mt-2 text-orange-600">
              Проверяем подключение к источнику данных...
            </p>
          )}
        </div>
      )
    }

    // Группируем матчи по дням
    const groupedFixtures = groupFixturesByDate(data.fixtures)

    return (
      <div className="space-y-4">
        {/* Заголовок с количеством матчей */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
              {data.fixtures.length} {getMatchesWord(data.fixtures.length)}
            </span>
          </div>
          {date && (
            <Badge variant="outline">
              {new Date(date).toLocaleDateString('ru-RU')}
            </Badge>
          )}
        </div>

        {/* Группированные матчи по дням */}
        <div className="space-y-4">
          {Object.entries(groupedFixtures).slice(0, 7).map(([dateKey, fixtures]) => (
            <div key={dateKey}>
              {/* Заголовок дня */}
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-medium">
                  {formatDateHeader(dateKey)}
                </h4>
                <div className="flex-1 h-px bg-border"></div>
                <Badge variant="secondary" className="text-xs">
                  {fixtures.length}
                </Badge>
              </div>

              {/* Матчи дня */}
              <div className="space-y-2">
                {fixtures.slice(0, 3).map((fixture) => (
                  <FixtureCard key={fixture.id} fixture={fixture} />
                ))}
                
                {fixtures.length > 3 && (
                  <div className="text-center">
                    <Link 
                      href={`/fixtures?date=${dateKey}&league=${league}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Ещё {fixtures.length - 3} {getMatchesWord(fixtures.length - 3)}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Время последнего обновления */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Обновлено: {new Date(data.lastUpdated).toLocaleTimeString('ru-RU')}
        </div>

        {/* Ссылка на все матчи */}
        <div className="text-center">
          <Link 
            href={`/fixtures?league=${league}&season=${season}`}
            className="text-sm text-primary hover:underline"
          >
            Смотреть все предстоящие матчи →
          </Link>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading fixtures:', error)
    
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Не удалось загрузить предстоящие матчи
          <br />
          <span className="text-xs opacity-75">
            {error instanceof Error ? error.message : 'Неизвестная ошибка'}
          </span>
        </AlertDescription>
      </Alert>
    )
  }
}

// Компонент карточки матча
function FixtureCard({ fixture }: { fixture: any }) {
  const matchDateTime = new Date(`${fixture.date} ${fixture.time}`)
  const isToday = isDateToday(fixture.date)
  const isTomorrow = isDateTomorrow(fixture.date)

  return (
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Время и соревнование */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={isToday ? "default" : isTomorrow ? "secondary" : "outline"}>
            {fixture.time}
          </Badge>
          {fixture.competition && (
            <span className="text-xs text-muted-foreground truncate">
              {fixture.competition.name}
            </span>
          )}
        </div>
      </div>

      {/* Команды */}
      <div className="space-y-1 mb-2">
        <div className="text-sm font-medium truncate">
          {fixture.homeTeam.name}
        </div>
        <div className="text-xs text-muted-foreground">vs</div>
        <div className="text-sm font-medium truncate">
          {fixture.awayTeam.name}
        </div>
      </div>

      {/* Дополнительная информация */}
      {fixture.venue?.name && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{fixture.venue.name}</span>
        </div>
      )}

      {/* Ссылка на детали */}
      <div className="flex items-center justify-between">
        <Link 
          href={`/fixtures/${fixture.id}`}
          className="text-xs text-primary hover:underline"
        >
          Подробнее →
        </Link>
        
        {/* Время до матча */}
        <span className="text-xs text-muted-foreground">
          {getTimeUntilMatch(matchDateTime)}
        </span>
      </div>
    </div>
  )
}

// Вспомогательные функции
function groupFixturesByDate(fixtures: any[]) {
  return fixtures.reduce((groups, fixture) => {
    const date = fixture.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(fixture)
    return groups
  }, {} as Record<string, any[]>)
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (dateString === today.toISOString().split('T')[0]) {
    return 'Сегодня'
  } else if (dateString === tomorrow.toISOString().split('T')[0]) {
    return 'Завтра'
  } else {
    return date.toLocaleDateString('ru-RU', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
  }
}

function isDateToday(dateString: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return dateString === today
}

function isDateTomorrow(dateString: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dateString === tomorrow.toISOString().split('T')[0]
}

function getTimeUntilMatch(matchDate: Date): string {
  const now = new Date()
  const diffMs = matchDate.getTime() - now.getTime()
  
  if (diffMs < 0) return 'Прошёл'
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) {
    return `через ${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`
  } else if (diffHours > 0) {
    return `через ${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'}`
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `через ${diffMinutes} мин`
  }
}

function getMatchesWord(count: number): string {
  if (count === 1) return 'матч'
  if (count < 5) return 'матча'
  return 'матчей'
}