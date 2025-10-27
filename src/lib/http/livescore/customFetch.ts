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
  timeoutMs?: number
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
    const {
      method = 'GET',
      url: configUrl = '',
      params,
      body,
      timeoutMs = 8000,
      ...restConfig
    } = config

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

    // По умолчанию отключаем кэш и ISR для всех запросов через клиент,
    // чтобы избежать ошибок "Failed to set fetch cache" при сетевых таймаутах
    if (!('cache' in init)) {
      init.cache = 'no-store'
    }
    ;(init as any).next = (init as any).next ?? { revalidate: 0 }

    // Поддержка тела запроса для не-GET методов
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

    // Повторные попытки и корректная обработка AbortError
    const maxAttempts = Math.max(1, Number((restConfig as any).retries ?? 2))
    const baseTimeout = typeof timeoutMs === 'number' ? timeoutMs : 12000
    let lastError: any = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let timeoutHandle: any = null
      let ac: AbortController | null = null

      try {
        // Настраиваем таймаут и AbortController на каждую попытку
        if (typeof AbortController !== 'undefined') {
          ac = new AbortController()
          const origSignal = (restConfig as any).signal as AbortSignal | undefined
          if (origSignal && 'addEventListener' in origSignal) {
            origSignal.addEventListener('abort', () => ac?.abort(), { once: true } as any)
          }
          ;(init as any).signal = ac.signal
          const attemptTimeout = attempt === 1 ? baseTimeout : Math.round(baseTimeout * 1.5)
          timeoutHandle = setTimeout(() => ac?.abort(), attemptTimeout)
        }

        const response = await fetchImpl(fullUrl.toString(), init)

        let data: any
        try {
          data = await response.json()
        } catch {
          data = {}
        }

        if (!response.ok) {
          lastError = { status: response.status, statusText: response.statusText, data }
          // Повторяем на 408/429/5xx кроме последней попытки
          if (
            attempt < maxAttempts &&
            (response.status === 408 || response.status === 429 || response.status >= 500)
          ) {
            await new Promise((r) => setTimeout(r, 200 * attempt))
            continue
          }
          throw lastError
        }

        return {
          data,
          status: response.status,
          statusText: response.statusText,
        }
      } catch (e: any) {
        lastError = e
        const isAbort = e?.name === 'AbortError'
        // Повторяем на AbortError или сетевых ошибках
        if (attempt < maxAttempts && (isAbort || e?.status >= 500 || e?.code === 'ECONNRESET')) {
          await new Promise((r) => setTimeout(r, 200 * attempt))
          continue
        }
        if (isAbort) {
          throw {
            status: 504,
            statusText: 'Gateway Timeout',
            data: { error: 'Request aborted by timeout', url: fullUrl.toString() },
          }
        }
        throw e
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle)
      }
    }

    // Если все попытки исчерпаны
    throw lastError || { status: 500, statusText: 'Fetch Failed', data: {} }
  }
}

export const customFetch = createCustomFetch()

// Default export для kubb
export default customFetch
