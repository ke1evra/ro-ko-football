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
  comparisonOperator?: ComparisonOperator
  // числовой операнд (линия) — берём из values[].value
  value?: number
  // фиксированное значение, например outcomeValue: 1/0/2
  outcomeValue?: number
  // between
  range?: { lower?: number; upper?: number }
  // in
  set?: Array<number | string>
  // exists
  eventFilter?: PredictionMapping['eventFilter']
  // область применения статистики (перемещено из маркета)
  scope?: 'both' | 'home' | 'away' | 'difference'
  // способ агрегирования (перемещено из маркета)
  aggregation?: 'auto' | 'sum' | 'difference' | 'min' | 'max' | 'parity' | 'direct'
  // дополнительные условия для комбинированных прогнозов
  conditions?: Array<{
    comparisonOperator: ComparisonOperator
    scope?: 'both' | 'home' | 'away' | 'difference'
    aggregation: 'auto' | 'sum' | 'difference' | 'min' | 'max' | 'parity' | 'direct'
    value?: number
    values?: Array<{ value: number }>
    range?: { lower?: number; upper?: number }
    set?: Array<{ value: number | string }>
  }>
  // логика объединения условий
  conditionLogic?: 'AND' | 'OR'
}

/**
 * Вспомогательная функция: определить calculationType и конечный statPath из market.mappingConfig, outcome.scope и outcome.aggregation
 */
function deriveCalculation(
  config: NonNullable<MarketData['mappingConfig']>,
  scope: string = 'both',
  aggregation: string = 'auto',
): { calculationType: CalculationType; statPath: string } | null {
  const { statType, statPath: basePath } = config
  if (!statType || statType === 'none') return null

  // Исход матча — отдельный тип
  if (statType === 'outcome') {
    return { calculationType: 'outcome', statPath: 'outcome' }
  }

  // Голы могут подтягиваться из Matches
  if (statType === 'goals') {
    if (aggregation === 'difference' || scope === 'difference') {
      return { calculationType: 'difference', statPath: 'goals' }
    }
    if (aggregation === 'min') return { calculationType: 'min', statPath: 'goals' }
    if (aggregation === 'max') return { calculationType: 'max', statPath: 'goals' }
    if (aggregation === 'parity') return { calculationType: 'parity', statPath: 'goals' }
    if (aggregation === 'sum' || scope === 'both')
      return { calculationType: 'sum', statPath: 'goals' }
    if (aggregation === 'direct' && basePath) {
      // Прямое значение для конкретной команды через пути goals.home/goals.away не задаём через statPath,
      // т.к. голы берем из Matches. Оставляем сумму по умолчанию.
      return { calculationType: 'sum', statPath: 'goals' }
    }
    // По умолчанию — сумма
    return { calculationType: 'sum', statPath: 'goals' }
  }

  // Числовая статистика (угловые/карточки/фолы/удары/...) из MatchStats
  if (!basePath) return null

  if (aggregation !== 'auto') {
    // Явное переопределение
    switch (aggregation) {
      case 'sum':
        return { calculationType: 'sum', statPath: basePath }
      case 'difference':
        return { calculationType: 'difference', statPath: basePath }
      case 'min':
        return { calculationType: 'min', statPath: basePath }
      case 'max':
        return { calculationType: 'max', statPath: basePath }
      case 'parity':
        return { calculationType: 'parity', statPath: basePath }
      case 'direct':
        // direct подразумевает конкретную команду
        if (scope === 'home') return { calculationType: 'direct', statPath: `${basePath}.home` }
        if (scope === 'away') return { calculationType: 'direct', statPath: `${basePath}.away` }
        // если команда не указана — дефолт к сумме
        return { calculationType: 'sum', statPath: basePath }
    }
  }

  // AUTO по scope
  switch (scope) {
    case 'home':
      return { calculationType: 'direct', statPath: `${basePath}.home` }
    case 'away':
      return { calculationType: 'direct', statPath: `${basePath}.away` }
    case 'difference':
      return { calculationType: 'difference', statPath: basePath }
    case 'both':
    default:
      return { calculationType: 'sum', statPath: basePath }
  }
}

/**
 * Универсальный конструктор маппинга по данным CMS
 */
