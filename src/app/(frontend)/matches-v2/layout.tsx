import { Footer } from '@/components/site/footer'
import { Header } from '@/components/site/header'
import { Main, Container } from '@/components/ds'
import UpcomingMatchesStrip from '@/components/home/UpcomingMatchesStrip'
import { getTopMatchesLeagues, getTopMatchesLeagueIds } from '@/lib/leagues'

export const dynamic = 'force-dynamic'

export default async function MatchesV2Layout({ children }: { children: React.ReactNode }) {
  // Получаем настройки из Payload для виджета
  let settings: any = null
  let leagueIds: number[] = []

  try {
    settings = await getTopMatchesLeagues()
    leagueIds = await getTopMatchesLeagueIds()
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[MATCHES_V2_LAYOUT] Ошибка загрузки настроек из Payload')
    console.error('[MATCHES_V2_LAYOUT] Digest:', err.digest)
    console.error('[MATCHES_V2_LAYOUT] Message:', err.message)
    console.error('[MATCHES_V2_LAYOUT] Stack:', err.stack)
    console.error('[MATCHES_V2_LAYOUT] Full error:', err)
  }

  return (
    <>
      <Header />

      {/* Виджет с матчами приоритетных лиг */}
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
