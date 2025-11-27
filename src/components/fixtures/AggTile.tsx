import React, { JSX } from 'react'

export type AggVariant = 'default' | 'success' | 'danger' | 'warning' | 'muted' | 'info' | 'primary'

interface AggTileProps {
  label: string
  value: string
  muted?: boolean
  variant?: AggVariant
  /** Показывать прогресс-бар (верхний ряд с 1/N) */
  progress?: number | null
}

export default function AggTile({
  label,
  value,
  muted = false,
  variant = 'default',
  progress = null,
}: AggTileProps): JSX.Element {
  const wrapper = `relative overflow-hidden rounded border p-2 flex flex-col justify-between ${muted ? 'opacity-70' : ''}`

  const numberPalette: Record<AggVariant, string> = {
    default: 'text-foreground',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    danger: 'text-red-700',
    info: 'text-sky-700',
    primary: 'text-indigo-700',
    muted: 'text-muted-foreground',
  }

  const bgPalette: Record<AggVariant, string> = {
    default: 'bg-muted',
    success: 'bg-green-100',
    warning: 'bg-yellow-100',
    danger: 'bg-red-100',
    info: 'bg-sky-100',
    primary: 'bg-indigo-100',
    muted: 'bg-muted',
  }

  // Для прогресса и��пользуем лёгкие цвета из bgPalette
  const fillPalette: Record<AggVariant, string> = bgPalette

  const numberCls = numberPalette[variant] || numberPalette.default
  const fillCls = fillPalette[variant] || fillPalette.default

  const clampedProgress =
    typeof progress === 'number' && Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : null

  return (
    <div className={wrapper}>
      {clampedProgress !== null && (
        <div
          className={`absolute inset-0 ${fillCls} transition-all duration-200`}
          style={{ width: `${clampedProgress}%` }}
        />
      )}

      <div className="relative z-10 flex flex-col gap-1">
        <div className="text-[10px] leading-3 text-muted-foreground text-center break-words">
          {label}
        </div>
        <div
          className={`font-mono text-center ${
            clampedProgress !== null ? 'text-[10px] leading-3 opacity-60' : 'text-sm leading-5'
          } font-semibold ${numberCls}`}
        >
          {value}
        </div>
      </div>
    </div>
  )
}
