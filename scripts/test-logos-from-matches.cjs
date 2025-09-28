#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки наличия логотипов в матчах
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// Конфигурация
const CONFIG = {
  API_KEY: 'JFSoWhkq1FIky8SS',
  API_SECRET: 'qbjc7aeuFAJo1E5KjX8fetGg9oAIxtBY',
  BASE_URL: 'https://livescore-api.com/api-client',
}

// HTTP запрос к API
function makeApiRequest(url) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${CONFIG.BASE_URL}${url}&key=${CONFIG.API_KEY}&secret=${CONFIG.API_SECRET}`
    console.log(`Запрос к API: ${fullUrl}`)

    https
      .get(fullUrl, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data)
            resolve(jsonData)
          } catch (e) {
            reject(new Error(`Ошибка парсинга JSON: ${e.message}`))
          }
        })
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

// Основная функция
async function main() {
  console.log('=== Проверяем логотипы в матчах ===')

  try {
    // Проверяем fixtures
    console.log('\n1. Проверяем fixtures...')
    const fixturesUrl = `/fixtures/matches.json?date=today&size=5`
    const fixturesResponse = await makeApiRequest(fixturesUrl)

    if (fixturesResponse.success && fixturesResponse.data?.fixtures) {
      const fixtures = fixturesResponse.data.fixtures.slice(0, 3)
      console.log(`Получено fixtures: ${fixtures.length}`)

      fixtures.forEach((fixture, index) => {
        console.log(`\nFixture ${index + 1}:`)
        console.log(`  ID: ${fixture.id}`)
        console.log(
          `  Home: ${fixture.home?.name || fixture.home_name} (ID: ${fixture.home?.id || fixture.home_id})`,
        )
        console.log(`  Home logo: ${fixture.home?.logo || 'отсутствует'}`)
        console.log(
          `  Away: ${fixture.away?.name || fixture.away_name} (ID: ${fixture.away?.id || fixture.away_id})`,
        )
        console.log(`  Away logo: ${fixture.away?.logo || 'отсутствует'}`)
      })
    }

    // Проверяем live matches
    console.log('\n2. Проверяем live matches...')
    const liveUrl = `/matches/live.json?size=5`
    const liveResponse = await makeApiRequest(liveUrl)

    if (liveResponse.success && liveResponse.data?.matches) {
      const matches = liveResponse.data.matches.slice(0, 3)
      console.log(`Получено live matches: ${matches.length}`)

      matches.forEach((match, index) => {
        console.log(`\nLive Match ${index + 1}:`)
        console.log(`  ID: ${match.id}`)
        console.log(`  Home: ${match.home?.name} (ID: ${match.home?.id})`)
        console.log(`  Home logo: ${match.home?.logo || 'отсутствует'}`)
        console.log(`  Away: ${match.away?.name} (ID: ${match.away?.id})`)
        console.log(`  Away logo: ${match.away?.logo || 'отсутствует'}`)
      })
    }

    // Проверяем history matches
    console.log('\n3. Проверяем history matches...')
    const historyUrl = `/matches/history.json?date=2024-12-20&size=5`
    const historyResponse = await makeApiRequest(historyUrl)

    if (historyResponse.success && historyResponse.data?.matches) {
      const matches = historyResponse.data.matches.slice(0, 3)
      console.log(`Получено history matches: ${matches.length}`)

      matches.forEach((match, index) => {
        console.log(`\nHistory Match ${index + 1}:`)
        console.log(`  ID: ${match.id}`)
        console.log(`  Home: ${match.home?.name} (ID: ${match.home?.id})`)
        console.log(`  Home logo: ${match.home?.logo || 'отсутствует'}`)
        console.log(`  Away: ${match.away?.name} (ID: ${match.away?.id})`)
        console.log(`  Away logo: ${match.away?.logo || 'отсутствует'}`)
      })
    }
  } catch (error) {
    console.error(`Ошибка: ${error.message}`)
  }
}

// Запуск
main()
