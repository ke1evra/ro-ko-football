/*
  Предсказания: типы, парсер строк событий и оценка результата по данным матча
  Покрытие: ВСЕ события из events-cheat-list.csv (для FT), с поддержкой 1Т/2Т для голов и основных исходов.

  Поддерживаемые группы:
  - Основные исходы: П1/Х/П2 (FT, 1Т, 2Т)
  - Двойной шанс: 1Х/12/Х2 (FT, 1Т, 2Т)
  - ОЗ: Да/Нет (FT)
  - Тоталы: ТБ/ТМ для голов (FT/1Т/2Т) и для статистик (УГ/ЖК/КК/УВС/УД/СЕЙВ/ОФ/Ф/АУТ/ВВ/ЗАМ)
  - Исход по статистике: УГ П1/П2/Х; ЖК П1/П2; ... (сравнение home vs away)
  - Двойной шанс по статистике: УГ 1Х/12/Х2; Фолы 1Х/Х2
  - Индивидуальные тоталы: ИТ1Б/ИТ1М/ИТ2Б/ИТ2М (для голов и статистик)
  - Фора: Ф1/Ф2 (для голов и статистик)
  - Комбо: A и B (логическое И двух под-событий)

  Примечания:
  - Числа допускают запятую в качестве десятичного разделителя.
  - Сравнения для тоталов строгое: over → value > line; under → value < line.
  - Для 1Т/2Т поддержаны: основные исходы и тоталы голов. Для статистик таймы не применяются (данных по таймам нет).
*/

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TeamSide = 'home' | 'away'
export type Scope = 'ft' | '1h' | '2h'

export type MarketGroup =
  | 'main' // П1/Х/П2
  | 'doubleChance' // 1Х/12/Х2
  | 'btts' // ОЗ Да/Нет
  | 'total' // ТБ/ТМ (голы/статистики)
  | 'statOutcome' // УГ П1/П2/Х и пр.
  | 'statDoubleChance' // УГ 1Х/12/Х2 и пр.
  | 'teamTotal' // ИТ1Б/ИТ1М/ИТ2Б/ИТ2М
  | 'handicap' // Ф1/Ф2
  | 'combo'

export type StatKey =
  | 'goals'
  | 'corners'
  | 'yellowCards'
  | 'redCards'
  | 'fouls'
  | 'throw_ins'
  | 'goal_kicks'
  | 'shotsOnTarget'
  | 'shots'
  | 'saves'
  | 'offsides'
  | 'substitutions'

export type TotalKind = 'over' | 'under'
export type DCKind = '1X' | '12' | 'X2'

export interface ParsedEvent {
  group: MarketGroup
  // Основные исходы
  outcome?: 'P1' | 'X' | 'P2'
  outcomeScope?: Scope
  // Двойной шанс (основной или по статике)
  doubleChance?: DCKind
  dcScope?: Scope
  dcStat?: StatKey
  // ОЗ
  btts?: 'yes' | 'no'
  // Тоталы
  total?: {
    kind: TotalKind
    line: number
    stat: StatKey
    scope?: Scope
  }
  // Исход по статике
  statOutcome?: {
    stat: StatKey
    comparator: 'home>away' | 'home==away' | 'away>home'
  }
  // Инд. тотал
  teamTotal?: {
    team: TeamSide
    kind: TotalKind
    line: number
    stat: StatKey
  }
  // Фора
  handicap?: {
    team: TeamSide
    line: number
    stat?: StatKey // если не указан, подразумеваются голы
  }
  // Комбо (логическое И)
  combo?: ParsedEvent[]
}

export interface EvaluateResult {
  parsed: ParsedEvent | null
  won: boolean | null // null = нево��можно оценить (нет данных)
  reason?:
    | 'unsupported_event'
    | 'match_not_finished'
    | 'no_score'
    | 'stat_unavailable'
    | 'unreachable'
}

// Префиксы для различных статистик
const PREFIX_TO_STAT: Record<string, StatKey> = {
  УГ: 'corners',
  ЖК: 'yellowCards',
  КК: 'redCards',
  УВС: 'shotsOnTarget',
  УД: 'shots',
  СЕЙВ: 'saves',
  ОФ: 'offsides',
  Ф: 'fouls',
  АУТ: 'throw_ins',
  ВВ: 'goal_kicks',
  ЗАМ: 'substitutions',
}

