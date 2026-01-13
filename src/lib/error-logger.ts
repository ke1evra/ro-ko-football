/**
 * Утилита для детального логирования ошибок с digest
 * Помогает найти конкретное место ошибки по digest в production
 */

export function logErrorWithDigest(
  error: Error & { digest?: string },
  context?: string,
) {
  const digest = error.digest || 'no-digest'
  const contextStr = context ? `[${context}]` : '[ERROR]'

  console.error(`${contextStr} Digest: ${digest}`)
  console.error(`${contextStr} Message:`, error.message)
  console.error(`${contextStr} Stack:`, error.stack)
  console.error(`${contextStr} Full error:`, error)

  // Дополнительная информация для отладки
  if (error.cause) {
    console.error(`${contextStr} Cause:`, error.cause)
  }

  // В production можно отправлять в систему мониторинга
  if (process.env.NODE_ENV === 'production') {
    // Здесь можно добавить отправку в Sentry, LogRocket и т.д.
  }
}

/**
 * Обертка для try-catch с детальным логированием
 */
export async function withErrorLogging<T>(
  fn: () => Promise<T>,
  context?: string,
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    logErrorWithDigest(error as Error & { digest?: string }, context)
    return null
  }
}
