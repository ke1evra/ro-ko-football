'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface Season {
  id: number
  name: string
  year?: number
  is_current?: boolean
}

interface SeasonSelectorProps {
  seasons: Season[]
  currentSeasonId?: number
  onSeasonChange: (seasonId: number) => void
  className?: string
}

export default function SeasonSelector({
  seasons,
  currentSeasonId,
  onSeasonChange,
  className = '',
}: SeasonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const currentSeason = seasons.find((s) => s.id === currentSeasonId) || seasons[0]

  if (seasons.length === 0) {
    return null
  }

  if (seasons.length === 1) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{currentSeason?.name}</span>
            {currentSeason?.is_current && (
              <Badge variant="default" className="text-xs">
                Текущий
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{currentSeason?.name}</span>
              {currentSeason?.is_current && (
                <Badge variant="default" className="text-xs">
                  Текущий
                </Badge>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border rounded-md shadow-lg">
              <div className="py-1 max-h-60 overflow-y-auto">
                {seasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => {
                      onSeasonChange(season.id)
                      setIsOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between ${
                      season.id === currentSeasonId ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{season.name}</span>
                      {season.year && (
                        <span className="text-sm text-muted-foreground">({season.year})</span>
                      )}
                    </div>
                    {season.is_current && (
                      <Badge variant="default" className="text-xs">
                        Текущий
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
