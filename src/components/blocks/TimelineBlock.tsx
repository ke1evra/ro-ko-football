import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface EventItem {
  minute: number
  team?: string
  player?: string
  type: 'goal' | 'penalty' | 'own-goal' | 'yellow' | 'red' | 'sub' | 'var'
  description?: string
}

function typeBadge(type: EventItem['type']) {
  switch (type) {
    case 'goal':
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Гол</Badge>
    case 'penalty':
      return <Badge className="bg-blue-600 hover:bg-blue-600">Пенальти</Badge>
    case 'own-goal':
      return <Badge className="bg-rose-600 hover:bg-rose-600">Автогол</Badge>
    case 'yellow':
      return <Badge className="bg-amber-500 hover:bg-amber-500">Жёлтая</Badge>
    case 'red':
      return <Badge className="bg-red-600 hover:bg-red-600">Красная</Badge>
    case 'sub':
      return <Badge variant="secondary">Замена</Badge>
    case 'var':
      return <Badge variant="outline">VAR</Badge>
    default:
      return <Badge>Событие</Badge>
  }
}

export default function TimelineBlock({ events }: { events?: EventItem[] }) {
  if (!events || events.length === 0) return null

  const sorted = [...events].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle>Хронология матча</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((e, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
            <div className="text-sm text-muted-foreground">{e.minute}'</div>
            <div>
              <div className="font-medium">
                {e.player || 'Игрок'} {e.team ? `(${e.team})` : ''}
              </div>
              {e.description && (
                <div className="text-sm text-muted-foreground">{e.description}</div>
              )}
            </div>
            <div>{typeBadge(e.type)}</div>
            {i !== sorted.length - 1 && (
              <div className="col-span-3">
                <Separator className="mt-2" />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
