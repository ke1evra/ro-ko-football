/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import configPromise from '@payload-config'
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes'

const getConfig = async () => await configPromise

export const POST = async (req: any, context: any) => {
  const config = await getConfig()
  return GRAPHQL_POST(config)(req, context)
}

export const OPTIONS = async (req: any, context: any) => {
  const config = await getConfig()
  return REST_OPTIONS(config)(req, context)
}
