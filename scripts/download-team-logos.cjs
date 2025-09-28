#!/usr/bin/env node

/**
 * Скрипт для загрузки всех логотипов команд из LiveScore API
 * 
 * Использование:
 * node scripts/download-team-logos.js
 * 
 * Особенности:
 * - Постраничная загрузка команд
 * - Скачивание логотипов с сохранением по ID команды
 * - Логгирование прогресса
 * - Возможность продолжить с места остановки
 * - Автоматическое создание папок
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// Конфигурация
const CONFIG = {
  API_KEY: 'JFSoWhkq1FIky8SS',
  API_SECRET: 'qbjc7aeuFAJo1E5KjX8fetGg9oAIxtBY',
  BASE_URL: 'https://livescore-api.com/api-client',
  LOGOS_DIR: path.join(__dirname, '..', 'public', 'team-logos'),
  LOG_FILE: path.join(__dirname, '..', 'logs', 'team-logos-download.log'),
  PROGRESS_FILE: path.join(__dirname, '..', 'logs', 'team-logos-progress.json'),
  PAGE_SIZE: 100,
  DELAY_BETWEEN_REQUESTS: 1000, // 1 секунда между запросами
  DELAY_BETWEEN_DOWNLOADS: 500, // 0.5 секунды между загрузками логотипов
}

// Создание необходимых папок
function ensureDirectories() {
  const dirs = [
    CONFIG.LOGOS_DIR,
    path.dirname(CONFIG.LOG_FILE),
    path.dirname(CONFIG.PROGRESS_FILE)
  ]
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      log(`Создана папка: ${dir}`)
    }
  })
}

// Логгирование
function log(message) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}`
  
  console.log(logMessage)
  
  // Записываем в файл
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n')
}

// Сохранение прогресса
function saveProgress(progress) {
  fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

// Загрузка прогресса
function loadProgress() {
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
    try {
      const progress = JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8'))
      
      // Восстанавливаем Set из массива
      if (Array.isArray(progress.processedTeams)) {
        progress.processedTeams = new Set(progress.processedTeams)
      } else {
        progress.processedTeams = new Set()
      }
      
      return progress
    } catch (e) {
      log(`Ошибка загрузки прогресса: ${e.message}`)
    }
  }
  
  return {
    currentPage: 1,
    totalPages: null,
    totalTeams: 0,
    downloadedLogos: 0,
    skippedLogos: 0,
    failedLogos: 0,
    processedTeams: new Set(),
    startTime: Date.now()
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
    const protocol = url.startsWith('https:') ? https : http
    
    const file = fs.createWriteStream(filePath)
    
    protocol.get(url, (response) => {
      // Проверяем статус ответа
      if (response.statusCode !== 200) {
        fs.unlinkSync(filePath) // Удаляем пустой файл
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        resolve()
      })
      
      file.on('error', (err) => {
        fs.unlinkSync(filePath) // Удаляем поврежденный файл
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

// Загрузка команд с одной страницы
async function fetchTeamsPage(page) {
  const url = `/teams/listing.json?page=${page}&size=${CONFIG.PAGE_SIZE}`
  
  try {
    log(`Загружаем страницу ${page}...`)
    const response = await makeApiRequest(url)
    
    if (!response.success) {
      throw new Error(`API вернул ошибку: ${response.error || 'Неизвестная ошибка'}`)
    }
    
    const teamsData = response.data?.teams || []
    const pagination = {
      total_pages: Math.ceil(response.data?.total / CONFIG.PAGE_SIZE) || null,
      total_items: response.data?.total || 0
    }
    
    // Извлекаем команды из структуры {team: {...}, country: {...}}
    const teams = teamsData.map(item => item.team || item)
    
    log(`Страница ${page}: получено ${teams.length} команд`)
    
    return {
      teams,
      pagination
    }
  } catch (error) {
    log(`Ошибка загрузки страницы ${page}: ${error.message}`)
    throw error
  }
}

// Загрузка логотипа команды
async function downloadTeamLogo(team, progress) {
  if (!team.logo) {
    log(`Команда ${team.id} (${team.name}): логотип отсутствует`)
    progress.skippedLogos++
    return
  }
  
  const extension = getFileExtension(team.logo)
  const fileName = `${team.id}.${extension}`
  const filePath = path.join(CONFIG.LOGOS_DIR, fileName)
  
  // Проверяем, не загружен ли уже логотип
  if (fs.existsSync(filePath)) {
    log(`Команда ${team.id} (${team.name}): логотип уже существует`)
    progress.skippedLogos++
    return
  }
  
  try {
    log(`Загружаем логотип команды ${team.id} (${team.name}): ${team.logo}`)
    await downloadFile(team.logo, filePath)
    
    // Проверяем размер файла
    const stats = fs.statSync(filePath)
    if (stats.size === 0) {
      fs.unlinkSync(filePath)
      throw new Error('Загружен пустой файл')
    }
    
    log(`Команда ${team.id} (${team.name}): логотип загружен (${stats.size} байт)`)
    progress.downloadedLogos++
    
  } catch (error) {
    log(`Команда ${team.id} (${team.name}): ошибка загрузки лого��ипа - ${error.message}`)
    progress.failedLogos++
  }
}

// Задержка
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Основная функция
async function main() {
  log('=== Начинаем загрузку логотипов команд ===')
  
  // Создаем необходимые папки
  ensureDirectories()
  
  // Загружаем прогресс
  const progress = loadProgress()
  log(`Загружен прогресс: страница ${progress.currentPage}, загружено ${progress.downloadedLogos} логотипов`)
  
  try {
    let currentPage = progress.currentPage
    let totalPages = progress.totalPages
    
    while (true) {
      // Загружаем страницу с командами
      const { teams, pagination } = await fetchTeamsPage(currentPage)
      
      // Обновляем информацию о пагинации
      if (!totalPages && pagination.total_pages) {
        totalPages = pagination.total_pages
        progress.totalPages = totalPages
        log(`Всего страниц: ${totalPages}`)
      }
      
      if (teams.length === 0) {
        log('Больше команд нет, завершаем работу')
        break
      }
      
      // Обрабатываем команды на текущей странице
      for (const team of teams) {
        if (progress.processedTeams.has && progress.processedTeams.has(team.id)) {
          continue // Пропускаем уже обработанные команды
        }
        
        await downloadTeamLogo(team, progress)
        progress.processedTeams.add && progress.processedTeams.add(team.id)
        progress.totalTeams++
        
        // Сохраняем прогресс после каждой команды
        saveProgress({
          ...progress,
          processedTeams: Array.from(progress.processedTeams || [])
        })
        
        // Задержка между загрузками
        await delay(CONFIG.DELAY_BETWEEN_DOWNLOADS)
      }
      
      // Переходим к следующей странице
      currentPage++
      progress.currentPage = currentPage
      
      // Сохраняем прогресс после каждой страницы
      saveProgress({
        ...progress,
        processedTeams: Array.from(progress.processedTeams || [])
      })
      
      log(`Страница ${currentPage - 1} обработана. Всего: команд ${progress.totalTeams}, загружено ${progress.downloadedLogos}, пропущено ${progress.skippedLogos}, ошибок ${progress.failedLogos}`)
      
      // Проверяем, не достигли ли мы последней страницы
      if (totalPages && currentPage > totalPages) {
        log('Достигнута последняя страница, завершаем работу')
        break
      }
      
      // Задержка между запросами к API
      await delay(CONFIG.DELAY_BETWEEN_REQUESTS)
    }
    
    log('=== Загрузка завершена ===')
    log(`Итого обработано команд: ${progress.totalTeams}`)
    log(`Логотипов загружено: ${progress.downloadedLogos}`)
    log(`Логотипов пропущено: ${progress.skippedLogos}`)
    log(`Ошибок загрузки: ${progress.failedLogos}`)
    
  } catch (error) {
    log(`Критическая ошибка: ${error.message}`)
    log('Прогресс сохранен, можно продолжить позже')
    process.exit(1)
  }
}

// Обработка сигналов завершения
process.on('SIGINT', () => {
  log('Получен сигнал прерывания, сохраняем прогресс...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  log('Получен сигнал завершения, сохраняем прогресс...')
  process.exit(0)
})

// Запуск
if (require.main === module) {
  main().catch(error => {
    log(`Необработанная ошибка: ${error.message}`)
    process.exit(1)
  })
}

module.exports = { main }