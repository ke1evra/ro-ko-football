#!/usr/bin/env node

/**
 * Скрипт настройки переменных окружения
 * 
 * Создаёт .env файл из .env.example с интерактивными подсказками
 * или просто копирует шаблон, если запущен без флагов.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import crypto from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const envPath = path.join(projectRoot, '.env')
const envExamplePath = path.join(projectRoot, '.env.example')

// Проверяем аргументы командной строки
const args = process.argv.slice(2)
const isInteractive = args.includes('--interactive') || args.includes('-i')
const isForce = args.includes('--force') || args.includes('-f')

/**
 * Генерация случайного секрета
 */
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Простое копирование файла
 */
function copyEnvFile() {
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ Файл .env.example не найден!')
    process.exit(1)
  }

  if (fs.existsSync(envPath) && !isForce) {
    console.log('⚠️  Файл .env уже существует.')
    console.log('Используйте --force для перезаписи или --interactive для настройки.')
    process.exit(0)
  }

  try {
    fs.copyFileSync(envExamplePath, envPath)
    console.log('✅ Файл .env создан из .env.example')
    console.log('📝 Отредактируйте .env файл перед запуском приложения:')
    console.log('   - Установите правильный DATABASE_URI')
    console.log('   - Сгенерируйте новый PAYLOAD_SECRET')
    console.log('   - Настройте API ключи при необходимости')
  } catch (error) {
    console.error('❌ Ошибка при создании .env файла:', error.message)
    process.exit(1)
  }
}

/**
 * Интерактивная настройка
 */
async function interactiveSetup() {
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ Файл .env.example не найден!')
    process.exit(1)
  }

  if (fs.existsSync(envPath) && !isForce) {
    console.log('⚠️  Файл .env уже существует.')
    console.log('Используйте --force для перезаписи.')
    process.exit(0)
  }

  console.log('🔧 Интерактивная настройка переменных окружения\n')

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve))

  try {
    // Читаем шаблон
    const template = fs.readFileSync(envExamplePath, 'utf8')
    let envContent = template

    console.log('📋 Настройка основных параметров:\n')

    // DATABASE_URI
    const dbUri = await question(
      'MongoDB URI (по умолчанию: mongodb://localhost:27017/payload): '
    )
    if (dbUri.trim()) {
      envContent = envContent.replace(
        'DATABASE_URI=mongodb://localhost:27017/payload',
        `DATABASE_URI=${dbUri.trim()}`
      )
    }

    // PAYLOAD_SECRET
    const useGeneratedSecret = await question(
      'Сгенерировать новый PAYLOAD_SECRET? (y/N): '
    )
    if (useGeneratedSecret.toLowerCase() === 'y' || useGeneratedSecret.toLowerCase() === 'yes') {
      const newSecret = generateSecret()
      envContent = envContent.replace(
        'PAYLOAD_SECRET=your-secret-key-here',
        `PAYLOAD_SECRET=${newSecret}`
      )
      console.log('✅ Сгенерирован новый PAYLOAD_SECRET')
    }

    // NODE_ENV
    const nodeEnv = await question(
      'Окружение (development/production) [development]: '
    )
    if (nodeEnv.trim()) {
      envContent = envContent.replace(
        'NODE_ENV=development',
        `NODE_ENV=${nodeEnv.trim()}`
      )
    }

    // APP_URL
    const appUrl = await question(
      'URL приложения [http://localhost:3001]: '
    )
    if (appUrl.trim()) {
      envContent = envContent.replace(
        'APP_URL=http://localhost:3001',
        `APP_URL=${appUrl.trim()}`
      )
    }

    console.log('\n📧 Настройка email (опционально):')

    // EMAIL_FROM
    const emailFrom = await question(
      'Email отправителя [noreply@yourdomain.com]: '
    )
    if (emailFrom.trim()) {
      envContent = envContent.replace(
        'EMAIL_FROM=noreply@yourdomain.com',
        `EMAIL_FROM=${emailFrom.trim()}`
      )
    }

    // RESEND_API_KEY
    const resendKey = await question(
      'Resend API ключ (оставьте пустым для пропуска): '
    )
    if (resendKey.trim()) {
      envContent = envContent.replace(
        'RESEND_API_KEY=re_xxxxxxxx',
        `RESEND_API_KEY=${resendKey.trim()}`
      )
    }

    console.log('\n⚽ Настройка LiveScore API (опционально):')

    // LIVESCORE_KEY
    const livescoreKey = await question(
      'LiveScore API ключ (оставьте пустым для пропуска): '
    )
    if (livescoreKey.trim()) {
      envContent = envContent.replace(
        'LIVESCORE_KEY=your-livescore-api-key-here',
        `LIVESCORE_KEY=${livescoreKey.trim()}`
      )
    }

    // LIVESCORE_SECRET
    const livescoreSecret = await question(
      'LiveScore API секрет (оставьте пустым для пропуска): '
    )
    if (livescoreSecret.trim()) {
      envContent = envContent.replace(
        'LIVESCORE_SECRET=your-livescore-api-secret-here',
        `LIVESCORE_SECRET=${livescoreSecret.trim()}`
      )
    }

    // Сохраняем файл
    fs.writeFileSync(envPath, envContent)
    
    console.log('\n✅ Файл .env успешно создан и настроен!')
    console.log('🚀 Теперь вы можете запустить приложение командой: pnpm dev')

  } catch (error) {
    console.error('\n❌ Ошибка при настройке:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

/**
 * Показать справку
 */
function showHelp() {
  console.log(`
🔧 Скрипт настройки переменных окружения

Использование:
  node scripts/setup-env.js [опции]

Опции:
  --interactive, -i    Интерактивная настройка с подсказками
  --force, -f          Перезаписать существующий .env файл
  --help, -h           Показать эту справку

Примеры:
  node scripts/setup-env.js                    # Простое копирование .env.example
  node scripts/setup-env.js --interactive      # Интерактивная настройка
  node scripts/setup-env.js -i -f              # Интерактивная настройка с перезаписью

Также доступны команды через package.json:
  pnpm env:setup                               # Простое копирование
  pnpm env:setup:interactive                   # Интерактивная настройка
`)
}

// Основная логика
async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    return
  }

  if (isInteractive) {
    await interactiveSetup()
  } else {
    copyEnvFile()
  }
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error.message)
  process.exit(1)
})