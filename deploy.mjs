#!/usr/bin/env node
/*
  Универсальный скрипт деплоя для rocoscore.ru
  Цели:
  - Предустановки: corepack/pnpm, docker compose
  - Подготовка .env (создание из .env.example, заполнение обязательных ключей)
  - Сборка и запуск docker-compose.appstack.yml
  - Ожидание health'ов и итоговые проверки HTTP
  - Идемпотентность и понятные сообщения об ошибках

  Использование:
    node deploy.mjs [--mode=prod|local] [--force-ports-override] [--skip-ssl] [--no-pull]
*/

import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'

const CWD = process.cwd()
const COMPOSE_FILE = path.join(CWD, 'docker-compose.appstack.yml')
const ENV_FILE = path.join(CWD, '.env')
const ENV_EXAMPLE_FILE = path.join(CWD, '.env.example')
const LOG_FILE = path.join(CWD, 'deploy.log')

// -------------------- utils --------------------
function ts() {
  return new Date().toISOString()
}
function writeLog(line) {
  fs.appendFileSync(LOG_FILE, `[${ts()}] ${line}\n`)
}
function log(msg) {
  const line = `${msg}`
  process.stdout.write(`${line}\n`)
  writeLog(line)
}
function warn(msg) {
  const line = `WARN: ${msg}`
  process.stderr.write(`${line}\n`)
  writeLog(line)
}
function fail(msg, code = 1) {
  const line = `ERROR: ${msg}`
  process.stderr.write(`${line}\n`)
  writeLog(line)
  process.exit(code)
}
function run(cmd, opts = {}) {
  log(`$ ${cmd}`)
  try {
    const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts })
    if (out) writeLog(`STDOUT:\n${out}`)
    return out
  } catch (e) {
    if (e.stdout) writeLog(`STDOUT:\n${e.stdout.toString()}`)
    if (e.stderr) writeLog(`STDERR:\n${e.stderr.toString()}`)
    writeLog(`EXIT_CODE: ${e.status ?? 'unknown'}`)
    fail(`Команда завершилась с ошибкой: ${cmd}`)
  }
}
function tryRun(cmd, opts = {}) {
  writeLog(`$ ${cmd}`)
  try {
    const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts })
    if (out) writeLog(`STDOUT:\n${out}`)
    return out.toString().trim()
  } catch (e) {
    if (e.stdout) writeLog(`STDOUT:\n${e.stdout.toString()}`)
    if (e.stderr) writeLog(`STDERR:\n${e.stderr.toString()}`)
    writeLog(`EXIT_CODE: ${e.status ?? 'unknown'}`)
    return ''
  }
}
function cmdExists(cmd) {
  const out = tryRun(`command -v ${cmd}`)
  return Boolean(out)
}
function generateSecret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex')
}
function readEnvFile(p) {
  if (!fs.existsSync(p)) return {}
  const src = fs.readFileSync(p, 'utf8')
  const obj = {}
  for (const line of src.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const k = line.slice(0, idx).trim()
    const v = line.slice(idx + 1).trim()
    obj[k] = v
  }
  return obj
}
function writeEnvFile(p, kv) {
  const lines = Object.entries(kv).map(([k, v]) => `${k}=${v}`)
  fs.writeFileSync(p, lines.join('\n') + '\n')
}
function upsertEnv(kv, patch) {
  return { ...kv, ...patch }
}
function portBusy(port) {
  try {
    const server = net.createServer()
    return new Promise((resolve) => {
      server.once('error', () => resolve(true))
      server.once('listening', () => server.close(() => resolve(false)))
      server.listen(port, '0.0.0.0')
    })
  } catch {
    return Promise.resolve(false)
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
async function httpProbe(url, insecure = false) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(
      url,
      insecure && url.startsWith('https')
        ? { rejectUnauthorized: false }
        : undefined,
      (res) => {
        // потребим тело, чтобы корректно закрыть
        res.resume()
        resolve({ status: res.statusCode || 0 })
      },
    )
    req.on('error', () => resolve({ status: 0 }))
    req.end()
  })
}

// -------------------- args --------------------
const args = new Set(process.argv.slice(2))
const mode = [...args].find((a) => a.startsWith('--mode='))?.split('=')[1] || 'prod'
const forcePorts = args.has('--force-ports-override')
const skipSSL = args.has('--skip-ssl')
const noPull = args.has('--no-pull')

// -------------------- prechecks --------------------
// очистим старый лог
try { fs.unlinkSync(LOG_FILE) } catch {}
writeLog('=== START DEPLOY ===')
log('== Предпроверки окружения ==')
if (!cmdExists('node')) fail('Node.js не найден')
if (!cmdExists('docker')) fail('Docker не найден')
// docker compose v2
const composeOk = cmdExists('docker') && tryRun('docker compose version')
if (!composeOk) fail('Docker Compose V2 недоступен (docker compose)')

// pnpm (через corepack)
if (!cmdExists('pnpm')) {
  log('pnpm не найден, включаю через corepack...')
  run('corepack enable pnpm')
}

// -------------------- repo setup --------------------
log('== Установка зависимостей проекта ==')
if (!noPull && cmdExists('git')) {
  log('Обновление репозитория...')
  tryRun('git rev-parse --abbrev-ref HEAD')
  tryRun('git fetch --all --prune')
  tryRun('git pull --ff-only')
}
run('pnpm --version')
run('pnpm install --frozen-lockfile')

