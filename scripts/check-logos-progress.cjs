#!/usr/bin/env node

/**
 * Скрипт для проверки прогресса загрузки логотипов команд
 */

const fs = require('fs')
const path = require('path')

// Конфигурация
const CONFIG = {
  LOGOS_DIR: path.join(__dirname, '..', 'public', 'team-logos'),
  LOG_FILE: path.join(__dirname, '..', 'logs', 'team-logos-download.log'),
  PROGRESS_FILE: path.join(__dirname, '..', 'logs', 'team-logos-progress.json'),
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}ч ${minutes % 60}м ${seconds % 60}с`
  } else if (minutes > 0) {
    return `${minutes}м ${seconds % 60}с`
  } else {
    return `${seconds}с`
  }
}

function main() {
  console.log('📊 Статус загрузки логотипов команд')
  console.log('=====================================')
  console.log('')

  // Проверяем файл прогресса
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
    try {
      const progress = JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8'))
      
      console.log('📈 Прогресс загрузки:')
      console.log(`   Текущая страница: ${progress.currentPage}`)
      console.log(`   Всего страниц: ${progress.totalPages || 'неизвестно'}`)
      
      if (progress.totalPages) {
        const percentage = Math.round((progress.currentPage / progress.totalPages) * 100)
        console.log(`   Прогресс: ${percentage}%`)
      }
      
      console.log('')
      console.log('📊 Статистика команд:')
      console.log(`   Обработано команд: ${progress.totalTeams}`)
      console.log(`   Логотипов загружено: ${progress.downloadedLogos}`)
      console.log(`   Логотипов пропущено: ${progress.skippedLogos}`)
      console.log(`   Ошибок загрузки: ${progress.failedLogos}`)
      
      if (progress.totalTeams > 0) {
        const successRate = Math.round((progress.downloadedLogos / progress.totalTeams) * 100)
        console.log(`   Успешность: ${successRate}%`)
      }
      
    } catch (e) {
      console.log('❌ Ошибка чтения файла прогресса:', e.message)
    }
  } else {
    console.log('📝 Файл прогресса не найден - загрузка еще не начиналась')
  }

  console.log('')

  // Проверяем папку с логотипами
  if (fs.existsSync(CONFIG.LOGOS_DIR)) {
    const files = fs.readdirSync(CONFIG.LOGOS_DIR).filter(file => file.endsWith('.png'))
    
    console.log('📁 Локальные файлы:')
    console.log(`   Загружено файлов: ${files.length}`)
    
    if (files.length > 0) {
      // Подсчитываем общий размер
      let totalSize = 0
      files.forEach(file => {
        const filePath = path.join(CONFIG.LOGOS_DIR, file)
        const stats = fs.statSync(filePath)
        totalSize += stats.size
      })
      
      console.log(`   Общий размер: ${formatBytes(totalSize)}`)
      console.log(`   Средний размер файла: ${formatBytes(totalSize / files.length)}`)
      
      // Показываем последние загруженные файлы
      const sortedFiles = files
        .map(file => {
          const filePath = path.join(CONFIG.LOGOS_DIR, file)
          const stats = fs.statSync(filePath)
          return { file, mtime: stats.mtime, size: stats.size }
        })
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 5)
      
      console.log('')
      console.log('🕒 Последние загруженные файлы:')
      sortedFiles.forEach(({ file, mtime, size }) => {
        const teamId = file.replace('.png', '')
        const timeAgo = Date.now() - mtime.getTime()
        console.log(`   ${teamId}.png (${formatBytes(size)}) - ${formatDuration(timeAgo)} назад`)
      })
    }
  } else {
    console.log('📁 Папка с логотипами не найдена')
  }

  console.log('')

  // Проверяем лог файл
  if (fs.existsSync(CONFIG.LOG_FILE)) {
    const logContent = fs.readFileSync(CONFIG.LOG_FILE, 'utf8')
    const lines = logContent.trim().split('\n')
    
    console.log('📋 Последние записи лога:')
    const lastLines = lines.slice(-5)
    lastLines.forEach(line => {
      // Убираем timestamp для краткости
      const message = line.replace(/^\[.*?\] /, '')
      console.log(`   ${message}`)
    })
    
    console.log('')
    console.log(`📄 Всего записей в логе: ${lines.length}`)
  } else {
    console.log('📋 Лог файл не найден')
  }

  console.log('')
  console.log('🚀 Команды для управления:')
  console.log('   npm run logos:test      - Тестовая загрузка (5 команд)')
  console.log('   npm run logos:download  - Полная загрузка всех логотипов')
  console.log('   npm run logos:status    - Показать этот статус')
  console.log('')
}

// Запуск
main()