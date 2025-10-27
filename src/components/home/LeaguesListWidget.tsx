'use client'

import * as React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CountryFlagImage } from '@/components/CountryFlagImage'
import { Calendar, Trophy, Users } from 'lucide-react'

export type LeagueItem = {
  id: string
  competitionId: number
  name: string
  displayName: string
  countryName?: string
  countryId?: number
  customName?: string
  priority: number
  enabled: boolean
  highlightColor?: string
  showMatchCount: boolean
  tier?: number
  isActive?: boolean
  matchCount?: number
}

export type LeaguesSettings = {
  enabled: boolean
  title: string
  maxItems: number
  showFlags: boolean
  groupByCountry: boolean
  displaySettings: {
    showOnlyActive: boolean
    showTiers: boolean
    compactMode: boolean
    showLogos: boolean
  }
  leagues: LeagueItem[]
}

interface LeaguesListWidgetProps {
  settings?: LeaguesSettings | null
  className?: string
}

function LeagueListItem({
  league,
  showFlags,
  showTiers,
  compactMode,
  showLogos,
}: {
  league: LeagueItem
  showFlags: boolean
  showTiers: boolean
  compactMode: boolean
  showLogos: boolean
}) {
  const displayName = league.customName || league.displayName || league.name

  return (
    <Link
      href={`/leagues/${league.competitionId}`}
      className={`
        flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors
        ${compactMode ? 'py-1' : 'py-2'}
      `}
      style={
        league.highlightColor ? { borderLeft: `3px solid ${league.highlightColor}` } : undefined
      }
    >
      {/* Флаг страны */}
      {showFlags && (
        <div className="flex-shrink-0">
          <CountryFlagImage
            countryId={league.countryId}
            countryName={league.countryName || 'Международная'}
            size="small"
            className="w-4 h-3 rounded-sm"
          />
        </div>
      )}

      {/* Логотип лиги (заглушка) */}
      {showLogos && (
        <div className="flex-shrink-0 w-5 h-5 bg-muted rounded-full flex items-center justify-center">
          <Trophy className="w-3 h-3 text-muted-foreground" />
        </div>
      )}

      {/* Название лиги */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${compactMode ? 'text-sm' : 'text-sm'}`}>
          {displayName}
        </div>

        {/* Уровень лиги */}
        {showTiers && league.tier && (
          <div className="text-xs text-muted-foreground">
            {league.tier === 1 ? '1-я лига' : `${league.tier}-я лига`}
          </div>
        )}
      </div>

      {/* Количество матчей */}
      {league.showMatchCount && league.matchCount !== undefined && (
        <Badge variant="secondary" className="text-xs">
          {league.matchCount}
        </Badge>
      )}
    </Link>
  )
}

function GroupedLeaguesList({
  leagues,
  showFlags,
  showTiers,
  compactMode,
  showLogos,
}: {
  leagues: LeagueItem[]
  showFlags: boolean
  showTiers: boolean
  compactMode: boolean
  showLogos: boolean
}) {
  // Группируем лиги по странам
  const groupedLeagues = React.useMemo(() => {
    const groups = new Map<string, { countryId?: number; leagues: LeagueItem[] }>()

    leagues.forEach((league) => {
      const country = league.countryName || 'Международные'
      if (!groups.has(country)) {
        groups.set(country, { countryId: league.countryId, leagues: [] })
      }
      groups.get(country)!.leagues.push(league)
    })

    // Сортируем страны и лиги внутри каждой страны
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, { countryId, leagues: countryLeagues }]) => ({
        country,
        countryId,
        leagues: countryLeagues.sort((a, b) => a.priority - b.priority),
      }))
  }, [leagues])

  return (
    <div className="space-y-4">
      {groupedLeagues.map(({ country, countryId, leagues: countryLeagues }) => (
        <div key={country}>
          <div className="flex items-center gap-2 mb-2 px-2">
            {showFlags && (
              <CountryFlagImage
                countryId={countryId}
                countryName={country}
                size="small"
                className="w-4 h-3 rounded-sm"
              />
            )}
            <h4 className="text-sm font-semibold text-muted-foreground">{country}</h4>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-1">
            {countryLeagues.map((league) => (
              <LeagueListItem
                key={league.id}
                league={league}
                showFlags={false} // Уже показан в заголовке группы
                showTiers={showTiers}
                compactMode={compactMode}
                showLogos={showLogos}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LeaguesListWidget({ settings, className }: LeaguesListWidgetProps) {
  // Если настройки не загружены или виджет отключён
  if (!settings?.enabled) {
    return (
      <div className={`text-sm text-muted-foreground text-center py-4 ${className}`}>
        Список лиг отключён в настройках
      </div>
    )
  }

  // Фильтруем и сортируем лиги
  const filteredLeagues = React.useMemo(() => {
    return settings.leagues
      .filter((league) => {
        if (!league.enabled) return false
        if (settings.displaySettings.showOnlyActive && !league.isActive) return false
        return true
      })
      .sort((a, b) => a.priority - b.priority)
      .slice(0, settings.maxItems)
  }, [settings])

  if (filteredLeagues.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground text-center py-4 ${className}`}>
        Нет доступных лиг для отображения
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Заголовок */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{settings.title}</h3>
        <Badge variant="outline" className="text-xs">
          {filteredLeagues.length}
        </Badge>
      </div>

      {/* Список лиг */}
      {settings.groupByCountry ? (
        <GroupedLeaguesList
          leagues={filteredLeagues}
          showFlags={settings.showFlags}
          showTiers={settings.displaySettings.showTiers}
          compactMode={settings.displaySettings.compactMode}
          showLogos={settings.displaySettings.showLogos}
        />
      ) : (
        <div className="space-y-1">
          {filteredLeagues.map((league) => (
            <LeagueListItem
              key={league.id}
              league={league}
              showFlags={settings.showFlags}
              showTiers={settings.displaySettings.showTiers}
              compactMode={settings.displaySettings.compactMode}
              showLogos={settings.displaySettings.showLogos}
            />
          ))}
        </div>
      )}

      {/* Ссылка на все лиги */}
      <div className="mt-4 pt-3 border-t">
        <Link
          href="/leagues"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Users className="w-4 h-4" />
          Все лиги
        </Link>
      </div>
    </div>
  )
}
