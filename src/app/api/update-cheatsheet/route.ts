import { NextRequest, NextResponse } from 'next/server'
import { getCompetitionsListJson } from '@/app/(frontend)/client'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Известные ID стран для целевых лиг
const TARGET_COUNTRIES = {
  'Англия': 'eng',      // АПЛ
  'Германия': 'ger',    // Бундеслига  
  'Италия': 'ita',     // Серия А
  'Франция': 'fra',     // Лига 1
  'Испания': 'esp',     // Ла Лига
  'Россия': 'rus',      // РПЛ
} as const

export async function GET(req: NextRequest) {
  try {
    console.log('[update-cheatsheet] Получаем ID стран...')
    
    // 1. Сначала получаем список стран (небольшой запрос)
    const countriesRes = await getCompetitionsListJson(
      { size: 50 }, // Небольшой размер для стран
      { cache: 'no-store', next: { revalidate: 0 }, timeoutMs: 10000 }
    )
    
    const countries = (countriesRes.data?.data?.competition || []) as Array<{
      countries?: Array<{ id?: number; name?: string }>
    }>
    
    // Извлекаем уникальные страны
    const countryMap = new Map<string, number>()
    countries.forEach(comp => {
      comp.countries?.forEach(country => {
        if (country.name && country.id && TARGET_COUNTRIES[country.name as keyof typeof TARGET_COUNTRIES]) {
          countryMap.set(country.name, Number(country.id))
        }
      })
    })
    
    console.log('[update-cheatsheet] Найденные страны:', Object.fromEntries(countryMap))
    
    const cheatsheet: Record<string, number> = {}
    const found: Record<string, { id: number; name: string; country: string }> = {}
    
    // 2. Для каждой найденной страны делаем отдельный запрос лиг
    for (const [countryName, countryId] of countryMap) {
      const key = TARGET_COUNTRIES[countryName as keyof typeof TARGET_COUNTRIES]
      if (!key) continue
      
      try {
        console.log(`[update-cheatsheet] Загружаем лиги для ${countryName} (ID: ${countryId})...`)
        
        const leaguesRes = await getCompetitionsListJson(
          { country_id: countryId, size: 20 }, // Только лиги конкретной страны
          { cache: 'no-store', next: { revalidate: 0 }, timeoutMs: 8000 }
        )
        
        const leagues = (leaguesRes.data?.data?.competition || []) as Array<{
          id?: number
          name?: string | null
          tier?: number | null
        }>
        
        // Ищем топ-лигу (tier=1) или первую в списке
        const topLeague = leagues.find(l => l.tier === 1) || leagues[0]
        
        if (topLeague?.id && topLeague.name) {
          cheatsheet[key] = Number(topLeague.id)
          found[key] = { 
            id: Number(topLeague.id), 
            name: topLeague.name, 
            country: countryName 
          }
          console.log(`[update-cheatsheet] ${key.toUpperCase()}: "${topLeague.name}" → ID ${topLeague.id}`)
        }
        
      } catch (e) {
        console.warn(`[update-cheatsheet] Ошибка для ${countryName}:`, e)
      }
    }
    
    // 3. Добавляем еврокубки (без привязки к стране)
    try {
      console.log('[update-cheatsheet] Ищем еврокубки...')
      const euRes = await getCompetitionsListJson(
        { size: 100 }, // Небольшой размер для поиска еврокубков
        { cache: 'no-store', next: { revalidate: 0 }, timeoutMs: 8000 }
      )
      
      const euComps = (euRes.data?.data?.competition || []) as Array<{
        id?: number
        name?: string | null
      }>
      
      const ucl = euComps.find(c => /champions.*league|лига.*чемпионов/i.test(String(c.name || '')))
      const uel = euComps.find(c => /europa.*league|лига.*европы/i.test(String(c.name || '')))
      
      if (ucl?.id) {
        cheatsheet.ucl = Number(ucl.id)
        found.ucl = { id: Number(ucl.id), name: ucl.name || '', country: 'UEFA' }
        console.log(`[update-cheatsheet] UCL: "${ucl.name}" → ID ${ucl.id}`)
      }
      
      if (uel?.id) {
        cheatsheet.uel = Number(uel.id)
        found.uel = { id: Number(uel.id), name: uel.name || '', country: 'UEFA' }
        console.log(`[update-cheatsheet] UEL: "${uel.name}" → ID ${uel.id}`)
      }
      
    } catch (e) {
      console.warn('[update-cheatsheet] Ошибка при поиске еврокубков:', e)
    }

    // 4. Записываем в файл
    const filePath = path.join(process.cwd(), 'src/lib/highlight-cheatsheet.json')
    await fs.writeFile(filePath, JSON.stringify(cheatsheet, null, 2), 'utf-8')
    
    console.log('[update-cheatsheet] Чит-лист обновлён:', cheatsheet)
    
    return NextResponse.json({ 
      success: true, 
      cheatsheet,
      found,
      message: 'Чит-лист успешно обновлён с реальными ID лиг!' 
    })
    
  } catch (e) {
    console.error('[update-cheatsheet] Общая ошибка:', e)
    return NextResponse.json({ 
      success: false, 
      error: String(e),
      message: 'Не удалось обновить чит-лист' 
    }, { status: 500 })
  }
}