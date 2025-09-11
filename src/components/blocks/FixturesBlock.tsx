import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface FixtureItem {
  date?: string
  time?: string
  teamA?: string
  teamB?: string
  tournament?: string
  venue?: string
}

export default function FixturesBlock({ fixtures }: { fixtures?: FixtureItem[] }) {
  if (!fixtures || fixtures.length === 0) return null

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle>Расписание матчей</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fixtures.map((f, i) => {
          const dateLabel = f.date ? new Date(f.date).toLocaleDateString() : ''
          const timeLabel = f.time || ''
          const tn = f.tournament || ''
          const venue = f.venue || ''
          return (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {dateLabel && <span>{dateLabel}</span>}
                  {timeLabel && (
                    <>
                      <span>•</span>
                      <span>{timeLabel}</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {tn && <Badge variant="secondary">{tn}</Badge>}
                  {venue && <Badge variant="outline">{venue}</Badge>}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="font-semibold">{f.teamA || 'Team A'}</div>
                <span className="text-muted-foreground">vs</span>
                <div className="font-semibold">{f.teamB || 'Team B'}</div>
              </div>
              {i !== fixtures.length - 1 && <Separator className="mt-2" />}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
