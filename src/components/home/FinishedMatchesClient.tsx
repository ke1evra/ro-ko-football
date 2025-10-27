'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TeamLogo } from '@/components/TeamLogo'
import { CountryFlagImage } from '@/components/CountryFlagImage'

export interface FinishedMatchItem {
  id: string
  url: string
  date: string
  leagueId: number
  leagueTitle: string
  countryId?: number
  countryName?: string
  homeTeam?: string
  awayTeam?: string
  homeTeamId?: number
  awayTeamId?: number
  homeScore?: number
  awayScore?: number
}

function formatDateLabel(dateISO: string): string {
  try {
    const matchDate = new Date(dateISO)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const beforeYesterday = new Date(today)
    beforeYesterday.setDate(today.getDate() - 2)

    const matchDateStr = matchDate.toDateString()
    const todayStr = today.toDateString()
    const yStr = yesterday.toDateString()
    const byStr = beforeYesterday.toDateString()

    if (matchDateStr === todayStr) return 'Сегодня'
    if (matchDateStr === yStr) return 'Вчера'
    if (matchDateStr === byStr) return 'Позавчера'

    return matchDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  } catch {
    return dateISO
  }
}

function formatTime(dateISO: string) {
  const d = new Date(dateISO)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function FinishedMatchesClient({
  items,
  pageSize = 20,
}: {
  items: FinishedMatchItem[]
  pageSize?: number
}) {
  const [visible, setVisible] = useState(pageSize)

  const visibleItems = useMemo(() => items.slice(0, visible), [items, visible])
  const canLoadMore = visible < items.length

  // Без группировки: единый поток по времени
  const list = visibleItems

  return (
    <div className="space-y-3">
      {/* Единый список без группировки */}
      {list.map((m) => (
        <Link key={m.id} href={m.url} className="block">
          <div className="w-full border rounded-lg p-3 bg-card hover:bg-accent transition-colors relative">
            {/* Мини-плашка с датой (как в UpcomingMatchesStrip) */}
            <div className="absolute -top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-medium rounded-full">
              {formatDateLabel(m.date)}
            </div>

            {/* Команды + счёт напротив */}
            <div className="space-y-1 mt-3">
              {/* Домашняя */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <TeamLogo teamId={m.homeTeamId} teamName={m.homeTeam} size="small" />
                  <div className="text-sm font-medium truncate">{m.homeTeam}</div>
                </div>
                <div className="text-lg font-bold text-primary tabular-nums ml-2">
                  {typeof m.homeScore === 'number' ? m.homeScore : '—'}
                </div>
              </div>
              {/* Гостевая */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <TeamLogo teamId={m.awayTeamId} teamName={m.awayTeam} size="small" />
                  <div className="text-sm font-medium truncate">{m.awayTeam}</div>
                </div>
                <div className="text-lg font-bold text-primary tabular-nums ml-2">
                  {typeof m.awayScore === 'number' ? m.awayScore : '—'}
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}

      {canLoadMore && (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setVisible((v) => v + pageSize)}
          >
            Загрузить ещё
          </Button>
        </div>
      )}
    </div>
  )
}
