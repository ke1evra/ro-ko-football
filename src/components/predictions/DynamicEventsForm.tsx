'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, X, Check, TrendingUp, ArrowLeft } from 'lucide-react'
import { parseEventString } from '@/lib/predictions'

interface PredictionEvent {
  id: string
  event: string
  coefficient: number
  v2?: any
}

interface DynamicEventsFormProps {
  matchData: {
    home: { name: string }
    away: { name: string }
  }
  onEventsChange: (events: PredictionEvent[]) => void
  initialEvents?: PredictionEvent[]
}

// Шаг для линий
const STEP = 0.5
const toStep = (n: number) => Math.max(0, Math.round(n / STEP) * STEP)
const formatHalf = (n: number) => {
  const v = Number(n.toFixed(2))
  return Number.isInteger(v) ? `${v.toFixed(1)}` : `${v}`
}

// Поддерживаемые префиксы статданных и дефолты для тоталов
const STAT_PREFIXES = [
  { code: 'УГ', label: 'Угловые', def: 9.5 },
  { code: 'ЖК', label: 'Жёлтые', def: 3.5 },
  { code: 'КК', label: 'Красные', def: 0.5 },
  { code: 'УВС', label: 'В створ', def: 9.5 },
  { code: 'УД', label: 'Удары', def: 24.5 },
  { code: 'СЕЙВ', label: 'Сейвы', def: 7.5 },
  { code: 'ОФ', label: 'Офсайды', def: 4.5 },
  { code: 'Ф', label: 'Фолы', def: 25.5 },
  { code: 'АУТ', label: 'Ауты', def: 20.5 },
  { code: 'ВВ', label: 'От ворот', def: 12.5 },
  { code: 'ЗАМ', label: 'Замены', def: 4.5 },
] as const

// Белые списки рынков по CSV
const STAT_DC_PREFIXES = ['УГ', 'Ф'] as const // двойной шанс по статике только для угловых и фолов
const STAT_OUTCOME_PREFIXES = [
  'УГ',
  'ЖК',
  'КК',
  'УВС',
  'УД',
  'СЕЙВ',
  'ОФ',
  'Ф',
  'АУТ',
  'ВВ',
] as const // без ЗАМ
const TEAM_TOTAL_PREFIXES = ['УГ', 'ЖК', 'УВС', 'Ф'] as const // ИТ только для этих
const HANDICAP_PREFIXES = ['УГ', 'ЖК'] as const // форы только для этих префиксов (и для голов без префикса)

// Дефолтные линии для ИТ по префиксам
const IT_DEFAULTS: Record<string, number> = {
  '': 0.5, // голы
  УГ: 4.5,
  ЖК: 1.5,
  УВС: 4.5,
  Ф: 12.5,
}

function requiresLineForBase(base: string): boolean {
  const b = base.toUpperCase()
  // Комбо 1Х и ТБ/ТМ требует линию
  if (b.includes(' И ТБ') || b.includes(' И ТМ')) return true
  // Любые ТБ/ТМ требуют линию
  if (/(^|\s)Т[БМ]$/i.test(b)) return true
  if (/\bТ[БМ]\b/.test(b)) return true
  // Индивидуальные тоталы и форы
  if (/^(ИТ1|ИТ2)[БМ]$/i.test(b)) return true
  if (/^(УГ|ЖК|УВС|Ф)\s+(ИТ1Б|ИТ1М|ИТ2Б|ИТ2М)$/i.test(b)) return true
  if (/^(Ф1|Ф2)$/i.test(b)) return true
  if (/^(УГ|ЖК)\s+Ф[12]$/i.test(b)) return true
  // По умолчанию — без линии
  return false
}

function defaultLineForBase(base: string): number {
  const b = base.toUpperCase()
  // Комбо: 1Х и ТБ/ТМ — голы 2.5
  if (b.includes(' И ТБ') || b.includes(' И ТМ')) return 2.5
  // Голы ТБ/ТМ (включая 1Т/2Т)
  if (b === 'ТБ' || b === 'ТМ' || b.startsWith('1Т Т') || b.startsWith('2Т Т')) return 2.5
  // Префиксные ТБ/ТМ
  for (const p of STAT_PREFIXES) {
    if (b.startsWith(p.code + ' ')) {
      if (b.includes(' ТБ') || b.includes(' ТМ')) return p.def
    }
  }
  // ИТ
  if (/^(ИТ1|ИТ2)[БМ]$/i.test(b)) return IT_DEFAULTS['']
  {
    const m = b.match(/^(УГ|ЖК|УВС|Ф)\s+(ИТ1Б|ИТ1М|ИТ2Б|ИТ2М)$/)
    if (m) return IT_DEFAULTS[m[1]] ?? IT_DEFAULTS['']
  }
  // Фора
  if (/^(Ф1|Ф2)$/i.test(b)) return 0
  if (/^(УГ|ЖК)\s+Ф[12]$/i.test(b)) return 0.5
  // По умолчанию
  return 2.5
}

