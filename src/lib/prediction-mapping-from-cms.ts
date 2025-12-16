/**
 * Создание и оценка маппингов на основе маркетов и исходов из CMS
 * Универсальная модель: metric(statPath, calculationType) operator operand
 *
 * Этот модуль не зависит от Payload типов — безопасен для изолированного использования.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 * РАЗНИЦА МЕЖДУ SCOPE И AGGREGATION
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 * SCOPE — ВЫБОР ДАННЫХ (какие данные берём)
 * ─────────────────────────────────────────
 * Определяет, какие данные из MatchStats использовать:
 *
 * • both       → Берём обе команды (home + away)
 * • home       → Берём только хозяев
 * • away       → Берём только гостей
 * • difference → Берём разницу (home - away)
 *
 * Примеры:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ Маркет: "Угловые"                                                           │
 * │ ├─ Исход "Угловые обе" (scope: both)   → corners.home + corners.away       │
 * │ ├─ Исход "Угловые хозяев" (scope: home) → corners.home                     │
 * │ ├─ Исход "Угловые гостей" (scope: away) → corners.away                     │
 * │ └─ Исход "Фора угловых" (scope: difference) → corners.home - corners.away  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * AGGREGATION — СПОСОБ ВЫЧИСЛЕНИЯ (как обрабатываем данные)
 * ──────────────────────────────────────────────────────────
 * Определяет, как вычислить итоговое значение из выбранных данных:
 *
 * • auto       → По умолчанию (зависит от scope)
 * • sum        → Сумма (home + away)
 * • difference → Разница (home - away)
 * • min        → Минимум (min(home, away))
 * • max        → Максимум (max(home, away))
 * • parity     → Чётность (сумма % 2)
 * • direct     → Прямое значение (без агрегации)
 *
 * Примеры:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ Маркет: "Голы"                                                              │
 * │ ├─ Исход "Тотал голов" (aggregation: sum)                                  │
 * │ │  → Сумма голов обеих команд (home + away)                                │
 * │ ├─ Исход "Фора голов" (aggregation: difference)                            │
 * │ │  → Разница голов (home - away)                                           │
 * │ ├─ Исход "Обе забьют" (aggregation: min)                                   │
 * │ │  → Минимум голов (если обе забили, то min ≥ 1)                           │
 * │ └─ Исход "Чёт/Нечёт" (aggregation: parity)                                 │
 * │    → Чётность суммы голов                                                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ВЗАИМОДЕЙСТВИЕ SCOPE И AGGREGATION
 * ──────────────────────────────────
 * Они работают вместе:
 *
 * 1. SCOPE выбирает, какие данные использовать
 * 2. AGGREGATION определяет, как их обработать
 *
 * Пример: Маркет "Жёлтые карточки"
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ Исход "ТБ 4.5 (обе)"                                                        │
 * │ ├─ scope: both                                                              │
 * │ ├─ aggregation: sum                                                         │
 * │ └─ Результат: yellowCards.home + yellowCards.away > 4.5                    │
 * │                                                                              │
 * │ Исход "ТБ 2.5 (хозяева)"                                                    │
 * │ ├─ scope: home                                                              │
 * │ ├─ aggregation: direct                                                      │
 * │ └─ Результат: yellowCards.home > 2.5                                        │
 * │                                                                              │
 * │ Исход "Обе получат ЖК"                                                      │
 * │ ├─ scope: both                                                              │
 * │ ├─ aggregation: min                                                         │
 * │ └─ Результат: min(yellowCards.home, yellowCards.away) ≥ 1                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * КОГДА AGGREGATION ПЕРЕОПРЕДЕЛЯЕТ SCOPE
 * ──────────────────────────────────────
 * Если aggregation явно указан (не 'auto'), он имеет приоритет:
 *
 * • aggregation: 'sum'        → Всегда сумма, независимо от scope
 * • aggregation: 'difference' → Всегда разница, независимо от scope
 * • aggregation: 'min'        → Всегда минимум, независимо от scope
 * • aggregation: 'direct'     → Прямое значение (scope определяет home/away)
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Агрегации/расчёты фактической метрики
export type CalculationType =
  | 'direct' // конкретная команда: stat.home/stat.away
  | 'sum' // home + away
  | 'difference' // home - away
  | 'overUnder' // прямое значение (тотал), сравнение с линией отдельно
  | 'outcome' // исход матча (1/0/2)
  | 'min' // min(home, away) — для ОЗ и подобных
  | 'max' // max(home, away)
  | 'parity' // чёт/нечёт — как правило берём сумму и считаем % 2

// Операторы сравнения
export type ComparisonOperator =
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'eq'
  | 'neq'
  | 'between'
  | 'in'
  | 'even'
  | 'odd'
  | 'exists'

// Универсальный маппинг события прогноза → фактическая метрика матча
export interface PredictionMapping {
  // База
  statPath?: string // например, 'yellowCards', 'corners', 'goals', 'outcome'
  calculationType?: CalculationType
  comparisonOperator?: ComparisonOperator

  // Правая часть (операнд) — для числовых операторов
  predictedValue?: number

  // Расширения под операторы
  rangeLower?: number // for between
  rangeUpper?: number // for between
  setValues?: Array<number | string> // for in
  eventFilter?: {
    type: 'goal' | 'own_goal' | 'penalty' | 'yellow_card' | 'red_card' | 'var' | 'substitution'
    team?: 'any' | 'home' | 'away'
    period?: 'any' | '1h' | '2h'
  } // for exists

  // Для отладки/UI
  actualValue?: number // может быть заполнено на этапе оценки
}

/**
 * Данные маркета из CMS (минимум, который нужен для маппинга)
 */
