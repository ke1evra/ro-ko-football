#!/usr/bin/env node

/**
 * Скрипт синхронизации баз данных между локальной и продакшн средой
 *
 * Поддерживает:
 * - Синхронизацию из продакшена в локальную
 * - Синхронизацию из локальной в продакшн
 * - Резервное копирование перед синхронизацией
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// Загружаем переменные окружения
dotenv.config({ path: path.join(projectRoot, '.env') })

const args = process.argv.slice(2)
const command = args[0]

if (!command) {
  showHelp()
  process.exit(1)
}

function showHelp() {
  console.log(`
🔄 Синхронизация баз данных MongoDB

Использование:
  node scripts/db-sync.js <command> [options]

Команды:
  from-prod    Синхронизировать из продакшена в локальную базу
  to-prod      Синхронизировать из локальной базы в продакшн
  backup       Создать резервную копию локальной базы

Опции:
  --dry-run    Показать команды без выполнения
  --force      Не спрашивать подтверждение

Примеры:
  node scripts/db-sync.js from-prod
  node scripts/db-sync.js to-prod --dry-run
  node scripts/db-sync.js backup

Требования:
  - Установленный mongodump/mongorestore
  - Доступ к продакшн базе (через SSH tunnel или прямой доступ)
  - Переменные окружения: DATABASE_URI для локальной, PROD_DATABASE_URI для продакшн
`)
}

function getMongoConnectionString(uri, isProd = false) {
  if (!uri) {
    console.error(`❌ Переменная ${isProd ? 'PROD_DATABASE_URI' : 'DATABASE_URI'} не задана`)
    process.exit(1)
  }

  // Для продакшена может потребоваться SSH tunnel
  // Например: mongodb://localhost:27018/payload (через SSH tunnel на порт 27018)
  return uri
}

function runCommand(cmd, description, dryRun = false) {
  console.log(`🔧 ${description}`)
  console.log(`   ${cmd}`)

  if (dryRun) {
    console.log('   (dry-run: команда не выполнена)\n')
    return
  }

  try {
    execSync(cmd, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env },
    })
    console.log(`✅ ${description} завершено\n`)
  } catch (error) {
    console.error(`❌ Ошибка при ${description.toLowerCase()}:`, error.message)
    process.exit(1)
  }
}

function confirmAction(message) {
  if (args.includes('--force')) return true

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

function backupTarget(uri, name, dryRun = false) {
  console.log(`💾 Создание резервной копии ${name} базы перед синхронизацией\n`)

  // Создаем директорию для бэкапов
  const backupDir = path.join(projectRoot, 'db-backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `backup-${name}-${timestamp}`)

  const dumpCmd = `mongodump --uri="${uri}" --out="${backupPath}"`
  runCommand(dumpCmd, `Создание резервной копии ${name} базы`, dryRun)

  console.log(`📁 Бэкап сохранён в: ${backupPath}`)
  console.log(`✅ Резервная копия ${name} базы создана!\n`)
}

async function syncFromProd(dryRun = false) {
  console.log('📥 Синхронизация из продакшена в локальную базу\n')

  const prodUri = getMongoConnectionString(process.env.PROD_DATABASE_URI, true)
  const localUri = getMongoConnectionString(process.env.DATABASE_URI, false)

  // Бэкап целевой базы (локальной) перед синхронизацией
  backupTarget(localUri, 'local', dryRun)

  // Создаем временную директорию для дампа
  const dumpDir = path.join(projectRoot, 'temp-db-dump')
  if (fs.existsSync(dumpDir)) {
    fs.rmSync(dumpDir, { recursive: true, force: true })
  }
  fs.mkdirSync(dumpDir, { recursive: true })

  try {
    // Экспорт из продакшена
    const dumpCmd = `mongodump --uri="${prodUri}" --out="${dumpDir}"`
    runCommand(dumpCmd, 'Экспорт данных из продакшн базы', dryRun)

    // Импорт в локальную базу
    const restoreCmd = `mongorestore --uri="${localUri}" --drop "${dumpDir}"`
    runCommand(restoreCmd, 'Импорт данных в локальную базу', dryRun)

    console.log('🎉 Синхронизация из продакшена завершена!')
  } finally {
    // Очистка
    if (fs.existsSync(dumpDir)) {
      fs.rmSync(dumpDir, { recursive: true, force: true })
    }
  }
}

async function syncToProd(dryRun = false) {
  console.log('📤 Синхронизация из локальной базы в продакшн\n')

  const prodUri = getMongoConnectionString(process.env.PROD_DATABASE_URI, true)
  const localUri = getMongoConnectionString(process.env.DATABASE_URI, false)

  // Бэкап целевой базы (продакшн) перед синхронизацией
  backupTarget(prodUri, 'prod', dryRun)

  // Создаем временную директорию для дампа
  const dumpDir = path.join(projectRoot, 'temp-db-dump')
  if (fs.existsSync(dumpDir)) {
    fs.rmSync(dumpDir, { recursive: true, force: true })
  }
  fs.mkdirSync(dumpDir, { recursive: true })

  try {
    // Экспорт из локальной базы
    const dumpCmd = `mongodump --uri="${localUri}" --out="${dumpDir}"`
    runCommand(dumpCmd, 'Экспорт данных из локальной базы', dryRun)

    // Импорт в продакшн базу
    const restoreCmd = `mongorestore --uri="${prodUri}" --drop "${dumpDir}"`
    runCommand(restoreCmd, 'Импорт данных в продакшн базу', dryRun)

    console.log('🎉 Синхронизация в продакшн завершена!')
  } finally {
    // Очистка
    if (fs.existsSync(dumpDir)) {
      fs.rmSync(dumpDir, { recursive: true, force: true })
    }
  }
}

function createBackup(dryRun = false) {
  console.log('💾 Создание резервной копии локальной базы\n')

  const localUri = getMongoConnectionString(process.env.DATABASE_URI, false)

  // Создаем директорию для бэкапов
  const backupDir = path.join(projectRoot, 'db-backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `backup-${timestamp}`)

  const dumpCmd = `mongodump --uri="${localUri}" --out="${backupPath}"`
  runCommand(dumpCmd, 'Создание резервной копии', dryRun)

  console.log(`📁 Бэкап сохранён в: ${backupPath}`)
  console.log('🎉 Резервная копия создана!')
}

async function main() {
  const dryRun = args.includes('--dry-run')

  switch (command) {
    case 'from-prod':
      if (
        !(await confirmAction('Это перезапишет локальную базу данными из продакшена. Продолжить?'))
      ) {
        console.log('❌ Операция отменена')
        return
      }
      await syncFromProd(dryRun)
      break

    case 'to-prod':
      if (
        !(await confirmAction('Это перезапишет продакшн базу данными из локальной. Продолжить?'))
      ) {
        console.log('❌ Операция отменена')
        return
      }
      await syncToProd(dryRun)
      break

    case 'backup':
      await createBackup(dryRun)
      break

    default:
      console.error(`❌ Неизвестная команда: ${command}`)
      showHelp()
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error.message)
  process.exit(1)
})
