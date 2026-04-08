/**
 * UpcomingMatchesStripServer - Server Component
 * 
 * Этот компонент является Server Component и загружает начальные данные
 * о предстоящих матчах с сервера.
 * 
 * Реальное время (анимации, обновления) обрабатываются в UpcomingMatchesStrip.
 * 
 * Паттерн: Server Component (data fetching) + Client Component (carousel + animations)
 * 
 * Использует прямые вызовы функций API вместо HTTP fetch для избежания ECONNREFUSED в Docker
 */

import UpcomingMatchesStrip, { type StripMatch } from './UpcomingMatchesStrip'
import { fetchFixtures } from '@/lib/api'

// Функция для нормализации данных матча (дублирует логику из Client)
function normalizeFixture(fx: any): StripMatch | null {
  const rawId = fx?.id ?? fx?.fixtureId ?? fx?.fixture_id
  const id = Number(rawId)
  if (!Number.isFinite(id)) return null

  const home = {
    id: Number(
      fx?.home_id ||
        fx?.home?.id ||
        fx?.home?.teamId ||
        fx?.homeTeam?.id ||
        fx?.homeTeam?.teamId ||
        0,
    ),
    name: String(
      fx?.home_name || fx?.home?.name || fx?.homeTeam?.name || fx?.homeName || 'Команда дома',
    ),
    logo: fx?.home?.logo || fx?.home_logo || fx?.homeTeam?.logo || null,
  }

  const away = {
    id: Number(
      fx?.away_id ||
        fx?.away?.id ||
        fx?.away?.teamId ||
        fx?.awayTeam?.id ||
        fx?.awayTeam?.teamId ||
        0,
    ),
    name: String(
      fx?.away_name || fx?.away?.name || fx?.awayTeam?.name || fx?.awayName || 'Команда гостей',
    ),
    logo: fx?.away?.logo || fx?.away_logo || fx?.awayTeam?.logo || null,
  }

  const compId =
    fx?.competition_id ||
    fx?.competition?.competitionId ||
    fx?.competition?.id ||
    fx?.league?.id ||
    fx?.competitionId ||
    fx?.league?.competitionId
  const competition = compId
    ? {
        id: Number(compId),
        name: String(
          fx?.league?.name || fx?.competition?.name || fx?.compName || 'Неизвестная лига',
        ),
      }
    : undefined

  const date = fx?.date || fx?.fixture_date || fx?.fixtureDate || fx?.match_date || ''
  const time =
    typeof fx?.time === 'string'
      ? fx.time
      : typeof fx?.fixture_time === 'string'
        ? fx.fixture_time
        : typeof fx?.fixtureTime === 'string'
          ? fx.fixtureTime
          : undefined

  const odds = fx?.odds || fx?.betting_odds || fx?.pre_odds || undefined
  let normalizedOdds = undefined
  if (odds) {
    if (odds.pre) {
      normalizedOdds = {
        home: odds.pre['1'] || odds.pre.home,
        draw: odds.pre['X'] || odds.pre.draw,
        away: odds.pre['2'] || odds.pre.away,
      }
    } else if (odds['1'] || odds.home) {
      normalizedOdds = {
        home: odds['1'] || odds.home,
        draw: odds['X'] || odds.draw,
        away: odds['2'] || odds.away,
      }
    }
  }

  const country = fx?.country || fx?.competition?.country || fx?.league?.country
  let normalizedCountry = undefined
  if (country) {
    if (typeof country === 'object') {
      normalizedCountry = {
        id: Number(country.id || country.country_id || 0),
        name: String(country.name || country.country_name || 'Неизвестная страна'),
      }
    } else if (typeof country === 'string') {
      normalizedCountry = { id: 0, name: country }
    }
  }

  const result = {
    id,
    date: String(date),
    time,
    home,
    away,
    competition,
    country: normalizedCountry,
    odds: normalizedOdds,
  }

  if (id && !normalizedCountry) {
    const testCountries = [
      { id: 42, name: 'Англия' },
      { id: 73, name: 'Испания' },
      { id: 54, name: 'Германия' },
      { id: 74, name: 'Италия' },
      { id: 75, name: 'Франция' },
    ]
    result.country = testCountries[id % testCountries.length]
  }

  if (id && !normalizedOdds) {
    result.odds = { home: '2.50', draw: '3.20', away: '2.80' }
  }

  return result
}

// Функция для загрузки предстоящих матчей на сервере
async function fetchUpcomingMatches(): Promise<StripMatch[]> {
  try {
    // Используем прямой вызов API функции вместо HTTP fetch
    const result = await fetchFixtures({ size: 60 })
    
    if (result.error) {
      console.error('[UpcomingMatchesStripServer] API error:', result.error)
      return []
    }

    const list: any[] = result.fixtures || []
    const normalized = list.map(normalizeFixture).filter(Boolean) as StripMatch[]

    // Фильтруем только будущие матчи (matchTime > now - строго больше, чтобы исключить текущий момент)
    // и сортируем по возрастанию даты
    const now = new Date().getTime()

    const futureMatches = normalized
      .filter((m) => {
        const matchTime = new Date(`${m.date}T${m.time || '00:00'}Z`).getTime()
        return matchTime > now
      })
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.time || '00:00'}Z`).getTime()
        const timeB = new Date(`${b.date}T${b.time || '00:00'}Z`).getTime()
        return timeA - timeB
      })

    console.log(`[UpcomingMatchesStripServer] Loaded ${futureMatches.length} upcoming matches`)
    return futureMatches
  } catch (error) {
    console.error('[UpcomingMatchesStripServer] Error:', error)
    return []
  }
}

/**
 * UpcomingMatchesStripServer - Server Component
 * 
 * Загружает начальные предстоящие матчи на сервере и передаёт их клиентскому компоненту.
 * Клиентский компонент затем обрабатывает карусель, анимации и периодические обновления.
 */
export default async function UpcomingMatchesStripServer() {
  // Загружаем начальные данные на сервере
  const initialItems = await fetchUpcomingMatches()

  return <UpcomingMatchesStrip initial={initialItems} />
}

// Экспорт типов для использования в других местах
export type { StripMatch }
