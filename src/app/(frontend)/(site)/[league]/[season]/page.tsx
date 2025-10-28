/**
 * Страница лиги/сезона с турнирной таблицей и виджетами
 * Server Component с ISR и поддержкой URL-состояния
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Trophy, Clock, Calendar } from 'lucide-react'
import StandingsTable from '@/components/league/StandingsTable'
import LiveMatchesWidget from '@/components/league/LiveMatchesWidget'
import FixturesWidget from '@/components/league/FixturesWidget'
import RefreshButton from '@/components/league/RefreshButton'

// Конфигурация поддерживаемых лиг
const LEAGUE_CONFIG: Record<string, { name: string; country: string; description: string; competitionId: number }> = {
  'premier-league': {
    name: 'Premier League',
    country: 'Англия',
    description: 'Английская Премьер-лига - самая популярная футбольная лига в мире',
    competitionId: 2,
  },
  'la-liga': {
    name: 'La Liga',
    country: 'Испания',
    description: 'Испанская Ла Лига - домашняя лига для Реал Мадрид и Барселоны',
    competitionId: 3,
  },
  bundesliga: {
    name: 'Bundesliga',
    country: 'Германия',
    description: 'Немецкая Бундеслига - известна своей атмосферой и молодыми талантами',
    competitionId: 1,
  },
  'serie-a': {
    name: 'Serie A',
    country: 'Италия',
    description: 'Итальянская Серия А - лига с богатой тактической традицией',
    competitionId: 4,
  },
  'ligue-1': {
    name: 'Ligue 1',
    country: 'Франция',
    description: 'Французская Лига 1 - развивающаяся лига с большим потенциалом',
    competitionId: 5,
  },
}

interface PageProps {
  params: Promise<{ league: string; season: string }>
  searchParams: Promise<{
    view?: 'all' | 'home' | 'away'
    round?: string
    date?: string
  }>
}

// Генерация метаданных для SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { league, season } = await params
  const leagueConfig = LEAGUE_CONFIG[league]

  if (!leagueConfig) {
    return {
      title: 'Лига не найдена',
      description: 'Запрашиваемая лига не поддерживается',
    }
  }

  const title = `${leagueConfig.name} ${season} - Турнирная таблица и результаты`
  const description = `Актуальная турнирная таблица ${leagueConfig.name} сезона ${season}, live-матчи и ближайшие игры. ${leagueConfig.description}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/${league}/${season}`,
    },
  }
}

export default async function LeaguePage({ params, searchParams }: PageProps) {
  const { league, season } = await params
  const { view = 'all', round, date } = await searchParams

  // Проверяем, поддерживается ли лига
  const leagueConfig = LEAGUE_CONFIG[league]
  if (!leagueConfig) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Заголовок страницы */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            {leagueConfig.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {leagueConfig.country} • Сезон {season}
          </p>
        </div>

        <RefreshButton league={league} season={season} />
      </div>

      {/* Описание лиги */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{leagueConfig.description}</p>
        </CardContent>
      </Card>

      {/* Основной контент */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Турнирная таблица - занимает 2 колонки на больших экранах */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Турнирная таблица
              </CardTitle>
              <CardDescription>Актуальные позиции команд в {leagueConfig.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<StandingsTableSkeleton />}>
                <StandingsTable competitionId={leagueConfig.competitionId} season={season} view={view} round={round} />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Боковая панель с виджетами */}
        <div className="space-y-6">
          {/* Live-матчи */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-red-500" />
                Live-матчи
              </CardTitle>
              <CardDescription>Матчи, которые идут прямо сейчас</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LiveMatchesSkeleton />}>
                <LiveMatchesWidget league={league} />
              </Suspense>
            </CardContent>
          </Card>

          {/* Ближайшие матчи */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Ближайшие матчи
              </CardTitle>
              <CardDescription>Предстоящие игры в ближайшие дни</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<FixturesSkeleton />}>
                <FixturesWidget league={league} season={season} date={date} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* JSON-LD для SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsOrganization',
            name: leagueConfig.name,
            description: leagueConfig.description,
            sport: 'Football',
            location: {
              '@type': 'Country',
              name: leagueConfig.country,
            },
            url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${league}/${season}`,
          }),
        }}
      />
    </div>
  )
}

// Скелетоны для состояний загрузки
function StandingsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Переключатели */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i: number) => (
          <Skeleton key={i} className="h-10 w-20" />
        ))}
      </div>

      {/* Заголовок таблицы */}
      <div className="grid grid-cols-8 gap-4 py-2 border-b">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i: number) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>

      {/* Строки таблицы */}
      {Array.from({ length: 10 }).map((_: unknown, i: number) => (
        <div key={i} className="grid grid-cols-8 gap-4 py-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((j: number) => (
            <Skeleton key={j} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

function LiveMatchesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_: unknown, i: number) => (
        <div key={i} className="p-3 border rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

function FixturesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_: unknown, i: number) => (
        <div key={i} className="p-3 border rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

// ISR конфигурация
export const revalidate = 300 // 5 минут
