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
  'Италия',
  'Испания',
  'Франция',
  'Россия',
  'Германия',
]

// Паттерны для распознавания турниров по названию
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
export const CHEATSHEET: HighlightCheatsheet = {
  // Пример: ucl: 100,
  // eng: 1,
}
