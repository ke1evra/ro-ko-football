'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, X, Check, TrendingUp } from 'lucide-react'

interface PredictionEvent {
  id: string
  event: string
  coefficient: number
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
  const [currentEvent, setCurrentEvent] = useState('')
  const [currentCoefficient, setCurrentCoefficient] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Параметрические значения (шаг 0.5)
  const STEP = 0.5
  const toStep = (n: number) => Math.max(0, Math.round(n / STEP) * STEP)
  const formatHalf = (n: number) => {
    const v = Number(n.toFixed(2))
    return Number.isInteger(v) ? `${v.toFixed(1)}` : `${v}`
  }

  // Локальные значения для вкладок
  const [totals, setTotals] = useState({ over: 2.5, under: 2.5 })
  const [corners, setCorners] = useState({ over: 10.5, under: 10.5 })
  const [yCards, setYCards] = useState({ over: 3.5, under: 3.5 })
  const [shotsOn, setShotsOn] = useState({ over: 4.5, under: 4.5 })
  const [offsides, setOffsides] = useState({ over: 2.5, under: 2.5 })
  const [fouls, setFouls] = useState({ over: 25.5, under: 25.5 })
  const [throwIns, setThrowIns] = useState({ over: 20.5, under: 20.5 })
  const [shotsAll, setShotsAll] = useState({ over: 10.5, under: 10.5 })

  const handleAddEvent = () => {
    if (!currentEvent.trim() || !currentCoefficient.trim()) return

    const coefficient = parseFloat(currentCoefficient)
    if (Number.isNaN(coefficient) || coefficient <= 0) return

    const newEvent: PredictionEvent = {
      id: Date.now().toString(),
      event: currentEvent.trim(),
      coefficient,
    }

    const updatedEvents = [...events, newEvent]
    setEvents(updatedEvents)
    onEventsChange(updatedEvents)

    // Сбрасываем форму
    setCurrentEvent('')
    setCurrentCoefficient('')
    setShowAddForm(false)
  }

  const handleRemoveEvent = (id: string) => {
    const updated = events.filter((e) => e.id !== id)
    setEvents(updated)
    onEventsChange(updated)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddEvent()
  }