function toNumberLocaleAware(input: string): number {
  const s = input.trim().replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

function parseTotalKind(token: string): TotalKind | null {
  const t = token.toUpperCase()
  if (t === 'ТБ' || t === 'TB') return 'over'
  if (t === 'ТМ' || t === 'TM') return 'under'
  return null
}

function parseScope(prefix: string): Scope | undefined {
  const p = prefix.toLowerCase()
  if (p === '1т' || p === '1-й' || p === '1-йтайм' || p === '1й' || p === '1h') return '1h'
  if (p === '2т' || p === '2-й' || p === '2-йтайм' || p === '2й' || p === '2h') return '2h'
  return undefined
}

function normX(token: string): string {
  // Нормализуем кириллическую Х → латинская X
  return token.replace(/Х/g, 'X').replace(/х/g, 'x')
}

function hasCombo(raw: string): boolean {
  return /\sи\s/i.test(raw)
}

// Парсер человекочитаемых событий
export function parseEventString(raw: string): ParsedEvent | null {
  if (!raw) return null
  let s = raw.trim().replace(/\s+/g, ' ')

  // Комбо: разделяем по " и " и парсим каждую часть
  if (hasCombo(s)) {
    const parts = s
      .split(/\sи\s/i)
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length >= 2) {
      const sub: ParsedEvent[] = []
      for (const p of parts) {
        const pe = parseEventString(p)
        if (!pe) return null
        sub.push(pe)
      }
      return { group: 'combo', combo: sub }
    }
  }

  // Префикс тайма (опционально): "1Т ..." или "2Т ..."
  let scope: Scope | undefined
  const scopeMatch = s.match(/^(1Т|2Т|1-й|2-й)\s+/i)
  if (scopeMatch) {
    scope = parseScope(scopeMatch[1])
    s = s.slice(scopeMatch[0].length).trim()
  }

  // Префикс статистики (опционально): УГ/ЖК/... → влияет на дальнейшее толкование
  let statPrefix: StatKey | undefined
  const firstToken = s.split(' ')[0].toUpperCase()
  if (PREFIX_TO_STAT[firstToken]) {
    statPrefix = PREFIX_TO_STAT[firstToken]
    s = s.slice(firstToken.length).trim()
  }

  // Основные исходы
  if (s === 'П1') return { group: 'main', outcome: 'P1', outcomeScope: scope }
  if (s === 'Х') return { group: 'main', outcome: 'X', outcomeScope: scope }
  if (s === 'П2') return { group: 'main', outcome: 'P2', outcomeScope: scope }

  // Исход по статике: "П1/Х/П2" при наличии statPrefix
  if (statPrefix && (s === 'П1' || s === 'Х' || s === 'П2')) {
    const comparator = s === 'П1' ? 'home>away' : s === 'П2' ? 'away>home' : 'home==away'
    return { group: 'statOutcome', statOutcome: { stat: statPrefix, comparator } }
  }

  // ОЗ Да/Нет
  if (/^ОЗ\s+Да$/i.test(s)) return { group: 'btts', btts: 'yes' }
  if (/^ОЗ\s+Нет$/i.test(s)) return { group: 'btts', btts: 'no' }

  // Двойной шанс: 1Х/12/Х2 — с нормализацией X
  let sNorm = normX(s.toUpperCase())
  // Поддержка варианта записи '2X' как 'X2'
  if (sNorm === '2X') sNorm = 'X2'
  if (sNorm === '1X' || sNorm === '12' || sNorm === 'X2') {
    if (statPrefix) {
      return { group: 'statDoubleChance', doubleChance: sNorm as DCKind, dcStat: statPrefix }
    }
    return { group: 'doubleChance', doubleChance: sNorm as DCKind, dcScope: scope }
  }

  // Тоталы: [ТБ/ТМ] LINE (по умолчанию goals FT)
  {
    const parts = s.split(' ')
    if (parts.length >= 2) {
      const kind = parseTotalKind(parts[0])
      if (kind) {
        const line = toNumberLocaleAware(parts.slice(1).join(' '))
        if (Number.isFinite(line)) {
          const stat = statPrefix ?? 'goals'
          return {
            group: 'total',
            total: { kind, line, stat, scope: stat === 'goals' ? scope : 'ft' },
          }
        }
      }
    }
  }

  // ИТ: ИТ1Б/ИТ1М/ИТ2Б/ИТ2М
  {
    const m = s.match(/^ИТ\s*(1|2)\s*(Б|М)\s+(.+)$/i) || s.match(/^(ИТ1Б|ИТ1М|ИТ2Б|ИТ2М)\s+(.+)$/i)
    if (m) {
      let team: TeamSide
      let kind: TotalKind
      let lineStr: string
      if (m.length === 4) {
        team = m[1] === '1' ? 'home' : 'away'
        kind = m[2].toUpperCase() === 'Б' ? 'over' : 'under'
        lineStr = m[3]
      } else {
        const tag = m[1].toUpperCase()
        team = tag.includes('1') ? 'home' : 'away'
        kind = tag.includes('Б') ? 'over' : 'under'
        lineStr = m[2]
      }
      const line = toNumberLocaleAware(lineStr)
      if (Number.isFinite(line)) {
        const stat = statPrefix ?? 'goals'
        return { group: 'teamTotal', teamTotal: { team, kind, line, stat } }
      }
    }
  }

  // Фора: Ф1/Ф2 LINE (для голов или стат)
  {
    const m = s.match(/^Ф\s*(1|2)\s+(.+)$/i) || s.match(/^(Ф1|Ф2)\s+(.+)$/i)
    if (m) {
      const team: TeamSide = (m[1] || m[0]).includes('1') ? 'home' : 'away'
      const line = toNumberLocaleAware(m[2] || m[1])
      if (Number.isFinite(line)) {
        return { group: 'handicap', handicap: { team, line, stat: statPrefix } }
      }
    }
  }

  // Исход по статике: с явным префиксом и второй токен П1/Х/П2 (например, "УГ П1")
  if (statPrefix) {
    const t = s.trim()
    if (t === 'П1' || t === 'П2' || t === 'Х') {
      const comparator = t === 'П1' ? 'home>away' : t === 'П2' ? 'away>home' : 'home==away'
      return { group: 'statOutcome', statOutcome: { stat: statPrefix, comparator } }
    }
    // Двойной шанс по статике с явным префиксом (например, "УГ 1Х")
    let tNorm = normX(t.toUpperCase())
    if (tNorm === '2X') tNorm = 'X2'
    if (tNorm === '1X' || tNorm === '12' || tNorm === 'X2') {
      return { group: 'statDoubleChance', doubleChance: tNorm as DCKind, dcStat: statPrefix }
    }
  }

  return null
}