export function createMappingFromCMS(
  market: MarketData,
  outcome: OutcomeData,
): PredictionMapping | null {
  const config = market.mappingConfig
  if (!config) return null

  const calc = deriveCalculation(config, outcome.scope || 'both', outcome.aggregation || 'auto')
  if (!calc) return null

  const mapping: PredictionMapping = {
    statPath: calc.statPath,
    calculationType: calc.calculationType,
    comparisonOperator: outcome.comparisonOperator || 'eq',
  }

  // Операнд/доп.поля по оператору
  switch (mapping.comparisonOperator) {
    case 'between': {
      const lower = outcome.range?.lower
      const upper = outcome.range?.upper
      if (typeof lower === 'number') mapping.rangeLower = lower
      if (typeof upper === 'number') mapping.rangeUpper = upper
      break
    }
    case 'in': {
      // Если явно передали множество — используем его
      if (Array.isArray(outcome.set) && outcome.set.length > 0) {
        mapping.setValues = outcome.set
        break
      }
      // Популярные предустановки для двойного шанса, если set не задан
      if (outcome.name === '1X') mapping.setValues = [1, 0]
      if (outcome.name === '12') mapping.setValues = [1, 2]
      if (outcome.name === 'X2') mapping.setValues = [0, 2]
      break
    }
    case 'even':
    case 'odd': {
      // operand не требуется
      break
    }
    case 'exists': {
      if (outcome.eventFilter) mapping.eventFilter = outcome.eventFilter
      break
    }
    default: {
      // Числовые операторы и eq по числам
      if (typeof outcome.outcomeValue === 'number') {
        mapping.predictedValue = outcome.outcomeValue
      } else if (typeof outcome.value === 'number') {
        mapping.predictedValue = outcome.value
      }
    }
  }

  return mapping
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
 * Создать маппинг из дополнительного условия
 */
function createMappingFromCondition(
  market: MarketData,
  condition: NonNullable<OutcomeData['conditions']>[0],
): PredictionMapping | null {
  const config = market.mappingConfig
  if (!config) return null

  const calc = deriveCalculation(
    config,
    condition.scope || 'both',
    condition.aggregation || 'auto',
  )
  if (!calc) return null

  const mapping: PredictionMapping = {
    statPath: calc.statPath,
    calculationType: calc.calculationType,
    comparisonOperator: condition.comparisonOperator,
  }

  // Операнд/доп.поля по оператору
  switch (mapping.comparisonOperator) {
    case 'between': {
      const lower = condition.range?.lower
      const upper = condition.range?.upper
      if (typeof lower === 'number') mapping.rangeLower = lower
      if (typeof upper === 'number') mapping.rangeUpper = upper
      break
    }
    case 'in': {
      if (Array.isArray(condition.set) && condition.set.length > 0) {
        mapping.setValues = condition.set.map((item) =>
          typeof item === 'object' && 'value' in item ? item.value : item,
        )
      }
      break
    }
    case 'even':
    case 'odd': {
      // operand не требуется
      break
    }
    default: {
      // Числовые операторы
      if (typeof condition.value === 'number') {
        mapping.predictedValue = condition.value
      } else if (Array.isArray(condition.values) && condition.values.length > 0) {
        const firstValue = condition.values[0]
        if (typeof firstValue === 'object' && 'value' in firstValue) {
          mapping.predictedValue = firstValue.value
        } else if (typeof firstValue === 'number') {
          mapping.predictedValue = firstValue
        }
      }
    }
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
  // Создаём основной маппинг
  const primaryMapping = createMappingFromCMS(market, outcome)
  if (!primaryMapping) return null

  // Оцениваем основное условие
  const primaryResult = evaluateMapping(match, matchStats, primaryMapping)
  if (primaryResult === null) return null

  // Если нет дополнительных условий — возвращаем результат основного
  if (!outcome.conditions || outcome.conditions.length === 0) {
    return primaryResult
  }

  // Оцениваем дополнительные условия
  const conditionResults: boolean[] = [primaryResult]

  for (const condition of outcome.conditions) {
    const conditionMapping = createMappingFromCondition(market, condition)
    if (!conditionMapping) return null

    const conditionResult = evaluateMapping(match, matchStats, conditionMapping)
    if (conditionResult === null) return null

    conditionResults.push(conditionResult)
  }

  // Применяем логику объединения
  const logic = outcome.conditionLogic || 'AND'

  if (logic === 'AND') {
    // Все условия должны быть истинны
    return conditionResults.every((result) => result === true)
  } else if (logic === 'OR') {
    // Хотя бы одно условие должно быть истинно
    return conditionResults.some((result) => result === true)
  }

  return null
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
