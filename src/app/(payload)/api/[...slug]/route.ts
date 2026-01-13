/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import configPromise from '@payload-config'

/**
 * Важно: если ошибка происходит на этапе module-eval (top-level import),
 * Next.js в production часто логирует только digest без stack.
 * Поэтому мы убираем тяжёлые импорты из top-level и грузим их динамически,
 * чтобы гарантированно получить stack trace в наших логах.
 */

type Handler = (req: any, context: any) => Promise<Response> | Response

async function loadRoutes() {
  try {
    const mod = await import('@payloadcms/next/routes')
    return mod
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[PAYLOAD API] FAILED to import @payloadcms/next/routes')
    console.error('[PAYLOAD API] Digest:', err.digest)
    console.error('[PAYLOAD API] Message:', err.message)
    console.error('[PAYLOAD API] Stack:', err.stack)
    console.error('[PAYLOAD API] Full error:', err)
    throw error
  }
}

async function getConfig() {
  try {
    return await configPromise
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[PAYLOAD API] FAILED to resolve @payload-config')
    console.error('[PAYLOAD API] Digest:', err.digest)
    console.error('[PAYLOAD API] Message:', err.message)
    console.error('[PAYLOAD API] Stack:', err.stack)
    console.error('[PAYLOAD API] Full error:', err)
    throw error
  }
}

async function wrap(factoryName: string, pick: (routes: any, config: any) => Handler): Promise<Handler> {
  const [routes, config] = await Promise.all([loadRoutes(), getConfig()])
  try {
    return pick(routes, config)
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error(`[PAYLOAD API] FAILED to build handler ${factoryName}`)
    console.error('[PAYLOAD API] Digest:', err.digest)
    console.error('[PAYLOAD API] Message:', err.message)
    console.error('[PAYLOAD API] Stack:', err.stack)
    console.error('[PAYLOAD API] Full error:', err)
    throw error
  }
}

export const GET = async (req: any, context: any) => {
  const handler = await wrap('REST_GET', (routes, config) => routes.REST_GET(config))
  return handler(req, context)
}

export const POST = async (req: any, context: any) => {
  const handler = await wrap('REST_POST', (routes, config) => routes.REST_POST(config))
  return handler(req, context)
}

export const DELETE = async (req: any, context: any) => {
  const handler = await wrap('REST_DELETE', (routes, config) => routes.REST_DELETE(config))
  return handler(req, context)
}

export const PATCH = async (req: any, context: any) => {
  const handler = await wrap('REST_PATCH', (routes, config) => routes.REST_PATCH(config))
  return handler(req, context)
}

export const PUT = async (req: any, context: any) => {
  const handler = await wrap('REST_PUT', (routes, config) => routes.REST_PUT(config))
  return handler(req, context)
}

export const OPTIONS = async (req: any, context: any) => {
  const handler = await wrap('REST_OPTIONS', (routes, config) => routes.REST_OPTIONS(config))
  return handler(req, context)
}
