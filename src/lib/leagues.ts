import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * Получить настройки лиг для виджета топ матчей
 */
export async function getTopMatchesLeagues() {
  try {
    const payload = await getPayload({ config })
    const data = await payload.findGlobal({
      slug: 'topMatchesLeagues',
      depth: 2, // Загружаем связанные лиги
    })

    return data
  } catch (error) {
    console.error('Ошибка при получении настроек топ матчей:', error)
    return null
  }
}

/**
 * Получить настройки лиг для сайдбара
 */
export async function getSidebarLeagues() {
  try {
    const payload = await getPayload({ config })
    const data = await payload.findGlobal({
      slug: 'sidebarLeagues',
      depth: 2, // Загружаем связанные лиги
    })

    return data
  } catch (error) {
    console.error('Ошибка при получении настроек сайдбара:', error)
    return null
  }
}

/**
 * Получить отфильтрованный список лиг для топ матчей
 */
export async function getFilteredTopMatchesLeagues() {
  const settings = await getTopMatchesLeagues()

  if (!settings?.enabled || !settings?.leagues) {
    return []
  }

  return settings.leagues
    .filter((item: any) => item.enabled && item.league)
    .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))
    .slice(0, settings.maxMatches || 10)
    .map((item: any) => ({
      league: item.league,
      priority: item.priority,
    }))
}

/**
 * Получить отфильтрованный список лиг для сайдбара
 */
export async function getFilteredSidebarLeagues() {
  const settings = await getSidebarLeagues()

  if (!settings?.enabled || !settings?.leagues) {
    return []
  }

  return settings.leagues
    .filter((item: any) => item.enabled && item.league)
    .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))
    .slice(0, settings.maxItems || 15)
    .map((item: any) => ({
      league: item.league,
      customName: item.customName,
      priority: item.priority,
      highlightColor: item.highlightColor,
      showMatchCount: item.showMatchCount,
    }))
}

/**
 * Получить ID лиг для топ матчей (для использования в API запросах)
 */
export async function getTopMatchesLeagueIds(): Promise<number[]> {
  const settings = await getTopMatchesLeagues()

  if (!settings?.enabled || !settings?.leagues) {
    return []
  }

  const ids = settings.leagues
    .filter((item: any) => item.enabled && item.league && item.league.competitionId)
    .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))
    .map((item: any) => item.league.competitionId)
    .filter((id: any) => typeof id === 'number')

  console.log('[LEAGUES] getTopMatchesLeagueIds result:', ids)
  return ids
}

/**
 * Получить ID лиг для сайдбара (для использования в API запросах)
 */
export async function getSidebarLeagueIds(): Promise<number[]> {
  const leagues = await getFilteredSidebarLeagues()
  return leagues
    .map((item: any) => item.league?.competitionId)
    .filter((id: any) => typeof id === 'number')
}

/**
 * Получить настройки лиг для виджета сайдбара (с полной информацией)
 */
export async function getSidebarLeaguesForWidget() {
  const settings = await getSidebarLeagues()

  if (!settings?.enabled || !settings?.leagues) {
    return null
  }

  // Преобразуем данные в формат для виджета
  const leagues = settings.leagues
    .filter((item: any) => item.enabled && item.league)
    .map((item: any) => ({
      id: item.league.id,
      competitionId: item.league.competitionId,
      name: item.league.name,
      displayName: item.league.displayName,
      countryName: item.league.countryName,
      countryId: item.league.countryId,
      customName: item.customName,
      priority: item.priority || 999,
      enabled: item.enabled,
      highlightColor: item.highlightColor,
      showMatchCount: item.showMatchCount || false,
      tier: item.league.tier,
      isActive: item.league.active,
      matchCount: 0, // TODO: Можно добавить подсчёт матчей
    }))

  return {
    enabled: settings.enabled,
    title: settings.title || 'Лиги',
    maxItems: settings.maxItems || 15,
    showFlags: settings.showFlags !== false,
    groupByCountry: settings.groupByCountry || false,
    displaySettings: {
      showOnlyActive: settings.displaySettings?.showOnlyActive !== false,
      showTiers: settings.displaySettings?.showTiers || false,
      compactMode: settings.displaySettings?.compactMode || false,
      showLogos: settings.displaySettings?.showLogos || false,
    },
    leagues,
  }
}

// === Централизованное получение названия лиги из CMS ===
const NAME_TTL_MS = 5 * 60 * 1000
const leagueNameCache = new Map<number, { value: string; expires: number }>()

export function resolveLeagueDisplayName(league: any): string {
  // Предпочитаем displayName, далее customName, потом оригинальное name
  const base = league?.displayName || league?.customName || league?.name || ''
  if (!base) return ''

  // Если в CMS нет displayName, формируем вручную (с добавлением страны)
  if (!league?.displayName && league?.countryName) {
    return `${base} (${league.countryName})`
  }
  return base
}

export async function getLeagueDisplayNameById(competitionId: number): Promise<string | null> {
  if (typeof competitionId !== 'number') return null

  // Кэш
  const now = Date.now()
  const cached = leagueNameCache.get(competitionId)
  if (cached && cached.expires > now) return cached.value

  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'leagues',
    where: { competitionId: { equals: competitionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (!res.docs.length) return null
  const name = resolveLeagueDisplayName(res.docs[0])
  leagueNameCache.set(competitionId, { value: name, expires: now + NAME_TTL_MS })
  return name
}

export async function getLeagueNamesMap(competitionIds: number[]): Promise<Record<number, string>> {
  const map: Record<number, string> = {}
  if (!Array.isArray(competitionIds) || competitionIds.length === 0) return map

  const unique = Array.from(new Set(competitionIds.filter((x) => typeof x === 'number')))
  const now = Date.now()

  const toFetch: number[] = []
  for (const id of unique) {
    const cached = leagueNameCache.get(id)
    if (cached && cached.expires > now) {
      map[id] = cached.value
    } else {
      toFetch.push(id)
    }
  }

  if (toFetch.length) {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'leagues',
      where: { competitionId: { in: toFetch } },
      limit: toFetch.length,
      depth: 0,
      overrideAccess: true,
    })

    for (const doc of res.docs) {
      const name = resolveLeagueDisplayName(doc)
      leagueNameCache.set(doc.competitionId, { value: name, expires: now + NAME_TTL_MS })
      map[doc.competitionId] = name
    }

    // Для тех, кто не найден — оставим пусто (можете подставлять фолбэк при использовании)
    for (const id of toFetch) {
      if (!(id in map)) {
        leagueNameCache.set(id, { value: '', expires: now + 30_000 }) // короткий TTL
        map[id] = ''
      }
    }
  }

  return map
}
