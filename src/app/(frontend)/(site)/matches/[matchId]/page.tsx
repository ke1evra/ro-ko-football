import { Container, Section } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MatchPageClient from '@/components/matches/MatchPageClient'
import type { Metadata } from 'next'

export const revalidate = 300

// Функция для получения базовой информации о матче из API
async function getMatchInfo(matchId: number) {
  try {
    // Пробуем получить информацию о матче из API событий
    const eventsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/matches/events?match_id=${matchId}`,
      { next: { revalidate: 300 } }
    )
    
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json()
      if (eventsData.success && eventsData.data) {
        return {
          id: matchId,
          home: { name: eventsData.data.home?.name || 'Команда дома' },
          away: { name: eventsData.data.away?.name || 'Команда гостей' },
          competition: eventsData.data.competition,
          date: eventsData.data.date,
          time: eventsData.data.time,
          status: eventsData.data.status,
        }
      }
    }

    // Если не удалось получить из событий, пробуем статистику
    const statsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/matches/stats?match_id=${matchId}`,
      { next: { revalidate: 300 } }
    )
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json()
      if (statsData.success && statsData.data) {
        return {
          id: matchId,
          home: { name: statsData.data.home?.name || 'Команда дома' },
          away: { name: statsData.data.away?.name || 'Команда гостей' },
          competition: statsData.data.competition,
          date: statsData.data.date,
          time: statsData.data.time,
          status: statsData.data.status,
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching match info:', error)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>
}): Promise<Metadata> {
  const { matchId } = await params
  const id = Number(matchId)
  
  if (!Number.isFinite(id)) {
    return { title: 'Матч не найден' }
  }

  const matchInfo = await getMatchInfo(id)
  
  if (!matchInfo) {
    return { title: `Матч #${id}` }
  }

  const title = `${matchInfo.home.name} vs ${matchInfo.away.name}${matchInfo.competition?.name ? ` — ${matchInfo.competition.name}` : ''}`
  const description = `Матч: ${matchInfo.home.name} — ${matchInfo.away.name}. События, статистика и подробности матча.`

  return {
    title,
    description,
  }
}

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const id = Number(matchId)

  if (!Number.isFinite(id)) {
    return (
      <Section>
        <Container>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Неверный идентификатор матча.</AlertDescription>
          </Alert>
        </Container>
      </Section>
    )
  }

  const matchInfo = await getMatchInfo(id)

  if (!matchInfo) {
    return (
      <Section>
        <Container className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Матч #{id} не найден.
            </AlertDescription>
          </Alert>
          <Link href="/leagues">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />К лигам
            </Button>
          </Link>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container className="space-y-6">
        <MatchPageClient matchId={id} initialMatchInfo={matchInfo} />

        {/* Навигация */}
        <div className="flex items-center gap-2">
          <Link href="/leagues">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />К лигам
            </Button>
          </Link>
          {matchInfo.competition?.id ? (
            <Link href={`/leagues/${matchInfo.competition.id}`}>
              <Button variant="outline" size="sm">
                К турниру
              </Button>
            </Link>
          ) : null}
        </div>
      </Container>
    </Section>
  )
}