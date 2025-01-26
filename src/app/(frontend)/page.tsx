import { getGlobal } from '@/lib/globals'
import { Home } from '@/payload-types'
import { RenderBlocks } from '@/components/render-blocks'

export default async function Index() {
  const global: Home = await getGlobal({ slug: 'home' })

  return (
    <main>
      <RenderBlocks blocks={global?.blocks} />
    </main>
  )
}
