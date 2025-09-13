/**
 * Клиентский компонент турнирной таблицы с поллингом
 * Использует shadcn компоненты для консистентного дизайна
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import DataRefreshStatus from './DataRefreshStatus'
import type { StandingsResponse } from '@/lib/live-score-api/dto'

interface StandingsTableClientProps {
  league: string
  season: string
  view?: 'all' | 'home' | 'away'
  round?: string
  initialData: StandingsResponse
}

export default function StandingsTableClient({
  league,
  season,
  view = 'all',
  round,
  initialData,
}: StandingsTableClientProps) {
  const [data, setData] = useState<StandingsResponse>(initialData)

  const handleDataUpdate = (newData: StandingsResponse) => {
    setData(newData)
  }

  return (
    <div className="space-y-4">
      {/* Статус обновления данных */}
      <DataRefreshStatus
        league={league}
        season={season}
        view={view}
        round={round}
        initialData={initialData}
        onDataUpdate={handleDataUpdate}
      />

      {/* Переключатели All/Home/Away */}
      <ViewToggle league={league} season={season} currentView={view} round={round} />

      {/* Информация об источнике данных */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant={data.source === 'live' ? 'default' : 'secondary'}>
            {data.source === 'live' ? 'Live' : data.source === 'database' ? 'БД' : 'Снапшот'}
          </Badge>
          <span>Данные от: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('ru-RU') : 'Неизвестно'}</span>
        </div>
        {round && <Badge variant="outline">Тур {round}</Badge>}
      </div>

      {/* Таблица */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Команда</TableHead>
              <TableHead className="text-center w-12">И</TableHead>
              <TableHead className="text-center w-12">В</TableHead>
              <TableHead className="text-center w-12">Н</TableHead>
              <TableHead className="text-center w-12">П</TableHead>
              <TableHead className="text-center w-16">Мячи</TableHead>
              <TableHead className="text-center w-12">РМ</TableHead>
              <TableHead className="text-center w-12 font-bold">О</TableHead>
              <TableHead className="w-20">Форма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(data.standings) ? data.standings.map((team: any, index: number) => (
              <TableRow key={team.teamId} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className={getPositionColor(team.rank)}>{team.rank}</span>
                    {index > 0 && (
                      <PositionTrend
                        current={team.rank}
                        previous={data.standings?.[index - 1]?.rank}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{team.teamName}</div>
                </TableCell>
                <TableCell className="text-center">{team.played}</TableCell>
                <TableCell className="text-center text-green-600">{team.wins}</TableCell>
                <TableCell className="text-center text-yellow-600">{team.draws}</TableCell>
                <TableCell className="text-center text-red-600">{team.losses}</TableCell>
                <TableCell className="text-center">
                  <span className="text-green-600">{team.goalsFor}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="text-red-600">{team.goalsAgainst}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={team.goalDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {team.goalDiff > 0 ? '+' : ''}
                    {team.goalDiff}
                  </span>
                </TableCell>
                <TableCell className="text-center font-bold">{team.points}</TableCell>
                <TableCell>
                  {team.form ? (
                    <FormIndicator form={team.form} />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>
      </div>

      {/* Легенда позиций */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Лига чемпионов</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Лига Европы</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Вылет</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Компонент переключателей
function ViewToggle({
  league,
  season,
  currentView,
  round,
}: {
  league: string
  season: string
  currentView: string
  round?: string
}) {
  const baseUrl = `/${league}/${season}`
  const roundParam = round ? `&round=${round}` : ''

  return (
    <ToggleGroup type="single" value={currentView} className="justify-start">
      <ToggleGroupItem value="all" asChild>
        <Link href={`${baseUrl}?view=all${roundParam}`}>Общая</Link>
      </ToggleGroupItem>
      <ToggleGroupItem value="home" asChild>
        <Link href={`${baseUrl}?view=home${roundParam}`}>Дома</Link>
      </ToggleGroupItem>
      <ToggleGroupItem value="away" asChild>
        <Link href={`${baseUrl}?view=away${roundParam}`}>В гостях</Link>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

// Компонент индикатора формы команды
function FormIndicator({ form }: { form: string }) {
  if (!form || typeof form !== 'string') {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  const results = form
    .slice(-5)
    .split('')
    .filter((r) => ['W', 'D', 'L'].includes(r)) // Последние 5 результатов

  if (results.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  return (
    <div className="flex gap-1">
      {results.map((result, index) => (
        <div
          key={index}
          className={`w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-medium ${
            result === 'W'
              ? 'bg-green-500'
              : result === 'D'
                ? 'bg-yellow-500'
                : result === 'L'
                  ? 'bg-red-500'
                  : 'bg-gray-400'
          }`}
        >
          {result}
        </div>
      ))}
    </div>
  )
}

// Компонент тренда позиции
function PositionTrend({ current, previous }: { current: number; previous?: number }) {
  if (!previous) return null

  if (current < previous) {
    return <TrendingUp className="h-3 w-3 text-green-500" />
  } else if (current > previous) {
    return <TrendingDown className="h-3 w-3 text-red-500" />
  } else {
    return <Minus className="h-3 w-3 text-gray-400" />
  }
}

// Функция для определения цвета позиции
function getPositionColor(position: number): string {
  if (position <= 4) return 'text-green-600 font-bold' // Лига чемпионов
  if (position <= 6) return 'text-blue-600 font-bold' // Лига Европы
  if (position >= 18) return 'text-red-600 font-bold' // Вылет
  return 'text-foreground'
}
