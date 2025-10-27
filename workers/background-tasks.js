/**
 * Фоновый воркер для Football Platform
 *
 * Выполняет периодические задачи:
 * - Обновление статистики матчей
 * - Подсчёт очков за предсказания
 * - Очистка устаревших данных
 * - Отправка уведомлений
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Загрузка переменных окружения
dotenv.config({ path: path.resolve(__dirname, '../.env') })

let payload = null
let isShuttingDown = false

/**
 * Инициализация Payload CMS
 */
async function initializePayload() {
  try {
    console.log('[Worker] Инициализация Payload CMS...')
    const { default: config } = await import('../src/payload.config.ts')
    payload = await getPayload({ config })
    console.log('[Worker] Payload CMS инициализирован')
    return payload
  } catch (error) {
    console.error('[Worker] Ошибка инициализации Payload:', error)
    throw error
  }
}

/**
 * Обновление счётчиков комментариев и голосов
 */
async function updateCommentCounters() {
  if (!payload || isShuttingDown) return

  try {
    console.log('[Worker] Обновление счётчиков комментариев...')

    // Получаем все комментарии с неправильными счётчиками
    const comments = await payload.find({
      collection: 'comments',
      limit: 100,
      overrideAccess: true,
    })

    for (const comment of comments.docs) {
      // Подсчитываем голоса для каждого комментария
      const votes = await payload.find({
        collection: 'commentVotes',
        where: {
          comment: { equals: comment.id },
        },
        limit: 1000,
        overrideAccess: true,
      })

      let upvotes = 0
      let downvotes = 0

      votes.docs.forEach((vote) => {
        if (vote.value === 1) upvotes++
        if (vote.value === -1) downvotes++
      })

      const score = upvotes - downvotes

      // Обновляем счётчики если они изменились
      if (
        comment.upvotes !== upvotes ||
        comment.downvotes !== downvotes ||
        comment.score !== score
      ) {
        await payload.update({
          collection: 'comments',
          id: comment.id,
          data: {
            upvotes,
            downvotes,
            score,
          },
          overrideAccess: true,
        })

        console.log(
          `[Worker] Обновлён комментарий ${comment.id}: ${upvotes}↑ ${downvotes}↓ (${score})`,
        )
      }
    }

    console.log('[Worker] Счётчики комментариев обновлены')
  } catch (error) {
    console.error('[Worker] Ошибка обновления счётчиков:', error)
  }
}

/**
 * Очистка устаревших токенов
 */
async function cleanupExpiredTokens() {
  if (!payload || isShuttingDown) return

  try {
    console.log('[Worker] Очистка устаревших токенов...')

    const now = new Date()

    // Очищаем токены верификации email
    const usersWithExpiredTokens = await payload.find({
      collection: 'users',
      where: {
        and: [
          { emailVerificationExpires: { exists: true } },
          { emailVerificationExpires: { less_than: now } },
        ],
      },
      limit: 100,
      overrideAccess: true,
    })

    for (const user of usersWithExpiredTokens.docs) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
        overrideAccess: true,
      })
    }

    // Очищаем токены сброса пароля
    const usersWithExpiredResetTokens = await payload.find({
      collection: 'users',
      where: {
        and: [
          { passwordResetExpires: { exists: true } },
          { passwordResetExpires: { less_than: now } },
        ],
      },
      limit: 100,
      overrideAccess: true,
    })

    for (const user of usersWithExpiredResetTokens.docs) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
        overrideAccess: true,
      })
    }

    console.log(
      `[Worker] Очищено ${usersWithExpiredTokens.docs.length + usersWithExpiredResetTokens.docs.length} устаревших токенов`,
    )
  } catch (error) {
    console.error('[Worker] Ошибка очистки токенов:', error)
  }
}

/**
 * Основной цикл воркера
 */
async function runWorkerCycle() {
  if (isShuttingDown) return

  console.log('[Worker] Запуск цикла фоновых задач...')

  try {
    await updateCommentCounters()
    await cleanupExpiredTokens()

    console.log('[Worker] Цикл фоновых задач завершён')
  } catch (error) {
    console.error('[Worker] Ошибка в цикле воркера:', error)
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('[Worker] Получен сигнал завершения...')
  isShuttingDown = true

  if (payload?.db?.drain) {
    try {
      await payload.db.drain()
      console.log('[Worker] Соединение с БД закрыто')
    } catch (error) {
      console.error('[Worker] Ошибка закрытия БД:', error)
    }
  }

  console.log('[Worker] Воркер завершён')
  process.exit(0)
}

/**
 * Запуск воркера
 */
async function startWorker() {
  try {
    console.log('[Worker] Запуск фонового воркера...')

    // Инициализация
    await initializePayload()

    // Первый запуск
    await runWorkerCycle()

    // Периодический запуск каждые 5 минут
    const interval = setInterval(
      async () => {
        if (!isShuttingDown) {
          await runWorkerCycle()
        } else {
          clearInterval(interval)
        }
      },
      5 * 60 * 1000,
    ) // 5 минут

    console.log('[Worker] Воркер запущен, интервал: 5 минут')

    // Обработка сигналов завершения
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    process.on('SIGUSR2', shutdown) // PM2 reload
  } catch (error) {
    console.error('[Worker] Критическая ошибка воркера:', error)
    process.exit(1)
  }
}

// Запуск воркера
startWorker().catch((error) => {
  console.error('[Worker] Не удалось запустить воркер:', error)
  process.exit(1)
})
