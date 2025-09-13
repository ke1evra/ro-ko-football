// Утилиты для работы с флагами команд

type FlagResponse = {
  data?: {
    flag?: string
    country?: string
  }
  error?: string
}

/**
 * Получает флаг команды по team_id через наш API роут
 */
export async function getTeamFlag(teamId: number | string): Promise<string | null> {
  try {
    const response = await fetch(`/api/flags/${teamId}`, {
      next: { revalidate: 3600 }, // Кэш на 1 час
    })

    if (!response.ok) {
      return null
    }

    const data: FlagResponse = await response.json()
    return data.data?.flag || null
  } catch (error) {
    console.error('Error fetching team flag:', error)
    return null
  }
}

/**
 * Получает флаги для массива команд
 */
export async function getTeamFlags(teamIds: (number | string)[]): Promise<Map<string, string>> {
  const flagMap = new Map<string, string>()

  // Получаем флаги параллельно
  const promises = teamIds.map(async (teamId) => {
    const flag = await getTeamFlag(teamId)
    if (flag) {
      flagMap.set(String(teamId), flag)
    }
  })

  await Promise.allSettled(promises)
  return flagMap
}

/**
 * Серверная версия для получения флага команды
 */
export async function getTeamFlagServer(teamId: number | string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/flags/${teamId}`, {
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      return null
    }

    const data: FlagResponse = await response.json()
    return data.data?.flag || null
  } catch (error) {
    console.error('Error fetching team flag (server):', error)
    return null
  }
}
