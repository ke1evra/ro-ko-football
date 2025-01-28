import { getGlobal } from '@/lib/globals'
import { RenderBlocks } from '@/components/render-blocks'

import type { Home } from '@/payload-types'

export default async function Index() {
  const global: Home = await getGlobal({ slug: 'home' })

  return (
    <main>
      <RenderBlocks blocks={global?.blocks} />
    </main>
  )
}
