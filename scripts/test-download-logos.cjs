#!/usr/bin/env node

/**
 * Тестовый скрипт для загрузки нескольких логотипов
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
  PAGE_SIZE: 5, // Только 5 команд для теста
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

// Загрузка файла по URL
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath)
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        fs.unlinkSync(filePath)
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        resolve()
      })
      
      file.on('error', (err) => {
        fs.unlinkSync(filePath)
        reject(err)
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

// Получение расширения файла из URL
function getFileExtension(url) {
  const match = url.match(/\.(png|jpg|jpeg|gif|svg)(\?|$)/i)
  return match ? match[1].toLowerCase() : 'png'
}

// Основная функция
async function main() {
  console.log('=== Тестируем загрузку логотипов ===')
  
  ensureDirectory()
  
  try {
    const url = `/teams/listing.json?page=1&size=${CONFIG.PAGE_SIZE}`
    const response = await makeApiRequest(url)
    
    if (response.success && response.data?.teams) {
      const teamsData = response.data.teams
      const teams = teamsData.map(item => item.team || item)
      
      console.log(`Получено команд: ${teams.length}`)
      
      for (const team of teams) {
        if (!team.logo) {
          console.log(`Команда ${team.id} (${team.name}): логотип отсутствует`)
          continue
        }
        
        const extension = getFileExtension(team.logo)
        const fileName = `${team.id}.${extension}`
        const filePath = path.join(CONFIG.LOGOS_DIR, fileName)
        
        console.log(`Загружаем логотип команды ${team.id} (${team.name})...`)
        console.log(`URL: ${team.logo}`)
        console.log(`Файл: ${fileName}`)
        
        try {
          await downloadFile(team.logo, filePath)
          
          const stats = fs.statSync(filePath)
          console.log(`✅ Успешно загружен (${stats.size} байт)`)
          
        } catch (error) {
          console.log(`❌ Ошибка загрузки: ${error.message}`)
        }
        
        console.log('')
        
        // Небольшая задержка между загрузками
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      console.log('=== Тест завершен ===')
      
      // Показываем содержимое папки
      const files = fs.readdirSync(CONFIG.LOGOS_DIR)
      console.log(`Загружено файлов: ${files.length}`)
      files.forEach(file => {
        const filePath = path.join(CONFIG.LOGOS_DIR, file)
        const stats = fs.statSync(filePath)
        console.log(`  ${file} (${stats.size} байт)`)
      })
    }
    
  } catch (error) {
    console.error(`Ошибка: ${error.message}`)
  }
}

// Запуск
main()