// Утилиты извлечения значений
function scorePair(match: any, scope: Scope = 'ft'): { home: number; away: number } | null {
  if (!match) return null
  if (scope === '1h') {
    const h = Number(match.homeScoreHalftime)
    const a = Number(match.awayScoreHalftime)
    if (!Number.isFinite(h) || !Number.isFinite(a)) return null
    return { home: h, away: a }
  }
  if (scope === '2h') {
    const h = Number(match.homeScore ?? 0) - Number(match.homeScoreHalftime ?? 0)
    const a = Number(match.awayScore ?? 0) - Number(match.awayScoreHalftime ?? 0)
    if (!Number.isFinite(h) || !Number.isFinite(a)) return null
    return { home: h, away: a }
  }
  const h = Number(match.homeScore)
  const a = Number(match.awayScore)
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null
  return { home: h, away: a }
}

function sumGoals(match: any, scope: Scope = 'ft'): number | null {
  const p = scorePair(match, scope)
  return p ? p.home + p.away : null
}

function mainOutcome(match: any, scope: Scope = 'ft'): 'P1' | 'X' | 'P2' | null {
  const p = scorePair(match, scope)
  if (!p) return null
  if (p.home > p.away) return 'P1'
  if (p.home < p.away) return 'P2'
  return 'X'
}

function mainDoubleChance(match: any, kind: DCKind, scope: Scope = 'ft'): boolean | null {
  const p = scorePair(match, scope)
  if (!p) return null
  if (kind === '1X') return p.home >= p.away
  if (kind === '12') return p.home !== p.away
  if (kind === 'X2') return p.away >= p.home
  return null
}

function pairFromAdditional(
  raw: any,
  keyCandidates: string[],
): { home: number; away: number } | null {
  if (!raw) return null
  for (const key of keyCandidates) {
    const val = raw?.[key]
    if (typeof val === 'string') {
      const [hs, as] = String(val).split(':')
      const home = Number.parseInt(hs ?? '0', 10)
      const away = Number.parseInt(as ?? '0', 10)
      if (Number.isFinite(home) && Number.isFinite(away)) return { home, away }
    }
  }
  return null
}

function statPair(matchStats: any, stat: StatKey): { home: number; away: number } | null {
  if (!matchStats) return null
  switch (stat) {
    case 'corners':
    case 'yellowCards':
    case 'redCards':
    case 'fouls':
    case 'shotsOnTarget':
    case 'shots':
    case 'saves':
    case 'offsides': {
      const group = (matchStats as any)[stat]
      if (!group) return null
      const h = Number(group.home ?? 0)
      const a = Number(group.away ?? 0)
      if (!Number.isFinite(h) || !Number.isFinite(a)) return null
      return { home: h, away: a }
    }
    case 'throw_ins': {
      return pairFromAdditional(matchStats.additionalStats, ['throw_ins', 'throwIns'])
    }
    case 'goal_kicks': {
      return pairFromAdditional(matchStats.additionalStats, ['goal_kicks', 'goalKicks'])
    }
    case 'substitutions': {
      return pairFromAdditional(matchStats.additionalStats, ['substitutions'])
    }
    default:
      return null
  }
}

