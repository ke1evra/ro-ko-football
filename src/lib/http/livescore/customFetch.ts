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
  return async function customFetch<TRes = unknown, TErr = unknown, TBody = unknown>(
    config: {
      method?: string
      url: string
      params?: Record<string, any>
      body?: TBody
    } & RequestConfig,
  ): Promise<{ data: TRes; status: number; statusText: string }> {
    const { method = 'GET', url: configUrl = '', params, body, ...restConfig } = config

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

    const init: RequestInit = {
      method,
      ...restConfig,
      headers: {
        accept: 'application/json',
        ...(restConfig.headers || {}),
      },
    }

    // Поддержк�� тела запроса для не-GET методов
    if (body !== undefined && String(method).toUpperCase() !== 'GET') {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        init.body = body as any
      } else if (
        typeof body === 'string' ||
        (typeof Blob !== 'undefined' && body instanceof Blob)
      ) {
        init.body = body as any
      } else {
        init.body = JSON.stringify(body)
        const hdrs = (init.headers ||= {}) as Record<string, string>
        if (typeof hdrs === 'object' && hdrs && !('content-type' in hdrs)) {
          hdrs['content-type'] = 'application/json'
        }
      }
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
