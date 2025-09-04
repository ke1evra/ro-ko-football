/**
 * Скрипт создания/обновления администратора в Payload CMS.
 *
 * Что делает:
 * - Инициализирует Payload через Local API, используя src/payload.config.ts
 * - Ищет пользователя по email
 *   - если существует — повышает до admin, при переданном пароле обновляет пароль, помечает emailVerified=true
 *   - если не существует — создаёт пользователя с ролью admin и emailVerified=true
 *
 * Запуск:
 *   node create-admin.mjs --email=you@example.com --password=StrongPass123!
 *   # или через переменные окружения
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=StrongPass123! node create-admin.mjs
 *
 * Требования:
 * - В .env заданы DATABASE_URI и PAYLOAD_SECRET
 * - Должна быть доступна БД (например, `docker compose up -d postgres`)
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Явная загрузка .env и fallback на .env.docker
dotenv.config({ path: path.resolve(__dirname, '.env') })
if (!process.env.DATABASE_URI || !process.env.PAYLOAD_SECRET) {
  dotenv.config({ path: path.resolve(__dirname, '.env.docker') })
}

function parseArg(name, def = undefined) {
  const k = `--${name}=`
  const found = process.argv.find((a) => a.startsWith(k))
  if (found) return found.slice(k.length)
  return process.env[`ADMIN_${name.toUpperCase()}`] ?? def
}

async function main() {
  const email = parseArg('email')
  const password = parseArg('password')

  if (!email) {
    console.error('Ошибка: не указан email (используйте --email=... или ADMIN_EMAIL)')
    process.exit(1)
  }
  if (!process.env.DATABASE_URI) {
    console.error('Ошибка: не задан DATABASE_URI в .env')
    process.exit(1)
  }
  if (!process.env.PAYLOAD_SECRET) {
    console.error('Ошибка: не задан PAYLOAD_SECRET в .env')
    process.exit(1)
  }

  console.log('Инициализация Payload...')
  const { default: config } = await import('./src/payload.config.ts')
  const payload = await getPayload({ config })

  console.log(`Поиск пользователя: ${email}`)
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    const user = existing.docs[0]
    console.log(
      `Пользователь найден (id=${user.id}). Обновляю роль/флаги${password ? ' и пароль' : ''}...`,
    )

    const updated = await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        role: 'admin',
        emailVerified: true,
        ...(password ? { password } : {}),
      },
      overrideAccess: true,
    })

    console.log('Готово: пользователь обновлён до admin.')
    console.log({
      id: updated.id,
      email: updated.email,
      role: updated.role,
      emailVerified: updated.emailVerified,
    })
  } else {
    if (!password) {
      console.error(
        'Ошибка: пользователь не найден. Для создания необходим --password или ADMIN_PASSWORD',
      )
      process.exit(1)
    }

    console.log('Пользователь не найден. Создаю администратора...')
    const created = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        role: 'admin',
        emailVerified: true,
      },
      overrideAccess: true,
    })

    console.log('Готово: администратор создан.')
    console.log({
      id: created.id,
      email: created.email,
      role: created.role,
      emailVerified: created.emailVerified,
    })
  }

  if (payload?.db?.drain) {
    await payload.db.drain()
  }
  process.exit(0)
}

main().catch(async (err) => {
  console.error('Не удалось создать/обновить администратора:')
  console.error(err)
  try {
    const payload = globalThis?.payload
    if (payload?.db?.drain) await payload.db.drain()
  } catch {}
  process.exit(1)
})
