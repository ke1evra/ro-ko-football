'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'

interface PredictionButtonProps {
  matchId?: number
  fixtureId?: number
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  className?: string
  mode?: 'redirect' | 'modal'
  onModalOpen?: () => void
}

export default function PredictionButton({ 
  matchId, 
  fixtureId, 
  size = 'default', 
  variant = 'default',
  className,
  mode = 'redirect',
  onModalOpen
}: PredictionButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (mode === 'modal' && onModalOpen) {
      onModalOpen()
    } else {
      const params = new URLSearchParams()
      if (matchId) params.set('matchId', matchId.toString())
      if (fixtureId) params.set('fixtureId', fixtureId.toString())
      
      router.push(`/predictions/create?${params.toString()}`)
    }
  }

  return (
    <Button 
      onClick={handleClick}
      size={size}
      variant={variant}
      className={className}
    >
      <TrendingUp className="h-4 w-4 mr-2" />
      Прогноз
    </Button>
  )
}