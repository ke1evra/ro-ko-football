import { getPayload } from 'payload'
import { NextRequest } from 'next/server.js'
import { apiCache } from '@/lib/api-cache'
import { rateLimiter } from '@/lib/http/livescore/rate-limiter'

/**
 * Типы для логирования
 */
export type CacheLevel = 'memory' | 'database' | 'livescore'

export type CacheStats = {
  memoryCache: {
    hit: boolean
    ttl: number
    age: number
  }
  database: {
    hit: boolean
    lastSyncAt: Date | null
    isStale: boolean
    staleSince: number
  }
  livescoreApi: {
    called: boolean
    statusCode: number | null
    duration: number | null
    cached: boolean
    attempt: number
  }
}

export type LogEntry = {
  endpoint: string
  params: Record<string, unknown>
  source: string
  statusCode: number
  duration: number
  cacheLevel: CacheLevel
  cacheStats: CacheStats
  userId?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Логированный fetch для LiveScore API
 * Автоматически логирует все запросы с метриками кэширования
 */
export class LoggedFetch {
  private payload: any = null

  /**
   * Инициализация Payload клиента
   */
  private async getPayload() {
    if (!this.payload) {
      const { default: config } = await import('@/payload.config')
      this.payload = await getPayload({ config })
    }
    return this.payload
  }

  /**
   * Получить данные с логированием
   */
  async get<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    options: {
      source?: string
      request?: NextRequest
      ttl?: number
      skipCache?: boolean
    } = {},
  ): Promise<T> {
    const {
      source = 'api-route',
      request,
      ttl = 120000, // 2 минуты по умолчанию
      skipCache = false,
    } = options

    const startTime = Date.now()
    const cacheKey = this.buildCacheKey(endpoint, params)

    // Метаданные запроса
    const userId = (request as any)?.user?.id
    const ipAddress = this.getClientIP(request)
    const userAgent = request?.headers?.get('user-agent') || undefined

    let cacheLevel: CacheLevel = 'livescore'
    const cacheStats: CacheStats = this.createEmptyCacheStats()
    let statusCode = 200
    let result: T

    try {
      // Проверяем лимит запросов
      await rateLimiter.checkLimit()

      if (!skipCache) {
        // Проверяем in-memory кэш
        const memoryResult = apiCache.getIfExists<T>(cacheKey)
        if (memoryResult) {
          cacheLevel = 'memory'
          cacheStats.memoryCache.hit = true
          cacheStats.memoryCache.age = apiCache.getAge(cacheKey)
          cacheStats.memoryCache.ttl = ttl / 1000

          console.log(`[LoggedFetch] Попадание в memory cache для ${endpoint}`)
          result = memoryResult
          return result
        }

        // TODO: Проверяем Payload кэш (БД)
        // const dbResult = await this.checkDatabaseCache(endpoint, params)
        // if (dbResult) {
        //   cacheLevel = 'database'
        //   cacheStats.database.hit = true
        //   cacheStats.database.lastSyncAt = dbResult.lastSyncAt
        //   cacheStats.database.isStale = this.isDataStale(dbResult.lastSyncAt)
        //   cacheStats.database.staleSince = this.getStaleTime(dbResult.lastSyncAt)
        //
        //   console.log(`[LoggedFetch] Попадание в database cache для ${endpoint}`)
        //   result = dbResult.data
        //   return result
        // }
      }

      // Выполняем запрос к LiveScore API
      cacheLevel = 'livescore'
      cacheStats.livescoreApi.called = true

      const apiStartTime = Date.now()
      const response = await this.makeApiRequest(endpoint, params)
      const apiDuration = Date.now() - apiStartTime

      cacheStats.livescoreApi.duration = apiDuration
      cacheStats.livescoreApi.statusCode = response.status
      cacheStats.livescoreApi.attempt = 1 // TODO: добавить retry логику

      if (!response.ok) {
        statusCode = response.status
        throw new Error(`LiveScore API error: ${response.status} ${response.statusText}`)
      }

      result = await response.json()
      cacheStats.livescoreApi.cached = true

      // ✅ Регистрируем успешный запрос в rate limiter
      rateLimiter.registerRequest()

      // Сохраняем в кэш
      if (!skipCache) {
        apiCache.set(cacheKey, result, ttl)
      }

      // TODO: Сохраняем в Payload (БД)
      // await this.saveToDatabase(endpoint, params, result)

      console.log(`[LoggedFetch] Запрос к LiveScore API выполнен: ${endpoint} (${apiDuration}ms)`)
    } catch (error) {
      statusCode = 500
      console.error(`[LoggedFetch] Ошибка запроса ${endpoint}:`, error)

      // При ошибке пытаемся вернуть устаревшие данные из кэша
      if (!skipCache) {
        const staleData = apiCache.getIfExists<T>(cacheKey, true) // true = allow expired
        if (staleData) {
          console.warn(`[LoggedFetch] Возвращаем устаревшие данные для ${endpoint}`)
          result = staleData
          cacheStats.memoryCache.hit = true
          cacheStats.memoryCache.age = apiCache.getAge(cacheKey)
          cacheLevel = 'memory'
          return result
        }
      }

      throw error
    } finally {
      // Логируем запрос
      const duration = Date.now() - startTime
      await this.logRequest({
        endpoint,
        params,
        source,
        statusCode,
        duration,
        cacheLevel,
        cacheStats,
        userId,
        ipAddress,
        userAgent,
      })
    }

    return result
  }

  /**
   * Построить ключ кэша
   */
  private buildCacheKey(endpoint: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key]
          return result
        },
        {} as Record<string, unknown>,
      )

    return `${endpoint}:${JSON.stringify(sortedParams)}`
  }

  /**
   * Создать пустую структуру cache stats
   */
  private createEmptyCacheStats(): CacheStats {
    return {
      memoryCache: {
        hit: false,
        ttl: 0,
        age: 0,
      },
      database: {
        hit: false,
        lastSyncAt: null,
        isStale: false,
        staleSince: 0,
      },
      livescoreApi: {
        called: false,
        statusCode: null,
        duration: null,
        cached: false,
        attempt: 0,
      },
    }
  }

  /**
   * Выполнить запрос к LiveScore API
   */
  private async makeApiRequest(
    endpoint: string,
    params: Record<string, unknown>,
  ): Promise<Response> {
    const baseUrl = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client'
    const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/')
    const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const url = new URL(path, base)

    // Добавляем авторизацию
    const apiKey = process.env.LIVESCORE_KEY || ''
    const apiSecret = process.env.LIVESCORE_SECRET || ''

    if (apiKey) url.searchParams.set('key', apiKey)
    if (apiSecret) url.searchParams.set('secret', apiSecret)
    url.searchParams.set('lang', 'ru') // Язык по умолчанию

    // Добавляем параметры
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        let formatted: string
        if (value instanceof Date) {
          // Нормализуем дату в формат YYYY-MM-DD
          formatted = value.toISOString().split('T')[0]
        } else if (Array.isArray(value)) {
          // Поддержка массивов параметров
          formatted = value.map((v) => String(v)).join(',')
        } else {
          formatted = String(value)
        }
        url.searchParams.set(key, formatted)
      }
    })

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Livescore-App/1.0',
        Accept: 'application/json',
        // Отключаем keep-alive: undici переиспользует стale-соединения и получает ETIMEDOUT
        Connection: 'close',
      },
      signal: AbortSignal.timeout(30000),
    })

    return response
  }

  /**
   * Получить IP адрес клиента
   */
  private getClientIP(request?: NextRequest): string | undefined {
    if (!request) return undefined

    // Проверяем стандартные заголовки
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfIP = request.headers.get('cf-connecting-ip')

    return forwarded?.split(',')[0]?.trim() || realIP || cfIP || undefined
  }

  /**
   * Проверить данные в Payload (БД)
   * TODO: реализовать после создания коллекций
   */

  private async checkDatabaseCache(
    _endpoint: string,
    _params: Record<string, unknown>,
  ): Promise<unknown> {
    // Заглушка для будущего
    return null
  }

  /**
   * Сохранить данные в Payload (БД)
   * TODO: реализовать после создания коллекций
   */

  private async saveToDatabase(
    _endpoint: string,
    _params: Record<string, unknown>,
    _data: unknown,
  ): Promise<void> {
    // Заглушка для будущего
  }

  /**
   * Проверить устарели ли данные
   */
  private isDataStale(lastSyncAt: Date | null): boolean {
    if (!lastSyncAt) return true
    const now = new Date()
    const diffMs = now.getTime() - lastSyncAt.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    return diffHours > 1 // Устарели если прошло больше часа
  }

  /**
   * Получить время устаревания в секундах
   */
  private getStaleTime(lastSyncAt: Date | null): number {
    if (!lastSyncAt) return 0
    const now = new Date()
    const diffMs = now.getTime() - lastSyncAt.getTime()
    return Math.floor(diffMs / 1000)
  }

  /**
   * Логировать запрос в базу данных
   */
  private async logRequest(entry: LogEntry): Promise<void> {
    try {
      const payload = await this.getPayload()

      // Валидируем source - должно быть одно из допустимых значений
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validSources: string[] = ['api-route', 'page', 'script', 'component', 'widget']
      const source = entry.source as string
      if (!validSources.includes(source)) {
        console.warn(
          `[LoggedFetch] Невалидный source: "${source}", заменяем на "component"`,
        )
        entry.source = 'component'
      }

      // Вычисляем итоговую статистику
      const summary = {
        totalRequests: 1, // Пока один запрос
        cacheHits: entry.cacheStats.memoryCache.hit || entry.cacheStats.database.hit ? 1 : 0,
        memoryHits: entry.cacheStats.memoryCache.hit ? 1 : 0,
        databaseHits: entry.cacheStats.database.hit ? 1 : 0,
        livescoreApiCalls: entry.cacheStats.livescoreApi.called ? 1 : 0,
        cacheHitRate: entry.cacheStats.memoryCache.hit || entry.cacheStats.database.hit ? 100 : 0,
        avgDuration: entry.duration,
      }

      await payload.create({
        collection: 'apiRequestLogs',
        data: {
          ...entry,
          summary,
        },
      })

      console.log(`[LoggedFetch] Запрос залогирован: ${entry.endpoint} (${entry.cacheLevel})`)
    } catch (error) {
      console.error('[LoggedFetch] Ошибка логирования:', error)
      // Не бросаем ошибку, чтобы не ломать основной поток
    }
  }
}

// Singleton instance
export const loggedFetch = new LoggedFetch()
