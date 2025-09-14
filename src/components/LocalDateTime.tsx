'use client'

import { useMemo } from 'react'

export type LocalDateTimeProps = {
  /**
   * Дата (может быть строкой YYYY-MM-DD/ISO или объектом Date)
   */
  date?: string | Date
  /**
   * Время в формате HH:mm или HH:mm:ss
   */
  time?: string
  /**
   * Готовая строка даты-времени (например, 2025-09-14T17:30:00)
   */
  dateTime?: string
  /**
   * Источник времени в UTC (если true — будет учтён суффикс Z при сборке)
   */
  utc?: boolean
  /**
   * Управление стилями формата даты/времени
   */
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle']
  timeStyle?: Intl.DateTimeFormatOptions['timeStyle']
  /**
   * Принудительная локаль (по умолчанию — локаль пользователя)
   */
  locale?: string
  /**
   * Режим показа: дата, время или вместе (по умолчанию — вместе, если переданы оба)
   */
  showDate?: boolean
  showTime?: boolean
  className?: string
}

function stripToDate(input: string): string {
  // Принимает ISO или YYYY-MM-DD и возвращает YYYY-MM-DD
  const dOnly = input.split('T')[0]
  return dOnly
}

function ensureSeconds(t?: string): string | undefined {
  if (!t) return undefined
  // Приводим HH:mm к HH:mm:00
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`
  return t
}

function toISO({
  date,
  time,
  dateTime,
  utc,
}: {
  date?: string | Date
  time?: string
  dateTime?: string
  utc?: boolean
}): string | null {
  if (dateTime) {
    // Если передали готовую строку, добавим Z при необходимости
    const hasZ = /Z$/.test(dateTime)
    return utc && !hasZ ? `${dateTime}Z` : dateTime
  }

  if (!date) return null

  const dateStr = typeof date === 'string' ? stripToDate(date) : stripToDate(date.toISOString())
  const timeStr = ensureSeconds(time) || '00:00:00'

  // Если utc — дописываем Z, чтобы браузер преобразовал в локальную зону
  return utc ? `${dateStr}T${timeStr}Z` : `${dateStr}T${timeStr}`
}

export function LocalDateTime({
  date,
  time,
  dateTime,
  utc = true,
  dateStyle = 'long',
  timeStyle = 'short',
  locale,
  showDate,
  showTime,
  className,
}: LocalDateTimeProps) {
  const iso = useMemo(() => toISO({ date, time, dateTime, utc }), [date, time, dateTime, utc])

  // SSR fallback: используем ru-RU, на клиенте перерендерим локально
  const ssrLocale = 'ru-RU'
  const clientLocale = typeof window !== 'undefined' ? locale || navigator.language : ssrLocale

  const formatted = useMemo(() => {
    if (!iso) return ''

    const dt = new Date(iso)
    const wantDate = showDate ?? true
    const wantTime = showTime ?? true

    const optsBase: Intl.DateTimeFormatOptions = {}

    const parts: string[] = []
    if (wantDate) {
      const opts: Intl.DateTimeFormatOptions = { ...optsBase, dateStyle }
      parts.push(new Intl.DateTimeFormat(clientLocale, opts).format(dt))
    }
    if (wantTime) {
      const opts: Intl.DateTimeFormatOptions = { ...optsBase, timeStyle }
      parts.push(new Intl.DateTimeFormat(clientLocale, opts).format(dt))
    }

    return parts.join(' ')
  }, [iso, clientLocale, dateStyle, timeStyle, showDate, showTime])

  // Подавляем предупреждение о возможной расхождении SSR/CSR
  return (
    <span className={className} suppressHydrationWarning>
      {formatted}
    </span>
  )
}

export default LocalDateTime
