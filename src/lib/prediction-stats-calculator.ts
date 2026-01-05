/**
 * Библиотека для подсчёта статистики прогнозов
 */

import type { Payload } from 'payload'
import type { Post, Match, OutcomeGroup } from '../payload-types'

// Типы для работы
type PredictionOutcome = NonNullable<Post['prediction']>['outcomes'][0]
type OutcomeCondition = OutcomeGroup['outcomes'][0]['conditions'][0]
type ConditionLogic = 'AND' | 'OR'

interface CalculationResult {
  event: string
  coefficient: number
  result: 'won' | 'lost' | 'undecided'
  reason?: string
  actualValue?: number
  expectedValue?: number
}

interface PredictionStatsData {
  post: string | number
  author: string | number
  fixtureId?: number
  matchId?: number
  status: 'pending' | 'settled'
  evaluatedAt: string
  summary: {
    total: number
    won: number
    lost: number
    undecided: number
    hitRate: number
    roi: number
  }
  details: CalculationResult[]
  scoring: {
    points: number
    breakdown: Record<string, unknown>
  }
}

/**
 * Получить исход матча (1 = П1, 0 = Х, 2 = П2)
 */
function getMatchOutcome(match: Match): number {
  if (match.homeScore === null || match.awayScore === null) {
    throw new Error('Match score is not available')
  }
  if (match.homeScore > match.awayScore) return 1
  if (match.homeScore < match.awayScore) return 2
  return 0
}

/**
 * Проверить одно условие
 */
function checkSingleCondition(
  condition: OutcomeCondition,
  match: Match,
  userValue: number | null,
): { result: boolean; actualValue?: number; expectedValue?: number } {
  // 1. Для исходов матча (П1/Х/П2, 1Х, 12, Х2)
  if (condition.outcomeValue !== undefined && condition.outcomeValue !== null) {
    try {
      const matchOutcome = getMatchOutcome(match)
      return {
        result: matchOutcome === condition.outcomeValue,
        actualValue: matchOutcome,
        expectedValue: condition.outcomeValue,
      }
    } catch (error) {
      throw error
    }
  }

  // 2. Для двойного шанса (оператор 'in')
  if (condition.comparisonOperator === 'in' && condition.set) {
    try {
      const matchOutcome = getMatchOutcome(match)
      const setValues = condition.set.map((s) => s.value)
      return {
        result: setValues.includes(matchOutcome),
        actualValue: matchOutcome,
        expectedValue: setValues[0], // Для отображения
      }
    } catch (error) {
      throw error
    }
  }

  // 3. Для остальных типов - вычислить значение из матча
  if (!condition.calculationType) {
    throw new Error('calculationType is required for this condition')
  }

  if (match.homeScore === null || match.awayScore === null) {
    throw new Error('Match score is not available')
  }

  let actualValue: number

  switch (condition.calculationType) {
    case 'sum':
      actualValue = match.homeScore + match.awayScore
      break
    case 'min':
      actualValue = Math.min(match.homeScore, match.awayScore)
      break
    case 'max':
      actualValue = Math.max(match.homeScore, match.awayScore)
      break
    case 'home':
      actualValue = match.homeScore
      break
    case 'away':
      actualValue = match.awayScore
      break
    case 'difference':
      actualValue = match.homeScore - match.awayScore
      break
    default:
      throw new Error(`Unknown calculationType: ${condition.calculationType}`)
  }

  // 4. Определить значение для сравнения
  const compareValue = userValue ?? condition.value

  if (compareValue === undefined || compareValue === null) {
    throw new Error('No value to compare')
  }

  // 5. Применить оператор сравнения
  let result: boolean

  switch (condition.comparisonOperator) {
    case 'gt':
      result = actualValue > compareValue
      break
    case 'gte':
      result = actualValue >= compareValue
      break
    case 'lt':
      result = actualValue < compareValue
      break
    case 'lte':
      result = actualValue <= compareValue
      break
    case 'eq':
      result = actualValue === compareValue
      break
    case 'neq':
      result = actualValue !== compareValue
      break
    case 'between':
      if (!condition.range?.lower || !condition.range?.upper) {
        throw new Error('Range is required for between operator')
      }
      result = actualValue >= condition.range.lower && actualValue <= condition.range.upper
      break
    case 'even':
      result = actualValue % 2 === 0
      break
    case 'odd':
      result = actualValue % 2 !== 0
      break
    default:
      throw new Error(`Unknown comparisonOperator: ${condition.comparisonOperator}`)
  }

  return { result, actualValue, expectedValue: compareValue }
}

