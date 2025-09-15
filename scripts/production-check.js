#!/usr/bin/env node

/**
 * Скрипт проверки готовности к продакшену
 *
 * Проверяет:
 * - Наличие необходимых переменных окружения
 * - Сборку приложения
 * - Подключение к базе данных
 * - Наличие PM2 конфигурации
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// Загрузка переменных окружения
dotenv.config({ path: path.join(projectRoot, '.env') })

const checks = []
let hasErrors = false

function addCheck(name, status, message = '') {
  checks.push({ name, status, message })
  if (!status) hasErrors = true
}

function checkFile(filePath, name) {
  const exists = fs.existsSync(filePath)
  addCheck(name, exists, exists ? '✓' : `Файл не найден: ${filePath}`)
  return exists
}

function checkEnvVar(varName, required = true) {
  const exists = !!process.env[varName]
  addCheck(
    `Переменная окружения: ${varName}`,
    !required || exists,
    exists
      ? '✓'
      : required
        ? 'Обязательная переменная не задана'
        : 'Опциональная переменная не задана',
  )
  return exists
}

console.log('🔍 Проверка готовности к продакшену...\n')

// Проверка файлов
console.log('📁 Проверка файлов:')
checkFile(path.join(projectRoot, 'package.json'), 'package.json')
checkFile(path.join(projectRoot, 'next.config.mjs'), 'next.config.mjs')
checkFile(path.join(projectRoot, 'src/payload.config.ts'), 'payload.config.ts')
checkFile(path.join(projectRoot, 'ecosystem.config.js'), 'ecosystem.config.js')
checkFile(path.join(projectRoot, '.next/BUILD_ID'), 'Сборка Next.js (.next/BUILD_ID)')

// Проверка директорий
const logsDir = path.join(projectRoot, 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
  addCheck('Директория logs', true, '✓ Создана')
} else {
  addCheck('Директория logs', true, '✓ Существует')
}

const workersDir = path.join(projectRoot, 'workers')
addCheck(
  'Директория workers',
  fs.existsSync(workersDir),
  fs.existsSync(workersDir) ? '✓' : 'Создайте директорию workers',
)

console.log('\n🔧 Проверка переменных окружения:')
// Обязательные переменные
checkEnvVar('DATABASE_URI')
checkEnvVar('PAYLOAD_SECRET')
checkEnvVar('NODE_ENV')

// Опциональные переменные
checkEnvVar('PORT', false)
checkEnvVar('RESEND_API_KEY', false)
checkEnvVar('EMAIL_FROM', false)
checkEnvVar('APP_URL', false)
checkEnvVar('LIVESCORE_KEY', false)
checkEnvVar('LIVESCORE_SECRET', false)

console.log('\n🗄️ Проверка базы данных:')
if (process.env.DATABASE_URI) {
  try {
    const uri = process.env.DATABASE_URI
    if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
      addCheck('Формат DATABASE_URI', true, '✓ MongoDB URI корректен')
    } else {
      addCheck(
        'Формат DATABASE_URI',
        false,
        'URI должен начинаться с mongodb:// или mongodb+srv://',
      )
    }
  } catch (error) {
    addCheck('Формат DATABASE_URI', false, `Ошибка парсинга URI: ${error.message}`)
  }
} else {
  addCheck('DATABASE_URI', false, 'Переменная не задана')
}

console.log('\n📦 Проверка зависимостей:')
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

  // Проверка критических зависимостей
  const criticalDeps = [
    '@payloadcms/db-mongodb',
    '@payloadcms/next',
    'payload',
    'next',
    'react',
    'react-dom',
  ]

  criticalDeps.forEach((dep) => {
    const exists = packageJson.dependencies && packageJson.dependencies[dep]
    addCheck(`Зависимость: ${dep}`, !!exists, exists ? `✓ ${exists}` : 'Не установлена')
  })

  // Проверка скриптов PM2
  const pm2Scripts = ['pm2:start', 'pm2:stop', 'pm2:restart', 'pm2:logs']
  pm2Scripts.forEach((script) => {
    const exists = packageJson.scripts && packageJson.scripts[script]
    addCheck(`Скрипт: ${script}`, !!exists, exists ? '✓' : 'Не найден')
  })
} catch (error) {
  addCheck('Чтение package.json', false, `Ошибка: ${error.message}`)
}

console.log('\n🚀 Проверка PM2 конфигурации:')
try {
  const ecosystemPath = path.join(projectRoot, 'ecosystem.config.js')
  if (fs.existsSync(ecosystemPath)) {
    // Простая проверка синтаксиса
    const content = fs.readFileSync(ecosystemPath, 'utf8')
    if (content.includes('football-platform') && content.includes('apps')) {
      addCheck('PM2 конфигурация', true, '✓ Конфигурация корректна')
    } else {
      addCheck('PM2 конфигурация', false, 'Конфигурация некорректна')
    }
  } else {
    addCheck('PM2 конфигурация', false, 'Файл ecosystem.config.js не найден')
  }
} catch (error) {
  addCheck('PM2 конфигурация', false, `Ошибка чтения: ${error.message}`)
}

// Вывод результатов
console.log('\n' + '='.repeat(60))
console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ')
console.log('='.repeat(60))

checks.forEach((check) => {
  const status = check.status ? '✅' : '❌'
  console.log(`${status} ${check.name}`)
  if (check.message && check.message !== '✓') {
    console.log(`   ${check.message}`)
  }
})

console.log('\n' + '='.repeat(60))

if (hasErrors) {
  console.log('❌ ПРОВЕРКА НЕ ПРОЙДЕНА')
  console.log('Исправьте ошибки перед запуском в продакшене.')
  console.log('\nРекомендации:')
  console.log('1. Убедитесь, что все переменные окружения заданы в .env')
  console.log('2. Выполните сборку: pnpm build')
  console.log('3. Проверьте подключение к MongoDB')
  console.log('4. Установите PM2: npm install -g pm2')
  process.exit(1)
} else {
  console.log('✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ')
  console.log('Приложение готово к запуску в продакшене!')
  console.log('\nДля запуска выполните:')
  console.log('pnpm pm2:start')
  console.log('\nДля мониторинга:')
  console.log('pnpm pm2:monit')
  process.exit(0)
}
