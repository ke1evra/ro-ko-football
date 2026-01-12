import { Badge } from '@/components/ui/badge'

interface MatchResultProps {
  home: string
  away: string
  homeScore: number
  awayScore: number
  homeScoreHalftime?: number | null
  awayScoreHalftime?: number | null
}

export function MatchResult({
  home,
  away,
  homeScore,
  awayScore,
  homeScoreHalftime,
  awayScoreHalftime,
}: MatchResultProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Результат матча
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{home}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-bold tabular-nums">{homeScore}</span>
          <span className="text-muted-foreground">:</span>
          <span className="text-2xl font-bold tabular-nums">{awayScore}</span>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="text-sm font-semibold truncate">{away}</div>
        </div>
      </div>
      {homeScoreHalftime !== null && awayScoreHalftime !== null && (
        <div className="text-xs text-muted-foreground">
          Перерыв: {homeScoreHalftime}:{awayScoreHalftime}
        </div>
      )}
    </div>
  )
}
