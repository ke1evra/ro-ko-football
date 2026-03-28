#!/usr/bin/env node

/**
 * Скрипт полной настройки продакшн окружения
 *
 * Выполняет:
 * - Проверку готовности к продакшену
 * - Сборку приложения
 * - Запуск PM2 процессов
 * - Финальную проверку
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

function runCommand(command, description) {
  console.log(`🔧 ${description}...`)
  try {
    execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    })
    console.log(`✅ ${description} завершено\n`)
  } catch (error) {
    console.error(`❌ Ошибка при ${description.toLowerCase()}:`, error.message)
    process.exit(1)
  }
}

function checkFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ${description} не найден: ${filePath}`)
    process.exit(1)
  }
  console.log(`✅ ${description} найден`)
}

console.log('🚀 Настройка продакшн окружения для Football Platform\n')

// Шаг 1: Проверка готовности
console.log('📋 Шаг 1: Проверка готовности к продакшену')
runCommand('node scripts/production-check.js', 'Проверка конфигурации')

// Шаг 2: Проверка наличия необходимых файлов
console.log('📁 Шаг 2: Проверка файлов')
checkFile(path.join(projectRoot, '.env'), 'Файл .env')
checkFile(path.join(projectRoot, 'ecosystem.config.cjs'), 'Конфигурация PM2')
checkFile(path.join(projectRoot, 'package.json'), 'package.json')
console.log('✅ Все файлы найдены\n')

// Шаг 2.5: Корректировка .env файла
console.log('🔧 Шаг 2.5: Корректировка .env файла')
try {
  const envPath = path.join(projectRoot, '.env')
  let envContent = fs.readFileSync(envPath, 'utf8')

  // Загружаем текущие переменные
  const envVars = dotenv.parse(envContent)

  // Удаляем PORT, если есть (чтобы PM2 задал 4317)
  if (envVars.PORT) {
    console.log('⚠️ Удаляю PORT из .env (PM2 задаст 4317)')
    delete envVars.PORT
  }

  // Задаем NODE_ENV=production
  envVars.NODE_ENV = 'production'
  console.log('✅ NODE_ENV=production задан')

  // Задаем APP_URL для продакшена, если не задан
  if (!envVars.APP_URL || envVars.APP_URL.includes('localhost')) {
    envVars.APP_URL = 'https://rocoscore.ru'
    console.log('✅ APP_URL=https://rocoscore.ru задан')
  }

  // Задаем NEXT_PUBLIC_SITE_URL
  envVars.NEXT_PUBLIC_SITE_URL = 'https://rocoscore.ru'
  console.log('✅ NEXT_PUBLIC_SITE_URL=https://rocoscore.ru задан')

  // Задаем PROD_DATABASE_URI, если не задана
  if (!envVars.PROD_DATABASE_URI) {
    // Предполагаем, что прод база на том же сервере, но с другим именем или портом
    // Пользователь должен скорректировать вручную
    envVars.PROD_DATABASE_URI = 'mongodb://localhost:27017/payload-prod'
    console.log(
      '✅ PROD_DATABASE_URI=mongodb://localhost:27017/payload-prod задан (скорректируйте при необходимости)',
    )
  }

  // Задаем прод-специфичные переменные, если не заданы
  if (!envVars.PROD_PAYLOAD_SECRET) {
    envVars.PROD_PAYLOAD_SECRET = envVars.PAYLOAD_SECRET || 'your-prod-secret-key-here'
    console.log('✅ PROD_PAYLOAD_SECRET задан')
  }

  if (!envVars.PROD_RESEND_API_KEY) {
    envVars.PROD_RESEND_API_KEY = envVars.RESEND_API_KEY || 're_xxxxxxxx'
    console.log('✅ PROD_RESEND_API_KEY задан')
  }

  if (!envVars.PROD_EMAIL_FROM) {
    envVars.PROD_EMAIL_FROM = envVars.EMAIL_FROM || 'noreply@rocoscore.ru'
    console.log('✅ PROD_EMAIL_FROM=noreply@rocoscore.ru задан')
  }

  if (!envVars.PROD_LIVESCORE_KEY) {
    envVars.PROD_LIVESCORE_KEY = envVars.LIVESCORE_KEY || 'JFSoWhkq1FIky8SS'
    console.log('✅ PROD_LIVESCORE_KEY задан')
  }

  if (!envVars.PROD_LIVESCORE_SECRET) {
    envVars.PROD_LIVESCORE_SECRET = envVars.LIVESCORE_SECRET || 'qbjc7aeuFAJo1E5KjX8fetGg9oAIxtBY'
    console.log('✅ PROD_LIVESCORE_SECRET задан')
  }

  if (!envVars.PROD_LIVESCORE_API_BASE) {
    envVars.PROD_LIVESCORE_API_BASE =
      envVars.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'
    console.log('✅ PROD_LIVESCORE_API_BASE задан')
  }

  // Пересобираем содержимое
  envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  fs.writeFileSync(envPath, envContent)
  console.log('✅ .env файл скорректирован\n')
} catch (error) {
  console.error('❌ Ошибка при корректировке .env:', error.message)
  process.exit(1)
}

// Шаг 3: Установка PM2 (если не установлен)
console.log('📦 Шаг 3: Проверка и установка PM2')
try {
  execSync('pm2 --version', { stdio: 'pipe' })
  console.log('✅ PM2 уже установлен')
} catch (error) {
  console.log('⚠️ PM2 не установлен, устанавливаю...')
  runCommand('npm install -g pm2', 'Установка PM2')
}
console.log()

// Шаг 5: Установка зависимостей (на всякий случай)
console.log('📦 Шаг 5: Установка зависимостей')
runCommand('pnpm install --frozen-lockfile', 'Установка зависимостей')

// Шаг 6: Генерация типов и API клиентов
console.log('🔨 Шаг 6: Генерация типов и API клиентов')
runCommand('pnpm generate:types', 'Генерация типов Payload')
runCommand('pnpm generate:api', 'Генерация API клиентов')

// Шаг 7: Сборка приложения
console.log('🏗️ Шаг 7: Сборка приложения')
runCommand('pnpm build', 'Сборка Next.js приложения')

// Шаг 7.5: Проверка файлов сборки
console.log('📁 Шаг 7.5: Проверка файлов сборки')
checkFile(path.join(projectRoot, '.next/standalone/server.js'), 'Standalone сервер Next.js')
checkFile(path.join(projectRoot, '.next/static'), 'Директория статических файлов')
console.log('✅ Файлы сборки найдены\n')

// Шаг 7.6: Копирование статических файлов для standalone
console.log('📋 Шаг 7.6: Копирование статических файлов для standalone')
try {
  const standaloneStaticDir = path.join(projectRoot, '.next/standalone/.next/static')
  const sourceStaticDir = path.join(projectRoot, '.next/static')

  // Удаляем старую копию
  if (fs.existsSync(standaloneStaticDir)) {
    fs.rmSync(standaloneStaticDir, { recursive: true, force: true })
  }

  // Создаем директорию
  fs.mkdirSync(standaloneStaticDir, { recursive: true })

  // Копируем статические файлы
  function copyDir(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true })
        copyDir(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }

  copyDir(sourceStaticDir, standaloneStaticDir)
  console.log('✅ Статические файлы скопированы в .next/standalone/.next/static')

  // Копируем public
  const standalonePublicDir = path.join(projectRoot, '.next/standalone/public')
  const sourcePublicDir = path.join(projectRoot, 'public')

  if (fs.existsSync(standalonePublicDir)) {
    fs.rmSync(standalonePublicDir, { recursive: true, force: true })
  }

  if (fs.existsSync(sourcePublicDir)) {
    fs.mkdirSync(standalonePublicDir, { recursive: true })
    copyDir(sourcePublicDir, standalonePublicDir)
    console.log('✅ Public файлы скопированы в .next/standalone/public')
  }
} catch (error) {
  console.error('❌ Ошибка при копировании файлов:', error.message)
  process.exit(1)
}
console.log()

// Шаг 8: Создание директорий для логов
console.log('📂 Шаг 8: Подготовка директорий')
const logsDir = path.join(projectRoot, 'logs')
const workersDir = path.join(projectRoot, 'workers')

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
  console.log('✅ Директория logs создана')
} else {
  console.log('✅ Директория logs существует')
}

if (!fs.existsSync(workersDir)) {
  fs.mkdirSync(workersDir, { recursive: true })
  console.log('✅ Директория workers создана')
} else {
  console.log('✅ Директория workers существует')
}
console.log()

// Шаг 9: Остановка существующих процессов PM2 (если есть)
console.log('🛑 Шаг 9: Очистка существующих процессов PM2')
try {
  execSync('pm2 delete all', { cwd: projectRoot, stdio: 'pipe' })
  console.log('✅ Существующие процессы PM2 остановлены')
} catch (error) {
  console.log('ℹ️ Нет активных процессов PM2 для остановки')
}
console.log()

// Шаг 10: Запуск PM2
console.log('▶️ Шаг 10: Запуск PM2 процессов')
runCommand('pm2 start ecosystem.config.cjs', 'Запуск PM2 процессов')

// Шаг 11: Сохранение конфигурации PM2 для автозапуска
console.log('💾 Шаг 11: Сохранение конфигурации PM2')
runCommand('pm2 save', 'Сохранение конфигурации PM2')

// Шаг 12: Финальная проверка
console.log('🔍 Шаг 12: Финальная проверка')
runCommand('pm2 status', 'Проверка статуса PM2 процессов')

console.log('🎉 Продакшн окружение успешно настроено!')
console.log('\n📊 Информация о запуске:')
console.log('- Приложение запущено на порту 4317')
console.log('- Рабочая директория: .next/standalone')
console.log('- Логи доступны в директории ./logs/')
console.log('- Мониторинг: pm2 monit')
console.log('- Просмотр логов: pm2 logs')
console.log(
  '\n⚠️ Не забудьте настроить nginx или другой reverse proxy для проксирования запросов на localhost:4317',
)
console.log('Пример nginx конфигурации см. в документации проекта')
