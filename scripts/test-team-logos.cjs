#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки загрузки логотипов команд
 * Загружает только первую страницу для тестирования
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// Конфигурация
const CONFIG = {
  API_KEY: 'JFSoWhkq1FIky8SS',
  API_SECRET: 'qbjc7aeuFAJo1E5KjX8fetGg9oAIxtBY',
  BASE_URL: 'https://livescore-api.com/api-client',
  LOGOS_DIR: path.join(__dirname, '..', 'public', 'team-logos-test'),
  PAGE_SIZE: 10, // Только 10 команд для теста
}

// Создание папки
function ensureDirectory() {
  if (!fs.existsSync(CONFIG.LOGOS_DIR)) {
    fs.mkdirSync(CONFIG.LOGOS_DIR, { recursive: true })
    console.log(`Создана папка: ${CONFIG.LOGOS_DIR}`)
  }
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
  console.log('=== Тестируем загрузку команд ===')
  
  ensureDirectory()
  
  try {
    const url = `/teams/list.json?page=1&size=${CONFIG.PAGE_SIZE}`
    const response = await makeApiRequest(url)
    
    console.log('Ответ API:')
    console.log(JSON.stringify(response, null, 2))
    
    if (response.success && response.data) {
      const teams = response.data.teams || []
      console.log(`\nПолучено команд: ${teams.length}`)
      console.log(`Всего команд в базе: ${response.data.total}`)
      console.log(`Всего страниц: ${response.data.pages}`)
      
      teams.forEach((team, index) => {
        console.log(`${index + 1}. ID: ${team.id}, Название: ${team.name}, Логотип: ${team.logo || 'отсутствует'}`)
      })
      
      // Попробуем загрузить первый логотип
      const teamWithLogo = teams.find(team => team.logo)
      if (teamWithLogo) {
        console.log(`\nПробуем загрузить логотип команды ${teamWithLogo.name}: ${teamWithLogo.logo}`)
        // Здесь можно добавить код загрузки файла
      } else {
        console.log('\nНи у одной команды нет логотипа в этой выборке')
      }
    }
    
  } catch (error) {
    console.error(`Ошибка: ${error.message}`)
  }
}

// Запуск
main()