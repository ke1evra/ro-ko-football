'use server'

import { customFetch } from '@/lib/http/livescore/customFetch'

export interface ApiTestParams {
  method: string
  params?: Record<string, any>
}

export interface ApiTestResult {
  success: boolean
  data?: any
  error?: string
  duration: number
}

// Маппинг методов на их URL endpoints
const METHOD_ENDPOINTS: Record<string, string> = {
  // Catalogs Service
  getCompetitionsListJson: 'competitions/list.json',
  getCountriesListJson: 'countries/list.json',
  getFederationsListJson: 'federations/list.json',
  getSeasonsListJson: 'seasons/list.json',
  getTeamsLastmatchesJson: 'teams/lastmatches.json',
  getTeamsListJson: 'teams/list.json',
  
  // Events Service
  getMatchesEventsJson: 'matches/events.json',
  
  // Fixtures Service
  getFixturesMatchesJson: 'fixtures/matches.json',
  
  // Lineups & Stats Service
  getMatchesLineupsJson: 'matches/lineups.json',
  getMatchesStatsJson: 'matches/stats.json',
  getTeamsHead2HeadJson: 'teams/head2head.json',
  
  // Matches Service
  getMatchesHistoryJson: 'matches/history.json',
  getMatchesLiveJson: 'matches/live.json',
  
  // Odds Service
  getOddsLiveJson: 'odds/live.json',
  getOddsPreJson: 'odds/pre.json',
  
  // Tables Service
  getCompetitionsTopscorersJson: 'competitions/topscorers.json',
  getTablesStandingsJson: 'tables/standings.json',
  
  // Translations Service
  getTranslationsCompetitionsJson: 'translations/competitions.json',
  getTranslationsCountriesJson: 'translations/countries.json',
  getTranslationsFederationsJson: 'translations/federations.json',
  getTranslationsTeamsJson: 'translations/teams.json',
  
  // Utility Service
  getAuthVerifyJson: 'auth/verify.json',
  getCountriesFlagJson: 'countries/flag.json',
}

export async function executeApiMethod({ method, params = {} }: ApiTestParams): Promise<ApiTestResult> {
  const startTime = Date.now()
  
  try {
    const endpoint = METHOD_ENDPOINTS[method]
    if (!endpoint) {
      throw new Error(`Неизвестный метод API: ${method}`)
    }

    // Строим URL с параметрами
    const url = new URL(endpoint, 'https://example.com') // базовый URL будет заменён в customFetch
    
    // Добавляем параметры в query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })

    // Используем только путь и query string
    const pathWithQuery = url.pathname + url.search

    const response = await customFetch(pathWithQuery, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const duration = Date.now() - startTime

    return {
      success: true,
      data,
      duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      duration,
    }
  }
}