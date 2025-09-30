#!/usr/bin/env node

/**
 * Перевод названий лиг на русский язык
 * Использование:
 *   node scripts/translate-league-names.mjs exports/league-names-YYYY-MM-DD.json
 */

import fs from 'fs/promises'
import path from 'path'

const EXACT = {
  // ТОП-лиги
  'Premier League': 'Премьер-лига',
  'LaLiga Santander': 'Ла Лига',
  'Serie A': 'Серия А',
  'Bundesliga': 'Бундеслига',
  'Ligue 1': 'Лига 1',
  'Primeira Liga': 'Примейра лига',
  'Eredivisie': 'Эредивизи',
  'Super Lig': 'Суперлига',
  'Superliga': 'Суперлига',
  'Premiership': 'Премьершип',
  'Championship': 'Чемпионшип',
  'Major League Soccer': 'Главная лига футбола',

  // Национальные уникальные
  'Allsvenskan': 'Альсвенскан',
  'Eliteserien': 'Элитсерия',
  'Veikkausliiga': 'Вейккауслига',
  'Ekstraklasa': 'Экстракласа',
  'Liga MX': 'Лига MX',
  'J. League': 'Джей-лига',
  'K-League 1': 'К-лига 1',
  'K-League 2': 'К-лига 2',
  'Hyundai A-League': 'Хюндай А-лига',
  'Indian Super League': 'Индийская суперлига',
  'Ligat HaAl': 'Лигат ха-Аль',
  'Leumit League': 'Леумит лига',
  'Erovnuli Liga': 'Эровнули лига',
  'Erovnuli Liga 2': 'Эровнули лига 2',
  'Urvalsdeild': 'Урвальсдейлд',
  'A Lyga': 'А лига',
  'NB I': 'НБ I',
  'NB II': 'НБ II',
  'Prva Liga': 'Прва лига',
  'Vtora Liga': 'Втора лига',
  'Pro League': 'Про лига',
  'Professional League': 'Профессиональная лига',
  'National League': 'Национальная лига',
  'National Division': 'Национальный дивизион',
  'Premier Division': 'Премьер дивизион',
  'First Professional League': 'Первая профессиональная лига',
  'Second Professional League': 'Вторая профессиональная лига',
  'First League': 'Первая лига',
  'First Division A': 'Первый дивизион А',
  'First Division B': 'Первый дивизион Б',
  '1st Division': '1-й дивизион',
  '2nd Division': '2-й дивизион',
  '3rd Division': '3-й дивизион',
  '1st League': '1-я лига',
  '2nd League': '2-я лига',
  '3rd League': '3-я лига',
  '1 Division': '1-й дивизион',
  '1st Liga': '1st Liga (Польша)',
  '2nd Liga': '2nd Liga (Польша)',
  '3rd Liga': '3rd Liga (Германия)',
  'Regionalliga': 'Региональлига',
  'Gamma Ethniki': 'Гамма этники',
  'Ykkonen': 'Юккёнен',
  'Kakkonen': 'Каккёнен',
  'Eerste Divisie': 'Эрсте дивизи',
  'KNVB Beker': 'Кубок Нидерландов',
  'Birinci Dasta': 'Бирынджи даста',
  'GO-JEK Liga 1': 'ГО-ДЖЕК лига 1',
  'Sg. Premier League': 'Сингапурская премьер-лига',
  'Qatar Stars League': 'Катарская лига звёзд',
  'UAE Pro League': 'ОАЭ про лига',
  'NPFL': 'НПФЛ',
  'Botola Pro': 'Ботола Про',

  // Испанские и португальские названия
  'Primera División': 'Примера',
  'Primera Division': 'Примера',
  'Primera Nacional': 'Примера Насьональ',
  'Primera B Metropolitana': 'Примера Б Метрополитана',
  'Primera C': 'Примера С',
  'Primera D': 'Примера Д',
  'Primera A': 'Примера А',
  'Segunda Division': 'Сегунда',
  'Segunda División': 'Сегунда',
  'Segunda Liga': 'Сегунда лига',
  'Campeonato de Portugal': 'Чемпионат Португалии',
  'Taca De Portugal': 'Кубок Португалии',

  // Итальянские/французские
  'Serie B': 'Серия Б',
  'Serie C': 'Серия С',
  'Serie D': 'Серия Д',
  'Coupe de France': 'Кубок Франции',
  'Ligue 2': 'Лига 2',
  'Ligue I': 'Лига I',

  // Кубки (уникальные)
  'FA Cup': 'Кубок Англии',
  'FA Trophy': 'Трофей ФА',
  'EFL Cup': 'Кубок ЕФЛ',
  'EFL Trophy': 'Трофей ЕФЛ',
  'Community Shield': 'Щит сообщества',
  'DFB Cup': 'Кубок Германии',
  'DFB-Pokal': 'Кубок Германии',
  'US Open Cup': 'Открытый кубок США',
  'Copa Do Brasil': 'Кубок Бразилии',
  'Copa Argentina': 'Кубок Аргентины',
  'Copa Colombia': 'Кубок Колумбии',
  'Copa MX': 'Кубок Мексики',
  'Copa Chile': 'Кубок Чили',
  'Copa Venezuela': 'Кубок Венесуэлы',
  'Copa Paraguay': 'Кубок Парагвая',
  'Copa Ecuador': 'Кубок Эквадора',
  'Coppa Italia': 'Кубок Италии',
  'Coppa Italia Serie C': 'Кубок Италии Серия С',
  'Serie C Super Cup': 'Суперкубок Серии С',
  'Super Cup': 'Суперкубок',
  'Welsh Cup': 'Кубок Уэльса',
  'Irish Cup': 'Кубок Ирландии',
  'Scottish Cup': 'Кубок Шотландии',
  'Cypriot Cup': 'Кубок Кипра',
  'DBU Pokalen': 'Кубок Дании',
  'NM Cupen': 'Кубок Норвегии',
  'ÖFB Cup': 'Кубок Австрии',
  'League Cup': 'Кубок лиги',
  "King's Cup": 'Кубок Короля',
  'Korean Cup': 'Кубок Кореи',
  'FFA Cup': 'Кубок ФФА',
  'Hazfi Cup': 'Кубок Хазфи',
  'Sultan Cup': 'Кубок Султана',
  'Arabian Gulf Cup': 'Кубок Персидского залива',
  'Malaysia League Cup': 'Кубок лиги Малайзии',
  'Sapling Cup': 'Кубок Саплинг',
  'Singapore Cup': 'Кубок Сингапура',
  'Telekom Cup': 'Кубок Телеком',

  // Международные
  'Champions League': 'Лига чемпионов',
  'Europa League': 'Лига Европы',
  'Conference League': 'Лига конференций',
  'UEFA Nations League': 'Лига наций УЕФА',
  'UEFA EURO Qualification': 'Квалификация Евро УЕФА',
  'FIFA World Cup': 'Чемпионат мира ФИФА',
  'FIFA Club World Cup': 'Клубный чемпионат мира ФИФА',
  'FIFA Confederations Cup': 'Кубок конфедераций ФИФА',
  'AFC Cup': 'Кубок АФК',
  'AFC Champions League': 'Лига чемпионов АФК',
  'CAF Super Cup': 'Суперкубок КАФ',
  'CONCACAF League': 'Лига КОНКАКАФ',
  'CONCACAF Nations League': 'Лига наций КОНКАКАФ',
  'CONCACAF Nations League Qualification': 'Квалификация Лиги наций КОНКАКАФ',
  'AFF Suzuki Cup': 'Кубок АФФ Сузуки',
  'SAFF Championship': 'Чемпионат САФФ',
  'COSAFA Cup': 'Кубок КОСАФА',
  'CAFA Nations Cup': 'Кубок наций КАФА',
  'Asian Cup': 'Кубок Азии',
  'Asian Cup Qualification': 'Квалификация Кубка Азии',
  'African Nations Championship': 'Чемпионат африканских наций',
  'African Cup of Nations': 'Кубок африканских наций',
  'Africa Cup of Nations Qualifications': 'Квалификация Кубка африканских наций',

  // Прочее
  'Canadian Championship': 'Чемпионат Канады',
  'National 1': 'Национальная 1',
  'Challenge League': 'Челлендж-лига',
  'Torneos de Verano': 'Летние турниры',
  'Torneo Federal A': 'Торнео Федераль А',
  'Paulista A1': 'Паулиста А1',
}

