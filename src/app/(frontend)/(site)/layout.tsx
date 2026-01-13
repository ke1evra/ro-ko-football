import { Footer } from '@/components/site/footer'
import { Header } from '@/components/site/header'
import { Main, Container } from '@/components/ds'
import UpcomingMatchesStrip from '@/components/home/UpcomingMatchesStrip'
import { getTopMatchesLeagues, getTopMatchesLeagueIds } from '@/lib/leagues'
import '@/lib/global-error-handler'

export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  console.log('[LAYOUT] SiteLayout started')
  
  // Получаем настройки из Payload для виджета
  let settings = null
  let leagueIds: number[] = []

  try {
    console.log('[LAYOUT] Calling getTopMatchesLeagues()')
    settings = await getTopMatchesLeagues()
    console.log('[LAYOUT] getTopMatchesLeagues() completed, settings:', settings ? 'found' : 'null')
    
    console.log('[LAYOUT] Calling getTopMatchesLeagueIds()')
    leagueIds = await getTopMatchesLeagueIds()
    console.log('[LAYOUT] getTopMatchesLeagueIds() completed, count:', leagueIds.length)
    console.log('[LAYOUT] League IDs:', leagueIds)
  } catch (error) {
    const err = error as Error & { digest?: string }
    console.error('[LAYOUT] ========== ERROR IN LAYOUT ==========')
    console.error('[LAYOUT] Digest:', err.digest)
    console.error('[LAYOUT] Message:', err.message)
    console.error('[LAYOUT] Stack:', err.stack)
    console.error('[LAYOUT] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
    console.error('[LAYOUT] Error name:', err.name)
    console.error('[LAYOUT] Error cause:', (err as any).cause)
    console.error('[LAYOUT] =======================================')
  }

  console.log('[LAYOUT] Rendering layout with', leagueIds.length, 'league IDs')

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
