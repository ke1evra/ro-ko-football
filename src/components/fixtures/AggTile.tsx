import React, { JSX } from 'react'

export type AggVariant = 'default' | 'success' | 'danger' | 'warning' | 'muted' | 'info' | 'primary'

interface AggTileProps {
  label: string
  /** Числитель (например, количество удачных исходов) */
  numerator?: number | null
  /** Знаменатель (общее количество) */
  denominator?: number | null
  muted?: boolean
  variant?: AggVariant
  /** Процент для прогресс-бара (0–100). Если null — прогресс не рисуется. */
  progress?: number | null
}

export default function AggTile({
  label,
  numerator = null,
  denominator = null,
  muted = false,
  variant = 'default',
  progress = null,
}: AggTileProps): JSX.Element {
  const wrapper = `relative overflow-hidden rounded border p-2 flex flex-col justify-between ${
    muted ? 'opacity-70' : ''
  }`

  const numberPalette: Record<AggVariant, string> = {
    default: 'text-foreground',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    danger: 'text-red-700',
    info: 'text-sky-700',
    primary: 'text-indigo-700',
    muted: 'text-muted-foreground',
  }

  // Цвет бордера по теме варианта
  const borderPalette: Record<AggVariant, string> = {
    default: 'border-border',
    success: 'border-green-300',
    warning: 'border-yellow-300',
    danger: 'border-red-300',
    info: 'border-sky-300',
    primary: 'border-indigo-300',
    muted: 'border-border',
  }

  // Градиент прогресса слева направо (от более светлого к более насыщенному)
  const gradientPalette: Record<AggVariant, string> = {
    default: 'bg-gradient-to-r from-slate-50 to-slate-100',
    success: 'bg-gradient-to-r from-green-50 to-green-100',
    warning: 'bg-gradient-to-r from-yellow-50 to-yellow-100',
    danger: 'bg-gradient-to-r from-red-50 to-red-100',
    info: 'bg-gradient-to-r from-sky-50 to-sky-100',
    primary: 'bg-gradient-to-r from-indigo-50 to-indigo-100',
    muted: 'bg-gradient-to-r from-slate-50 to-slate-100',
  }

  const numberCls = numberPalette[variant] || numberPalette.default
  const borderCls = borderPalette[variant] || borderPalette.default
  const gradientCls = gradientPalette[variant] || gradientPalette.default

  const clampedProgress =
    typeof progress === 'number' && Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : null

  const hasFraction = numerator !== null && denominator !== null

  return (
    <div className={`${wrapper} ${borderCls}`}>
      {clampedProgress !== null && (
        <div
          className={`absolute inset-0 ${gradientCls} transition-[width] duration-200`}
          style={{ width: `${clampedProgress}%` }}
        />
      )}

      <div className="relative z-10 flex flex-col gap-1 justify-between h-full">
        <div className="text-[10px] leading-3 text-muted-foreground text-center break-words">
          {label}
        </div>
        <div className={`font-mono text-center font-semibold ${numberCls}`}>
          {hasFraction ? (
            <span className="inline-flex items-baseline gap-[1px]">
              <span className="text-sm leading-5">{numerator}</span>
              <span className="text-[10px] leading-3 opacity-60">/{denominator}</span>
            </span>
          ) : (
            <span
              className={
                clampedProgress !== null ? 'text-[10px] leading-3 opacity-60' : 'text-sm leading-5'
              }
            >
              {numerator ?? ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
