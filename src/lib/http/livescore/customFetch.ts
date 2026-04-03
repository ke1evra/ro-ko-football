/*
  Тонкая обёртка над fetch для клиентов Kubb с логированием и кэшированием.
  Автоматически добавляет key, secret и lang=ru к query-параметрам.
  ВНИМАНИЕ: ключи читаются из серверных переменных окружения (LIVESCORE_*).
  Не используйте этот клиент в браузере напрямую — вызывайте из server actions/route handlers.

  Теперь использует loggedFetch для:
  - Логирования всех запросов в ApiRequestLogs
  - Контроля лимита 45,000 запросов/день
  - Кэширования ответов
*/

import { loggedFetch } from './logged-fetch'
import { NextRequest } from 'next/server.js'

export type FetchLike = typeof fetch

export type RequestConfig = RequestInit & {
  params?: Record<string, any>
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
  timeoutMs?: number
  /** Skip cache and force fresh data from API (useful for Server Components) */
  skipCache?: boolean
}

export type ResponseErrorConfig<T = unknown> = {
  status: number
  statusText: string
  data: T
}

export type CreateFetchOptions = {
  baseUrl?: string
  apiKey?: string
  apiSecret?: string
  defaultLang?: string
  fetchImpl?: FetchLike
}

export function createCustomFetch({
  baseUrl = process.env.LIVESCORE_API_BASE || 'https://livescore-api.com/api-client',
  apiKey = process.env.LIVESCORE_KEY || '',
  apiSecret = process.env.LIVESCORE_SECRET || '',
  defaultLang = 'ru',
  fetchImpl = fetch,
}: CreateFetchOptions = {}) {
  // Возвращаем функцию, совместимую с kubb
  return async function customFetch<TRes = unknown, TErr = unknown, TBody = unknown>(
    config: {
      method?: string
      url: string
      params?: Record<string, any>
      body?: TBody
    } & RequestConfig,
  ): Promise<{ data: TRes; status: number; statusText: string }> {
    const { method = 'GET', url: configUrl = '', params, timeoutMs = 8000, skipCache = false, ...restConfig } = config

    // Поддержка только GET запросов для LiveScore API
    if (method !== 'GET') {
      throw new Error('LiveScore API поддерживает только GET запросы')
    }

    // Нормализуем базовый URL и путь
    const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/')
    const path = configUrl.startsWith('/') ? configUrl.slice(1) : configUrl

    const fullUrl = new URL(path, base)

    // Добавляем query параметры
    const searchParams = new URLSearchParams(fullUrl.search)

    // Добавляем авторизацию и локаль
    if (apiKey) searchParams.set('key', apiKey)
    if (apiSecret) searchParams.set('secret', apiSecret)
    if (defaultLang && !searchParams.has('lang')) searchParams.set('lang', defaultLang)

    // Добавляем параметры из config.params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return

        let formatted: string
        if (value instanceof Date) {
          // Нормализуем дату в формат YYYY-MM-DD
          formatted = value.toISOString().split('T')[0]
        } else if (Array.isArray(value)) {
          // Поддержка массивов параметров: приводим элементы к строкам, даты — к YYYY-MM-DD
          formatted = value
            .map((v) => (v instanceof Date ? v.toISOString().split('T')[0] : String(v)))
            .join(',')
        } else {
          formatted = String(value)
        }

        searchParams.set(key, formatted)
      })
    }

    fullUrl.search = searchParams.toString()

    // Определяем TTL на основе типа запроса
    const endpoint = path
    let ttl = 120000 // 2 минуты по умолчанию

    if (endpoint.includes('/matches/live')) {
      ttl = 30000 // 30 секунд для лайф матчей
    } else if (endpoint.includes('/fixtures/')) {
      ttl = 120000 // 2 минуты для фикстур
    } else if (endpoint.includes('/competitions/standings')) {
      ttl = 300000 // 5 минут для таблиц
    }

    // Получаем request из restConfig (для SSR)
    const request = (restConfig as any).request as NextRequest | undefined

    try {
      // Используем loggedFetch для выполнения запроса с логированием
      const data = await loggedFetch.get<TRes>(endpoint, params || {}, {
        source: 'api-route',
        request,
        ttl,
        skipCache, // Используем переданное значение или false по умолчанию
      })

      return {
        data,
        status: 200,
        statusText: 'OK',
      }
    } catch (error: any) {
      // Логирование ошибки уже выполнено в loggedFetch
      console.error(`[customFetch] Ошибка запроса ${endpoint}:`, error)

      // Преобразуем ошибку в формат kubb
      if (error && typeof error === 'object' && 'status' in error) {
        return {
          data: (error as any).data || {},
          status: (error as any).status,
          statusText: (error as any).statusText || 'Error',
        }
      }

      // Неизвестная ошибка
      return {
        data: { error: error instanceof Error ? error.message : 'Unknown error' } as any,
        status: 500,
        statusText: 'Internal Server Error',
      }
    }
  }
}

export const customFetch = createCustomFetch()

// Default export для kubb
export default customFetch
