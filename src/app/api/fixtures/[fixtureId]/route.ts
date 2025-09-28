import { NextRequest, NextResponse } from 'next/server'
import {
  getMatchesLiveJson,
  getMatchesHistoryJson,
  getFixturesMatchesJson,
} from '@/app/(frontend)/client'

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  try {
    const { fixtureId } = await params
    const id = Number(fixtureId)

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid fixture ID' }, { status: 400 })
    }

    console.log(`[API] Searching for fixture ${id}`)

    // Сначала проверим, есть ли этот матч в общем списке fixtures
    try {
      console.log(`[API] First checking if fixture ${id} exists in general fixtures API`)
      const generalResp = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/fixtures?size=100`)
      if (generalResp.ok) {
        const generalData = await generalResp.json()
        const generalFixtures = generalData.fixtures || []
        const foundInGeneral = generalFixtures.find((fx: any) => Number(fx?.id) === id)
        console.log(`[API] Found fixture ${id} in general fixtures:`, !!foundInGeneral)
        if (foundInGeneral) {
          console.log(`[API] General fixtures data for ${id}:`, JSON.stringify(foundInGeneral, null, 2))
          
          // Если нашли в общем списке, используем эти данные
          const fx = foundInGeneral
          const homeName = fx.home_name || fx.home?.name || fx.home_team?.name || 'Команда дома'
          const awayName = fx.away_name || fx.away?.name || fx.away_team?.name || 'Команда гостей'
          
          const normalized = {
            id: Number(fx.id),
            date: String(fx.date || ''),
            time: String(fx.time || ''),
            home: { id: Number(fx.home_id || fx.home?.id || fx.home_team?.id || '0'), name: homeName },
            away: { id: Number(fx.away_id || fx.away?.id || fx.away_team?.id || '0'), name: awayName },
            competition: fx.competition
              ? { id: Number(fx.competition.id || '0'), name: fx.competition.name || '' }
              : undefined,
            location: typeof fx.location === 'string' ? fx.location : fx.venue?.name || null,
            round:
              typeof fx.round === 'string' ? fx.round : fx.round != null ? String(fx.round) : undefined,
            group_id: fx.group_id != null ? Number(fx.group_id) : null,
            odds: fx.odds,
            h2h: typeof fx.h2h === 'string' ? fx.h2h : undefined,
          }
          console.log(`[API] Returning data from general fixtures API`)
          return NextResponse.json(normalized)
        }
      }
    } catch (error) {
      console.error(`[API] Error checking general fixtures:`, error)
    }

    // 1. Сначала пробуем live API (текущие/предстоящие матчи)
    try {
      console.log(`[API] Trying live matches API with fixture_id=${id}`)
      const liveResp = await getMatchesLiveJson({ 
        fixture_id: id,
        lang: 'ru'
      })
      const liveList = (liveResp.data?.data?.match || []) as Array<any>
      console.log(`[API] Live API returned ${liveList.length} matches`)
      
      const m = liveList[0]
      if (m) {
        console.log(`[API] Found match in live API`)
        const homeName = m.home?.name || 'Команда дома'
        const awayName = m.away?.name || 'Команда гостей'
        const normalized = {
          id: Number(m.fixture_id || id),
          date: String(m.date || ''),
          time: String(m.time || ''),
          home: { id: Number(m.home?.id || '0'), name: homeName },
          away: { id: Number(m.away?.id || '0'), name: awayName },
          competition: m.competition
            ? { id: Number(m.competition.id || '0'), name: m.competition.name || '' }
            : undefined,
          location: typeof m.location === 'string' ? m.location : null,
          round:
            typeof m.round === 'string' ? m.round : m.round != null ? String(m.round) : undefined,
          group_id: m.group_id != null ? Number(m.group_id) : null,
          odds: m.odds,
          h2h: m.urls?.head2head || undefined,
          status: m.status,
          time_status: m.time_status ?? null,
          match_id: Number(m.id || 0) || undefined,
          scores: m.scores,
          added: m.added,
          last_changed: m.last_changed,
          outcomes: m.outcomes,
          urls: m.urls,
        }
        return NextResponse.json(normalized)
      }
    } catch (error) {
      console.error(`[API] Error in live API:`, error)
    }

    // 2. Если не найден в live, ищем в fixtures (будущие матчи)
    try {
      console.log(`[API] Trying fixtures API with fixture_id=${id}`)
      const now = new Date()
      const futureStart = new Date(now.toISOString().split('T')[0])
      const futureEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 дней вперед
      
      const fixturesResp = await getFixturesMatchesJson({
        from: futureStart,
        to: futureEnd,
        size: 100,
        lang: 'ru'
      })
      
      const fixturesList = (fixturesResp.data?.data?.fixtures || []) as Array<any>
      console.log(`[API] Fixtures API returned ${fixturesList.length} fixtures`)
      
      // Ищем матч по ID в fixtures
      const fixtureMatch = fixturesList.find((fx) => Number(fx?.id) === id)
      if (fixtureMatch) {
        console.log(`[API] Found fixture in fixtures API`)
        const fx = fixtureMatch
        const homeName = fx.home_name || fx.home?.name || fx.home_team?.name || 'Команда дома'
        const awayName = fx.away_name || fx.away?.name || fx.away_team?.name || 'Команда гостей'
        
        const normalized = {
          id: Number(fx.id),
          date: String(fx.date || ''),
          time: String(fx.time || ''),
          home: { id: Number(fx.home_id || fx.home?.id || fx.home_team?.id || '0'), name: homeName },
          away: { id: Number(fx.away_id || fx.away?.id || fx.away_team?.id || '0'), name: awayName },
          competition: fx.competition
            ? { id: Number(fx.competition.id || '0'), name: fx.competition.name || '' }
            : undefined,
          location: typeof fx.location === 'string' ? fx.location : fx.venue?.name || null,
          round:
            typeof fx.round === 'string' ? fx.round : fx.round != null ? String(fx.round) : undefined,
          group_id: fx.group_id != null ? Number(fx.group_id) : null,
          odds: fx.odds,
          h2h: typeof fx.h2h === 'string' ? fx.h2h : undefined,
        }
        return NextResponse.json(normalized)
      }
    } catch (error) {
      console.error(`[API] Error in fixtures API:`, error)
    }

    // 3. Если не найден в fixtures, ищем в истории (завершенные матчи)
    try {
      console.log(`[API] Trying history matches API with fixture_id=${id}`)
      const now = new Date()
      const historyStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // 90 дней назад
      const historyEnd = new Date() // до сегодня
      
      const historyResp = await getMatchesHistoryJson({
        from: historyStart,
        to: historyEnd,
        size: 100,
        lang: 'ru'
      })
      
      const historyList = (historyResp.data?.data?.match || []) as Array<any>
      console.log(`[API] History API returned ${historyList.length} matches`)
      
      // Ищем матч по fixture_id в истории
      const historyMatch = historyList.find((m) => Number(m?.fixture_id) === id)
      if (historyMatch) {
        console.log(`[API] Found match in history API`)
        const m = historyMatch
        const homeName = m.home?.name || 'Команда дома'
        const awayName = m.away?.name || 'Команда гостей'
        
        const normalized = {
          id: Number(m.fixture_id || id),
          date: String(m.date || ''),
          time: String(m.time || ''),
          home: { id: Number(m.home?.id || '0'), name: homeName },
          away: { id: Number(m.away?.id || '0'), name: awayName },
          competition: m.competition
            ? { id: Number(m.competition.id || '0'), name: m.competition.name || '' }
            : undefined,
          location: typeof m.location === 'string' ? m.location : null,
          round:
            typeof m.round === 'string' ? m.round : m.round != null ? String(m.round) : undefined,
          group_id: m.group_id != null ? Number(m.group_id) : null,
          odds: m.odds,
          h2h: m.urls?.head2head || undefined,
          status: m.status,
          time_status: m.time_status ?? null,
          match_id: Number(m.id || 0) || undefined,
          scores: m.scores,
          added: m.added,
          last_changed: m.last_changed,
          outcomes: m.outcomes,
          urls: m.urls,
        }
        return NextResponse.json(normalized)
      }
    } catch (error) {
      console.error(`[API] Error in history API:`, error)
    }

    console.log(`[API] Fixture ${id} not found in any API`)
    return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })

  } catch (error) {
    console.error('Error fetching fixture:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}