/**
 * Проверить все условия с учётом логики (AND/OR)
 */
function checkConditions(
  conditions: OutcomeCondition[],
  match: Match,
  userValue: number | null,
  logic: ConditionLogic = 'AND',
): { result: boolean; actualValue?: number; expectedValue?: number } {
  if (!conditions || conditions.length === 0) {
    throw new Error('No conditions to check')
  }

  const results = conditions.map((condition) => {
    try {
      return checkSingleCondition(condition, match, userValue)
    } catch (error) {
      throw error
    }
  })

  const finalResult =
    logic === 'AND' ? results.every((r) => r.result) : results.some((r) => r.result)

  // Возвращаем значения из первого условия для отображения
  return {
    result: finalResult,
    actualValue: results[0]?.actualValue,
    expectedValue: results[0]?.expectedValue,
  }
}

/**
 * Рассчитать результат одного исхода
 */
async function calculateOutcomeResult(
  payload: Payload,
  outcome: PredictionOutcome,
  match: Match,
): Promise<CalculationResult> {
  const eventName = `${outcome.outcomeName}${outcome.value !== null && outcome.value !== undefined ? ` ${outcome.value}` : ''}`

  // Проверить статус матча
  if (match.status !== 'finished') {
    return {
      event: eventName,
      coefficient: outcome.coefficient,
      result: 'undecided',
      reason: 'match_not_finished',
    }
  }

  // Проверить наличие счёта
  if (match.homeScore === null || match.awayScore === null) {
    return {
      event: eventName,
      coefficient: outcome.coefficient,
      result: 'undecided',
      reason: 'no_score',
    }
  }

  // Получить группу исходов
  let outcomeGroup: OutcomeGroup
  try {
    if (typeof outcome.outcomeGroup === 'object' && outcome.outcomeGroup !== null) {
      outcomeGroup = outcome.outcomeGroup as OutcomeGroup
    } else {
      const result = await payload.findByID({
        collection: 'outcome-groups',
        id: outcome.outcomeGroup as string | number,
      })
      outcomeGroup = result as OutcomeGroup
    }
  } catch (error) {
    console.error(`Error fetching outcome group for ${eventName}:`, error)
    return {
      event: eventName,
      coefficient: outcome.coefficient,
      result: 'undecided',
      reason: 'unsupported_event',
    }
  }

  // Найти определение исхода
  const outcomeDefinition = outcomeGroup.outcomes?.find((o) => o.name === outcome.outcomeName)

  if (!outcomeDefinition || !outcomeDefinition.conditions) {
    return {
      event: eventName,
      coefficient: outcome.coefficient,
      result: 'undecided',
      reason: 'unsupported_event',
    }
  }

  // Проверить условия
  try {
    const checkResult = checkConditions(
      outcomeDefinition.conditions,
      match,
      outcome.value,
      outcomeDefinition.conditionLogic || 'AND',
    )

    return {
      event: eventName,
      coefficient: outcome.coefficient,
      result: checkResult.result ? 'won' : 'lost',
      actualValue: checkResult.actualValue,
      expectedValue: checkResult.expectedValue,
    }
  } catch (error) {
    console.error(`Error checking conditions for ${eventName}:`, error)
    return {
      event: eventName,
      coefficient: outcome.coefficient,
      result: 'undecided',
      reason: 'stat_unavailable',
    }
  }
}

/**
 * Рассчитать ROI
 */
