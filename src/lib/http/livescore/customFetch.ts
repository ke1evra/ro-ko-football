/*
  Тонкая обёртка над fetch для клиентов Kubb.
  Автоматически добавляет key, secret и lang=ru к query-параметрам.
  ВНИМАНИЕ: ключи читаются из серверных переменных окружения (LIVESCORE_*).
  Не используйте этот клиент в браузере напрямую — вызывайте из server actions/route handlers.
*/

export type FetchLike = typeof fetch

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
  return async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === 'string' ? input : input.toString(), baseUrl)

    const params = new URLSearchParams(url.search)

    // Добавляем авторизацию и локаль только если заданы ключи (серверное исполнение)
    if (apiKey) params.set('key', apiKey)
    if (apiSecret) params.set('secret', apiSecret)
    if (defaultLang && !params.has('lang')) params.set('lang', defaultLang)

    url.search = params.toString()

    const nextInit: RequestInit = {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init?.headers || {}),
      },
    }

    return fetchImpl(url.toString(), nextInit)
  }
}

export const customFetch = createCustomFetch()