// -------------------- .env setup --------------------
log('== Настройка .env ==')
if (!fs.existsSync(ENV_FILE)) {
  if (!fs.existsSync(ENV_EXAMPLE_FILE)) fail('.env отсутствует и .env.example не найден')
  fs.copyFileSync(ENV_EXAMPLE_FILE, ENV_FILE)
  log('Создан .env из .env.example')
  writeLog(fs.readFileSync(ENV_FILE, 'utf8'))
}
const env = readEnvFile(ENV_FILE)
const targetUrl = mode === 'prod' ? 'https://rocoscore.ru' : 'http://localhost'
const patch = {}
if (!env.DATABASE_URI || env.DATABASE_URI.includes('localhost')) {
  patch.DATABASE_URI = 'mongodb://mongo:27017/payload'
}
if (!env.PAYLOAD_SECRET || env.PAYLOAD_SECRET === 'your-secret-key-here') {
  patch.PAYLOAD_SECRET = generateSecret(32)
}
patch.NODE_ENV = mode === 'prod' ? 'production' : 'development'
if (!env.APP_URL || env.APP_URL.includes('localhost')) {
  patch.APP_URL = targetUrl
}
const newEnv = upsertEnv(env, patch)
writeEnvFile(ENV_FILE, newEnv)
log('Файл .env обновлён для текущего режима')
writeLog('Текущий .env (секреты частично скрыты):')
const masked = { ...newEnv, PAYLOAD_SECRET: (newEnv.PAYLOAD_SECRET || '').slice(0, 6) + '***' }
writeLog(JSON.stringify(masked, null, 2))

// -------------------- docker networks --------------------
log('== Подготовка Docker сетей ==')
if (!tryRun('docker network inspect web')) {
  run('docker network create web')
} else {
  log('Сеть web уже существует')
}
if (!tryRun('docker network inspect private')) {
  run('docker network create private')
} else {
  log('Сеть private уже существует')
}

// -------------------- ports check --------------------
log('== Проверка портов 80/443 ==')
const busy80 = await portBusy(80)
const busy443 = await portBusy(443)
if ((busy80 || busy443) && !forcePorts) {
  warn(`Порты заняты: 80=${busy80}, 443=${busy443}`)
  warn('Завершение. Запустите с --force-ports-override для теста на 8080/8443 или освободите порты.')
  process.exit(2)
}

// -------------------- compose build+up --------------------
log('== Сборка и запуск docker-compose ==')
if (!fs.existsSync(COMPOSE_FILE)) fail('docker-compose.appstack.yml не найден')
run('docker --version')
run(`docker compose version`)
run(`docker compose -f ${COMPOSE_FILE} config`)
run(`docker compose -f ${COMPOSE_FILE} build --pull`)
run(`docker compose -f ${COMPOSE_FILE} up -d`)
run(`docker compose -f ${COMPOSE_FILE} ps`)

// -------------------- wait health --------------------
log('== Ожидание готовности сервисов ==')
async function waitHealthy(name, timeoutMs = 300000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const out = tryRun(`docker inspect --format='{{json .State.Health}}' ${name}`)
    if (out) {
      try {
        const st = JSON.parse(out)
        if (st && st.Status === 'healthy') return true
      } catch {}
    }
    await sleep(3000)
  }
  return false
}

const okMongo = await waitHealthy('mongo')
if (!okMongo) {
  warn('Mongo не перешёл в healthy в отведённое время')
  tryRun(`docker compose -f ${COMPOSE_FILE} logs mongo | tail -n 200`)
}
const okPayload = await waitHealthy('payload')
if (!okPayload) {
  warn('Payload не перешёл в healthy в отведённое время')
  tryRun(`docker compose -f ${COMPOSE_FILE} logs payload | tail -n 200`)
}
const okNext = await waitHealthy('next')
if (!okNext) {
  warn('Next не перешёл в healthy в отведённое время')
  tryRun(`docker compose -f ${COMPOSE_FILE} logs next | tail -n 200`)
}

// -------------------- probes --------------------
log('== HTTP проверки ==')
const baseUrl = mode === 'prod' ? 'https://rocoscore.ru' : 'http://localhost'
const insecure = mode !== 'prod' || true // допускаем self-signed
const checks = [
  { url: `${baseUrl}/`, name: 'frontend /' },
  { url: `${baseUrl}/api/health`, name: 'payload /api/health' },
  { url: `${baseUrl}/admin`, name: 'payload admin' },
]
for (const c of checks) {
  const r = await httpProbe(c.url, insecure)
  const line = `${c.name}: ${c.url} -> status ${r.status}`
  log(line)
}

writeLog('=== END DEPLOY ===')
log('\n== Готово ==')
log('Управление:')
log(`  docker compose -f ${COMPOSE_FILE} ps`)
log(`  docker compose -f ${COMPOSE_FILE} logs -f --tail=200`)
log(`  docker compose -f ${COMPOSE_FILE} up -d --build`)
log(`  docker compose -f ${COMPOSE_FILE} down`)

log('\nПодсказки:')
log('- Для автоматического выпуска публичных сертификатов удалите caddy.tls: "internal" из compose и убедитесь, что DNS rocoscore.ru указывает на сервер, а п��рты 80/443 свободны.')
log('- Для локального прогона можно использовать: node deploy.mjs --mode=local --force-ports-override')
