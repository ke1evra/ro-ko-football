/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import configPromise from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  try {
    console.log('[PAYLOAD LAYOUT] serverFunction called')
    const config = await configPromise
    console.log('[PAYLOAD LAYOUT] configPromise resolved')
    return handleServerFunctions({
      ...args,
      config,
      importMap,
    })
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[PAYLOAD LAYOUT] ========== ERROR IN SERVER FUNCTION ==========')
    console.error('[PAYLOAD LAYOUT] Digest:', err.digest)
    console.error('[PAYLOAD LAYOUT] Message:', err.message)
    console.error('[PAYLOAD LAYOUT] Stack:', err.stack)
    console.error('[PAYLOAD LAYOUT] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
    console.error('[PAYLOAD LAYOUT] ==============================================')
    throw error
  }
}

const Layout = async ({ children }: Args) => {
  const config = await configPromise
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}

export default Layout
