import React from 'react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
// import type { Player as PlayerType } from '@/payload-types'
// Временно используем any, пока не добавим Player в коллекции
type PlayerType = any

interface PlayerBlockProps {
  // Новый интерфейс из payload block: player — relationship на players
  player?: string | PlayerType
  // Старые поля для обратной совместимости на время миграции рендерера
  name?: string
  photoUrl?: string
  teamName?: string
  stats?: Record<string, string | number>
}

function getInitials(name?: string) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export const PlayerBlock = (props: PlayerBlockProps) => {
  // Распаковка из relationship, если передан player из payload
  const p =
    props.player && typeof props.player === 'object' ? (props.player as PlayerType) : undefined

  const name = p?.name ?? props.name ?? 'Player Name'
  const teamName = p?.team && typeof p.team === 'object' ? p.team.name : props.teamName
  const photoUrl =
    p?.photo && typeof p.photo === 'object' ? (p.photo.url ?? undefined) : props.photoUrl

  const statsFromRel = p?.stats
    ? {
        Голы: p.stats.goals ?? 0,
        Ассисты: p.stats.assists ?? 0,
        ЖК: p.stats.yellowCards ?? 0,
        КК: p.stats.redCards ?? 0,
      }
    : undefined

  const stats = statsFromRel ?? props.stats ?? {}

  return (
    <Card className="my-4 p-4">
      <div className="flex gap-4 items-center">
        <Avatar className="h-16 w-16">
          {photoUrl ? <AvatarImage src={photoUrl} alt={name} /> : null}
          <AvatarFallback className="text-base font-bold">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-xl font-bold">{name}</div>
          {teamName && (
            <div className="mt-1 text-sm text-muted-foreground">
              <Badge variant="secondary">{teamName}</Badge>
            </div>
          )}
          {stats && Object.keys(stats).length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
              {Object.entries(stats).map(([label, value]) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="font-medium">{label}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
