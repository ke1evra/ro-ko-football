import { getPayload } from 'payload'
import { cache } from 'react'

import configPromise from '@payload-config'

export const getGlobal = cache(async ({ slug }: { slug: any }) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.findGlobal({
    slug: slug,
    depth: 2,
    fallbackLocale: false,
  })

  return result || null
})
