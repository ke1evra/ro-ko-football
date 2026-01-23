/**
 * Rate limiter для LiveScore API
 * Контролирует лимит 45,000 запросов в день
 */

interface RateLimitStats {
  requestsToday: number
  maxDailyRequests: number
  remainingRequests: number
  lastResetDate: string
  usagePercent: number
  status: 'ok' | 'warning' | 'limit_reached'
}

class RateLimiter {
  private readonly MAX_DAILY_REQUESTS = 45000 // Жёсткий лимит
  private readonly WARNING_THRESHOLD = 0.8 // 80% - предупреждение
  private requestsToday = 0
  private lastResetDate = new Date().toDateString()

  /**
   * Проверить лимит перед выполнением запроса
   * @throws Error если лимит превышен
   */
  async checkLimit(): Promise<void> {
    this.checkAndResetDailyCounter()

    if (this.requestsToday >= this.MAX_DAILY_REQUESTS) {
      console.error(
        `[RateLimiter] ❌ ЛИМИТ ПРЕВЫШЕН: ${this.requestsToday}/${this.MAX_DAILY_REQUESTS}`,
      )
      throw new Error(
        `Превышен дневной лимит запросов к LiveScore API (${this.MAX_DAILY_REQUESTS}). ` +
          `Сегодня уже выполнено: ${this.requestsToday} запросов.`,
      )
    }

    // Предупреждение при достижении 80%
    const usagePercent = (this.requestsToday / this.MAX_DAILY_REQUESTS) * 100
    if (usagePercent >= this.WARNING_THRESHOLD * 100) {
      console.warn(
        `[RateLimiter] ⚠️ БЛИЗКО К ЛИМИТУ: ${this.requestsToday}/${this.MAX_DAILY_REQUESTS} (${usagePercent.toFixed(1)}%)`,
      )
    }
  }

  /**
   * Зарегистрировать выполненный запрос
   */
  registerRequest(): void {
    this.requestsToday++
    console.log(
      `[RateLimiter] ✅ Запрос зарегистрирован: ${this.requestsToday}/${this.MAX_DAILY_REQUESTS}`,
    )
  }

  /**
   * Получить текущую статистику
   */
  getStats(): RateLimitStats {
    this.checkAndResetDailyCounter()

    const usagePercent = Math.round((this.requestsToday / this.MAX_DAILY_REQUESTS) * 100)
    const remainingRequests = Math.max(0, this.MAX_DAILY_REQUESTS - this.requestsToday)

    let status: 'ok' | 'warning' | 'limit_reached' = 'ok'
    if (this.requestsToday >= this.MAX_DAILY_REQUESTS) {
      status = 'limit_reached'
    } else if (usagePercent >= this.WARNING_THRESHOLD * 100) {
      status = 'warning'
    }

    return {
      requestsToday: this.requestsToday,
      maxDailyRequests: this.MAX_DAILY_REQUESTS,
      remainingRequests,
      lastResetDate: this.lastResetDate,
      usagePercent,
      status,
    }
  }

  /**
   * Проверить и сбросить счётчик раз в день
   */
  private checkAndResetDailyCounter(): void {
    const today = new Date().toDateString()
    if (this.lastResetDate !== today) {
      const yesterdayCount = this.requestsToday
      console.log(
        `[RateLimiter] 🌅 Новый день! Сброс счётчика. Вчера было: ${yesterdayCount} запросов`,
      )
      this.requestsToday = 0
      this.lastResetDate = today
    }
  }

  /**
   * Принудительный сброс счётчика (для тестирования)
   */
  resetCounter(): void {
    console.warn(`[RateLimiter] 🔄 Принудительный сброс счётчика (было: ${this.requestsToday})`)
    this.requestsToday = 0
    this.lastResetDate = new Date().toDateString()
  }

  /**
   * Проверить можем ли мы выполнить запрос
   */
  canMakeRequest(): boolean {
    this.checkAndResetDailyCounter()
    return this.requestsToday < this.MAX_DAILY_REQUESTS
  }

  /**
   * Получить время до сброса лимита (в миллисекундах)
   */
  getTimeUntilReset(): number {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    return tomorrow.getTime() - now.getTime()
  }

  /**
   * Получить время до сброса лимита (форматированная строка)
   */
  getTimeUntilResetFormatted(): string {
    const ms = this.getTimeUntilReset()
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}ч ${minutes}мин`
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Экспорт для обратной совместимости
export { RateLimiter }
