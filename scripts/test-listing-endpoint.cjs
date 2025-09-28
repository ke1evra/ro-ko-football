#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки endpoint /teams/listing.json
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// Конфигурация
const CONFIG = {
  API_KEY: 'JFSoWhkq1FIky8SS',
  API_SECRET: 'qbjc7aeuFAJo1E5KjX8fetGg9oAIxtBY',
  BASE_URL: 'https://livescore-api.com/api-client',
  PAGE_SIZE: 10,
}

// HTTP запрос к API
function makeApiRequest(url) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${CONFIG.BASE_URL}${url}&key=${CONFIG.API_KEY}&secret=${CONFIG.API_SECRET}`
    console.log(`Запрос к API: ${fullUrl}`)
    
    https.get(fullUrl, (res) => {
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
    }).on('error', (err) => {
      reject(err)
    })
  })
}

// Основная функция
async function main() {
  console.log('=== Тестируем endpoint /teams/listing.json ===')
  
  try {
    const url = `/teams/listing.json?page=1&size=${CONFIG.PAGE_SIZE}`
    const response = await makeApiRequest(url)
    
    console.log('Структура ответа:')
    console.log(`Success: ${response.success}`)
    
    if (response.success && response.data) {
      const teams = response.data.teams || []
      console.log(`\nПолучено команд: ${teams.length}`)
      
      if (response.data.total) {
        console.log(`Всего команд в базе: ${response.data.total}`)
      }
      if (response.data.pages) {
        console.log(`Всего страниц: ${response.data.pages}`)
      }
      
      console.log('\nПервые команды с логотипами:')
      teams.forEach((item, index) => {
        const team = item.team || item
        console.log(`${index + 1}. ID: ${team.id}, Название: ${team.name}`)
        console.log(`   Логотип: ${team.logo || 'отсутствует'}`)
        if (team.logo) {
          console.log(`   ✅ Логотип найден!`)
        }
        console.log('')
      })
      
      // Подсчитаем команды с логотипами
      const teamsWithLogos = teams.filter(item => {
        const team = item.team || item
        return team.logo
      })
      
      console.log(`\nСтатистика:`)
      console.log(`Команд с логотипами: ${teamsWithLogos.length} из ${teams.length}`)
      console.log(`Процент команд с логотипами: ${Math.round((teamsWithLogos.length / teams.length) * 100)}%`)
      
      if (teamsWithLogos.length > 0) {
        console.log('\n🎉 Отлично! Логотипы найдены, можно создавать скрипт загрузки!')
      }
    }
    
  } catch (error) {
    console.error(`Ошибка: ${error.message}`)
  }
}

// Запуск
main()