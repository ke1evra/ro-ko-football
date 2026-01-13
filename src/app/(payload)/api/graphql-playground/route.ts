/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import configPromise from '@payload-config'
import '@payloadcms/next/css'
import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes'

const getConfig = async () => await configPromise

export const GET = async (req: any, context: any) => {
  const config = await getConfig()
  return GRAPHQL_PLAYGROUND_GET(config)(req, context)
}
