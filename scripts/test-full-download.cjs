#!/usr/bin/env node

/**
 * Тестовый запуск полного скрипта на 2 страницах
 */

const fs = require('fs')
const path = require('path')

// Временно изменяем конфигурацию для теста
const originalScript = fs.readFileSync(path.join(__dirname, 'download-team-logos.cjs'), 'utf8')

// Создаем тестовую версию с ограничением на 2 страницы
const testScript = originalScript
  .replace('PAGE_SIZE: 100,', 'PAGE_SIZE: 10,') // Меньше команд на страницу
  .replace('DELAY_BETWEEN_REQUESTS: 1000,', 'DELAY_BETWEEN_REQUESTS: 500,') // Быстрее
  .replace('DELAY_BETWEEN_DOWNLOADS: 500,', 'DELAY_BETWEEN_DOWNLOADS: 200,') // Быстрее
  .replace("path.join(__dirname, '..', 'public', 'team-logos')", "path.join(__dirname, '..', 'public', 'team-logos-full-test')")
  .replace("path.join(__dirname, '..', 'logs', 'team-logos-download.log')", "path.join(__dirname, '..', 'logs', 'team-logos-full-test.log')")
  .replace("path.join(__dirname, '..', 'logs', 'team-logos-progress.json')", "path.join(__dirname, '..', 'logs', 'team-logos-full-test-progress.json')")

// Добавляем ограничение на 2 страницы
const limitedScript = testScript.replace(
  'while (true) {',
  `let maxPages = 2; // Ограничение для теста
   let pagesProcessed = 0;
   while (pagesProcessed < maxPages) {`
).replace(
  'currentPage++',
  `currentPage++
   pagesProcessed++`
)

// Сохраняем тестовую версию
fs.writeFileSync(path.join(__dirname, 'test-full-download-limited.cjs'), limitedScript)

console.log('Создана тестовая версия скрипта: test-full-download-limited.cjs')
console.log('Запускаем тест на 2 страницах (20 команд)...')

// Запускаем тестовую версию
require('./test-full-download-limited.cjs')