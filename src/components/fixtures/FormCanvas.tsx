'use client'

import React, { useEffect, useRef, useState } from 'react'

interface FormCanvasProps {
  form: Array<'W' | 'D' | 'L'>
  title: string
  compact?: boolean
}

export function FormCanvas({ form, title, compact = false }: FormCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

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

    // Фиксированная высота 150px
    const canvasHeight = 100

    // Устанавливаем размеры canvas с учетом DPR
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`

    ctx.scale(dpr, dpr)

    // Очищаем canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Базовая линия (центр canvas)
    const baseline = canvasHeight / 2

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

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div ref={containerRef} className="w-full">
        <canvas ref={canvasRef} className="block w-full" />
      </div>
    </div>
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
