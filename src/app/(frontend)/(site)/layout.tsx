import { Footer } from '@/components/site/footer'
import { Header } from '@/components/site/header'
import { Main, Container } from '@/components/ds'
import UpcomingMatchesStrip from '@/components/home/UpcomingMatchesStrip'
import { getTopMatchesLeagues, getTopMatchesLeagueIds } from '@/lib/leagues'

export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Получаем настройки из Payload для виджета
  let settings = null
  let leagueIds: number[] = []
  
  try {
    settings = await getTopMatchesLeagues()
    leagueIds = await getTopMatchesLeagueIds()
  } catch (error) {
    console.error('[LAYOUT] Ошибка загрузки настроек из Payload:', error)
  }

  return (
    <>
      <Header />
      
      {/* Виджет с матчами приоритетных лиг - сквозной на уровне лейаута */}
      <div className="border-b bg-muted/80">
        <Container className="py-3">
          <div className="mb-2">
            <h2 className="text-sm font-medium text-foreground mb-1">
              🏆 {settings?.title || 'Ближайшие матчи топ-лиг'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {settings?.enabled 
                ? `Настроено ${leagueIds.length} лиг через CMS`
                : 'Виджет отключён в настройках CMS'
              }
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