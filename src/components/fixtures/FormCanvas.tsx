'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { generateMatchUrl } from '@/lib/match-url-utils'
import type { MatchRow, MatchStatsData } from '@/components/fixtures/MatchTable'

interface FormCanvasProps {
  form: Array<'W' | 'D' | 'L'>
  matches: MatchRow[]
  title: string
  compact?: boolean
  side?: 'home' | 'away'
}

// Порядок статистик (как в таблице)
const ORDERED_STATS_KEYS: string[] = [
  'possession',
  'shots',
  'shotsOnTarget',
  'bigChances',
  'corners',
  'passes',
  'yellowCards',
  'shotsOffTarget',
  'shotsBlocked',
  'shotsInsideBox',
  'shotsOutsideBox',
  'hitWoodwork',
  'goals',
  'offsides',
  'freeKicks',
  'longPasses',
  'finalThirdPasses',
  'crosses',
  'xa',
  'throwIns',
  'fouls',
  'tackles',
  'duelsWon',
  'clearances',
  'interceptions',
  'errorsLeadingToShot',
  'errorsLeadingToGoal',
  'saves',
  'xgotAfterShotsOnTarget',
  'goalsPrevented',
]

const getStatsLabel = (key: string): string => {
  const statsLabels: Record<string, string> = {
    possession: 'Владение мячом',
    shots: 'Удары',
    shotsOnTarget: 'Удары в створ',
    shotsOffTarget: 'Удары мимо',
    shotsBlocked: 'Заблокированные удары',
    shotsInsideBox: 'Удары из штрафной',
    shotsOutsideBox: 'Удары за штрафной',
    hitWoodwork: 'Попадание в штангу',
    goals: 'Голы',
    bigChances: 'Голевые моменты',
    corners: 'Угловые',
    offsides: 'Офсайды',
    freeKicks: 'Штрафные',
    longPasses: 'Длинные передачи',
    finalThirdPasses: 'Передачи в последней трети',
    crosses: 'Навесы',
    xa: 'Ожидаемые ассисты',
    throwIns: 'Вбрасывания',
    fouls: 'Фолы',
    tackles: 'Отборы',
    duelsWon: 'Выиграно дуэлей',
    clearances: 'Выносы',
    interceptions: 'Перехваты',
    errorsLeadingToShot: 'Ошибки, приведшие к удару',
    errorsLeadingToGoal: 'Ошибки, приведшие к голу',
    yellowCards: 'Жёлтые карточки',
    redCards: 'Красные карточки',
    saves: 'Сэйвы',
    passes: 'Передачи',
    passesAccurate: 'Точные передачи',
    passAccuracy: 'Точность передач (%)',
    attacks: 'Атаки',
    dangerousAttacks: 'Опасные атаки',
    xgotAfterShotsOnTarget: 'xGOT после ударов в створ',
    goalsPrevented: 'Предотвращённые голы',
  }
  return statsLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

const getOrderedStats = (stats: MatchStatsData): Array<[string, unknown]> => {
  const allKeys = Object.keys(stats)
  const sortedKeys = ORDERED_STATS_KEYS.filter((key) => allKeys.includes(key)).concat(
    allKeys.filter((key) => !ORDERED_STATS_KEYS.includes(key)),
  )
  return sortedKeys.map((key) => [key, stats[key as keyof MatchStatsData]])
}

const CANVAS_HEIGHT_DEFAULT = 200
const CANVAS_HEIGHT_COMPACT = 160

export function FormCanvas({
  form,
  matches,
  title,
  compact = false,
  side = 'home',
}: FormCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || containerWidth === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    // Вычисляем уровни для лесенки (справа налево, поэтому разворачиваем)
    const reversedForm = [...form].reverse()
    const levels: number[] = []
    let current = 0
    for (const res of reversedForm) {
      if (res === 'W') current -= 1
      else if (res === 'L') current += 1
      levels.push(current)
    }
    // Разворачиваем обратно для отрисовки слева направо
    levels.reverse()

    const totalSquares = form.length + 1 // +1 для серого квадрата

    // Вычисляем размер квадрата на основе ширины контейнера, но ограничиваем максимум 24px
    const canvasWidth = containerWidth
    // При большом количестве матчей уменьшаем gap
    const gap = compact ? 1 : 2
    const calculatedSize = Math.floor((canvasWidth - (totalSquares - 1) * gap) / totalSquares)
    const squareSize = Math.min(calculatedSize, 24)

    const verticalOffset = compact ? 4 : 0

    // Считаем максимальное количество уровней вверх/вниз
    let minLevel = 0
    let maxLevel = 0
    if (compact) {
      for (const level of levels) {
        if (level < minLevel) minLevel = level
        if (level > maxLevel) maxLevel = level
      }
    }
    const maxUpLevels = Math.abs(minLevel)
    const maxDownLevels = maxLevel

    const paddingTop = compact ? 2 : 4
    const paddingBottom = compact ? 2 : 4

    const canvasHeight =
      squareSize +
      (maxUpLevels + maxDownLevels) * Math.abs(verticalOffset) +
      paddingTop +
      paddingBottom

    // Устанавливаем размеры canvas с учетом DPR
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`

    ctx.scale(dpr, dpr)

    // Очищаем canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Базовая линия: отталкиваемся от низа, чтобы нижние квадраты не обрезались
    const baseline =
      canvasHeight - paddingBottom - maxDownLevels * Math.abs(verticalOffset) - squareSize / 2

    // Вычисляем позицию первого квадрата для знака вопроса (так как идем справа налево)
    const firstLevel = levels.length > 0 ? (levels[0] ?? 0) : 0
    const lastOffsetY = compact ? firstLevel * verticalOffset : 0

    // Рисуем серый квадрат "будущий матч" на линии последнего квадрата
    ctx.fillStyle = '#9ca3af' // gray-400
    const futureX = 0
    const futureY = baseline - squareSize / 2 + lastOffsetY
    if (compact) {
      ctx.fillRect(futureX, futureY, squareSize, squareSize)
    } else {
      roundRect(ctx, futureX, futureY, squareSize, squareSize, 4)
    }

    // Текст "?" в сером квадрате (только если не компактный режим)
    if (!compact) {
      ctx.fillStyle = '#ffffff'
      const fontSize = Math.max(10, Math.floor(squareSize * 0.5))
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', futureX + squareSize / 2, futureY + squareSize / 2)
    }

    // Рисуем квадраты формы
    form.forEach((res, idx) => {
      const level = levels[idx] ?? 0
      const offsetY = compact ? level * verticalOffset : 0

      const x = (idx + 1) * (squareSize + gap)
      const y = baseline - squareSize / 2 + offsetY

      // Цвет квадрата
      switch (res) {
        case 'W':
          ctx.fillStyle = '#22c55e' // green-500
          break
        case 'D':
          ctx.fillStyle = '#eab308' // yellow-500
          break
        case 'L':
          ctx.fillStyle = '#ef4444' // red-500
          break
        default:
          ctx.fillStyle = '#9ca3af' // gray-400
      }

      // Рисуем квадрат
      if (compact) {
        ctx.fillRect(x, y, squareSize, squareSize)
      } else {
        roundRect(ctx, x, y, squareSize, squareSize, 4)
      }

      // Текст в квадрате (только если не компактный режим)
      if (!compact) {
        ctx.fillStyle = '#ffffff'
        const fontSize = Math.max(10, Math.floor(squareSize * 0.5))
        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const label = res === 'W' ? 'В' : res === 'D' ? 'Н' : 'П'
        ctx.fillText(label, x + squareSize / 2, y + squareSize / 2)
      }
    })
  }, [form, compact, containerWidth])

  // Обработчик движения мыши
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !containerRef.current) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const totalSquares = form.length + 1
    const gap = compact ? 1 : 2
    const calculatedSize = Math.floor((containerWidth - (totalSquares - 1) * gap) / totalSquares)
    const squareSize = Math.min(calculatedSize, 24)

    // Проверяем, на каком квадрате находится курсор
    let foundIndex: number | null = null
    for (let idx = 0; idx < form.length; idx++) {
      const squareX = (idx + 1) * (squareSize + gap)
      if (x >= squareX && x <= squareX + squareSize) {
        foundIndex = idx
        break
      }
    }

    if (foundIndex !== null) {
      setHoveredIndex(foundIndex)
      setTooltipPosition({ x: e.clientX, y: e.clientY })
      canvas.style.cursor = 'pointer'
    } else {
      setHoveredIndex(null)
      setTooltipPosition(null)
      canvas.style.cursor = 'default'
    }
  }

  // Обработчик клика
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredIndex !== null && matches[hoveredIndex]) {
      const match = matches[hoveredIndex]
      const url = generateMatchUrl({
        homeTeamName: match.homeName,
        awayTeamName: match.awayName,
        date: match.date,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        fixtureId: match.fixtureId,
        matchId: match.matchId,
      })
      router.push(url)
    }
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
    setTooltipPosition(null)
  }

  const hoveredMatch = hoveredIndex !== null ? matches[hoveredIndex] : null

  return (
    <>
      <div className={title ? 'space-y-2' : ''}>
        {title && <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>}
        <div ref={containerRef} className="w-full">
          <canvas
            ref={canvasRef}
            className="block w-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          />
        </div>
      </div>

      {/* Tooltip - рендерится вне контейнера */}
      {hoveredMatch && tooltipPosition && (
        <div
          className="fixed z-50 bg-popover text-popover-foreground rounded-md border shadow-md p-3 max-w-sm"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y + 10}px`,
            pointerEvents: 'none',
          }}
        >
          <div className="space-y-2">
            <div className="font-semibold text-sm">
              {hoveredMatch.homeName} - {hoveredMatch.awayName}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(hoveredMatch.date).toLocaleDateString('ru-RU')}
            </div>
            <div className="text-sm font-bold">
              {hoveredMatch.homeScore} - {hoveredMatch.awayScore}
            </div>
            {hoveredMatch.stats ? (
              <div className="text-xs space-y-1 max-h-64 overflow-y-auto">
                <h4 className="font-semibold text-xs mb-1">Статистика матча</h4>
                {getOrderedStats(hoveredMatch.stats).map(([key, value]) => {
                  if (
                    value &&
                    typeof value === 'object' &&
                    'home' in value &&
                    'away' in value &&
                    typeof value.home === 'number' &&
                    typeof value.away === 'number'
                  ) {
                    const v = value as { home: number; away: number }
                    return (
                      <div key={key} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{getStatsLabel(key)}</span>
                        <span className="font-semibold">
                          {v.home} - {v.away}
                        </span>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Статистика недоступна</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// Вспомогательная функция для рисования скругленных прямоугольников
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.fill()
}