function calculateROI(results: CalculationResult[]): number {
  const allWon = results.every((r) => r.result === 'won')
  const anyUndecided = results.some((r) => r.result === 'undecided')

  if (anyUndecided) return 0

  if (allWon) {
    // Для экспресса: произведение всех коэффициентов минус 1
    const totalCoef = results.reduce((acc, r) => acc * r.coefficient, 1)
    return totalCoef - 1 // ROI в долях (0.85 = +85%)
  }

  return -1 // Проигрыш = -100%
}

/**
 * Рассчитать очки (простая система: 1 балл за правильный ��сход)
 */
function calculatePoints(results: CalculationResult[]): number {
  return results.filter((r) => r.result === 'won').length
}

/**
 * Рассчитать статистику для одного прогноза
 */
export async function calculatePredictionStats(
  payload: Payload,
  post: Post,
): Promise<PredictionStatsData | null> {
  if (post.postType !== 'prediction' || !post.prediction?.outcomes) {
    console.log(`Post ${post.id} is not a prediction`)
    return null
  }

  const outcomes = post.prediction.outcomes

  if (outcomes.length === 0) {
    console.log(`Post ${post.id} has no outcomes`)
    return null
  }

  // Получить уникальные fixtureId
  const fixtureIdsSet = new Set(outcomes.map((o) => o.fixtureId).filter(Boolean))
  const fixtureIds = Array.from(fixtureIdsSet) as number[]

  if (fixtureIds.length === 0) {
    console.log(`Post ${post.id} has no fixtureIds`)
    return null
  }

  // Получить матчи
  const matches = await payload.find({
    collection: 'matches',
    where: {
      fixtureId: { in: fixtureIds },
    },
    limit: 100,
  })

  // Проверить что все матчи найдены
  if (matches.docs.length !== fixtureIds.length) {
    console.log(
      `Post ${post.id}: not all matches found (${matches.docs.length}/${fixtureIds.length})`,
    )
    return null
  }

  // Проверить что все матчи завершены
  const allFinished = matches.docs.every((m) => m.status === 'finished')
  if (!allFinished) {
    console.log(`Post ${post.id}: not all matches finished`)
    return null
  }

  // Рассчитать результаты для каждого исхода
  const results: CalculationResult[] = []

  for (const outcome of outcomes) {
    const match = matches.docs.find((m) => m.fixtureId === outcome.fixtureId)
    if (!match) continue

    const result = await calculateOutcomeResult(payload, outcome, match)
    results.push(result)
  }

  // Подсчитать сводку
  const won = results.filter((r) => r.result === 'won').length
  const lost = results.filter((r) => r.result === 'lost').length
  const undecided = results.filter((r) => r.result === 'undecided').length
  const total = results.length
  const hitRate = total > 0 ? won / total : 0
  const roi = calculateROI(results)
  const points = calculatePoints(results)

  return {
    post: post.id,
    author: typeof post.author === 'object' ? post.author.id : post.author,
    fixtureId: outcomes[0].fixtureId,
    status: 'settled',
    evaluatedAt: new Date().toISOString(),
    summary: {
      total,
      won,
      lost,
      undecided,
      hitRate,
      roi,
    },
    details: results,
    scoring: {
      points,
      breakdown: {},
    },
  }
}

/**
 * Сохранить статистику в БД
 */
export async function savePredictionStats(
  payload: Payload,
  statsData: PredictionStatsData,
): Promise<void> {
  // Проверить существует ли уже статистика
  const existing = await payload.find({
    collection: 'predictionStats',
    where: {
      post: { equals: statsData.post },
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    // Обновить существующую
    await payload.update({
      collection: 'predictionStats',
      id: existing.docs[0].id,
      data: statsData as any,
    })
    console.log(`✅ Updated stats for post ${statsData.post}`)
  } else {
    // Создать новую
    await payload.create({
      collection: 'predictionStats',
      data: statsData as any,
    })
    console.log(`✅ Created stats for post ${statsData.post}`)
  }
}
