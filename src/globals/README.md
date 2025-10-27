# Глобалы для управления лигами

В проекте созданы два глобала для управления отображением лиг в разных частях сайта.

## TopMatchesLeagues (Лиги для топ матчей)

**Slug:** `topMatchesLeagues`

Управляет настройками виджета топ матчей на главной странице.

### Основные поля:

- `enabled` - включить/выключить виджет
- `title` - заголовок виджета (по умолчанию "Топ матчи")
- `maxMatches` - максимальное количество матчей (1-50, по умолчанию 10)
- `leagues` - массив лиг с настройками:
  - `league` - связь с коллекцией leagues
  - `priority` - приоритет (меньше число = выше приоритет)
  - `enabled` - включена ли ли��а

### Настройки фильтрации:

- `showOnlyActive` - показывать только активные лиги
- `timeRange` - временной диапазон (сегодня/завтра/неделя/месяц)
- `excludeFinished` - исключить завершённые матчи

### Использование в коде:

```typescript
import {
  getTopMatchesLeagues,
  getFilteredTopMatchesLeagues,
  getTopMatchesLeagueIds,
} from '@/lib/leagues'

// Получить все настройки
const settings = await getTopMatchesLeagues()

// Получить отфильтрованный список лиг
const leagues = await getFilteredTopMatchesLeagues()

// Получить только ID лиг для API запросов
const leagueIds = await getTopMatchesLeagueIds()
```

## SidebarLeagues (Лиги в сайдбаре)

**Slug:** `sidebarLeagues`

Управляет списком лиг в левом сайдбаре сайта.

### Основные поля:

- `enabled` - показывать лиги в сайдбаре
- `title` - заголовок секции (по умолчанию "Лиги")
- `maxItems` - максимальное количество лиг (1-50, по умолчанию 15)
- `showFlags` - показывать флаги стран
- `groupByCountry` - группировать по странам
- `leagues` - массив лиг с настройками:
  - `league` - связь с коллекцией leagues
  - `customName` - пользовательское название
  - `priority` - порядок сортировки
  - `enabled` - включена ли лига
  - `highlightColor` - цвет выделения (HEX)
  - `showMatchCount` - показывать количество матчей

### Настройки отображения:

- `showOnlyActive` - только активные лиги
- `showTiers` - показывать уровень лиги
- `compactMode` - компактный режим
- `showLogos` - показывать логотипы лиг

### Использование в коде:

```typescript
import { getSidebarLeagues, getFilteredSidebarLeagues, getSidebarLeagueIds } from '@/lib/leagues'

// Получить все настройки
const settings = await getSidebarLeagues()

// Получить отфильтрованный список лиг
const leagues = await getFilteredSidebarLeagues()

// Получить только ID лиг для API запросов
const leagueIds = await getSidebarLeagueIds()
```

## Доступ в админке

После создания глобалов они будут доступны в админке Payload по адресам:

- `/admin/globals/topMatchesLeagues` - настройки топ матчей
- `/admin/globals/sidebarLeagues` - настройки сайдбара

Редактировать глобалы могут только пользователи с ролью `admin`.

## Компоненты для предварительного просмотра

Создан компонент `LeaguesPreview` для отображения настроенных лиг в админке:

```typescript
import { LeaguesPreview } from '@/components/admin/LeaguesPreview'

<LeaguesPreview
  leagues={leagues}
  title="Предварительный просмотр"
  maxItems={10}
  showFlags={true}
  compactMode={false}
/>
```

## API endpoints

Глобалы доступны через REST API:

- `GET /api/globals/topMatchesLeagues` - настройки топ матчей
- `GET /api/globals/sidebarLeagues` - настройки сайдбара

Для обновления нужны права администратора:

- `POST /api/globals/topMatchesLeagues` - обновить настройки топ матчей
- `POST /api/globals/sidebarLeagues` - обновить настройки сайдбара
