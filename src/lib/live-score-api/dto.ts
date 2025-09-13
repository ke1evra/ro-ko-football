// Временные типы для API live score, пока не интегрируем Directus

export interface StandingsResponse {
  data: {
    standings: Array<{
      id: string
      team: {
        id: string
        name: string
        logo?: string
      }
      position: number
      points: number
      played: number
      wins: number
      draws: number
      losses: number
      goalsFor: number
      goalsAgainst: number
      goalDifference: number
      form?: string
    }>
  }
  standings?: Array<{
    teamId: string
    teamName: string
    rank: number
    points: number
    played: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    goalDiff: number
    form?: string
  }>
  source?: 'live' | 'database' | 'snapshot'
  lastUpdated?: string
}

export interface FixturesResponse {
  data: {
    fixtures: Array<{
      id: string
      date: string
      homeTeam: {
        id: string
        name: string
        logo?: string
      }
      awayTeam: {
        id: string
        name: string
        logo?: string
      }
      score?: {
        home: number
        away: number
      }
      status: string
    }>
  }
}

export interface LiveMatchesResponse {
  data: {
    matches: Array<{
      id: string
      date: string
      homeTeam: {
        id: string
        name: string
        logo?: string
      }
      awayTeam: {
        id: string
        name: string
        logo?: string
      }
      score: {
        home: number
        away: number
      }
      status: string
      minute?: number
    }>
  }
  matches?: Array<{
    id: string
    date: string
    homeTeam: {
      id: string
      name: string
      logo?: string
    }
    awayTeam: {
      id: string
      name: string
      logo?: string
    }
    score: {
      home: number
      away: number
    }
    status: string
    minute?: number
  }>
  lastUpdated?: string
  error?: string
}