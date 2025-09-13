import React from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Match as MatchType } from '@/payload-types'

interface MatchBlockProps {
  match?: string | MatchType
}

const palette = [
  'bg-rose-200 text-rose-900',
  'bg-amber-200 text-amber-900',
  'bg-emerald-200 text-emerald-900',
  'bg-sky-200 text-sky-900',
  'bg-indigo-200 text-indigo-900',
  'bg-fuchsia-200 text-fuchsia-900',
  'bg-teal-200 text-teal-900',
  'bg-lime-200 text-lime-900',
]

function getInitials(name?: string) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function colorClass(name?: string) {
  if (!name) return palette[0]
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return palette[sum % palette.length]
}

export default function MatchBlock({ match }: MatchBlockProps) {
  const m = match && typeof match === 'object' ? (match as MatchType) : undefined
  const aName = m && typeof m.teamA === 'object' && m.teamA ? m.teamA.name : 'Команда А'
  const bName = m && typeof m.teamB === 'object' && m.teamB ? m.teamB.name : 'Команда Б'
  const aScore = typeof m?.scoreA === 'number' ? (m.scoreA as number) : 0
  const bScore = typeof m?.scoreB === 'number' ? (m.scoreB as number) : 0

  const timeStr = m?.date ? new Date(m.date).toLocaleString() : undefined
  const isLive = (timeStr || '').toLowerCase().includes('live')
  const isFinished = typeof m?.scoreA === 'number' && typeof m?.scoreB === 'number' && !isLive

  const aLeading = aScore > bScore
  const bLeading = bScore > aScore

  return (
    <Card className="my-4 overflow-hidden rounded-2xl shadow-sm">
      <CardHeader className="flex items-center justify-between pb-2">
        {isLive ? (
          <Badge variant="destructive" className="flex items-center gap-2">
            <span className="h-3 w-3 animate-ping rounded-full bg-red-500" />
            LIVE
          </Badge>
        ) : (
          <Badge variant="secondary">{timeStr || '—'}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Team A */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className={`text-base font-extrabold ${colorClass(aName)}`}>
                {getInitials(aName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p
                className={`text-lg font-semibold ${aLeading ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {aName}
              </p>
              {isFinished && (
                <p className="text-xs text-muted-foreground">
                  {aLeading ? 'Победитель' : aScore === bScore ? 'Ничья' : ''}
                </p>
              )}
            </div>
          </div>
          {/* Score */}
          <div className="text-center">
            <p className="text-3xl font-bold">
              {aScore} - {bScore}
            </p>
          </div>
          {/* Team B */}
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right">
              <p
                className={`text-lg font-semibold ${bLeading ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {bName}
              </p>
              {isFinished && (
                <p className="text-xs text-muted-foreground">
                  {bLeading ? 'Победитель' : aScore === bScore ? 'Ничья' : ''}
                </p>
              )}
            </div>
            <Avatar className="h-12 w-12">
              <AvatarFallback className={`text-base font-extrabold ${colorClass(bName)}`}>
                {getInitials(bName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">Матч-анонс</CardFooter>
    </Card>
  )
}
