import React, { JSX } from 'react'

export type AggVariant = 'default' | 'success' | 'danger' | 'warning' | 'muted' | 'info' | 'primary'

interface AggTileProps {
  label: string
  value: string
  muted?: boolean
  variant?: AggVariant
}

export default function AggTile({
  label,
  value,
  muted = false,
  variant = 'default',
}: AggTileProps): JSX.Element {
  const wrapper = `rounded border p-2 flex flex-col justify-between ${muted ? 'opacity-70' : ''}`
  const numberPalette: Record<AggVariant, string> = {
    default: 'text-foreground',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    danger: 'text-red-700',
    info: 'text-sky-700',
    primary: 'text-indigo-700',
    muted: 'text-muted-foreground',
  }
  const numberCls = numberPalette[variant] || numberPalette.default

  return (
    <div className={wrapper}>
      <div className="text-[10px] leading-3 text-muted-foreground text-center break-words">
        {label}
      </div>
      <div className={`text-sm leading-5 font-semibold font-mono text-center ${numberCls}`}>
        {value}
      </div>
    </div>
  )
}