// Двусмысленные названия, требующие уточнения по стране
const AMBIGUOUS = new Set([
  'Super League',
  'Premier League',
  'Premier Division',
  'Pro League',
  'Professional League',
  'National League',
])

// Точные переводы для двусмысленных названий с учётом страны
const EXACT_BY_COUNTRY = {
  'Super League|Греция': 'Суперлига Греции',
  'Super League|Китай': 'Китайская Суперлига',
  'Super League|Швейцария': 'Швейцарская Суперлига',
  'Super League|Уганда': 'Суперлига Уганды',
  'Super League|Малави': 'Суперлига Малави',

  'Premier League|Россия': 'Премьер-лига (Россия)',
  'Premier League|Украина': 'Премьер-лига (Украина)',
  'Premier League|Гана': 'Премьер-лига (Гана)',
  'Premier League|Танзания': 'Премьер-лига (Танзания)',
  'Premier League|Азербайджан': 'Премьер-лига (Азербайджан)',
  'Premier League|Кения': 'Премьер-лига (Кения)',
  'Premier League|Египет': 'Премьер-лига (Египет)',
  'Premier League|ЮАР': 'Премьер-лига (ЮАР)',

  'Premier Division|Ирландия': 'Премьер-дивизион (Ирландия)',
  'Pro League|Иран': 'Про лига (Иран)',
  'National League|Англия': 'Национальная лига (Англия)',
}