export interface MarketData {
  name: string
  mappingConfig?: {
    statPath?: string
    statType?: 'none' | 'numeric' | 'outcome' | 'goals'
  }
}

/**
 * Данные исхода из CMS (минимум для построения оператора/операнда)
 */
export interface OutcomeData {
  name: string

  // Массив условий (новая структура)
  conditions?: Array<{
    comparisonOperator: ComparisonOperator

    // Для исходов матча
    outcomeValue?: number
    set?: Array<number | { value: number }>

    // Для обычных исходов
    calculationType?: 'sum' | 'min' | 'max' | 'home' | 'away' | 'difference'
    value?: number

    // Для специальных операторов
    range?: { lower?: number; upper?: number }
    eventFilter?: {
      type: 'goal' | 'own_goal' | 'penalty' | 'yellow_card' | 'red_card' | 'var' | 'substitution'
      team?: 'any' | 'home' | 'away'
      period?: 'any' | '1h' | '2h'
    }
  }>

  conditionLogic?: 'AND' | 'OR'

  // Старая структура (для обратной совместимости)
  comparisonOperator?: ComparisonOperator
  calculationType?: 'sum' | 'min' | 'max' | 'home' | 'away' | 'difference'
  value?: number
  outcomeValue?: number
  set?: Array<number | { value: number }>
  range?: { lower?: number; upper?: number }
  eventFilter?: {
    type: 'goal' | 'own_goal' | 'penalty' | 'yellow_card' | 'red_card' | 'var' | 'substitution'
    team?: 'any' | 'home' | 'away'
    period?: 'any' | '1h' | '2h'
  }
}

/**
 * Маппинг calculationType в CalculationType
 */
function mapCalculationType(ct: string): CalculationType {
  switch (ct) {
    case 'sum':
      return 'sum'
    case 'min':
      return 'min'
    case 'max':
      return 'max'
    case 'home':
      return 'direct'
    case 'away':
      return 'direct'
    case 'difference':
      return 'difference'
    default:
      return 'sum'
  }
}

/**
 * Внутренние утилиты для вычисления фактических значений
 */
