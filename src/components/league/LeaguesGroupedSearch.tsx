"use client"

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { CountryFlagImage } from '@/components/CountryFlagImage'

export type LeagueItem = {
  id: number
  name: string
  country?: {
    id?: number
    name?: string | null
    flag?: string | null
  } | null
}

interface LeaguesGroupedSearchProps {
  items: LeagueItem[]
  className?: string
}

function byName(a?: string | null, b?: string | null) {
  return (a || '').localeCompare(b || '', 'ru')
}

export default function LeaguesGroupedSearch({ items, className }: LeaguesGroupedSearchProps) {
  const [query, setQuery] = useState('')

  const normalized = useMemo(() => {
    const q = query.trim().toLowerCase()
    return !q
      ? items
      : items.filter((it) => it.name.toLowerCase().includes(q))
  }, [items, query])

  const groups = useMemo(() => {
    const map = new Map<string, LeagueItem[]>()
    const labelIntl = 'Международные'

    for (const it of normalized) {
      const countryName = (it.country?.name || labelIntl).trim()
      if (!map.has(countryName)) map.set(countryName, [])
      map.get(countryName)!.push(it)
    }

    const sorted: Array<[string, LeagueItem[]]> = Array.from(map.entries())
      .sort(([a], [b]) => byName(a, b))
      .map(([countryName, arr]) => [countryName, arr.sort((a, b) => byName(a.name, b.name))])

    return sorted
  }, [normalized])

  const nothingFound = normalized.length === 0

  return (
    <div className={className}>
      <div className="mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по лигам"
        />
      </div>

      {nothingFound ? (
        <div className="text-sm text-muted-foreground">Ничего не найдено</div>
      ) : (
        <div className="space-y-8">
          {groups.map(([countryName, leagues]) => (
            <section key={countryName} className="space-y-3">
              <h3 className="text-lg font-semibold">{countryName}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {leagues.map((competition) => (
                  <Link key={competition.id} href={`/leagues/${competition.id}`} className="block">
                    <div className="group border rounded-md p-4 flex items-center gap-3 hover:bg-accent transition-colors">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                        {competition.country?.id ? (
                          <CountryFlagImage
                            countryId={competition.country.id}
                            countryName={competition.country.name || undefined}
                            size="medium"
                            className="w-full h-full object-cover"
                          />)
                          : (
                          <span className="text-base" aria-hidden>⚽</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{competition.name}</div>
                        {competition.country?.name && (
                          <div className="text-xs text-muted-foreground truncate">
                            {competition.country.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
