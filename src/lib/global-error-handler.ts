/**
 * Глобальный обработчик ошибок для Next.js
 * Перехватывает все необработанные ошибки и логирует их с полным стеком
 */

// Перехватываем необработанные ошибки
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('[GLOBAL ERROR HANDLER] Unhandled Rejection:', {
      reason,
      promise,
      stack: reason?.stack,
      message: reason?.message,
      digest: reason?.digest,
    })
  })

  process.on('uncaughtException', (error: Error) => {
    console.error('[GLOBAL ERROR HANDLER] Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      digest: (error as any).digest,
    })
  })
}

/**
 * Обертка для async функций с детальным логированием ошибок
 */
export function withDetailedErrorLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string,
): T {
  return (async (...args: any[]) => {
    try {
      console.log(`[${context}] Starting execution`)
      const result = await fn(...args)
      console.log(`[${context}] Completed successfully`)
      return result
    } catch (error) {
      const err = error as Error & { digest?: string }
      console.error(`[${context}] ERROR OCCURRED:`)
      console.error(`[${context}] Digest:`, err.digest)
      console.error(`[${context}] Message:`, err.message)
      console.error(`[${context}] Stack:`, err.stack)
      console.error(`[${context}] Full error:`, err)
      console.error(`[${context}] Error name:`, err.name)
      console.error(`[${context}] Error cause:`, (err as any).cause)
      console.error(`[${context}] Arguments:`, args)
      throw error
    }
  }) as T
}
