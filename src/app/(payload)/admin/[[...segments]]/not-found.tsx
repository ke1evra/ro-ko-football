/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { NotFoundPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> => {
  try {
    const config = await configPromise
    return generatePageMetadata({ config, params, searchParams })
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[PAYLOAD NOT-FOUND] ========== ERROR ==========')
    console.error('[PAYLOAD NOT-FOUND] Digest:', err.digest)
    console.error('[PAYLOAD NOT-FOUND] Message:', err.message)
    console.error('[PAYLOAD NOT-FOUND] Stack:', err.stack)
    throw error
  }
}

const NotFound = async ({ params, searchParams }: Args) => {
  try {
    const config = await configPromise
    return NotFoundPage({ config, params, searchParams, importMap })
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[PAYLOAD NOT-FOUND PAGE] ========== ERROR ==========')
    console.error('[PAYLOAD NOT-FOUND PAGE] Digest:', err.digest)
    console.error('[PAYLOAD NOT-FOUND PAGE] Message:', err.message)
    console.error('[PAYLOAD NOT-FOUND PAGE] Stack:', err.stack)
    throw error
  }
}

export default NotFound
