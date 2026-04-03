# 🤖 Система Агентов Rocoscore

> Мульти-агентная архитектура для разработки и поддержки футбольной фан-платформы Rocoscore на базе Payload CMS 3.x + Next.js 15

---

## 📋 Содержание

1. [Общее описание системы](#1-общее-описание-системы)
2. [Агенты и их скилы](#2-агенты-и-их-скилы)
3. [Правила взаимодействия агентов](#3-правила-взаимодействия-агентов)
4. [Примеры использования](#4-примеры-использования)
5. [Быстрый выбор агента](#5-быстрый-выбор-агента)

---

## 1. Общее описание системы

### 🎯 Цель

Система агентов Rocoscore предназначена для организации эффективной разработки и поддержки футбольной фан-платформы. Каждый агент — это специализированная роль с чётко определённой зоной ответственности, которая позволяет:

- Распределять задачи по доменам экспертизы
- Уменьшать контекст для каждой задачи
- Обеспечивать консистентность кода внутри домена
- Ускорять onboarding новых разработчиков

### 🏗️ Технологический стек

| Компонент | Технология | Версия |
|-----------|------------|--------|
| **CMS Backend** | Payload CMS | 3.70.0 |
| **Frontend Framework** | Next.js | 15.5.9 |
| **Database** | MongoDB | 6.0+ |
| **Language** | TypeScript | 5.7.3 |
| **API Integration** | LiveScore API | REST |
| **Styling** | Tailwind CSS | 4.1.12 |
| **UI Components** | shadcn/ui | Radix-based |
| **Rich Text** | Lexical | 0.35.0 |
| **Process Manager** | PM2 | latest |
| **Containerization** | Docker | 24+ |
| **Package Manager** | pnpm | 10.15.1 |

### 📁 Ключевые директории проекта

```
/Users/ko/payload-starter/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (frontend)/         # Frontend pages
│   │   ├── (payload)/          # Payload admin routes
│   │   └── api/                # API routes
│   ├── collections/            # Payload collections
│   ├── components/             # React components
│   ├── globals/                # Payload globals
│   ├── lib/                    # Utilities & services
│   │   ├── http/livescore/     # LiveScore API client
│   │   ├── predictions.ts      # Prediction logic
│   │   └── match-transformers.ts
│   └── hooks/                  # React hooks
├── scripts/                    # Sync & import scripts
│   ├── sync-*.mjs              # Synchronization workers
│   ├── import-*.mjs            # Import scripts
│   └── prediction-stats/       # Stats calculation
├── docker-compose.*.yml        # Docker configs for workers
└── ecosystem.config.cjs        # PM2 configuration
```

### 🔗 Архитектура данных

```mermaid
flowchart TB
    subgraph External["External APIs"]
        LS[LiveScore API]
    end

    subgraph Payload["Payload CMS + MongoDB"]
        Users["👤 Users<br/>Auth & Profiles"]
        Posts["📝 Posts<br/>UGC & Predictions"]
        Fixtures["⚽ Fixtures<br/>Matches & Odds"]
        Leagues["🏆 Leagues<br/>Competitions"]
        Teams["👥 Teams<br/>Statistics"]
        Markets["📊 Markets<br/>Betting markets"]
        Stats["📈 PredictionStats<br/>User analytics"]
    end

    subgraph Frontend["Next.js 15 Frontend"]
        SSR["Server Components"]
        CSR["Client Components"]
        API["API Routes"]
    end

    subgraph Workers["Background Workers"]
        Sync[Sync Scripts]
        Calc[Stats Calculation]
    end

    LS -->|fetch data| Sync
    Sync -->|update| Fixtures
    Sync -->|update| Leagues
    Sync -->|update| Teams

    Fixtures -->|display| SSR
    Posts -->|render| SSR
    Users -->|authenticate| API

    API -->|create| Posts
    API -->|read| Stats

    Workers -->|calculate| Stats
```

---

## 2. Агенты и их скилы

---

### 🏛️ 2.1 payload-core-agent

**ID**: `payload-core-agent`  
**Фокус**: Payload CMS ядро — коллекции, глобалы, доступ и хуки

#### Описание

Агент отвечает за архитектуру и конфигурацию Payload CMS. Создаёт и поддерживает схемы данных, настраивает доступ, реализует бизнес-логику через хуки.

#### Зоны ответственности

| Путь | Описание |
|------|----------|
| [`src/collections/*.ts`](src/collections/) | Определения коллекций |
| [`src/globals/*.ts`](src/globals/) | Глобальные настройки |
| [`src/payload.config.ts`](src/payload.config.ts) | Основная конфигурация |
| [`src/hooks/`](src/hooks/) | Кастомные хуки |
| [`src/lib/admin/`](src/lib/admin/) | Admin UI utilities |

#### Скилы

##### 🧩 collections-management
**Уровень**: Expert

Создание и конфигурация коллекций Payload:

```typescript
// Пример: создание коллекции с отношениями
export const Fixtures: CollectionConfig = {
  slug: 'fixtures',
  admin: {
    useAsTitle: 'fixtureId',
    group: 'Футбольные данные',
  },
  access: {
    read: () => true,
    create: () => false, // Только через синхронизацию
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'fixtureId',
      type: 'number',
      required: true,
      unique: true,
    },
    {
      name: 'league',
      type: 'relationship',
      relationTo: 'leagues',
      required: true,
    },
    // ... поля
  ],
  indexes: [
    { fields: ['fixtureId', 'date'] },
  ],
}
```

**Когда использовать**:
- Добавление новой сущности в CMS
- Настройка полей и валидации
- Оптимизация запросов через индексы

---

##### 🌍 globals-config
**Уровень**: Advanced

Настройка глобальных настроек:

```typescript
// globals/HeaderMenu.ts
export const HeaderMenu: GlobalConfig = {
  slug: 'headerMenu',
  fields: [
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'link', type: 'text', required: true },
      ],
    },
  ],
}
```

**Когда использовать**:
- Создание настроек сайта
- Конфигурация меню и виджетов
- Глобальные константы

---

##### 🔐 access-control
**Уровень**: Advanced

Настройка прав доступа:

```typescript
access: {
  read: ({ req }) => {
    // Публичный доступ
    if (req.user?.role === 'admin') return true
    return { author: { equals: req.user?.id } }
  },
  create: ({ req }) => Boolean(req.user),
  update: ({ req }) => isAdmin(req) ? true : { author: { equals: req.user?.id } },
  delete: ({ req }) => isAdmin(req),
}
```

**Когда использовать**:
- Ограничение доступа к данным
- Реализация RBAC
- Публичные vs приватные коллекции

---

##### 🪝 hook-implementation
**Уровень**: Expert

Реализация бизнес-логики через хуки:

```typescript
hooks: {
  beforeValidate: [
    async ({ data, req, operation, originalDoc }) => {
      // Автогенерация slug
      if (needsSlug && data.title) {
        data.slug = await generateUniqueSlug(data.title)
      }
      return data
    },
  ],
  afterChange: [
    async ({ doc, operation, req }) => {
      // Инвалидация кэша
      await revalidateTag(`post-${doc.slug}`)
    },
  ],
}
```

**Когда использовать**:
- Валидация данных
- Автогенерация полей
- Интеграция с внешними сервисами
- Кэширование и ревалидация

---

##### 🔄 migration-scripts
**Уровень**: Intermediate

Создание скриптов миграции:

```typescript
// Пример: миграция данных
async function migrateData() {
  const payload = await getPayload({ config })
  
  const docs = await payload.find({
    collection: 'posts',
    limit: 1000,
  })
  
  for (const doc of docs.docs) {
    await payload.update({
      collection: 'posts',
      id: doc.id,
      data: { newField: transformOldData(doc.oldField) },
    })
  }
}
```

**Когда использовать**:
- Миграция схемы данных
- Обновление существующих записей
- Бэкап и восстановление

---

### ⚽ 2.2 football-data-agent

**ID**: `football-data-agent`  
**Фокус**: Футбольные данные и интеграция с LiveScore API

#### Описание

Агент управляет всеми аспектами работы с футбольными данными: интеграция с LiveScore API, синхронизация матчей, лиг, команд, обработка статистики.

#### Зоны ответственности

| Путь | Описание |
|------|----------|
| [`src/lib/http/livescore/`](src/lib/http/livescore/) | LiveScore API клиент |
| [`src/lib/match-transformers.ts`](src/lib/match-transformers.ts) | Трансформация данных |
| [`src/app/api/fixtures/`](src/app/api/fixtures/) | Fixtures API routes |
| [`src/app/api/matches/`](src/app/api/matches/) | Matches API routes |
| [`scripts/sync-*.mjs`](scripts/) | Скрипты синхронизации |

#### Скилы

##### 🔌 livescore-api-integration
**Уровень**: Expert

Работа с LiveScore API:

```typescript
// Пример: типизированный запрос к API
async function fetchFixtures(params: {
  competition_id?: number
  date?: string
}): Promise<Fixture[]> {
  const response = await loggedFetch.get(
    'soccer/fixtures.json',
    {
      competition_id: params.competition_id,
      date: params.date,
    },
    { ttl: 120000 }
  )
  return response.fixtures || []
}
```

**Когда использовать**:
- Новые endpoint'ы LiveScore API
- Обработка rate limiting
- Кэширование ответов
- Обработка ошибок API

---

##### 🔄 match-data-transform
**Уровень**: Advanced

Трансформация данных API в формат CMS:

```typescript
// Пример: трансформация фикстуры
export function transformApiFixture(apiFixture: ApiFixture): FixtureInput {
  return {
    fixtureId: apiFixture.id,
    date: parseApiDate(apiFixture.date),
    time: apiFixture.time,
    homeTeam: {
      teamId: apiFixture.home_team.id,
      name: apiFixture.home_team.name,
      logo: apiFixture.home_team.logo,
    },
    awayTeam: {
      teamId: apiFixture.away_team.id,
      name: apiFixture.away_team.name,
      logo: apiFixture.away_team.logo,
    },
    status: mapApiStatus(apiFixture.status),
    odds: extractOdds(apiFixture.odds),
    lastSyncAt: new Date().toISOString(),
  }
}
```

**Когда использовать**:
- Новые типы данных из API
- Нормализация форматов
- Маппинг статусов и типов

---

##### 📅 fixture-sync
**Уровень**: Expert

Синхронизация фикстур с API:

```typescript
// Пример: полный цикл синхронизации
async function syncFixtures() {
  const leagues = await getTopMatchesLeagues()
  
  for (const league of leagues) {
    const apiFixtures = await fetchFixtures({
      competition_id: league.competitionId,
      date: formatDate(new Date()),
    })
    
    for (const fixture of apiFixtures) {
      await upsertFixture(transformApiFixture(fixture))
    }
  }
}
```

**Когда использовать**:
- Настройка периодической синхронизации
- Обработка дельта-обновлений
- Batch processing

---

##### 📊 standings-calculation
**Уровень**: Intermediate

Работа с турнирными таблицами:

```typescript
// Пример: обработка standings
function processStandings(apiData: ApiStanding[]): Standing[] {
  return apiData.map((row, index) => ({
    position: index + 1,
    teamId: row.team_id,
    teamName: row.team_name,
    played: row.overall.games_played,
    won: row.overall.won,
    draw: row.overall.draw,
    lost: row.overall.lost,
    goalsFor: row.overall.goals_scored,
    goalsAgainst: row.overall.goals_against,
    points: row.points,
    form: calculateForm(row.recent_form),
  }))
}
```

**Когда использовать**:
- Отображение таблиц
- Расчёт формы команд
- Группировка по группам

---

##### 🎨 team-logo-management
**Уровень**: Intermediate

Управление логотипами команд:

```typescript
// Пример: загрузка логотипа
async function downloadTeamLogo(teamId: number, logoUrl: string) {
  const response = await fetch(logoUrl)
  const buffer = await response.arrayBuffer()
  
  const filename = `${teamId}.png`
  await fs.writeFile(`public/team-logos/${filename}`, Buffer.from(buffer))
  
  return `/team-logos/${filename}`
}
```

**Когда использовать**:
- Первоначальная загрузка логотипов
- Обновление устаревших
- Оптимизация размеров

---

### 🎯 2.3 predictions-agent

**ID**: `predictions-agent`  
**Фокус**: Система прогнозов и ставок

#### Описание

Агент управляет всей логикой прогнозов: создание прогнозов, оценка исходов, подсчёт очков, отображение коэффициентов.

#### Зоны ответственности

| Путь | Описание |
|------|----------|
| [`src/lib/predictions.ts`](src/lib/predictions.ts) | Логика парсинга и оценки |
| [`src/lib/prediction-mapping-from-cms.ts`](src/lib/prediction-mapping-from-cms.ts) | Маппинг маркетов |
| [`src/lib/prediction-stats-calculator.ts`](src/lib/prediction-stats-calculator.ts) | Расчёт статистики |
| [`src/components/predictions/`](src/components/predictions/) | UI компоненты прогнозов |
| [`scripts/prediction-stats/`](scripts/prediction-stats/) | Скрипты расчёта статистики |
| [`src/collections/Markets.ts`](src/collections/Markets.ts) | Маркеты ставок |
| [`src/collections/OutcomeGroups.ts`](src/collections/OutcomeGroups.ts) | Группы исходов |

#### Скилы

##### 🧠 prediction-logic
**Уровень**: Expert

Реализация логики прогнозов:

```typescript
// Пример: парсинг строки события
export function parseEvent(eventStr: string): ParsedEvent {
  // П1, П2, Х - основные исходы
  const mainMatch = eventStr.match(/^(П1|П2|Х)$/)
  if (mainMatch) {
    return {
      group: 'main',
      outcome: mainMatch[1] as 'P1' | 'P2' | 'X',
      outcomeScope: 'ft',
    }
  }
  
  // Тоталы: ТБ 2.5, ТМ 1.5
  const totalMatch = eventStr.match(/^(ТБ|ТМ)\s+(\d+\.?\d*)$/)
  if (totalMatch) {
    return {
      group: 'total',
      total: {
        kind: totalMatch[1] === 'ТБ' ? 'over' : 'under',
        line: parseFloat(totalMatch[2]),
        stat: 'goals',
        scope: 'ft',
      },
    }
  }
  
  // ... другие паттерны
}
```

**Когда использовать**:
- Добавление новых типов прогнозов
- Парсинг строк событий
- Валидация прогнозов

---

##### ✅ outcome-evaluation
**Уровень**: Expert

Оценка результатов прогнозов:

```typescript
// Пример: оценка выигрыша
export function evaluatePrediction(
  prediction: ParsedEvent,
  matchData: MatchData
): EvaluateResult {
  switch (prediction.group) {
    case 'main':
      const result = determineWinner(matchData)
      return {
        won: result === prediction.outcome,
        reason: 'outcome_matched',
      }
    
    case 'total':
      const totalGoals = matchData.home_goals + matchData.away_goals
      const line = prediction.total!.line
      const won = prediction.total!.kind === 'over' 
        ? totalGoals > line 
        : totalGoals < line
      return { won, reason: 'total_evaluated' }
    
    // ... другие группы
  }
}
```

**Когда использовать**:
- Settlement прогнозов
- Расчёт точности
- Обработка edge cases

---

##### 🗺️ market-mapping
**Уровень**: Advanced

Маппинг между API и CMS маркетами:

```typescript
// Пример: связь фикстуры с маркетами
async function mapFixtureToMarkets(fixture: Fixture) {
  const markets = await payload.find({
    collection: 'markets',
    where: {
      competitionId: { equals: fixture.competition.competitionId },
    },
  })
  
  return markets.docs.map(market => ({
    ...market,
    outcomes: market.outcomes.map(outcome => ({
      ...outcome,
      // Связь с outcome-groups для evaluation
      evaluation: outcome.outcomeGroup?.conditions,
    })),
  }))
}
```

**Когда использовать**:
- Настройка новых лиг
- Создание маркетов
- Связь API ↔ CMS

---

##### 📈 stats-calculation
**Уровень**: Advanced

Расчёт статистики предикторов:

```typescript
// Пример: расчёт ROI
function calculateROI(predictions: Prediction[]): ROIMetrics {
  const totalStake = predictions.reduce((sum, p) => sum + p.stake, 0)
  const totalReturn = predictions
    .filter(p => p.status === 'won')
    .reduce((sum, p) => sum + (p.stake * p.coefficient), 0)
  
  return {
    roi: ((totalReturn - totalStake) / totalStake) * 100,
    winRate: predictions.filter(p => p.status === 'won').length / predictions.length,
    totalPredictions: predictions.length,
    averageOdds: predictions.reduce((sum, p) => sum + p.coefficient, 0) / predictions.length,
  }
}
```

**Когда использовать**:
- Обновление рейтингов
- Аналитика пользователей
- Лидерборды

---

##### 💰 coefficient-display
**Уровень**: Intermediate

Отображение коэффициентов:

```typescript
// Пример: форматирование коэффициента
function formatCoefficient(value: number): string {
  if (value < 1.5) return value.toFixed(2) // Низкий
  if (value < 3) return value.toFixed(2)   // Средний
  return value.toFixed(2)                  // Высокий
}

// Пример: стилизация по значению
function getCoefficientColor(value: number): string {
  if (value < 1.5) return 'text-green-600'
  if (value > 3) return 'text-red-600'
  return 'text-yellow-600'
}
```

**Когда использовать**:
- UI отображение коэффициентов
- Подсветка value bets
- Форматирование

---

### 🎨 2.4 ui-frontend-agent

**ID**: `ui-frontend-agent`  
**Фокус**: UI компоненты и фронтенд

#### Описание

Агент отвечает за пользовательский интерфейс: React компоненты, Next.js страницы, стилизация, клиентское состояние.

#### Зоны ответственности

| Путь | Описание |
|------|----------|
| [`src/app/(frontend)/`](src/app/(frontend)/) | Frontend pages |
| [`src/components/`](src/components/) | React components |
| [`src/globals.css`](src/globals.css) | Global styles |
| [`components.json`](components.json) | shadcn/ui config |
| [`src/hooks/`](src/hooks/) | Custom hooks |

#### Скилы

##### ⚛️ react-components
**Уровень**: Expert

Создание React компонентов:

```typescript
// Пример: композиция компонента матча
interface MatchCardProps {
  fixture: Fixture
  showOdds?: boolean
  onPredict?: () => void
}

export function MatchCard({ fixture, showOdds, onPredict }: MatchCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <TeamLogo team={fixture.homeTeam} />
          <span className="font-semibold">{fixture.homeTeam.name}</span>
        </div>
        <span className="text-muted-foreground">vs</span>
        <div className="flex items-center gap-4">
          <span className="font-semibold">{fixture.awayTeam.name}</span>
          <TeamLogo team={fixture.awayTeam} />
        </div>
      </CardHeader>
      {showOdds && (
        <CardContent>
          <OddsDisplay odds={fixture.odds} />
        </CardContent>
      )}
    </Card>
  )
}
```

**Когда использовать**:
- Новые UI компоненты
- Рефакторинг существующих
- Оптимизация рендеринга

---

##### 📄 nextjs-pages
**Уровень**: Advanced

Создание страниц Next.js App Router:

```typescript
// Пример: страница лиги с ISR
import { Metadata } from 'next'

interface LeaguePageProps {
  params: Promise<{ leagueId: string }>
}

export async function generateMetadata({ params }: LeaguePageProps): Promise<Metadata> {
  const { leagueId } = await params
  const league = await getLeague(leagueId)
  
  return {
    title: `${league.name} - Турнирная таблица`,
    description: `Статистика и результаты ${league.name}`,
  }
}

export default async function LeaguePage({ params }: LeaguePageProps) {
  const { leagueId } = await params
  const league = await getLeague(leagueId)
  
  return (
    <div className="container mx-auto py-8">
      <LeagueHeader league={league} />
      <StandingsTable leagueId={leagueId} />
    </div>
  )
}
```

**Когда использовать**:
- Новые страницы
- SEO-оптимизация
- ISR настройка

---

##### 🧩 shadcn-ui
**Уровень**: Advanced

Использование shadcn/ui компонентов:

```typescript
// Пример: диалог для создания прогноза
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function PredictionDialog({ fixture }: { fixture: Fixture }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Сделать прогноз</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Прогноз на матч</DialogTitle>
          <DialogDescription>
            Выберите исход и коэффициент
          </DialogDescription>
        </DialogHeader>
        <PredictionForm fixture={fixture} />
      </DialogContent>
    </Dialog>
  )
}
```

**Когда использовать**:
- UI из библиотеки shadcn
- Кастомизация темы
- Доступность (a11y)

---

##### 🎨 tailwind-styling
**Уровень**: Intermediate

Стилизация с Tailwind CSS:

```typescript
// Пример: карточка с градиентом и анимацией
export function FeaturedCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="
      relative overflow-hidden rounded-xl
      bg-gradient-to-br from-primary/10 to-primary/5
      border border-primary/20
      p-6 transition-all duration-300
      hover:shadow-lg hover:scale-[1.02]
    ">
      {children}
    </div>
  )
}
```

**Когда использовать**:
- Адаптивный дизайн
- Темная/светлая тема
- Анимации и переходы

---

##### 🔄 client-state-management
**Уровень**: Intermediate

Управление клиентским состоянием:

```typescript
// Пример: контекст аутентификации
'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Проверка сессии
    checkSession().then(setUser).finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const user = await loginUser(email, password)
    setUser(user)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

**Когда использовать**:
- Глобальное состояние
- Кэширование данных
- Оптимистичные обновления

---

### 🛡️ 2.5 typescript-guard-agent

**ID**: `typescript-guard-agent`  
**Фокус**: TypeScript контроль качества

#### Описание

Агент обеспечивает типобезопасность проекта: исправление типов, проектирование интерфейсов, интеграция с Payload типами.

#### Зоны ответственности

| Путь | Описание |
|------|----------|
| [`src/payload-types.ts`](src/payload-types.ts) | Сгенерированные типы |
| [`tsconfig.json`](tsconfig.json) | TypeScript конфигурация |
| [`tsconfig.typecheck.json`](tsconfig.typecheck.json) | Strict type checking |
| Типы в компонентах и API | Ручная типизация |

#### Скилы

##### 🔧 type-fixes
**Уровень**: Expert

Исправление ошибок TypeScript:

```typescript
// Пример: до и после

// ❌ До: ошибка TS2322
const where: Where = {
  fixtureId: { equals: id },
  date: { gte: startDate },
}

// ✅ После: правильное приведение типов
const whereConditions: Record<string, unknown> = {
  fixtureId: { equals: id },
  date: { gte: startDate },
}

const result = await payload.find({
  collection: 'fixtures',
  where: whereConditions as any, // eslint-disable-next-line @typescript-eslint/no-explicit-any
})
```

**Когда использовать**:
- Ошибки TS2322, TS2345
- Несовместимость типов Payload
- Сложные generic'и

---

##### 🏗️ interface-design
**Уровень**: Advanced

Проектирование типов:

```typescript
// Пример: иерархия типов для прогнозов
export type TeamSide = 'home' | 'away'
export type Scope = 'ft' | '1h' | '2h'

export type MarketGroup =
  | 'main'      // П1/Х/П2
  | 'doubleChance' // 1Х/12/Х2
  | 'btts'      // ОЗ
  | 'total'     // ТБ/ТМ

export interface ParsedEvent {
  group: MarketGroup
  outcome?: 'P1' | 'X' | 'P2'
  outcomeScope?: Scope
  // discriminated union для разных типов
}

// Строгая типизация API ответов
export interface ApiResponse<T> {
  data: T
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

**Когда использовать**:
- Новые домены
- Рефакторинг legacy
- API contracts

---

##### 🔒 payload-type-safety
**Уровень**: Advanced

Интеграция с типами Payload:

```typescript
// Пример: типобезопасная работа с Payload
import type { Payload, CollectionConfig } from 'payload'
import type { User, Post, Fixture } from '@/payload-types'

// Типизированный доступ к коллекции
async function getUserById(payload: Payload, id: string): Promise<User | null> {
  const result = await payload.findByID({
    collection: 'users',
    id,
  })
  return result as User
}

// Типизированная коллекция
const PostsCollection: CollectionConfig = {
  slug: 'posts',
  fields: [
    // fields автоматически генерируют типы
  ],
}
```

**Когда использовать**:
- Интеграция с Payload Local API
- Генерация типов
- Типизация hooks

---

##### 📡 api-typing
**Уровень**: Intermediate

Типизация API routes:

```typescript
// Пример: типизированный API route
import { NextRequest, NextResponse } from 'next/server'

interface CreatePredictionBody {
  fixtureId: number
  outcomes: PredictionOutcome[]
  coefficient: number
}

interface PredictionResponse {
  success: boolean
  predictionId?: string
  error?: string
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<PredictionResponse>> {
  const body = (await request.json()) as CreatePredictionBody
  
  // Валидация
  const validated = predictionSchema.safeParse(body)
  if (!validated.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid data' },
      { status: 400 }
    )
  }
  
  // ... обработка
  
  return NextResponse.json({ success: true, predictionId: '123' })
}
```

**Когда использовать**:
- Новые API endpoints
- Валидация входящих данных
- Документация API

---

##### ✅ type-check-enforcement
**Уровень**: Intermediate

Настройка и выполнение проверки типов:

```bash
# Обязательные команды перед коммитом
npm run type-check  # Полная проверка через tsconfig.typecheck.json
npm run lint        # ESLint
```

```json
// tsconfig.typecheck.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true
  },
  "include": ["src/**/*"]
}
```

**Когда использовать**:
- Настройка CI/CD
- Pre-commit hooks
- Troubleshooting

---

### ⚙️ 2.6 sync-worker-agent

**ID**: `sync-worker-agent`  
**Фокус**: Синхронизация и background workers

#### Описание

Агент управляет фоновыми процессами: синхронизация данных, импорт, batch processing, cron jobs через Docker workers.

#### Зоны ответственности

| Путь | Описание |
|------|----------|
| [`scripts/sync-*.mjs`](scripts/) | Скрипты синхронизации |
| [`scripts/import-*.mjs`](scripts/) | Импорт скрипты |
| [`scripts/prediction-stats/`](scripts/prediction-stats/) | Статистика |
| [`docker-compose.*.yml`](docker-compose.sync-fixtures.yml) | Docker configs |
| [`Dockerfile.worker`](Dockerfile.worker) | Worker образ |

#### Скилы

##### 📝 sync-script-development
**Уровень**: Expert

Разработка скриптов синхронизации:

```javascript
#!/usr/bin/env node

/**
 * Синхронизация данных
 * Запуск: tsx scripts/sync-fixtures.mjs [--loop] [--interval=3600000]
 */

import { getPayload } from 'payload'
import dotenv from 'dotenv'

dotenv.config()

const BATCH_SIZE = 50
const SYNC_DAYS = 10

async function syncFixtures() {
  console.log('[sync-fixtures] Начинаем синхронизацию...')
  
  const { default: config } = await import('../src/payload.config.ts')
  const payload = await getPayload({ config })
  
  try {
    // Получаем данные из API
    const fixtures = await fetchFixturesFromAPI()
    
    // Batch processing
    for (let i = 0; i < fixtures.length; i += BATCH_SIZE) {
      const batch = fixtures.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(f => upsertFixture(payload, f)))
      console.log(`Обработано ${i + batch.length}/${fixtures.length}`)
    }
    
    console.log('[sync-fixtures] Синхронизация завершена')
  } catch (error) {
    console.error('[sync-fixtures] Ошибка:', error)
    process.exit(1)
  }
}

// Поддержка режима loop
const interval = parseArg('interval', 3600000)
if (hasFlag('loop')) {
  console.log(`[sync-fixtures] Режим loop, интервал: ${interval}ms`)
  setInterval(syncFixtures, interval)
}

syncFixtures()
```

**Когда использовать**:
- Новые источники данных
- Оптимизация performance
- Обработка ошибок и retry

---

##### 🐳 docker-worker-setup
**Уровень**: Advanced

Настройка Docker workers:

```yaml
# docker-compose.sync-fixtures.yml
services:
  sync-fixtures:
    build:
      context: .
      dockerfile: Dockerfile.worker
    command: tsx scripts/sync-fixtures.mjs --loop --interval=3600000
    environment:
      DATABASE_URI: ${DATABASE_URI}
      PAYLOAD_SECRET: ${PAYLOAD_SECRET}
      LIVESCORE_KEY: ${LIVESCORE_KEY}
      LIVESCORE_SECRET: ${LIVESCORE_SECRET}
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

```dockerfile
# Dockerfile.worker
FROM node:22-alpine

WORKDIR /app

# Установка tsx для запуска TypeScript
RUN npm install -g tsx

COPY package*.json ./
RUN npm install

COPY . .

CMD ["tsx"]
```

**Когда использовать**:
- Новые workers
- Настройка ресурсов
- Логирование и мониторинг

---

##### ⏰ cron-jobs
**Уровень**: Intermediate

Настройка периодических задач:

```javascript
// Пример: cron-расписание через setInterval
const SCHEDULES = {
  fixtures: 60 * 60 * 1000,      // Каждый час
  standings: 4 * 60 * 60 * 1000, // Каждые 4 часа
  odds: 15 * 60 * 1000,          // Каждые 15 минут
  stats: 24 * 60 * 60 * 1000,    // Раз в день
}

async function runScheduledTask(name, fn) {
  console.log(`[${name}] Запуск задачи...`)
  const start = Date.now()
  
  try {
    await fn()
    console.log(`[${name}] Завершено за ${Date.now() - start}ms`)
  } catch (error) {
    console.error(`[${name}] Ошибка:`, error)
    // Отправка alert
  }
}

// Запуск с расписанием
Object.entries(SCHEDULES).forEach(([name, interval]) => {
  runScheduledTask(name, TASKS[name])
  setInterval(() => runScheduledTask(name, TASKS[name]), interval)
})
```

**Когда использовать**:
- Регулярная синхронизация
- Расчёт статистики
- Очистка данных

---

##### 📥 data-import-pipelines
**Уровень**: Advanced

Создание pipeline'ов импорта:

```javascript
// Пример: импорт истории матчей
async function importMatchHistory(leagueId, season, direction = 'backward') {
  const payload = await getPayload({ config })
  
  // Определяем начальную точку
  const cursor = await getImportCursor(payload, leagueId, season)
  
  let hasMore = true
  let page = cursor.page || 1
  
  while (hasMore) {
    console.log(`[import] Страница ${page}...`)
    
    const matches = await fetchMatchesFromAPI({
      leagueId,
      season,
      page,
      direction,
    })
    
    if (matches.length === 0) {
      hasMore = false
      break
    }
    
    // Трансформация и сохранение
    for (const match of matches) {
      await payload.create({
        collection: 'matches',
        data: transformMatch(match),
      })
    }
    
    // Сохраняем прогресс
    await updateImportCursor(payload, leagueId, season, { page: ++page })
    
    // Rate limiting
    await sleep(1000)
  }
  
  console.log('[import] Импорт завершён')
}
```

**Когда использовать**:
- Импорт исторических данных
- Миграция между системами
- Инициализация данных

---

##### 🔄 batch-processing
**Уровень**: Intermediate

Batch обработка больших объёмов:

```javascript
// Пример: расчёт статистики пачками
async function calculateStatsBatched(userIds, batchSize = 100) {
  const results = []
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize)
    
    // Параллельная обработка батча
    const batchResults = await Promise.all(
      batch.map(userId => calculateUserStats(userId))
    )
    
    results.push(...batchResults)
    
    // Сохраняем прогресс каждые N батчей
    if (i % (batchSize * 10) === 0) {
      await saveProgressCheckpoint({ processed: i + batch.length })
    }
    
    // Предотвращаем перегрузку
    await sleep(100)
  }
  
  return results
}
```

**Когда использовать**:
- Большие объёмы данных
- Предотвращение OOM
- Возобновляемые процессы

---

### 🚀 2.7 devops-agent

**ID**: `devops-agent`  
**Фокус**: DevOps и инфраструктура

#### Описание

Агент управляет инфраструктурой: Docker, PM2, деплой, окружения, мониторинг серверов.

#### Зоны ответственности

| Путь | Описание |
|------|----------|
| [`Dockerfile`](Dockerfile) | Основной образ |
| [`docker-compose.yml`](docker-compose.yml) | Docker Compose |
| [`ecosystem.config.cjs`](ecosystem.config.cjs) | PM2 конфиг |
| [`deploy.sh`](deploy.sh), [`deploy.mjs`](deploy.mjs) | Скрипты деплоя |
| [`Caddyfile`](Caddyfile) | Reverse proxy |

#### Скилы

##### 🐳 docker-configuration
**Уровень**: Expert

Конфигурация Docker:

```dockerfile
# Многоступенчатая сборка для оптимизации
FROM node:22.12.0-alpine AS base

# Stage 1: Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
ENV COREPACK_INTEGRITY_KEYS=0
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm run build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3100
ENV PORT 3100
ENV NODE_OPTIONS="--max-old-space-size=6144"

CMD HOSTNAME="0.0.0.0" node server.js
```

**Когда использовать**:
- Оптимизация образов
- Multi-stage builds
- Security hardening

---

##### 📊 pm2-setup
**Уровень**: Advanced

Настройка PM2:

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'football-platform',
      script: 'node',
      args: 'server.js',
      cwd: '.next/standalone',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
        NODE_OPTIONS: '--no-deprecation',
      },
      
      // Auto-restart
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
    },
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['rocoscore.ru'],
      ref: 'origin/main',
      repo: 'git@github.com:...',
      path: '/var/www/football-platform',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.cjs',
    },
  },
}
```

**Когда использовать**:
- Production deployment
- Process management
- Load balancing

---

##### 🚢 deployment-scripts
**Уровень**: Expert

Скрипты деплоя:

```bash
#!/bin/bash
# deploy.sh - Zero-downtime deployment

set -e

echo "🚀 Starting deployment..."

# 1. Build locally
echo "📦 Building application..."
npm run build

# 2. Sync to server
echo "📤 Uploading to server..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env' \
  . user@server:/var/www/app/

# 3. Restart on server
echo "🔄 Restarting application..."
ssh user@server "cd /var/www/app && npm install && pm2 reload ecosystem.config.cjs"

echo "✅ Deployment completed!"
```

```javascript
// deploy.mjs - Advanced deployment with checks
import { execSync } from 'child_process'

const STEPS = [
  { name: 'Build', cmd: 'npm run build' },
  { name: 'Type Check', cmd: 'npm run type-check' },
  { name: 'Test', cmd: 'npm test' },
  { name: 'Deploy', cmd: './deploy.sh' },
]

for (const step of STEPS) {
  console.log(`\n🔹 ${step.name}...`)
  try {
    execSync(step.cmd, { stdio: 'inherit' })
    console.log(`✅ ${step.name} completed`)
  } catch (error) {
    console.error(`❌ ${step.name} failed`)
    process.exit(1)
  }
}
```

**Когда использовать**:
- Автоматизация деплоя
- CI/CD pipelines
- Rollback procedures

---

##### 🔧 environment-management
**Уровень**: Advanced

Управление окружениями:

```bash
# .env.example - шаблон переменных
# Database
DATABASE_URI=mongodb://user:pass@localhost:27017/payload?authSource=admin

# Payload
PAYLOAD_SECRET=your-secret-key-min-32-chars

# LiveScore API
LIVESCORE_KEY=your-api-key
LIVESCORE_SECRET=your-api-secret

# App
APP_URL=http://localhost:3000
NODE_ENV=development

# Email
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@rocoscore.ru
```

```javascript
// scripts/setup-env.js - Интерактивная настройка
import { createInterface } from 'readline'
import { writeFileSync, existsSync } from 'fs'

const ENV_TEMPLATE = {
  DATABASE_URI: { required: true, description: 'MongoDB connection string' },
  PAYLOAD_SECRET: { required: true, description: 'Secret key (min 32 chars)' },
  LIVESCORE_KEY: { required: true, description: 'LiveScore API key' },
  LIVESCORE_SECRET: { required: true, description: 'LiveScore API secret' },
}

async function setupEnv() {
  console.log('🔧 Environment Setup\n')
  
  const env = {}
  for (const [key, config] of Object.entries(ENV_TEMPLATE)) {
    const value = await ask(`${config.description}:`)
    if (config.required && !value) {
      console.error(`❌ ${key} is required`)
      process.exit(1)
    }
    env[key] = value
  }
  
  const envContent = Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  
  writeFileSync('.env', envContent)
  console.log('\n✅ .env file created!')
}
```

**Когда использовать**:
- Новые окружения
- Ротация секретов
- Документация

---

##### 🔍 server-troubleshooting
**Уровень**: Intermediate

Диагностика и решение проблем:

```bash
#!/bin/bash
# diagnose.sh - Диагностика сервера

echo "🔍 Server Diagnostics"
echo "====================="

# Check disk space
echo -e "\n📀 Disk Space:"
df -h | grep -E '(Filesystem|/dev/)'

# Check memory
echo -e "\n🧠 Memory:"
free -h

# Check MongoDB
echo -e "\n🍃 MongoDB Status:"
systemctl status mongod --no-pager

# Check PM2
echo -e "\n⚡ PM2 Processes:"
pm2 status

# Check logs
echo -e "\n📜 Recent Errors:"
tail -n 50 logs/error.log | grep -i error

# Check ports
echo -e "\n🔌 Open Ports:"
ss -tlnp | grep -E '(3100|27017)'
```

```javascript
// healthcheck endpoint
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    payload: await checkPayload(),
    disk: checkDiskSpace(),
    memory: checkMemory(),
  }
  
  const healthy = Object.values(checks).every(c => c.status === 'ok')
  
  return Response.json(
    { status: healthy ? 'healthy' : 'unhealthy', checks },
    { status: healthy ? 200 : 503 }
  )
}
```

**Когда использовать**:
- Production issues
- Performance problems
- Monitoring setup

---

## 3. Правила взаимодействия агентов

### 3.1 Коммуникация между агентами

```mermaid
flowchart LR
    A[payload-core-agent] -->|Collections & Types| B[football-data-agent]
    A -->|Types| C[predictions-agent]
    A -->|Types| D[ui-frontend-agent]
    B -->|Data| C
    B -->|Fixtures| D
    C -->|Predictions| D
    E[typescript-guard-agent] -->|Types| A
    E -->|Types| B
    E -->|Types| C
    E -->|Types| D
    F[sync-worker-agent] -->|Sync| B
    F -->|Stats| C
    G[devops-agent] -->|Deploy| All
```

### 3.2 Когда нужен orchestrator

**Orchestrator** вызывается для задач, затрагивающих несколько агентов:

| Сценарий | Задействованные агенты |
|----------|----------------------|
| **Новая страница матча** | `football-data-agent` → `ui-frontend-agent` → `typescript-guard-agent` |
| **Новый тип прогноза** | `predictions-agent` → `payload-core-agent` → `ui-frontend-agent` |
| **Новая интеграция API** | `football-data-agent` → `sync-worker-agent` → `devops-agent` |
| **Production incident** | `devops-agent` + `typescript-guard-agent` + доменный агент |

### 3.3 Правила handoff

#### 🔀 Handoff payload-core-agent → football-data-agent

**Контекст**: Добавление поля для футбольных данных

```typescript
// payload-core-agent создаёт поле
{
  name: 'liveScoreId',
  type: 'number',
  required: true,
  unique: true,
}

// Передача:
// 1. Название поля и тип
// 2. Source API endpoint
// 3. Трансформация, если нужна
```

#### 🔀 Handoff football-data-agent → ui-frontend-agent

**Контекст**: Новый endpoint с данными

```typescript
// football-data-agent создаёт API route
// app/api/fixtures/route.ts

// Передача:
// 1. Endpoint URL
// 2. Response interface
// 3. Query parameters
// 4. Кэширование (TTL)
```

#### 🔀 Handoff predictions-agent → typescript-guard-agent

**Контекст**: Новые типы прогнозов

```typescript
// predictions-agent определяет домен
export type NewMarketType = 'asianHandicap' | 'overUnder'

// Передача:
// 1. Типы для интеграции с Payload
// 2. Интерфейсы для API
// 3. Валидация Zod schema
```

### 3.4 Код ревью между агентами

| Reviewer | Проверяет | Критерии |
|----------|-----------|----------|
| `typescript-guard-agent` | Все PR | Типобезопасность, strict mode |
| `payload-core-agent` | Коллекции | Access control, hooks, индексы |
| `devops-agent` | Docker/PM2 | Безопасность, оптимизация |
| `football-data-agent` | API интеграции | Rate limiting, обработка ошибок |

---

## 4. Примеры использования

### 4.1 Добавление новой страницы лиги

**Сценарий**: Создать страницу `/leagues/[leagueId]/calendar` с календарём матчей

**Агенты**: `football-data-agent` → `ui-frontend-agent` → `typescript-guard-agent`

```typescript
// Step 1: football-data-agent - API endpoint
// src/app/api/leagues/[leagueId]/calendar/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
  
  const fixtures = await payload.find({
    collection: 'fixtures',
    where: {
      'league': { equals: leagueId },
      'status': { equals: 'scheduled' },
    },
    sort: 'date',
  })
  
  return Response.json({ fixtures: fixtures.docs })
}

// Step 2: ui-frontend-agent - страница
// src/app/(frontend)/(site)/leagues/[leagueId]/calendar/page.tsx
export default async function CalendarPage({ params }: PageProps) {
  const { leagueId } = await params
  const fixtures = await fetch(`${API_URL}/leagues/${leagueId}/calendar`)
    .then(r => r.json())
  
  return (
    <div className="container py-8">
      <CalendarGrid fixtures={fixtures} />
    </div>
  )
}

// Step 3: typescript-guard-agent - типы
interface CalendarFixture {
  id: string
  date: string
  homeTeam: Team
  awayTeam: Team
  round?: string
}
```

### 4.2 Добавление нового типа прогноза

**Сценарий**: Поддержка азиатского гандикапа

**Агенты**: `predictions-agent` → `payload-core-agent` → `ui-frontend-agent`

```typescript
// Step 1: predictions-agent - логика
export function parseAsianHandicap(eventStr: string): ParsedEvent {
  const match = eventStr.match(/^(Ф1|Ф2)\s+([+-]?\d+\.?\d*)$/)
  if (!match) return null
  
  return {
    group: 'asianHandicap',
    handicap: {
      team: match[1] === 'Ф1' ? 'home' : 'away',
      line: parseFloat(match[2]),
    },
  }
}

export function evaluateAsianHandicap(
  prediction: ParsedEvent,
  match: MatchData
): boolean {
  const { team, line } = prediction.handicap
  const goals = team === 'home' ? match.home_goals : match.away_goals
  const opponentGoals = team === 'home' ? match.away_goals : match.home_goals
  
  return goals + line > opponentGoals
}

// Step 2: payload-core-agent - коллекция
// Добавить в Markets.ts
{
  name: 'asianHandicap',
  type: 'group',
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: false },
    { name: 'defaultLine', type: 'number', defaultValue: 0.25 },
  ],
}

// Step 3: ui-frontend-agent - UI
export function AsianHandicapInput({ onChange }: Props) {
  return (
    <div className="flex gap-4">
      <Select onValueChange={v => onChange({ team: v })}>
        <option value="home">Ф1</option>
        <option value="away">Ф2</option>
      </Select>
      <Input 
        type="number" 
        step="0.25"
        onChange={e => onChange({ line: parseFloat(e.target.value) })}
      />
    </div>
  )
}
```

### 4.3 Настройка нового sync worker

**Сценарий**: Синхронизация live событий матча каждые 30 секунд

**Агенты**: `sync-worker-agent` → `football-data-agent` → `devops-agent`

```javascript
// Step 1: sync-worker-agent - скрипт
// scripts/sync-match-events.mjs
async function syncLiveEvents() {
  const liveMatches = await payload.find({
    collection: 'matches',
    where: { status: { equals: 'live' } },
  })
  
  for (const match of liveMatches.docs) {
    const events = await fetchMatchEvents(match.matchId)
    await payload.update({
      collection: 'matches',
      id: match.id,
      data: { events, lastEventSync: new Date() },
    })
  }
}

setInterval(syncLiveEvents, 30000)

// Step 2: football-data-agent - API метод
async function fetchMatchEvents(matchId: number): Promise<MatchEvent[]> {
  return loggedFetch.get(`matches/${matchId}/events.json`, {}, { ttl: 0 })
}

// Step 3: devops-agent - Docker compose
# docker-compose.sync-events.yml
services:
  sync-events:
    build: { context: ., dockerfile: Dockerfile.worker }
    command: tsx scripts/sync-match-events.mjs
    deploy:
      resources:
        limits: { cpus: '0.5', memory: 512M }
    restart: unless-stopped
```

### 4.4 Исправление TypeScript ошибок в API

**Сценарий**: Ошибка TS2345 в fixtures route

**Агенты**: `typescript-guard-agent` → `football-data-agent`

```typescript
// ❌ До: ошибка TS2345
const where: Where = {
  fixtureId: { equals: parseInt(params.fixtureId) },
}

const fixture = await payload.find({
  collection: 'fixtures',
  where,
})

// ✅ После: исправленная версия
// typescript-guard-agent определяет подход
const fixtureId = parseInt(params.fixtureId)
if (isNaN(fixtureId)) {
  return NextResponse.json({ error: 'Invalid fixtureId' }, { status: 400 })
}

const whereConditions: Record<string, unknown> = {
  fixtureId: { equals: fixtureId },
}

const fixture = await payload.find({
  collection: 'fixtures',
  where: whereConditions as any, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  limit: 1,
})
```

---

## 5. Быстрый выбор агента

### 5.1 Decision Tree

```
Задача связана с...
│
├── 📦 Payload CMS?
│   ├── Создание/изменение коллекции → payload-core-agent (collections-management)
│   ├── Глобальные настройки → payload-core-agent (globals-config)
│   ├── Права доступа → payload-core-agent (access-control)
│   ├── Хуки и логика → payload-core-agent (hook-implementation)
│   └── Миграция данных → payload-core-agent (migration-scripts)
│
├── ⚽ Футбольными данными?
│   ├── Интеграция API → football-data-agent (livescore-api-integration)
│   ├── Трансформация данных → football-data-agent (match-data-transform)
│   ├── Синхронизация матчей → football-data-agent (fixture-sync)
│   ├── Турнирные таблицы → football-data-agent (standings-calculation)
│   └── Логотипы команд → football-data-agent (team-logo-management)
│
├── 🎯 Прогнозами?
│   ├── Новый тип прогноза → predictions-agent (prediction-logic)
│   ├── Оценка результата → predictions-agent (outcome-evaluation)
│   ├── Маркеты и связи → predictions-agent (market-mapping)
│   ├── Статистика → predictions-agent (stats-calculation)
│   └── Отображение коэффициентов → predictions-agent (coefficient-display)
│
├── 🎨 UI / Frontend?
│   ├── React компонент → ui-frontend-agent (react-components)
│   ├── Новая страница → ui-frontend-agent (nextjs-pages)
│   ├── Компонент shadcn → ui-frontend-agent (shadcn-ui)
│   ├── Стилизация → ui-frontend-agent (tailwind-styling)
│   └── Состояние (state) → ui-frontend-agent (client-state-management)
│
├── 🛡️ TypeScript?
│   ├── Ошибка типов → typescript-guard-agent (type-fixes)
│   ├── Дизайн интерфейса → typescript-guard-agent (interface-design)
│   ├── Типы Payload → typescript-guard-agent (payload-type-safety)
│   ├── Типизация API → typescript-guard-agent (api-typing)
│   └── Настройка проверки → typescript-guard-agent (type-check-enforcement)
│
├── ⚙️ Фоновые процессы?
│   ├── Скрипт синхронизации → sync-worker-agent (sync-script-development)
│   ├── Docker worker → sync-worker-agent (docker-worker-setup)
│   ├── Cron job → sync-worker-agent (cron-jobs)
│   ├── Импорт данных → sync-worker-agent (data-import-pipelines)
│   └── Batch processing → sync-worker-agent (batch-processing)
│
└── 🚀 Инфраструктура?
    ├── Docker → devops-agent (docker-configuration)
    ├── PM2 → devops-agent (pm2-setup)
    ├── Деплой → devops-agent (deployment-scripts)
    ├── Окружение → devops-agent (environment-management)
    └── Проблемы сервера → devops-agent (server-troubleshooting)
```

### 5.2 Матрица выбора по файлам

| Файл/Директория | Агент | Скил |
|----------------|-------|------|
| `src/collections/*.ts` | payload-core-agent | collections-management |
| `src/globals/*.ts` | payload-core-agent | globals-config |
| `src/payload.config.ts` | payload-core-agent | all |
| `src/lib/http/livescore/` | football-data-agent | livescore-api-integration |
| `src/lib/match-transformers.ts` | football-data-agent | match-data-transform |
| `src/app/api/fixtures/` | football-data-agent | fixture-sync |
| `src/lib/predictions.ts` | predictions-agent | prediction-logic |
| `src/lib/prediction-stats-calculator.ts` | predictions-agent | stats-calculation |
| `src/components/predictions/` | predictions-agent + ui-frontend-agent | multiple |
| `src/app/(frontend)/` | ui-frontend-agent | nextjs-pages |
| `src/components/` | ui-frontend-agent | react-components |
| `src/components/ui/` | ui-frontend-agent | shadcn-ui |
| `tsconfig*.json` | typescript-guard-agent | type-check-enforcement |
| `src/payload-types.ts` | typescript-guard-agent | payload-type-safety |
| `scripts/sync-*.mjs` | sync-worker-agent | sync-script-development |
| `docker-compose.*.yml` | sync-worker-agent | docker-worker-setup |
| `Dockerfile` | devops-agent | docker-configuration |
| `ecosystem.config.cjs` | devops-agent | pm2-setup |
| `deploy.sh` | devops-agent | deployment-scripts |

### 5.3 Чеклист перед вызовом агента

- [ ] Понятна ли зона ответственности?
- [ ] Определены ли входные/выходные данные?
- [ ] Есть ли примеры похожих реализаций в проекте?
- [ ] Нужен ли orchestrator для нескольких агентов?
- [ ] Проверен ли `npm run type-check`?

---

## 📝 Приложения

### A. Команды для работы с агентами

```bash
# Проверка типов (обязательно!)
npm run type-check

# Генерация типов Payload
npm run generate:types

# Синхронизация данных
npm run sync:fixtures
npm run sync:standings

# Расчёт статистики
npm run predictions:stats:calc

# Деплой
npm run deploy

# Локальная разработка
npm run dev
```

### B. Полезные ссылки

- [Payload CMS Docs](https://payloadcms.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [LiveScore API Docs](https://livescore-api.com/)

### C. История изменений

| Версия | Дата | Изменения |
|--------|------|-----------|
| 1.0 | 2025-04-02 | Initial release, 7 agents defined |

---

> **Note**: Этот документ является живым. Обновляйте его при добавлении новых агентов, скилов или паттернов использования.