function sumStat(matchStats: any, stat: StatKey): number | null {
  const p = statPair(matchStats, stat)
  return p ? p.home + p.away : null
}

function teamStat(match: any, matchStats: any, stat: StatKey, team: TeamSide): number | null {
  if (stat === 'goals') {
    const p = scorePair(match, 'ft')
    if (!p) return null
    return team === 'home' ? p.home : p.away
  }
  const p = statPair(matchStats, stat)
  if (!p) return null
  return team === 'home' ? p.home : p.away
}

export function evaluateEvent(rawEvent: string, match: any, matchStats: any): EvaluateResult {
  const parsed = parseEventString(rawEvent)
  if (!parsed) return { parsed: null, won: null, reason: 'unsupported_event' }

  const status = match?.status
  const finished = status === 'finished' || status === 'ft' || status === 'FT' || status === 'ended'

  // Основные исходы
  if (parsed.group === 'main') {
    const sc = parsed.outcomeScope ?? 'ft'
    if (sc === 'ft' && !finished) return { parsed, won: null, reason: 'match_not_finished' }
    const outcome = mainOutcome(match, sc)
    if (!outcome) return { parsed, won: null, reason: 'no_score' }
    const won = outcome === parsed.outcome
    return { parsed, won }
  }

  // Двойной шанс (основной)
  if (parsed.group === 'doubleChance' && parsed.doubleChance) {
    const sc = parsed.dcScope ?? 'ft'
    if (sc === 'ft' && !finished) return { parsed, won: null, reason: 'match_not_finished' }
    const ok = mainDoubleChance(match, parsed.doubleChance, sc)
    if (ok == null) return { parsed, won: null, reason: 'no_score' }
    return { parsed, won: ok }
  }

  // ОЗ
  if (parsed.group === 'btts') {
    if (!finished) return { parsed, won: null, reason: 'match_not_finished' }
    const p = scorePair(match, 'ft')
    if (!p) return { parsed, won: null, reason: 'no_score' }
    const btts = p.home > 0 && p.away > 0
    const won = parsed.btts === 'yes' ? btts === true : btts === false
    return { parsed, won }
  }

  // Тоталы
  if (parsed.group === 'total' && parsed.total) {
    const { stat, kind, line, scope = 'ft' } = parsed.total
    let value: number | null = null

    if (stat === 'goals') {
      if (scope === 'ft' && !finished) return { parsed, won: null, reason: 'match_not_finished' }
      value = sumGoals(match, scope)
    } else {
      value = sumStat(matchStats, stat)
    }

    if (value == null) return { parsed, won: null, reason: 'stat_unavailable' }
    const won = kind === 'over' ? value > line : value < line
    return { parsed, won }
  }

  // Исход по статике
  if (parsed.group === 'statOutcome' && parsed.statOutcome) {
    const p = statPair(matchStats, parsed.statOutcome.stat)
    if (!p) return { parsed, won: null, reason: 'stat_unavailable' }
    let won = false
    if (parsed.statOutcome.comparator === 'home>away') won = p.home > p.away
    else if (parsed.statOutcome.comparator === 'away>home') won = p.away > p.home
    else won = p.home === p.away
    return { parsed, won }
  }

  // Двойной шанс по статике
  if (parsed.group === 'statDoubleChance' && parsed.doubleChance && parsed.dcStat) {
    const p = statPair(matchStats, parsed.dcStat)
    if (!p) return { parsed, won: null, reason: 'stat_unavailable' }
    let ok: boolean
    if (parsed.doubleChance === '1X') ok = p.home >= p.away
    else if (parsed.doubleChance === '12') ok = p.home !== p.away
    else ok = p.away >= p.home
    return { parsed, won: ok }
  }

  // Индивидуальные тоталы
  if (parsed.group === 'teamTotal' && parsed.teamTotal) {
    const { team, kind, line, stat } = parsed.teamTotal
    const value = teamStat(match, matchStats, stat, team)
    if (value == null) return { parsed, won: null, reason: 'stat_unavailable' }
    const won = kind === 'over' ? value > line : value < line
    return { parsed, won }
  }

  // Фора
  if (parsed.group === 'handicap' && parsed.handicap) {
    const { team, line, stat } = parsed.handicap
    if (!stat || stat === 'goals') {
      if (!finished) return { parsed, won: null, reason: 'match_not_finished' }
      const p = scorePair(match, 'ft')
      if (!p) return { parsed, won: null, reason: 'no_score' }
      const diff = team === 'home' ? p.home - p.away : p.away - p.home
      return { parsed, won: diff > line }
    }
    const sp = statPair(matchStats, stat)
    if (!sp) return { parsed, won: null, reason: 'stat_unavailable' }
    const diff = team === 'home' ? sp.home - sp.away : sp.away - sp.home
    return { parsed, won: diff > line }
  }

  // Комбо: логическое И
  if (parsed.group === 'combo' && parsed.combo && parsed.combo.length > 0) {
    let anyUndecided = false
    for (const sub of parsed.combo) {
      const r = evaluateEvent(renderEvent(sub), match, matchStats)
      if (r.won == null) anyUndecided = true
      else if (!r.won) return { parsed, won: false }
    }
    return { parsed, won: anyUndecided ? null : true }
  }

  return { parsed, won: null, reason: 'unreachable' }
}