function goalsPair(match: any): { home: number; away: number } | null {
  const h = Number(match?.homeScore)
  const a = Number(match?.awayScore)
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null
  return { home: h, away: a }
}

function outcomeValue(match: any): number | null {
  const p = goalsPair(match)
  if (!p) return null
  if (p.home > p.away) return 1
  if (p.home < p.away) return 2
  return 0
}

function statGroup(matchStats: any, key: string): { home: number; away: number } | null {
  if (!matchStats || !key) return null
  const group = matchStats[key]
  if (!group) return null
  const h = Number(group?.home)
  const a = Number(group?.away)
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null
  return { home: h, away: a }
}

function valueByPath(matchStats: any, path: string): number | null {
  if (!matchStats || !path) return null
  const parts = path.split('.')
  if (parts.length === 1) return null
  const group = matchStats[parts[0]]
  const val = group?.[parts[1]]
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

/**
 * Вычислить фактическое значение по метрике
 */
export function computeActualValue(
  match: any,
  matchStats: any,
  mapping: PredictionMapping,
): number | null {
  const { calculationType, statPath } = mapping
  if (!calculationType || !statPath) return null

  const base = statPath.split('.')[0]

  switch (calculationType) {
    case 'direct': {
      if (base === 'goals') {
        const p = goalsPair(match)
        if (!p) return null
        if (statPath.endsWith('.home')) return p.home
        if (statPath.endsWith('.away')) return p.away
        // если не указано .home/.away — возвращаем сумму как дефолт
        return p.home + p.away
      }
      // direct для статистики: ожидается .home/.away
      const v = valueByPath(matchStats, statPath)
      return v
    }
    case 'sum': {
      if (base === 'goals') {
        const p = goalsPair(match)
        return p ? p.home + p.away : null
      }
      const g = statGroup(matchStats, base)
      return g ? g.home + g.away : null
    }
    case 'difference': {
      if (base === 'goals') {
        const p = goalsPair(match)
        return p ? p.home - p.away : null
      }
      const g = statGroup(matchStats, base)
      return g ? g.home - g.away : null
    }
    case 'min': {
      if (base === 'goals') {
        const p = goalsPair(match)
        return p ? Math.min(p.home, p.away) : null
      }
      const g = statGroup(matchStats, base)
      return g ? Math.min(g.home, g.away) : null
    }
    case 'max': {
      if (base === 'goals') {
        const p = goalsPair(match)
        return p ? Math.max(p.home, p.away) : null
      }
      const g = statGroup(matchStats, base)
      return g ? Math.max(g.home, g.away) : null
    }
    case 'parity': {
      // возвращаем число, по которому позже проверим even/odd
      if (base === 'goals') {
        const p = goalsPair(match)
        return p ? p.home + p.away : null
      }
      const g = statGroup(matchStats, base)
      return g ? g.home + g.away : null
    }
    case 'outcome': {
      return outcomeValue(match)
    }
    case 'overUnder': {
      // трактуем как прямое значение из статистики (для совместимости)
      if (base === 'goals') {
        const p = goalsPair(match)
        return p ? p.home + p.away : null
      }
      const g = statGroup(matchStats, base)
      return g ? g.home + g.away : null
    }
    default:
      return null
  }
}

/**
 * Проверка события существования из ленты событий
 */
function eventExists(matchStats: any, filter?: PredictionMapping['eventFilter']): boolean | null {
  const events: any[] = Array.isArray(matchStats?.events) ? matchStats.events : []
  if (!filter) return null
  if (!events.length) return null

  const teamOk = (evTeam: any): boolean => {
    if (!filter.team || filter.team === 'any') return true
    return evTeam === filter.team
  }

  const periodOk = (minute: any): boolean => {
    if (!filter.period || filter.period === 'any') return true
    const m = Number(minute)
    if (!Number.isFinite(m)) return true // нет данных — не фильтруем
    if (filter.period === '1h') return m <= 45
    if (filter.period === '2h') return m > 45
    return true
  }

  return events.some((ev) => {
    if (ev?.type !== filter.type) return false
    if (!teamOk(ev?.team)) return false
    if (!periodOk(ev?.minute)) return false
    return true
  })
}

/**
 * Универсальная проверка маппинга
 */
export function evaluateMapping(
  match: any,
  matchStats: any,
  mapping: PredictionMapping,
): boolean | null {
  const op = mapping.comparisonOperator
  if (!op) return null

  // exists — проверка по ленте событий
  if (op === 'exists') {
    const ok = eventExists(matchStats, mapping.eventFilter)
    return ok
  }

  // even/odd — проверка чётности фактического значения
  if (op === 'even' || op === 'odd') {
    const actual = computeActualValue(match, matchStats, mapping)
    if (actual == null) return null
    const isEven = Math.abs(actual) % 2 === 0
    return op === 'even' ? isEven : !isEven
  }

  // between/in — отдельные режимы
  if (op === 'between') {
    const actual = computeActualValue(match, matchStats, mapping)
    if (actual == null) return null
    const lower = mapping.rangeLower
    const upper = mapping.rangeUpper
    if (lower == null || upper == null) return null
    return actual >= lower && actual <= upper
  }

  if (op === 'in') {
    const actual = computeActualValue(match, matchStats, mapping)
    if (actual == null) return null
    const set = mapping.setValues
    if (!set || !set.length) return null
    return set.includes(actual)
  }

  // Базовые числовые сравнения
  const actual = computeActualValue(match, matchStats, mapping)
  const expected = mapping.predictedValue
  if (actual == null || expected == null) return null

  switch (op) {
    case 'gt':
      return actual > expected
    case 'gte':
      return actual >= expected
    case 'lt':
      return actual < expected
    case 'lte':
      return actual <= expected
    case 'eq':
      return actual === expected
    case 'neq':
      return actual !== expected
    default:
      return null
  }
}

/**
 * Человекочитаемая метка события
 */
export function createLabelFromCMS(market: MarketData, outcome: OutcomeData): string {
  const parts: string[] = [market.name, outcome.name]
  if (typeof outcome.value === 'number') parts.push(String(outcome.value))
  else if (outcome.range && (outcome.range.lower != null || outcome.range.upper != null)) {
    const l = outcome.range.lower != null ? outcome.range.lower : '-∞'
    const u = outcome.range.upper != null ? outcome.range.upper : '+∞'
    parts.push(`[${l}..${u}]`)
  }
  return parts.join(' ')
}

/**
 * Валидации входных данных из CMS
 */
export function validateMarketForMapping(market: MarketData): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const config = market.mappingConfig
  if (!config) errors.push('Маркет не имеет настроек маппинга')
  if (config && config.statType === 'none') errors.push('Маркет не использует статистику')
  if (config && config.statType !== 'outcome' && !config.statPath)
    errors.push('Не указан путь к статистике (statPath)')
  return { valid: errors.length === 0, errors }
}

