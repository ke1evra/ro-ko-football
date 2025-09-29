'use client'

import React from 'react'

interface League {
  id: string
  competitionId: number
  name: string
  countryName?: string
  active?: boolean
}

interface LeagueItem {
  league: League
  customName?: string
  priority: number
  enabled: boolean
  highlightColor?: string
  showMatchCount?: boolean
}

interface LeaguesPreviewProps {
  leagues: LeagueItem[]
  title: string
  maxItems?: number
  showFlags?: boolean
  compactMode?: boolean
}

export function LeaguesPreview({ 
  leagues, 
  title, 
  maxItems = 10,
  showFlags = true,
  compactMode = false 
}: LeaguesPreviewProps) {
  const enabledLeagues = leagues
    .filter(item => item.enabled && item.league)
    .sort((a, b) => (a.priority || 999) - (b.priority || 999))
    .slice(0, maxItems)

  if (enabledLeagues.length === 0) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-500">Нет настроенных лиг</p>
      </div>
    )
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {enabledLeagues.map((item, index) => (
          <div 
            key={item.league.id}
            className={`flex items-center justify-between p-2 rounded ${
              compactMode ? 'py-1' : 'py-2'
            } ${item.highlightColor ? 'border-l-4' : 'border-l-2 border-gray-200'}`}
            style={{
              borderLeftColor: item.highlightColor || '#e5e7eb'
            }}
          >
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500 font-mono w-6">
                {index + 1}.
              </span>
              {showFlags && item.league.countryName && (
                <span className="text-sm text-gray-400">
                  {item.league.countryName}
                </span>
              )}
              <div className="flex flex-col">
                <span className="font-medium">
                  {item.customName || item.league.name}
                </span>
                {item.league.countryName && (
                  <span className="text-xs text-gray-400">
                    {item.league.countryName}
                  </span>
                )}
              </div>
              {!item.league.active && (
                <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded">
                  Неактивна
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>ID: {item.league.competitionId}</span>
              <span>Приоритет: {item.priority}</span>
              {item.showMatchCount && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
                  +счётчик
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {leagues.length > maxItems && (
        <p className="text-sm text-gray-500 mt-2">
          Показано {enabledLeagues.length} из {leagues.filter(l => l.enabled).length} включённых лиг
        </p>
      )}
    </div>
  )
}