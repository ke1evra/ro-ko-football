'use client'

import { useRouter } from 'next/navigation'

interface YearSelectorProps {
  leagueId: string
  selectedYear?: string
}

export function YearSelector({ leagueId, selectedYear }: YearSelectorProps) {
  const router = useRouter()

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value
    if (year) {
      router.push(`/leagues/${leagueId}/matches/${year}`)
    } else {
      router.push(`/leagues/${leagueId}/matches`)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Выберите год:</span>
      <select 
        className="px-3 py-1 border rounded-md text-sm"
        value={selectedYear || ''}
        onChange={handleYearChange}
      >
        <option value="">Последние матчи</option>
        {Array.from({ length: 26 }, (_, i) => 2025 - i).map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>
  )
}