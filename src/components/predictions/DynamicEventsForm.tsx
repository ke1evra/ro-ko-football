'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { X, TrendingUp } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export interface PredictionEvent {
  id: string
  event: string
  coefficient: number
  market: string
  marketLabel?: string
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
  onSelectedEventChange: (event: PredictionEvent | null) => void
  selectedEvent: PredictionEvent | null
}

export default function DynamicEventsForm({
  matchData,
  onSelectedEventChange,
  selectedEvent,
}: DynamicEventsFormProps) {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMarketId, setSelectedMarketId] = useState<string>('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedOutcome, setSelectedOutcome] = useState<string>('')
  const [selectedValue, setSelectedValue] = useState<number | null>(null)
  const [coefficientInput, setCoefficientInput] = useState<string>('')

  useEffect(() => {
    async function loadMarkets() {
      try {
        const response = await fetch('/api/custom/bet-markets')
        if (response.ok) {
          const data = await response.json()
          const docs = data.docs || []
          setMarkets(docs)
          if (docs.length > 0) {
            setSelectedMarketId(docs[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to load markets:', error)
      } finally {
        setLoading(false)
      }
    }
    void loadMarkets()
  }, [])

  useEffect(() => {
    if (!selectedEvent) {
      setSelectedOutcome('')
      setSelectedValue(null)
      setCoefficientInput('')
      return
    }
    setCoefficientInput(String(selectedEvent.coefficient))
  }, [selectedEvent])

  const selectedMarket = markets.find((m) => m.id === selectedMarketId)
  const selectedGroup = selectedMarket?.groups?.find((g) => g.id === selectedGroupId)

  function selectValue(outcomeName: string, value: number | null) {
    setSelectedOutcome(outcomeName)
    setSelectedValue(value)
    onSelectedEventChange(null)
    setCoefficientInput('')
  }

  function handleCoefficientChange(raw: string) {
    setCoefficientInput(raw)

    const trimmed = raw.trim()
    if (!selectedOutcome || !trimmed) {
      onSelectedEventChange(null)
      return
    }

    const c = parseFloat(trimmed.replace(',', '.'))
    if (!Number.isFinite(c) || c <= 0) {
      onSelectedEventChange(null)
      return
    }

    const eventLabel =
      selectedValue !== null ? `${selectedOutcome} ${selectedValue}` : selectedOutcome

    const marketType = selectedValue !== null ? 'total' : 'main'

    const newEvent: PredictionEvent = {
      id: `${selectedOutcome}-${selectedValue ?? 'novalue'}`,
      event: eventLabel,
      coefficient: c,
      market: marketType,
      marketLabel: selectedMarket?.name,
      v2: {
        market: marketType,
        label: eventLabel,
        coefficient: c,
        stat: 'goals',
        ...(selectedValue !== null && {
          kind: selectedOutcome.includes('ТБ') ? 'over' : 'under',
          line: selectedValue,
        }),
      },
    }

    onSelectedEventChange(newEvent)
  }

  function clearSelectedEvent() {
    setSelectedOutcome('')
    setSelectedValue(null)
    setCoefficientInput('')
    onSelectedEventChange(null)
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

  const isCoefficientValid = (() => {
    const trimmed = coefficientInput.trim()
    if (!trimmed) return false
    const c = parseFloat(trimmed.replace(',', '.'))
    return Number.isFinite(c) && c > 0
  })()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Событие и коэффициент
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Текущее выбранное событие */}
        {selectedEvent && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Текущее событие:</Label>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex flex-col gap-1">
                {selectedEvent.marketLabel && (
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {selectedEvent.marketLabel}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm py-1.5 px-2 h-auto rounded-md">
                    {selectedEvent.event}
                  </Badge>
                  <span className="text-sm">Коэффициент: {selectedEvent.coefficient}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelectedEvent}
                className="h-8 px-2 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Separator />
          </div>
        )}

        {/* Выбор маркета */}
        <div className="space-y-2">
          <Label>Маркет</Label>
          <div className="flex flex-wrap gap-2">
            {markets.map((market) => (
              <Button
                key={market.id}
                type="button"
                variant={selectedMarketId === market.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedMarketId(market.id)
                  setSelectedGroupId('')
                  clearSelectedEvent()
                }}
                className="whitespace-nowrap"
              >
                {market.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Группы исходов */}
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
                                    <div
                                      key={`val-${colIdx}-${valIdx}`}
                                      className="flex flex-col gap-2"
                                    >
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
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      }

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
                                  <div
                                    key={`val-${rowIdx}-${colIdx}-${valIdx}`}
                                    className="flex flex-col gap-2"
                                  >
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
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {row.length < 3 &&
                            Array.from({ length: 3 - row.length }).map((_, i) => (
                              <div key={`placeholder-${rowIdx}-${i}`} />
                            ))}
                        </div>
                      ))
                    })()}
                  </div>

                  {/* Исходы без значений */}
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
                            </div>
                          ))}
                        </div>
                      )
                    }

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

                  {/* Ввод коэффициента для выбранного исхода */}
                  {selectedOutcome && (
                    <div className="mt-4 space-y-2">
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
                          value={coefficientInput}
                          onChange={(e) => handleCoefficientChange(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {!selectedEvent && !selectedOutcome && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            Выберите исход и укажите коэффициент, чтобы активировать создание прогноза.
          </div>
        )}

        {selectedOutcome && !isCoefficientValid && (
          <div className="text-xs text-amber-600">
            Введите корректный коэффициент &gt; 0, чтобы использовать это событие в прогнозе.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
