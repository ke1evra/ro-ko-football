import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface TeamRow {
  name: string
  played?: number
  wins?: number
  draws?: number
  losses?: number
  goalsFor?: number
  goalsAgainst?: number
  points?: number
  form?: string
}

export default function StandingsBlock({ teams }: { teams?: TeamRow[] }) {
  const rows = (teams || []).map((t) => ({
    ...t,
    played: t.played ?? 0,
    wins: t.wins ?? 0,
    draws: t.draws ?? 0,
    losses: t.losses ?? 0,
    goalsFor: t.goalsFor ?? 0,
    goalsAgainst: t.goalsAgainst ?? 0,
    points: t.points ?? ((t.wins ?? 0) * 3 + (t.draws ?? 0)),
  }))

  if (rows.length === 0) return null

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle>Турнирная таблица</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Команда</TableHead>
              <TableHead className="text-right">И</TableHead>
              <TableHead className="text-right">В</TableHead>
              <TableHead className="text-right">Н</TableHead>
              <TableHead className="text-right">П</TableHead>
              <TableHead className="text-right">З-П</TableHead>
              <TableHead className="text-right">О</TableHead>
              <TableHead className="text-right">Форма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t, i) => {
              const gd = (t.goalsFor ?? 0) - (t.goalsAgainst ?? 0)
              const form = (t.form || '').slice(0, 5)
              return (
                <TableRow key={t.name + i}>
                  <TableCell className="font-medium">{i + 1}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell className="text-right">{t.played}</TableCell>
                  <TableCell className="text-right">{t.wins}</TableCell>
                  <TableCell className="text-right">{t.draws}</TableCell>
                  <TableCell className="text-right">{t.losses}</TableCell>
                  <TableCell className="text-right">{t.goalsFor}-{t.goalsAgainst} ({gd >= 0 ? '+' : ''}{gd})</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{t.points}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-xs tracking-tight">{form}</span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
