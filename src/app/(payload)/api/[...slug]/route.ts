/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import configPromise from '@payload-config'
import '@payloadcms/next/css'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

const getConfig = async () => {
  try {
    console.log('[PAYLOAD API] Getting config...')
    const config = await configPromise
    console.log('[PAYLOAD API] Config resolved')
    return config
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[PAYLOAD API] ========== ERROR GETTING CONFIG ==========')
    console.error('[PAYLOAD API] Digest:', err.digest)
    console.error('[PAYLOAD API] Message:', err.message)
    console.error('[PAYLOAD API] Stack:', err.stack)
    console.error('[PAYLOAD API] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
    console.error('[PAYLOAD API] ==========================================')
    throw error
  }
}

export const GET = async (req: any, context: any) => {
  try {
    console.log('[PAYLOAD API] GET handler called')
    const config = await getConfig()
    return REST_GET(config)(req, context)
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[PAYLOAD API GET] ========== ERROR ==========')
    console.error('[PAYLOAD API GET] Digest:', err.digest)
    console.error('[PAYLOAD API GET] Message:', err.message)
    console.error('[PAYLOAD API GET] Stack:', err.stack)
    console.error('[PAYLOAD API GET] ===========================')
    throw error
  }
}
export const POST = async (req: any, context: any) => {
  const config = await getConfig()
  return REST_POST(config)(req, context)
}
export const DELETE = async (req: any, context: any) => {
  const config = await getConfig()
  return REST_DELETE(config)(req, context)
}
export const PATCH = async (req: any, context: any) => {
  const config = await getConfig()
  return REST_PATCH(config)(req, context)
}
export const PUT = async (req: any, context: any) => {
  const config = await getConfig()
  return REST_PUT(config)(req, context)
}
export const OPTIONS = async (req: any, context: any) => {
  const config = await getConfig()
  return REST_OPTIONS(config)(req, context)
}
