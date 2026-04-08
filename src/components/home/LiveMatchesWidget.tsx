/**
 * LiveMatchesWidget - Server Component
 * 
 * Этот компонент является Server Component и загружает начальные данные
 * с сервера для отображения живых матчей.
 * 
 * Реальное время (таймеры, обновления) обрабатываются в LiveMatchesWidgetClient.
 * 
 * Паттерн: Server Component (data fetching) + Client Component (real-time updates)
 * 
 * Использует прямые вызовы функций API вместо HTTP fetch для избежания ECONNREFUSED в Docker
 */

import LiveMatchesWidgetClient from './LiveMatchesWidgetClient'
import { type LiveItem, normalize } from './live-matches-utils'
import { fetchLiveMatches } from '@/lib/api'

interface LiveMatchesWidgetProps {
  league?: string
}

/**
 * Result type for fetch with error tracking
 */
interface FetchResult {
  items: LiveItem[]
  error: string | null
}

// Функция для загрузки живых матчей на сервере
async function fetchLiveMatchesData(page = 1): Promise<FetchResult> {
  try {
    // Используем прямой вызов API функции вместо HTTP fetch
    const result = await fetchLiveMatches({ size: 50 })

    if (result.error) {
      console.error('[LiveMatchesWidget] API error:', result.error)
      return { items: [], error: result.error }
    }

    const raw = (result.matches || []) as any[]
    console.log(`[LiveMatchesWidget] Raw matches from API: ${raw.length}`)
    if (raw.length > 0) {
      console.log(`[LiveMatchesWidget] First raw match structure:`, {
        id: raw[0]?.id,
        fixtureId: raw[0]?.fixtureId,
        hasHome: !!raw[0]?.home,
        hasHomeTeam: !!raw[0]?.homeTeam,
        homeName: raw[0]?.home?.name || raw[0]?.homeTeam?.name,
      })
    }

    const normalized = raw.map(normalize).filter(Boolean) as LiveItem[]
    console.log(`[LiveMatchesWidget] After normalize: ${normalized.length} matches (filtered out ${raw.length - normalized.length})`)

    return { items: normalized, error: null }
  } catch (error) {
    let errorMessage = 'Failed to load live matches'

    if (error instanceof Error) {
      errorMessage = error.message
      console.error('[LiveMatchesWidget] Error:', error)
    }

    return { items: [], error: errorMessage }
  }
}

/**
 * LiveMatchesWidget - Server Component
 * 
 * Загружает начальные живые матчи на сервере и передаёт их клиентскому компоненту.
 * Клиентский компонент затем обновляет данные в реальном времени.
 */
export default async function LiveMatchesWidget({ league }: LiveMatchesWidgetProps) {
  // Загружаем начальные данные на сервере
  const { items, error } = await fetchLiveMatchesData(1)

  return <LiveMatchesWidgetClient initialItems={items} error={error} hasError={!!error} />
}

// Экспорт типов для использования в других местах
export type { LiveItem }
