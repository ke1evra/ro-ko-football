/**
 * Простой in-memory кэш для LiveScore API
 * Хранит сырые данные от API с TTL
 */

type CacheEntry<T = unknown> = {
  data: T
  expiresAt: number
  createdAt: number
}

class ApiCache {
  private cache = new Map<string, CacheEntry>()
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 минут

  constructor() {
    // Периодическая очистка устаревших записей
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.cleanup()
      }, this.CLEANUP_INTERVAL)
    }
  }

  /**
   * Получить данные из кэша
   */
  get<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = 120000): Promise<T> {
    const cached = this.cache.get(key)
    const now = Date.now()

    if (cached && cached.expiresAt > now) {
      console.log(`[ApiCache] HIT: ${key}`)
      return Promise.resolve(cached.data as T)
    }

    // Кэш устарел или отсутствует
    console.log(`[ApiCache] MISS: ${key}`)
    return fetcher().then((data) => {
      this.set(key, data, ttlMs)
      return data
    })
  }

  /**
   * Получить данные из кэша без выполнения запроса
   */
  getIfExists<T>(key: string, allowExpired = false): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (!allowExpired && cached.expiresAt <= now) return null

    return cached.data as T
  }

  /**
   * Сохранить данные в кэш
   */
  set<T>(key: string, data: T, ttlMs: number = 120000): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      expiresAt: now + ttlMs,
      createdAt: now,
    })
    console.log(`[ApiCache] SET: ${key} (TTL: ${ttlMs}ms)`)
  }

  /**
   * Получить возраст данных в кэше (в секундах)
   */
  getAge(key: string): number {
    const cached = this.cache.get(key)
    if (!cached) return 0

    const now = Date.now()
    return Math.floor((now - cached.createdAt) / 1000)
  }

  /**
   * Проверить существует ли ключ в кэше
   */
  has(key: string): boolean {
    const cached = this.cache.get(key)
    return cached !== undefined && cached.expiresAt > Date.now()
  }

  /**
   * Удалить ключ из кэша
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      console.log(`[ApiCache] DELETE: ${key}`)
    }
    return deleted
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`[ApiCache] CLEARED: ${size} entries`)
  }

  /**
   * Получить статистику кэша
   */
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    let totalSize = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt > now) {
        validEntries++
      } else {
        expiredEntries++
      }
      // Примерная оценка размера (ключ + данные)
      totalSize += key.length + JSON.stringify(entry.data).length
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    }
  }

  /**
   * Очистить устаревшие записи
   */
  cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[ApiCache] CLEANUP: removed ${removed} expired entries`)
    }
  }

  /**
   * Получить все ключи (для отладки)
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }
}

// Singleton instance
export const apiCache = new ApiCache()
