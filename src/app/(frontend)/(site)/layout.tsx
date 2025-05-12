import { Main } from '@/components/ds'

import {Footer} from '@/components/site/footer'
import {Header} from '@/components/site/header'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Main className="flex-1">{children}</Main>
      <Footer />
    </>
  )
}
