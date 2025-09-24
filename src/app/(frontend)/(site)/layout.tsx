import { Footer } from '@/components/site/footer'
import { Header } from '@/components/site/header'
import { Main, Container } from '@/components/ds'
import UpcomingMatchesStrip from '@/components/home/UpcomingMatchesStrip'

export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      
      {/* Виджет с матчами приоритетных лиг - сквозной на уровне лейаута */}
      <div className="border-b bg-card/30">
        <Container className="py-3">
          <div className="mb-2">
            <h2 className="text-sm font-medium text-foreground mb-1">
              🏆 Ближайшие матчи топ-лиг
            </h2>
            <p className="text-xs text-muted-foreground">
              АПЛ • Бундеслига • Серия А • Лига 1 • Ла Лига • РПЛ • Лига Чемпионов • Лига Европы
            </p>
          </div>
          <div className="overflow-hidden">
            <UpcomingMatchesStrip initial={[]} />
          </div>
        </Container>
      </div>
      
      <Main className="flex-1">{children}</Main>
      <Footer />
    </>
  )
}
