'use server'

import {
  getCompetitionsListJson,
  getCountriesListJson,
  getFederationsListJson,
  getSeasonsListJson,
  getTeamsListJson,
  getScoresEventsJson,
  getFixturesMatchesJson,
  getMatchesLineupsJson,
  getMatchesStatsJson,
  getTeamsHead2HeadJson,
  getMatchesHistoryJson,
  getMatchesLiveJson,
  getTeamsMatchesJson,
  getCompetitionsTopscorersJson,
  getCompetitionsTopcardsJson,
  getTablesStandingsJson,
  getAuthVerifyJson,
  getCountriesFlagPng,
} from '@/app/(frontend)/client'

import type {
  GetScoresEventsJsonQueryParams,
  GetMatchesLineupsJsonQueryParams,
  GetMatchesStatsJsonQueryParams,
  GetTeamsHead2HeadJsonQueryParams,
} from '@/app/(frontend)/client'

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

export async function executeApiMethod({
  method,
  params = {},
}: ApiTestParams): Promise<ApiTestResult> {
  const startTime = Date.now()

  try {
    let result: any

    // Выполняем соответствующий метод API
    switch (method) {
      // Catalogs Service
      case 'getCompetitionsListJson':
        result = await getCompetitionsListJson(params)
        break
      case 'getCountriesListJson':
        result = await getCountriesListJson(params)
        break
      case 'getFederationsListJson':
        result = await getFederationsListJson(params)
        break
      case 'getSeasonsListJson':
        result = await getSeasonsListJson(params)
        break
      case 'getTeamsListJson':
        result = await getTeamsListJson(params)
        break

      // Events Service
      case 'getMatchesEventsJson':
        result = await getScoresEventsJson(params as unknown as GetScoresEventsJsonQueryParams)
        break

      // Fixtures Service
      case 'getFixturesMatchesJson':
        result = await getFixturesMatchesJson(params)
        break

      // Lineups & Stats Service
      case 'getMatchesLineupsJson':
        result = await getMatchesLineupsJson(
          params as unknown as GetMatchesLineupsJsonQueryParams,
        )
        break
      case 'getMatchesStatsJson':
        result = await getMatchesStatsJson(params as unknown as GetMatchesStatsJsonQueryParams)
        break
      case 'getTeamsHead2HeadJson':
        result = await getTeamsHead2HeadJson(
          params as unknown as GetTeamsHead2HeadJsonQueryParams,
        )
        break

      // Matches Service
      case 'getMatchesHistoryJson':
        result = await getMatchesHistoryJson(params)
        break
      case 'getMatchesLiveJson':
        result = await getMatchesLiveJson(params)
        break
      case 'getTeamsLastmatchesJson':
        result = await getTeamsMatchesJson(params)
        break

      // Tables Service
      case 'getCompetitionsTopscorersJson':
        result = await getCompetitionsTopscorersJson(params)
        break
      case 'getCompetitionsTopcardsJson':
        result = await getCompetitionsTopcardsJson(params)
        break
      case 'getTablesStandingsJson':
        result = await getTablesStandingsJson(params)
        break

      // Utility Service
      case 'getAuthVerifyJson':
        result = await getAuthVerifyJson(params)
        break
      case 'getCountriesFlagJson':
        result = await getCountriesFlagPng(params)
        break

      // Методы, которые пока не реализованы в новом API клиенте
      case 'getOddsLiveJson':
      case 'getOddsPreJson':
      case 'getTranslationsCompetitionsJson':
      case 'getTranslationsCountriesJson':
      case 'getTranslationsFederationsJson':
      case 'getTranslationsTeamsJson':
        throw new Error(`Метод ${method} пока не поддерживается в новом API клиенте`)

      default:
        throw new Error(`Неизвестный метод API: ${method}`)
    }

    const duration = Date.now() - startTime

    return {
      success: true,
      data: result,
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