// Порядковые и общие термины (для подстановки)
const PATTERN_REPLACEMENTS = [
  ['National League North / South', 'Национальная лига Север/Юг'],
  ['National Premier leagues', 'Национальные премьер-лиги'],
  ['Premier Soccer League', 'Премьер футбольная лига'],
  ['Super League', 'Суперлига'],
  ['Premier League', 'Премьер-лига'],
  ['Pro League', 'Про лига'],
  ['Professional League', 'Профессиональная лига'],
  ['League Cup', 'Кубок лиги'],
  ['First Division', 'Первый дивизион'],
  ['Second Division', 'Второй дивизион'],
  ['Third Division', 'Третий дивизион'],
  ['1st Division', '1-й дивизион'],
  ['2nd Division', '2-й дивизион'],
  ['3rd Division', '3-й дивизион'],
  ['1st League', '1-я лига'],
  ['2nd League', '2-я лига'],
  ['3rd League', '3-я лига'],
  ['League 1', 'Лига 1'],
  ['League 2', 'Лига 2'],
  ['Division Profesional', 'Профессиональный дивизион'],
  ['Division', 'Дивизион'],
  ['League', 'Лига'],
]

const COUNTRY_CUP_DEFAULT = {
  Англия: 'Кубок Англии',
  Испания: 'Кубок Испании',
  Италия: 'Кубок Италии',
  Германия: 'Кубок Германии',
  Франция: 'Кубок Франции',
  Португалия: 'Кубок Португалии',
  Россия: 'Кубок России',
}

function translateAmbiguous(league, defaultTranslated) {
  const name = normalize(league.name)
  const country = normalize(league.countryName)
  const key = country ? `${name}|${country}` : null
  if (key && EXACT_BY_COUNTRY[key]) return EXACT_BY_COUNTRY[key]
  if (country) {
    const base = defaultTranslated || (EXACT[name] || applyOrderedReplacements(name))
    return `${base} (${country})`
  }
  return defaultTranslated || (EXACT[name] || name)
}