export default function DynamicEventsForm({
  matchData,
  onEventsChange,
  initialEvents = [],
}: DynamicEventsFormProps) {
  const [events, setEvents] = useState<PredictionEvent[]>(initialEvents)
  const [showAddForm, setShowAddForm] = useState(false)

  // Режим создания
  const [mode, setMode] = useState<'choose' | 'fill'>('choose')
  const [selectedBase, setSelectedBase] = useState<string>('')
  const [line, setLine] = useState<number>(2.5)
  const [coefficient, setCoefficient] = useState<string>('')

  const needsLine = useMemo(
    () => (selectedBase ? requiresLineForBase(selectedBase) : false),
    [selectedBase],
  )

  // Сформированное событие (динамически)
  const builtEvent = useMemo(() => {
    if (!selectedBase) return ''
    if (needsLine) return `${selectedBase} ${formatHalf(line)}`
    return selectedBase
  }, [selectedBase, needsLine, line])

  function startAddFlow() {
    setShowAddForm(true)
    setMode('choose')
    setSelectedBase('')
    setLine(2.5)
    setCoefficient('')
  }

  function cancelAddFlow() {
    setShowAddForm(false)
    setMode('choose')
    setSelectedBase('')
    setLine(2.5)
    setCoefficient('')
  }

  function pickBase(base: string) {
    setSelectedBase(base)
    setLine(defaultLineForBase(base))
    setMode('fill')
  }

  function addCurrentEvent() {
    if (!builtEvent.trim()) return
    const c = parseFloat(coefficient)
    if (!Number.isFinite(c) || c <= 0) return

    // Формируем структурированную запись (eventsV2)
    const label = builtEvent.trim()
    const parsed = parseEventString(label)
    const v2: any = { market: undefined, label, coefficient: c }
    if (parsed) {
      v2.market = parsed.group
      // Основные поля по рынкам
      switch (parsed.group) {
        case 'main': {
          v2.outcome = parsed.outcome
          v2.scope = parsed.outcomeScope ?? 'ft'
          v2.stat = 'goals'
          break
        }
        case 'doubleChance': {
          v2.dc = parsed.doubleChance
          v2.scope = parsed.dcScope ?? 'ft'
          v2.stat = 'goals'
          break
        }
        case 'btts': {
          v2.btts = parsed.btts
          v2.stat = 'goals'
          v2.scope = 'ft'
          break
        }
        case 'total': {
          v2.kind = parsed.total?.kind
          v2.line = parsed.total?.line
          v2.stat = parsed.total?.stat
          v2.scope = parsed.total?.scope ?? 'ft'
          break
        }
        case 'statOutcome': {
          v2.stat = parsed.statOutcome?.stat
          const cmp = parsed.statOutcome?.comparator
          v2.outcome = cmp === 'home>away' ? 'P1' : cmp === 'away>home' ? 'P2' : 'X'
          break
        }
        case 'statDoubleChance': {
          v2.stat = parsed.dcStat
          v2.dc = parsed.doubleChance
          break
        }
        case 'teamTotal': {
          v2.stat = parsed.teamTotal?.stat
          v2.team = parsed.teamTotal?.team
          v2.kind = parsed.teamTotal?.kind
          v2.line = parsed.teamTotal?.line
          break
        }
        case 'handicap': {
          v2.stat = parsed.handicap?.stat ?? 'goals'
          v2.team = parsed.handicap?.team
          v2.line = parsed.handicap?.line
          break
        }
        case 'combo': {
          // Ожидаем вид: [doubleChance, total]
          const sub = parsed.combo || []
          const dc = sub.find((s: any) => s.group === 'doubleChance') as any
          const tot = sub.find((s: any) => s.group === 'total') as any
          if (dc) v2.comboDc = dc.doubleChance
          if (tot) {
            v2.comboKind = tot.total?.kind
            v2.line = tot.total?.line
          }
          v2.stat = 'goals'
          v2.scope = 'ft'
          break
        }
        default:
          break
      }
    }

    const newEvent: PredictionEvent = {
      id: Date.now().toString(),
      event: label,
      coefficient: c,
      v2,
    }
    const updated = [...events, newEvent]
    setEvents(updated)
    onEventsChange(updated)
    // Сброс формы
    setMode('choose')
    setSelectedBase('')
    setCoefficient('')
    setLine(2.5)
    setShowAddForm(false)
  }

  // UI helpers
  function BigBadge({ label, onClick }: { label: string; onClick: () => void }) {
    return (
      <Badge
        variant="outline"
        className="cursor-pointer text-base py-2 px-3 rounded-md h-auto"
        onClick={onClick}
      >
        {label}
      </Badge>
    )
  }

  // Вспом. списки кодов
  const STAT_PREFIXES_CODES = STAT_PREFIXES.map((p) => p.code)

  // Блок выбора событий (Шаг 1)
  function ChoosePanel() {
    return (
      <div className="space-y-6">
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="flex flex-wrap gap-2 bg-transparent p-0 mb-4 h-auto min-h-[2rem]">
            <TabsTrigger
              value="main"
              className="rounded-full border bg-muted px-3 py-1.5 h-8 text-sm"
            >
              Основные
            </TabsTrigger>
            <TabsTrigger
              value="dc"
              className="rounded-full border bg-muted px-3 py-1.5 h-8 text-sm"
            >
              Двойной шанс
            </TabsTrigger>
            <TabsTrigger
              value="totals"
              className="rounded-full border bg-muted px-3 py-1.5 h-8 text-sm"
            >
              Тоталы (голы)
            </TabsTrigger>
            <TabsTrigger
              value="combos"
              className="rounded-full border bg-muted px-3 py-1.5 h-8 text-sm"
            >
              Комбо
            </TabsTrigger>
            <TabsTrigger
              value="stat_totals"
              className="rounded-full border bg-muted px-3 py-1.5 h-8 text-sm"
            >
              Тоталы (статика)
            </TabsTrigger>
            <TabsTrigger
              value="stat_outcomes"
              className="rounded-full border bg-muted px-3 py-1.5 h-8 text-sm"
            >
              Исходы (статика)
            </TabsTrigger>
            <TabsTrigger
              value="stat_dc"
              className="rounded-full border bg-muted px-3 py-1.5 h-8 text-sm"
            >
              ДШ (статика)
            </TabsTrigger>
            <TabsTrigger
              value="team_totals"
              className="rounded-full border bg-muted px-3 py-1.5 h-8 text-sm"
            >
              Инд. тоталы
            </TabsTrigger>
            <TabsTrigger
              value="handicap"
              className="rounded-full border bg-muted px-3 py-1.5 h-8 text-sm"
            >
              Фора
            </TabsTrigger>
          </TabsList>

          {/* Основные: П1/Х/П2, по таймам, ОЗ */}
          <TabsContent value="main" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {['П1', 'Х', 'П2'].map((code) => (
                <BigBadge key={code} label={code} onClick={() => pickBase(code)} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {['1Т П1', '1Т Х', '1Т П2', '2Т П1', '2Т Х', '2Т П2'].map((code) => (
                <BigBadge key={code} label={code} onClick={() => pickBase(code)} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {['ОЗ Да', 'ОЗ Нет'].map((code) => (
                <BigBadge key={code} label={code} onClick={() => pickBase(code)} />
              ))}
            </div>
          </TabsContent>

          {/* Двойной шанс */}
          <TabsContent value="dc" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {['1X', '12', 'X2', '1Т 1X', '1Т 12', '1Т X2', '2Т 1X', '2Т 12', '2Т X2'].map(
                (code) => (
                  <BigBadge key={code} label={code} onClick={() => pickBase(code)} />
                ),
              )}
            </div>
          </TabsContent>

          {/* Комбо (1Х и ТБ/ТМ) */}
          <TabsContent value="combos" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {['1Х и ТБ', '1Х и ТМ'].map((code) => (
                <BigBadge key={code} label={code} onClick={() => pickBase(code)} />
              ))}
            </div>
            <div className="text-xs text-muted-foreground">Линия применяется к тоталу голов</div>
          </TabsContent>

          {/* Тоталы по голам */}
          <TabsContent value="totals" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {['ТБ', 'ТМ', '1Т ТБ', '1Т ТМ', '2Т ТБ', '2Т ТМ'].map((code) => (
                <BigBadge key={code} label={code} onClick={() => pickBase(code)} />
              ))}
            </div>
          </TabsContent>

          {/* Тоталы по статике */}
          <TabsContent value="stat_totals" className="space-y-3">
            {STAT_PREFIXES.map((p) => (
              <div key={p.code} className="flex flex-wrap gap-2">
                <BigBadge label={`${p.code} ТБ`} onClick={() => pickBase(`${p.code} ТБ`)} />
                <BigBadge label={`${p.code} ТМ`} onClick={() => pickBase(`${p.code} ТМ`)} />
              </div>
            ))}
          </TabsContent>

          {/* Исходы по статике — только П1 и П2 (без Х) */}
          <TabsContent value="stat_outcomes" className="space-y-3">
            {STAT_OUTCOME_PREFIXES.map((code) => (
              <div key={code} className="flex flex-wrap gap-2">
                <BigBadge label={`${code} П1`} onClick={() => pickBase(`${code} П1`)} />
                <BigBadge label={`${code} П2`} onClick={() => pickBase(`${code} П2`)} />
              </div>
            ))}
          </TabsContent>

          {/* Двойной шанс по статике — только УГ и Ф, и только 1Х/Х2 */}
          <TabsContent value="stat_dc" className="space-y-3">
            {STAT_DC_PREFIXES.map((code) => (
              <div key={code} className="flex flex-wrap gap-2">
                <BigBadge label={`${code} 1Х`} onClick={() => pickBase(`${code} 1Х`)} />
                <BigBadge label={`${code} Х2`} onClick={() => pickBase(`${code} Х2`)} />
              </div>
            ))}
          </TabsContent>

          {/* Индивидуальные тоталы — голы + whitelisted префиксы */}
          <TabsContent value="team_totals" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <BigBadge label="ИТ1Б" onClick={() => pickBase('ИТ1Б')} />
              <BigBadge label="ИТ1М" onClick={() => pickBase('ИТ1М')} />
              <BigBadge label="ИТ2Б" onClick={() => pickBase('ИТ2Б')} />
              <BigBadge label="ИТ2М" onClick={() => pickBase('ИТ2М')} />
            </div>
            {TEAM_TOTAL_PREFIXES.map((code) => (
              <div key={code} className="flex flex-wrap gap-2">
                <BigBadge label={`${code} ИТ1Б`} onClick={() => pickBase(`${code} ИТ1Б`)} />
                <BigBadge label={`${code} ИТ1М`} onClick={() => pickBase(`${code} ИТ1М`)} />
                <BigBadge label={`${code} ИТ2Б`} onClick={() => pickBase(`${code} ИТ2Б`)} />
                <BigBadge label={`${code} ИТ2М`} onClick={() => pickBase(`${code} ИТ2М`)} />
              </div>
            ))}
          </TabsContent>

          {/* Фора — голы + префиксы УГ/ЖК */}
          <TabsContent value="handicap" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <BigBadge label="Ф1" onClick={() => pickBase('Ф1')} />
              <BigBadge label="Ф2" onClick={() => pickBase('Ф2')} />
            </div>
            {HANDICAP_PREFIXES.map((code) => (
              <div key={code} className="flex flex-wrap gap-2">
                <BigBadge label={`${code} Ф1`} onClick={() => pickBase(`${code} Ф1`)} />
                <BigBadge label={`${code} Ф2`} onClick={() => pickBase(`${code} Ф2`)} />
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Мини‑виджет заполнения (Шаг 2)
  function FillPanel() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="text-base py-2 px-3 h-auto rounded-md" variant="secondary">
              {selectedBase || '—'}
            </Badge>
            {needsLine && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Линия</Label>
                <div className="flex items-stretch gap-3">
                  <Input
                    inputMode="decimal"
                    type="number"
                    step={STEP}
                    min={0}
                    value={formatHalf(line)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!Number.isNaN(v)) setLine(toStep(v))
                    }}
                    className="text-base h-10 w-28"
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => setLine((v) => toStep(v + STEP))}
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => setLine((v) => toStep(Math.max(0, v - STEP)))}
                    >
                      -
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            onClick={() => {
              setMode('choose')
              setSelectedBase('')
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Назад
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-end gap-3">
          <div className="space-y-2">
            <Label className="text-sm">Коэффициент</Label>
            <Input
              inputMode="decimal"
              type="number"
              step="0.01"
              min="1"
              placeholder="1.85"
              value={coefficient}
              onChange={(e) => setCoefficient(e.target.value)}
              className="text-base h-12"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={addCurrentEvent}
              disabled={!selectedBase || !coefficient.trim()}
              className="h-12 px-6 text-base"
            >
              <Check className="h-5 w-5 mr-2" /> ОК
            </Button>
            <Button variant="outline" className="h-12 px-6 text-base" onClick={cancelAddFlow}>
              <X className="h-5 w-5 mr-2" /> Отмена
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
                    <span className="text-sm">Коэффициент: {event.coefficient}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updated = events.filter((e) => e.id !== event.id)
                      setEvents(updated)
                      onEventsChange(updated)
                    }}
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

        {/* Кнопка запуска добавления */}
        {!showAddForm && (
          <Button variant="outline" onClick={startAddFlow} className="w-full h-12 text-base">
            <Plus className="h-5 w-5 mr-2" />
            Добавить событие
          </Button>
        )}

        {/* Фlow выбора/заполнения */}
        {showAddForm && (
          <div className="p-4 border rounded-lg bg-muted/20">
            {mode === 'choose' ? <ChoosePanel /> : <FillPanel />}
          </div>
        )}

        {events.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-2 opтольacity-50" />
            <p className="text-sm">Пока не добавлено ни одного события</p>
            <p className="text-xs">Нажмите &#34;Добавить событие&#34; для начала</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
