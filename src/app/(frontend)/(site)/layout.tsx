import { Footer } from '@/components/site/footer'
import { Header } from '@/components/site/header'
import { Main } from '@/components/ds'
import UpcomingMatchesStrip from '@/components/home/UpcomingMatchesStrip'

export const dynamic = 'force-dynamic'



export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="border-b bg-card/30">
        <div className="container py-2">
          {/* Временно отключен для тестирования API */}
          <div className="text-sm text-muted-foreground text-center py-2">
            Тестируем API... Откройте <a href="/api/fixtures-test" className="underline">/api/fixtures-test</a>
          </div>
        </div>
      </div>
      <Main className="flex-1">{children}</Main>
      <Footer />
    </>
  )
}