function normalize(str) {
  return (str || '').replace(/\s+/g, ' ').trim()
}

function applyOrderedReplacements(name) {
  let out = name
  for (const [src, dst] of PATTERN_REPLACEMENTS) {
    const re = new RegExp(`(^|[^A-Za-z])${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z])`, 'g')
    out = out.replace(re, (m) => m.replace(src, dst))
  }
  return out
}

function translateGeneric(league) {
  const original = normalize(league.name)
  const countryName = normalize(league.countryName)
  const lower = original.toLowerCase()

  // Кубковые эвристики
  const isCupByName = /\b(cup|copa|coupe|pokal)\b/i.test(original)

  if (isCupByName || league.isCup) {
    // Известные слу��аи "Welsh Cup" и т.п. ловятся через EXACT/PATTERN
    if (countryName) {
      if (COUNTRY_CUP_DEFAULT[countryName]) return COUNTRY_CUP_DEFAULT[countryName]
      return `Кубок ${countryName}`
    }
    // Без страны — общее слово
    return 'Кубок'
  }

  // Лиги: сначала заменить общие фразы
  let translated = applyOrderedReplacements(original)

  // Испанские конструкции
  translated = translated
    .replace(/\bPrimera División\b/gi, 'Примера')
    .replace(/\bPrimera Division\b/gi, 'Примера')
    .replace(/\bSegunda División\b/gi, 'Сегунда')
    .replace(/\bSegunda Division\b/gi, 'Сегунда')

  // Если замены ничего не поменяли, добавим контекст страны в скобках
  if (translated === original && countryName) {
    translated = `${original} (${countryName})`
  }

  return translated
}

function translateLeagueName(league) {
  const name = normalize(league.name)

  // Двусмысленные названия: уточняем по стране
  if (AMBIGUOUS.has(name)) {
    const base = EXACT[name] || applyOrderedReplacements(name)
    return translateAmbiguous(league, base)
  }

  // Точное совпадение
  if (EXACT[name]) return EXACT[name]

  // Попытка исправить мелкие артефакты (например, лишние пробелы)
  const fixed = name.replace(/\s+/g, ' ').trim()
  if (EXACT[fixed]) return EXACT[fixed]

  // Специальные кейсы по шаблонам
  if (/\bWelsh Cup\b/i.test(name)) return 'Кубок Уэльса'
  if (/\bIrish Cup\b/i.test(name)) return 'Кубок Ирландии'
  if (/\bScottish Cup\b/i.test(name)) return 'Кубок Шотландии'

  return translateGeneric(league)
}

async function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('❌ Укажите файл экспорта: node scripts/translate-league-names.mjs exports/league-names-YYYY-MM-DD.json')
    process.exit(1)
  }

  const filePath = path.resolve(input)
  const json = JSON.parse(await fs.readFile(filePath, 'utf8'))

  if (!Array.isArray(json.leagues)) {
    console.error('❌ Неверный формат файла: отсутствует массив leagues')
    process.exit(1)
  }

  let translatedCount = 0
  let skippedCount = 0

  const leagues = json.leagues.map((league) => {
    // Всегда переводим и перезаписываем customName
    const t = translateLeagueName(league)
    if (t && t !== league.name) {
      translatedCount++
      return { ...league, customName: t }
    }

    skippedCount++
    return { ...league, customName: null }
  })

  const out = {
    ...json,
    translationDate: new Date().toISOString(),
    leagues,
  }

  const outPath = filePath.replace(/\.json$/, '-translated.json')
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')

  console.log('\n🎉 Перевод завершён!')
  console.log(`📄 Файл с переводами: ${outPath}`)
  console.log('📊 Статистика:')
  console.log(`   • Переведено: ${translatedCount}`)
  console.log(`   • Пропущено: ${skippedCount}`)
  console.log(`   • Всего лиг: ${leagues.length}`)
}

main().catch((e) => {
  console.error('❌ Ошибка при переводе:', e)
  process.exit(1)
})