  // Хелпер рендера блока ТБ/ТМ с инпутами и +/‑
  function NumericPair({
    labelOver,
    labelUnder,
    state,
    setState,
    buildCode,
  }: {
    labelOver: string
    labelUnder: string
    state: { over: number; under: number }
    setState: (next: { over: number; under: number }) => void
    buildCode: (type: 'over' | 'under', val: number) => string
  }) {
    const setOver = (v: number) => {
      const nv = toStep(v)
      setState({ ...state, over: nv })
      setCurrentEvent(buildCode('over', nv))
    }
    const setUnder = (v: number) => {
      const nv = toStep(v)
      setState({ ...state, under: nv })
      setCurrentEvent(buildCode('under', nv))
    }
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{labelOver}</div>
          <Input
            type="number"
            step={STEP}
            min={0}
            value={formatHalf(state.over)}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!Number.isNaN(v)) setOver(v)
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOver(state.over - STEP)}
              className="h-7 px-2"
            >
              -
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOver(state.over + STEP)}
              className="h-7 px-2"
            >
              +
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{labelUnder}</div>
          <Input
            type="number"
            step={STEP}
            min={0}
            value={formatHalf(state.under)}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!Number.isNaN(v)) setUnder(v)
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnder(state.under - STEP)}
              className="h-7 px-2"
            >
              -
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnder(state.under + STEP)}
              className="h-7 px-2"
            >
              +
            </Button>
          </div>
        </div>
      </div>
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
      <CardContent className="space-y-4">
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
                    <Badge variant="secondary">{event.event}</Badge>
                    <span className="text-sm">Коэффициент: {event.coefficient}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEvent(event.id)}
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

        {/* Кнопка добавления события */}
        {!showAddForm && (
          <Button variant="outline" onClick={() => setShowAddForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Добавить событие
          </Button>
        )}

        {/* Форма добавления события */}
        {showAddForm && (
          <div className="space-y-6 p-4 border rounded-lg bg-muted/20">
            {/* Ряд 1: Инпуты и кнопка ОК */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="event-input" className="text-sm">
                  Событие
                </Label>
                <Input
                  id="event-input"
                  value={currentEvent}
                  onChange={(e) => setCurrentEvent(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите событие или выберите во вкладках ниже"
                />
              </div>
              <div>
                <Label htmlFor="coeff-input" className="text-sm">
                  Коэффициент
                </Label>
                <Input
                  id="coeff-input"
                  type="number"
                  step="0.01"
                  min="1"
                  value={currentCoefficient}
                  onChange={(e) => setCurrentCoefficient(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="1.85"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleAddEvent}
                  disabled={!currentEvent.trim() || !currentCoefficient.trim()}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  ОК
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setCurrentEvent('')
                    setCurrentCoefficient('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Вкладки категорий */}
            <div className="space-y-4">
              <Tabs defaultValue="main" className="w-full">
                <TabsList className="flex flex-wrap gap-2 bg-transparent p-0 mb-4">
                  <TabsTrigger
                    value="main"
                    className="rounded-full border bg-muted px-2.5 py-1 h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-colors"
                  >
                    Основные исходы
                  </TabsTrigger>
                  <TabsTrigger
                    value="totals"
                    className="rounded-full border bg-muted px-2.5 py-1 h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-colors"
                  >
                    Тоталы
                  </TabsTrigger>
                  <TabsTrigger
                    value="corners"
                    className="rounded-full border bg-muted px-2.5 py-1 h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-colors"
                  >
                    Угловые
                  </TabsTrigger>
                  <TabsTrigger
                    value="ycards"
                    className="rounded-full border bg-muted px-2.5 py-1 h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-colors"
                  >
                    Жёлтые карточки
                  </TabsTrigger>
                  <TabsTrigger
                    value="shots_on"
                    className="rounded-full border bg-muted px-2.5 py-1 h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-colors"
                  >
                    Удары в створ
                  </TabsTrigger>
                  <TabsTrigger
                    value="offsides"
                    className="rounded-full border bg-muted px-2.5 py-1 h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-colors"
                  >
                    Офсайды
                  </TabsTrigger>
                  <TabsTrigger
                    value="fouls"
                    className="rounded-full border bg-muted px-2.5 py-1 h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-colors"
                  >
                    Фолы
                  </TabsTrigger>
                  <TabsTrigger
                    value="throw_ins"
                    className="rounded-full border bg-muted px-2.5 py-1 h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-colors"
                  >
                    Ауты
                  </TabsTrigger>
                  <TabsTrigger
                    value="shots_all"
                    className="rounded-full border bg-muted px-2.5 py-1 h-7 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-colors"
                  >
                    Удары все
                  </TabsTrigger>
                </TabsList>

                {/* Основные исходы */}
                <TabsContent value="main" className="space-y-3 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {['П1', 'Х', 'П2'].map((code) => (
                      <Badge
                        key={code}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setCurrentEvent(code)}
                      >
                        {code}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Выберите исход. При необходимости отредактируйте вручную поле &#34;Событие&#34;.
                  </div>
                </TabsContent>

                {/* Тоталы */}
                <TabsContent value="totals" className="space-y-3 pt-3">
                  <NumericPair
                    labelOver="ТБ"
                    labelUnder="ТМ"
                    state={totals}
                    setState={setTotals}
                    buildCode={(type, v) => `${type === 'over' ? 'ТБ' : 'ТМ'} ${formatHalf(v)}`}
                  />
                </TabsContent>

                {/* Угловые */}
                <TabsContent value="corners" className="space-y-3 pt-3">
                  <NumericPair
                    labelOver="УГ ТБ"
                    labelUnder="УГ ТМ"
                    state={corners}
                    setState={setCorners}
                    buildCode={(type, v) => `УГ ${type === 'over' ? 'ТБ' : 'ТМ'} ${formatHalf(v)}`}
                  />
                </TabsContent>

                {/* Жёлтые карточки */}
                <TabsContent value="ycards" className="space-y-3 pt-3">
                  <NumericPair
                    labelOver="ЖК ТБ"
                    labelUnder="ЖК ТМ"
                    state={yCards}
                    setState={setYCards}
                    buildCode={(type, v) => `ЖК ${type === 'over' ? 'ТБ' : 'ТМ'} ${formatHalf(v)}`}
                  />
                </TabsContent>

                {/* Удары в створ */}
                <TabsContent value="shots_on" className="space-y-3 pt-3">
                  <NumericPair
                    labelOver="УВС ТБ"
                    labelUnder="УВС ТМ"
                    state={shotsOn}
                    setState={setShotsOn}
                    buildCode={(type, v) => `УВС ${type === 'over' ? 'ТБ' : 'ТМ'} ${formatHalf(v)}`}
                  />
                </TabsContent>

                {/* Офсайды */}
                <TabsContent value="offsides" className="space-y-3 pt-3">
                  <NumericPair
                    labelOver="ОФ ТБ"
                    labelUnder="ОФ ТМ"
                    state={offsides}
                    setState={setOffsides}
                    buildCode={(type, v) => `ОФ ${type === 'over' ? 'ТБ' : 'ТМ'} ${formatHalf(v)}`}
                  />
                </TabsContent>

                {/* Фолы */}
                <TabsContent value="fouls" className="space-y-3 pt-3">
                  <NumericPair
                    labelOver="Ф ТБ"
                    labelUnder="Ф ТМ"
                    state={fouls}
                    setState={setFouls}
                    buildCode={(type, v) => `Ф ${type === 'over' ? 'ТБ' : 'ТМ'} ${formatHalf(v)}`}
                  />
                </TabsContent>

                {/* Ауты */}
                <TabsContent value="throw_ins" className="space-y-3 pt-3">
                  <NumericPair
                    labelOver="АУТ ТБ"
                    labelUnder="АУТ ТМ"
                    state={throwIns}
                    setState={setThrowIns}
                    buildCode={(type, v) => `АУТ ${type === 'over' ? 'ТБ' : 'ТМ'} ${formatHalf(v)}`}
                  />
                </TabsContent>

                {/* Удары все */}
                <TabsContent value="shots_all" className="space-y-3 pt-3">
                  <NumericPair
                    labelOver="УД ТБ"
                    labelUnder="УД ТМ"
                    state={shotsAll}
                    setState={setShotsAll}
                    buildCode={(type, v) => `УД ${type === 'over' ? 'ТБ' : 'ТМ'} ${formatHalf(v)}`}
                  />
                </TabsContent>
              </Tabs>

              <div className="text-xs text-muted-foreground">
                Подберите событие во вкладках, затем введите коэффициент и нажмите &#34;ОК&#34;. При
                необходимости отредактируйте событие вручную.
              </div>
            </div>
          </div>
        )}

        {events.length === 0 && !showAddForm && (
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Пока не добавлено ни одного события</p>
            <p className="text-xs">Нажмите &#34;Добавить событие&#34; для начала</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
