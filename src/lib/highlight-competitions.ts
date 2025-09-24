export type HighlightCheatsheet = {
  // Еврокубки
  ucl?: number // UEFA Champions League
  uel?: number // UEFA Europa League
  // Топ национальные лиги
  eng?: number // Англия — Premier League
  ita?: number // Италия — Serie A
  esp?: number // Испания — La Liga
  fra?: number // Франция — Ligue 1
  rus?: number // Россия — РПЛ
  ger?: number // Германия — Bundesliga
}

export const HIGHLIGHT_COUNTRY_ORDER_RU: string[] = [
  'Англия',
  'Германия',
  'Италия',
  'Франция',
  'Испания',
  'Россия',
]

export const COUNTRY_NAME_TO_KEY: Record<string, keyof HighlightCheatsheet> = {
  Англия: 'eng',
  Германия: 'ger',
  Италия: 'ita',
  Франция: 'fra',
  Испания: 'esp',
  Россия: 'rus',
}

// Паттерны для распознаван��я турниров по названию
export const COMPETITION_NAME_PATTERNS: Record<keyof HighlightCheatsheet, RegExp[]> = {
  ucl: [/champions/i, /лига\s*чемпионов/i],
  uel: [/europa/i, /лига\s*европ/i],

  eng: [/premier/i, /премьер/i],
  ita: [/serie\s*a/i, /серия\s*a/i],
  esp: [/(la\s*liga|laliga|примера)/i],
  fra: [/(ligue\s*1|лига\s*1)/i],
  rus: [/российская|рпл|rfpl|premier/i],
  ger: [/bundesliga|бундеслига/i],
}

// Шпаргалка ID — заполняйте по мере необходимости.
// Если ID указан, он будет использован в первую очередь и без эвристик.
import CHEATSHEET_FILE from './highlight-cheatsheet.json'

export const DEFAULT_CHEATSHEET: HighlightCheatsheet = {
  // Пример: ucl: 100,
  // eng: 1,
}

export const CHEATSHEET: HighlightCheatsheet = {
  ...DEFAULT_CHEATSHEET,
  ...(CHEATSHEET_FILE as Partial<HighlightCheatsheet>),
}

export const PRIORITY_ORDER = ['ucl', 'uel', 'eng', 'ger', 'ita', 'fra', 'esp', 'rus'] as const
export type PriorityKey = (typeof PRIORITY_ORDER)[number]

export function getCompetitionWeightByIdName(
  competition?: { id?: number | null; name?: string | null },
): number {
  if (!competition) return 9999
  const { id, name } = competition

  // 1) По ID из CHEATSHEET
  for (let i = 0; i < PRIORITY_ORDER.length; i += 1) {
    const key = PRIORITY_ORDER[i] as PriorityKey
    const cheatId = (CHEATSHEET as any)[key] as number | undefined
    if (cheatId && id && cheatId === id) return i
  }

  // 2) По названию
  const lower = String(name || '').toLowerCase()
  for (let i = 0; i < PRIORITY_ORDER.length; i += 1) {
    const key = PRIORITY_ORDER[i] as PriorityKey
    const patterns = COMPETITION_NAME_PATTERNS[key] || []
    if (patterns.some((re) => re.test(lower))) return i
  }

  return 9999
}
