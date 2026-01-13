/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import configPromise from '@payload-config'

async function loadRoutes() {
  try {
    return await import('@payloadcms/next/routes')
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[PAYLOAD GRAPHQL PLAYGROUND] FAILED to import @payloadcms/next/routes')
    console.error('[PAYLOAD GRAPHQL PLAYGROUND] Digest:', err.digest)
    console.error('[PAYLOAD GRAPHQL PLAYGROUND] Message:', err.message)
    console.error('[PAYLOAD GRAPHQL PLAYGROUND] Stack:', err.stack)
    throw error
  }
}

async function getConfig() {
  return await configPromise
}

export const GET = async (req: any, context: any) => {
  const [routes, config] = await Promise.all([loadRoutes(), getConfig()])
  return routes.GRAPHQL_PLAYGROUND_GET(config)(req, context)
}