export function validateOutcomeForMapping(outcome: OutcomeData): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const op = outcome.comparisonOperator
  if (!op) errors.push('Не указан оператор сравнения')

  if (op === 'between') {
    if (outcome.range?.lower == null || outcome.range?.upper == null) {
      errors.push('Для between укажите нижнюю и верхнюю границы')
    }
  } else if (op === 'in') {
    if (!outcome.set || outcome.set.length === 0) {
      // допустим автоматические предустановки 1X/12/X2 — тогда пропустим
      if (!['1X', '12', 'X2'].includes(outcome.name)) {
        errors.push('Для in укажите множество значений (set)')
      }
    }
  } else if (op === 'exists') {
    if (!outcome.eventFilter?.type) errors.push('Для exists укажите тип события (eventFilter.type)')
  } else if (['gt', 'gte', 'lt', 'lte', 'eq', 'neq'].includes(op || '')) {
    if (outcome.value == null && outcome.outcomeValue == null) {
      errors.push('Укажите числовое значение (values[].value) или outcomeValue')
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Создать маппинг из одного условия
 */
function createMappingFromCondition(
  market: MarketData,
  condition: NonNullable<OutcomeData['conditions']>[0],
): PredictionMapping | null {
  const config = market.mappingConfig
  if (!config) return null

  const mapping: PredictionMapping = {
    comparisonOperator: condition.comparisonOperator,
  }

  // Исход матча
  if (config.statType === 'outcome') {
    mapping.statPath = 'outcome'
    mapping.calculationType = 'outcome'

    if (condition.outcomeValue !== undefined) {
      mapping.predictedValue = condition.outcomeValue
    }
    if (condition.set) {
      mapping.setValues = condition.set.map((item) =>
        typeof item === 'object' && 'value' in item ? item.value : item,
      )
    }

    return mapping
  }

  // Голы или числовая статистика
  const basePath = config.statPath || 'goals'

  // Определяем calculationType
  if (condition.calculationType) {
    mapping.calculationType = mapCalculationType(condition.calculationType)

    // Для home/away добавляем путь
    if (condition.calculationType === 'home') {
      mapping.statPath = `${basePath}.home`
    } else if (condition.calculationType === 'away') {
      mapping.statPath = `${basePath}.away`
    } else {
      mapping.statPath = basePath
    }
  } else {
    mapping.statPath = basePath
    mapping.calculationType = 'sum'
  }

  // Значение
  if (condition.value !== undefined) {
    mapping.predictedValue = condition.value
  }

  // Диапазон
  if (condition.range) {
    mapping.rangeLower = condition.range.lower
    mapping.rangeUpper = condition.range.upper
  }

  // Множество
  if (condition.set) {
    mapping.setValues = condition.set.map((item) =>
      typeof item === 'object' && 'value' in item ? item.value : item,
    )
  }

  // Фильтр событий
  if (condition.eventFilter) {
    mapping.eventFilter = condition.eventFilter
  }

  return mapping
}

/**
 * Оценка исхода с поддержкой комбинированных условий
 */
export function evaluateOutcome(
  match: any,
  matchStats: any,
  market: MarketData,
  outcome: OutcomeData,
): boolean | null {
  if (!outcome.conditions || outcome.conditions.length === 0) {
    return null
  }

  // Оцениваем все условия
  const results: (boolean | null)[] = []

  for (const condition of outcome.conditions) {
    const mapping = createMappingFromCondition(market, condition)
    if (!mapping) return null

    const result = evaluateMapping(match, matchStats, mapping)
    if (result === null) return null

    results.push(result)
  }

  // Если одно условие — возвращаем его
  if (results.length === 1) {
    return results[0]
  }

  // Применяем логику объединения
  const logic = outcome.conditionLogic || 'AND'

  if (logic === 'OR') {
    return results.some((r) => r === true)
  } else {
    return results.every((r) => r === true)
  }
}

/**
 * Доступные статистики (подсказка для UI)
 */
export function getAvailableStats(): Array<{ label: string; value: string }> {
  return [
    { label: 'Угловые', value: 'corners' },
    { label: 'Жёлтые карточки', value: 'yellowCards' },
    { label: 'Красные карточки', value: 'redCards' },
    { label: 'Фолы', value: 'fouls' },
    { label: 'Удары', value: 'shots' },
    { label: 'Удары в створ', value: 'shotsOnTarget' },
    { label: 'Удары мимо створа', value: 'shotsOffTarget' },
    { label: 'Заблокированные удары', value: 'shotsBlocked' },
    { label: 'Офсайды', value: 'offsides' },
    { label: 'Сейвы', value: 'saves' },
    { label: 'Передачи', value: 'passes' },
    { label: 'Точные передачи', value: 'passesAccurate' },
    { label: 'Атаки', value: 'attacks' },
    { label: 'Опасные атаки', value: 'dangerousAttacks' },
    // Голы и исход — специальные ключи: goals/outcome
  ]
}
