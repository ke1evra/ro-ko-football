import React from 'react'
import { cn } from '@/lib/utils'

interface SiteLogoProps {
  className?: string
}

export function SiteLogo({ className }: SiteLogoProps) {
  return (
    <span
      aria-label="RoCoScore"
      className={cn(
        'inline-flex items-center font-extrabold tracking-tight select-none text-black',
        className,
      )}
    >
      RoCoScore
    </span>
  )
}

export default SiteLogo
