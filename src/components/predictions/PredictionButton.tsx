import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'

interface PredictionButtonProps {
  matchId?: number
  fixtureId?: number
  size?: 'sm' | 'default'
  variant?: 'default' | 'outline' | 'secondary'
  className?: string
}

export default function PredictionButton({ 
  matchId, 
  fixtureId, 
  size = 'sm', 
  variant = 'outline',
  className 
}: PredictionButtonProps) {
  if (!matchId && !fixtureId) {
    return null
  }

  const searchParams = new URLSearchParams()
  if (matchId) searchParams.set('matchId', matchId.toString())
  if (fixtureId) searchParams.set('fixtureId', fixtureId.toString())

  return (
    <Link href={`/predictions/create?${searchParams.toString()}`}>
      <Button size={size} variant={variant} className={className}>
        <TrendingUp className="h-4 w-4 mr-1" />
        Прогноз
      </Button>
    </Link>
  )
}