// Вспомогательно: рендер ParsedEvent в строку (минимально для рекурсии combo)
function renderEvent(pe: ParsedEvent): string {
  if (pe.group === 'main' && pe.outcome) {
    const pfx = pe.outcomeScope === '1h' ? '1Т ' : pe.outcomeScope === '2h' ? '2Т ' : ''
    return `${pfx}${pe.outcome}`
  }
  if (pe.group === 'doubleChance' && pe.doubleChance) {
    const pfx = pe.dcScope === '1h' ? '1Т ' : pe.dcScope === '2h' ? '2Т ' : ''
    return `${pfx}${pe.doubleChance}`
  }
  if (pe.group === 'btts' && pe.btts) return `ОЗ ${pe.btts === 'yes' ? 'Да' : 'Нет'}`
  if (pe.group === 'total' && pe.total) {
    const kind = pe.total.kind === 'over' ? 'ТБ' : 'ТМ'
    const pfx = pe.total.stat !== 'goals' ? `${statPrefixFromKey(pe.total.stat)} ` : ''
    const scope = pe.total.scope === '1h' ? '1Т ' : pe.total.scope === '2h' ? '2Т ' : ''
    return `${scope}${pfx}${kind} ${pe.total.line}`.trim()
  }
  if (pe.group === 'statOutcome' && pe.statOutcome) {
    const tag =
      pe.statOutcome.comparator === 'home>away'
        ? 'П1'
        : pe.statOutcome.comparator === 'away>home'
          ? 'П2'
          : 'Х'
    return `${statPrefixFromKey(pe.statOutcome.stat)} ${tag}`
  }
  if (pe.group === 'statDoubleChance' && pe.doubleChance && pe.dcStat) {
    return `${statPrefixFromKey(pe.dcStat)} ${pe.doubleChance}`
  }
  if (pe.group === 'teamTotal' && pe.teamTotal) {
    const team = pe.teamTotal.team === 'home' ? 'ИТ1' : 'ИТ2'
    const kind = pe.teamTotal.kind === 'over' ? 'Б' : 'М'
    const pfx = pe.teamTotal.stat !== 'goals' ? `${statPrefixFromKey(pe.teamTotal.stat)} ` : ''
    return `${pfx}${team}${kind} ${pe.teamTotal.line}`
  }
  if (pe.group === 'handicap' && pe.handicap) {
    const team = pe.handicap.team === 'home' ? 'Ф1' : 'Ф2'
    const pfx = pe.handicap.stat ? `${statPrefixFromKey(pe.handicap.stat)} ` : ''
    return `${pfx}${team} ${pe.handicap.line}`
  }
  if (pe.group === 'combo' && pe.combo) {
    return pe.combo.map((c) => renderEvent(c)).join(' и ')
  }
  return ''
}

function statPrefixFromKey(stat: StatKey): string {
  for (const [k, v] of Object.entries(PREFIX_TO_STAT)) {
    if (v === stat) return k
  }
  return ''
}

export function evaluateMany(
  events: string[],
  match: any,
  matchStats: any,
): { total: number; won: number; lost: number; undecided: number; details: EvaluateResult[] } {
  const details = events.map((e) => evaluateEvent(e, match, matchStats))
  let won = 0
  let lost = 0
  let undecided = 0
  for (const r of details) {
    if (r.won == null) undecided += 1
    else if (r.won) won += 1
    else lost += 1
  }
  return { total: details.length, won, lost, undecided, details }
}
