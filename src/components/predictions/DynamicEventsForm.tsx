'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X, Check, TrendingUp } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface PredictionEvent {
  id: string
  event: string
  coefficient: number
  v2?: any
}

interface Market {
  id: string
  name: string
  groups: Array<{
    id: string
    name: string
    outcomes: Array<{
      name: string
      values: Array<{
        value: number
      }>
    }>
  }>
}

interface DynamicEventsFormProps {
  matchData: {
    home: { name: string }
    away: { name: string }
  }
  onEventsChange: (events: PredictionEvent[]) => void
  initialEvents?: PredictionEvent[]
}

export default function DynamicEventsForm({
  matchData,
  onEventsChange,
  initialEvents = [],
}: DynamicEventsFormProps) {
  const [events, setEvents] = useState<PredictionEvent[]>(initialEvents)
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMarketId, setSelectedMarketId] = useState<string>('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedOutcome, setSelectedOutcome] = useState<string>('')
  const [selectedValue, setSelectedValue] = useState<number | null>(null)
  const [coefficient, setCoefficient] = useState<string>('')

  useEffect(() => {
    async function loadMarkets() {
      try {
        const response = await fetch('/api/custom/bet-markets')
        if (response.ok) {
          const data = await response.json()
          setMarkets(data.docs || [])
        }
      } catch (error) {
        console.error('Failed to load markets:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMarkets()
  }, [])

  const selectedMarket = markets.find((m) => m.id === selectedMarketId)
  const selectedGroup = selectedMarket?.groups?.find((g) => g.id === selectedGroupId)

  function selectValue(outcomeName: string, value: number | null) {
    setSelectedOutcome(outcomeName)
    setSelectedValue(value)
  }

  function addEvent() {
    if (!selectedMarket || !selectedGroup || !selectedOutcome || !coefficient.trim()) return

    const c = parseFloat(coefficient)
    if (!Number.isFinite(c) || c <= 0) return

    const eventLabel =
      selectedValue !== null ? `${selectedOutcome} ${selectedValue}` : selectedOutcome
    const newEvent: PredictionEvent = {
      id: Date.now().toString(),
      event: eventLabel,
      coefficient: c,
      v2: {
        market: selectedValue !== null ? 'total' : 'main', // для исходов без значений - main
        label: eventLabel,
        coefficient: c,
        stat: 'goals', // по умолчанию
        ...(selectedValue !== null && {
          kind: selectedOutcome.includes('ТБ') ? 'over' : 'under',
          line: selectedValue,
        }),
      },
    }

    const updated = [...events, newEvent]
    setEvents(updated)
    onEventsChange(updated)

    // Reset
    setSelectedOutcome('')
    setSelectedValue(null)
    setCoefficient('')
  }

  function removeEvent(eventId: string) {
    const updated = events.filter((e) => e.id !== eventId)
    setEvents(updated)
    onEventsChange(updated)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p>Загрузка групп исходов...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          События для прогноза
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Список добавленных событий */}
        {events.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Выбранные события:</Label>
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm py-1.5 px-2 h-auto rounded-md">
                      {event.event}
                    </Badge>
                    <span className="text-sm">Коэффиц��ент: {event.coefficient}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEvent(event.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Separator />
          </div>
        )}

        {/* Выбор маркета */}
        <div className="space-y-2">
          <Label>Маркет</Label>
          <Select
            value={selectedMarketId}
            onValueChange={(value) => {
              setSelectedMarketId(value)
              setSelectedGroupId('') // reset group when market changes
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите маркет" />
            </SelectTrigger>
            <SelectContent>
              {markets.map((market) => (
                <SelectItem key={market.id} value={market.id}>
                  {market.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Г��уппы исходов */}
        {selectedMarket && (
          <Accordion
            type="multiple"
            defaultValue={selectedMarket?.groups?.length > 0 ? [selectedMarket.groups[0].id] : []}
            className="w-full"
          >
            {selectedMarket?.groups?.map((group) => (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger>{group.name}</AccordionTrigger>
                <AccordionContent>
                  {/* Динамическое количество колонок: 1–5 => столько же колонок; больше 5 => строки по 3 колонки */}
                  <div className="space-y-3">
                    {(() => {
                      const outcomesWithValues = group.outcomes.filter(
                        (o) => o.values && o.values.length > 0,
                      )

                      if (outcomesWithValues.length <= 5) {
                        const cols = Math.max(1, outcomesWithValues.length)
                        let gridColsClass = 'grid-cols-1'
                        switch (cols) {
                          case 1:
                            gridColsClass = 'grid-cols-1'
                            break
                          case 2:
                            gridColsClass = 'grid-cols-2'
                            break
                          case 3:
                            gridColsClass = 'grid-cols-3'
                            break
                          case 4:
                            gridColsClass = 'grid-cols-4'
                            break
                          case 5:
                            gridColsClass = 'grid-cols-5'
                            break
                          default:
                            gridColsClass = 'grid-cols-3'
                        }

                        return (
                          <div className={`grid ${gridColsClass} gap-3`}>
                            {outcomesWithValues.map((outcome, colIdx) => (
                              <div key={`single-row-col-${colIdx}`} className="flex flex-col gap-2">
                                <div className="text-xs font-medium text-muted-foreground truncate">
                                  {outcome.name}
                                </div>
                                <div className="flex flex-col gap-2">
                                  {outcome.values.map((val, valIdx) => (
                                    <div key={`val-${colIdx}-${valIdx}`} className="flex flex-col gap-2">
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => selectValue(outcome.name, val.value)}
                                        className={
                                          (selectedOutcome === outcome.name &&
                                          selectedValue === val.value
                                            ? 'bg-primary text-primary-foreground '
                                            : '') + 'w-full border-0 text-center'
                                        }
                                      >
                                        <span className="text-xs opacity-30">{outcome.name}</span>{' '}
                                        {val.value}
                                      </Button>
                                      {selectedOutcome === outcome.name && selectedValue === val.value && (
                                        <div className="space-y-2 mt-2">
                                          <Label>
                                            Коэффициент для {selectedOutcome}
                                            {selectedValue !== null ? ` ${selectedValue}` : ''}
                                          </Label>
                                          <div className="flex gap-2">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min="1"
                                              placeholder="1.85"
                                              value={coefficient}
                                              onChange={(e) => setCoefficient(e.target.value)}
                                              className="flex-1"
                                            />
                                            <Button onClick={addEvent} disabled={!coefficient.trim()}>
                                              <Check className="h-4 w-4 mr-2" />
                                              Добавить
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      }

                      // > 5 исходов — разбивка по строкам по 3 колонки
                      const rows: (typeof outcomesWithValues)[] = []
                      for (let i = 0; i < outcomesWithValues.length; i += 3) {
                        rows.push(outcomesWithValues.slice(i, i + 3))
                      }

                      return rows.map((row, rowIdx) => (
                        <div
                          key={`row-${rowIdx}`}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                        >
                          {row.map((outcome, colIdx) => (
                            <div key={`col-${rowIdx}-${colIdx}`} className="flex flex-col gap-2">
                              <div className="text-xs font-medium text-muted-foreground truncate">
                                {outcome.name}
                              </div>
                              <div className="flex flex-col gap-2">
                                {outcome.values.map((val, valIdx) => (
                                  <div key={`val-${rowIdx}-${colIdx}-${valIdx}`} className="flex flex-col gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => selectValue(outcome.name, val.value)}
                                      className={
                                        (selectedOutcome === outcome.name &&
                                        selectedValue === val.value
                                          ? 'bg-primary text-primary-foreground '
                                          : '') + 'w-full border-0 text-center'
                                      }
                                    >
                                      <span className="text-xs opacity-30">{outcome.name}</span>{' '}
                                      <span>{val.value}</span>
                                    </Button>
                                    {selectedOutcome === outcome.name && selectedValue === val.value && (
                                      <div className="space-y-2 mt-2">
                                        <Label>
                                          Коэффициент для {selectedOutcome}
                                          {selectedValue !== null ? ` ${selectedValue}` : ''}
                                        </Label>
                                        <div className="flex gap-2">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="1"
                                            placeholder="1.85"
                                            value={coefficient}
                                            onChange={(e) => setCoefficient(e.target.value)}
                                            className="flex-1"
                                          />
                                          <Button onClick={addEvent} disabled={!coefficient.trim()}>
                                            <Check className="h-4 w-4 mr-2" />
                                            Добавить
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {/* Для заполнения сетки до 3 колонок на последней строке добавляем пустые плейсхолдеры */}
                          {row.length < 3 &&
                            Array.from({ length: 3 - row.length }).map((_, i) => (
                              <div key={`placeholder-${rowIdx}-${i}`} />
                            ))}
                        </div>
                      ))
                    })()}
                  </div>

                  {/* Исходы без значений: та же логика сетки — 1–5 в одну строку, >5 по 3 в ряд */}
                  {(() => {
                    const noValue = group.outcomes.filter(
                      (outcome) => !outcome.values || outcome.values.length === 0,
                    )

                    if (noValue.length === 0) return null

                    if (noValue.length <= 5) {
                      const cols = Math.max(1, noValue.length)
                      let gridColsClass = 'grid-cols-1'
                      switch (cols) {
                        case 1:
                          gridColsClass = 'grid-cols-1'
                          break
                        case 2:
                          gridColsClass = 'grid-cols-2'
                          break
                        case 3:
                          gridColsClass = 'grid-cols-3'
                          break
                        case 4:
                          gridColsClass = 'grid-cols-4'
                          break
                        case 5:
                          gridColsClass = 'grid-cols-5'
                          break
                        default:
                          gridColsClass = 'grid-cols-3'
                      }
                      return (
                        <div className={`mt-4 grid gap-2 ${gridColsClass}`}>
                          {noValue.map((outcome, outcomeIndex) => (
                            <div key={`no-col-${outcomeIndex}`} className="flex flex-col gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => selectValue(outcome.name, null)}
                                className={
                                  (selectedOutcome === outcome.name && selectedValue === null
                                    ? 'bg-primary text-primary-foreground '
                                    : '') + 'w-full border-0 text-center'
                                }
                              >
                                {outcome.name}
                              </Button>
                              {selectedOutcome === outcome.name && (
                                <div className="space-y-2 mt-2">
                                  <Label>
                                    Коэффициент для {selectedOutcome}
                                    {selectedValue !== null ? ` ${selectedValue}` : ''}
                                  </Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="1"
                                      placeholder="1.85"
                                      value={coefficient}
                                      onChange={(e) => setCoefficient(e.target.value)}
                                      className="flex-1"
                                    />
                                    <Button onClick={addEvent} disabled={!coefficient.trim()}>
                                      <Check className="h-4 w-4 mr-2" />
                                      Добавить
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    }

                    // > 5 — по 3 колонки на строку
                    const rows: (typeof noValue)[] = []
                    for (let i = 0; i < noValue.length; i += 3) {
                      rows.push(noValue.slice(i, i + 3))
                    }

                    return (
                      <div className="mt-4 space-y-2">
                        {rows.map((row, rowIdx) => (
                          <div key={`no-row-${rowIdx}`} className="grid grid-cols-3 gap-2">
                            {row.map((outcome, idx) => (
                              <div key={`no-col-${rowIdx}-${idx}`} className="flex flex-col gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => selectValue(outcome.name, null)}
                                  className={
                                    (selectedOutcome === outcome.name && selectedValue === null
                                      ? 'bg-primary text-primary-foreground '
                                      : '') + 'w-full border-0'
                                  }
                                >
                                  {outcome.name}
                                </Button>
                                {selectedOutcome === outcome.name && (
                                  <div className="space-y-2 mt-2">
                                    <Label>
                                      Коэффициент для {selectedOutcome}
                                      {selectedValue !== null ? ` ${selectedValue}` : ''}
                                    </Label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        placeholder="1.85"
                                        value={coefficient}
                                        onChange={(e) => setCoefficient(e.target.value)}
                                        className="flex-1"
                                      />
                                      <Button onClick={addEvent} disabled={!coefficient.trim()}>
                                        <Check className="h-4 w-4 mr-2" />
                                        Добавить
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {row.length < 3 &&
                              Array.from({ length: 3 - row.length }).map((_, i) => (
                                <div key={`no-placeholder-${rowIdx}-${i}`} />
                              ))}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {events.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Пока не добавлено ни одного события</p>
            <p className="text-xs">Выберите группу и нажмите на значение для добавления</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
