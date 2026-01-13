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
    const err = error as Error & { digest?: string }
    console.error('[LAYOUT] Ошибка загрузки настроек из Payload')
    console.error('[LAYOUT] Digest:', err.digest)
    console.error('[LAYOUT] Message:', err.message)
    console.error('[LAYOUT] Stack:', err.stack)
    console.error('[LAYOUT] Full error:', err)
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
