/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import configPromise from '@payload-config'

async function loadRoutes() {
  try {
    return await import('@payloadcms/next/routes')
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[PAYLOAD GRAPHQL] FAILED to import @payloadcms/next/routes')
    console.error('[PAYLOAD GRAPHQL] Digest:', err.digest)
    console.error('[PAYLOAD GRAPHQL] Message:', err.message)
    console.error('[PAYLOAD GRAPHQL] Stack:', err.stack)
    throw error
  }
}

async function getConfig() {
  return configPromise
}

export const POST = async (req: any, context: any) => {
  const routes = await loadRoutes()
  return routes.GRAPHQL_POST(configPromise)(req)
}

export const OPTIONS = async (req: any, context: any) => {
  const routes = await loadRoutes()
  // REST_OPTIONS expects (request, { params })
  return routes.REST_OPTIONS(configPromise)(req, context)
}
