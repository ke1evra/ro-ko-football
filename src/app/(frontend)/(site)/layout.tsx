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
      <div className="border-b bg-stone-200">
        <Container className="py-3">
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
