/*
  Тонкая обёртка над fetch для клиентов Kubb.
  Автоматически добавляет key, secret и lang=ru к query-параметрам.
  ВНИМАНИЕ: ключи читаются из серверных переменных окружения (LIVESCORE_*).
  Не используйте этот клиент в браузере напрямую — вызывайте из server actions/route handlers.
*/

export type FetchLike = typeof fetch

export type RequestConfig = RequestInit & {
  params?: Record<string, any>
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
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
  return async function customFetch(config: any): Promise<any> {
    const { method = 'GET', url: configUrl = '', params, ...restConfig } = config

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
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value))
        }
      })
    }

    fullUrl.search = searchParams.toString()

    const init: RequestInit = {
      method,
      ...restConfig,
      headers: {
        accept: 'application/json',
        ...(restConfig.headers || {}),
      },
    }

    const response = await fetchImpl(fullUrl.toString(), init)

    let data: any
    try {
      data = await response.json()
    } catch {
      data = {}
    }

    if (!response.ok) {
      throw {
        status: response.status,
        statusText: response.statusText,
        data,
      }
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
    }
  }
}

export const customFetch = createCustomFetch()

// Default export для kubb
export default customFetch
