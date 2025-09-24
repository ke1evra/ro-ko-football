# CLAUDE_MVP.md

## Overview
Fan football platform with:
- Community posts & comments.
- Match predictions with scoring & leaderboards.
- Live statistics (leagues, seasons, standings, teams).
- Editorial news.

Stack: **Next.js frontend**, **Payload + Mongo** (UGC/auth/news/predictions), **Directus + Postgres** (football data).  
MVP: launch fast → start with **live stats pages**, then switch to Directus, then add UGC + predictions + news.

---

## Architecture

### Responsibilities
- **Payload (Mongo)**
  - Users & Auth (JWT).
  - UGC: posts, comments, votes.
  - Predictions & scoring.
  - News content.

- **Directus (Postgres)**
  - Football data (matches, leagues, teams, standings, stats).
  - Admin-facing only.
  - REST/GraphQL API for Next.js.

- **Next.js**
  - App Router, shadcn/ui, Tailwind.
  - Data merge from both CMS.
  - ISR + SWR.
  - SEO: canonical, sitemap, JSON-LD, robots.

### Communication
- No shared DB.
- Linking via IDs (e.g. `post.matchId → directus/matches/:id`).
- Payload webhooks → Next revalidate.

---

## 1. Product Requirements

### Scope
- **Leagues**: list, highlight top 10 (ENG, GER, ITA, FRA, ESP, RUS, POR, BEL, NOR, SWE).
- **Seasons**: per league, show available years.
- **Standings**: league table (points, W/D/L, goals, form).
- **Teams**: profile (logo, squad value, basic info).
- **Directus sync**: switch stats from raw API → Directus.
- **Auth**: register/login via Payload.
- **UGC**: posts, comments, voting, feed (hot/new/top).
- **Predictions**: W/D/L, optional score, scoring (2 pts outcome, 5 pts exact).
- **Leaderboard**: top predictors.
- **News**: editorial articles.
- **User profile**: posts, predictions, stats.

### Non-goals
- No chat, notifications, or social login.
- No advanced player stats (MVP = basic info).

---

## 2. Technical Requirements

### Stack
- Next.js 15, TypeScript, Tailwind v4, shadcn/ui.
- Payload + Mongo (users, UGC, predictions, news).
- Directus + Postgres (football data).
- Validation: Zod.
- SEO: metadata, sitemap.xml, JSON-LD.
- Cache: ISR (tags) + SWR.
- Dates: date-fns (ru locale).

### Structure
/src
/app
/(site) # public pages
/(auth) # register/login
/api # custom routes
/cms-payload # payload config
/cms-directus # directus config
/components # UI
/contracts # Zod schemas
/lib # fetch, auth, seo


### Infra
- Docker Compose: Next, Payload, Mongo, Directus, Postgres.
- Webhooks: Payload → Next revalidate.
- Monitoring: healthchecks, logs.

---

## 3. QA Requirements

### Unit
- Prediction scoring.
- Zod validation.

### Integration
- Post + comment + vote.
- Prediction save + scoring.

### E2E
- Auth (register/login).
- Feed scroll & sort.
- Leagues → season → standings → team.
- Match-center (prediction before deadline, points after FT).
- Leaderboard.
- News pages with OG-tags.

### SEO
- Title, desc, canonical.
- JSON-LD valid.
- Sitemap & robots valid.

### Performance
- LCP ≤ 2.5s, CLS < 0.1, INP ≤ 200ms.
- Bundle ≤ 180 KB.

### Security
- Bcrypt passwords.
- Sanitize UGC.
- Rate limits: posts, comments, votes, predictions.

---

## 4. MVP Roadmap

### Iteration 1 — **Comments & Votes core**
- **Goal:** generic threaded comments + up/down votes (attachable to `prediction` and `comment`).
- **Exit:** create/reply, fetch tree, vote once per user, karma updates.
- **DoD:** Integration (tree, rate-limit), E2E (reply & vote), sanitize & XSS safe.

### Iteration 2 — Leagues (RU + logos)
- **Goal:** `/leagues` with highlight set (ENG/GER/ITA/FRA/ESP/RUS/POR/BEL/NOR/SWE).
- **Exit:** list visible, RU names, logos, links to league page.
- **DoD:** E2E list/links; SEO canonical.

### Iteration 3 — League seasons
- **Goal:** `/leagues/[leagueId]` seasons.
- **Exit:** years listed; links to standings.
- **DoD:** Integration schema validation; E2E navigation; empty states OK.

### Iteration 4 — Standings table (+ form)
- **Goal:** `/leagues/[leagueId]/[year]`.
- **Exit:** P/W/D/L, GF/GA/GD, form(5) rendered; RU names, logos.
- **DoD:** E2E render & sort; JSON-LD Competition/Breadcrumb.

### Iteration 5 — Team profile
- **Goal:** `/teams/[teamId]`.
- **Exit:** logo, squad value (if available), basic info, recent form.
- **DoD:** Integration (team schema), E2E page; placeholders for missing fields.

### Iteration 6 — Directus sync (no UI change)
- **Goal:** ETL provider → Directus; switch reads to Directus.
- **Exit:** leagues/seasons/standings/teams now from Directus.
- **DoD:** Integration (Zod on Directus), E2E parity with provider.

### Iteration 7 — Predictions (W/D/X + score + props)
- **Goal:** create predictions bound to `fixtureId`; enforce deadline.
- **Exit:** prediction saved; props stored (stats-keys optional); profile shows history.
- **DoD:** Unit scoring (outcome=2, exact=5 max); Integration CRUD; E2E create/view.

### Iteration 8 — Leaderboard + settle job
- **Goal:** settle after FT; leaderboard month/season.
- **Exit:** points appear post-FT; leaderboard updates.
- **DoD:** Unit scoring; Integration settle job; E2E predict→FT→points.

### Iteration 9 — News + SEO polish
- **Goal:** editorial news; finalize SEO.
- **Exit:** news visible; sitemap/robots/JSON-LD valid.
- **DoD:** E2E news; SEO checks pass; Lighthouse budgets green.

---

## 5. Client Data Reference

### User Roles
- `admin` — full access
- `user` — regular users

### Collections

#### Users
- email, username, name
- role: admin/user
- rating, emailVerified

#### Posts
- title, slug (auto-generated), content
- postType: regular/prediction
- author, publishedAt
- For predictions: matchId, fixtureId, prediction data

#### Comments
- content, author, post
- parent (for threading)

### Access Rules
- **Read**: public for all collections
- **Create**: authenticated users only
- **Update/Delete**: admin or owner only

### API Clients

#### catalogsService
- getCompetitionsListJson — list of competitions/leagues
- getCountriesListJson — list of countries
- getFederationsListJson — list of federations (UEFA, FIFA, etc.)
- getTeamsListJson — list of teams
- getSeasonsListJson — list of seasons

#### matchesService
- getMatchesLiveJson — live matches
- getMatchesHistoryJson — completed matches
- getTeamsHead2HeadJson — head-to-head between teams
- getTeamsMatchesJson — matches for specific team

#### tablesService
- getTablesStandingsJson — league standings/tables
- getCompetitionsTopscorersJson — top scorers
- getCompetitionsTopcardsJson — top cards (yellow/red)

#### fixturesService
- getFixturesMatchesJson — upcoming fixtures

#### eventsService
- getScoresEventsJson — match events (goals, cards, etc.)

#### lineupsStatsService
- getMatchesLineupsJson — team lineups
- getMatchesStatsJson — match statistics

#### utilityService
- getAuthVerifyJson — API auth verification
- getCountriesFlagPng — country flag images

### Priority Leagues
Located in `src/lib/highlight-competitions.ts`:
- PREMIER_LEAGUE: 2 (England)
- BUNDESLIGA: 1 (Germany)
- SERIE_A: 4 (Italy)
- LIGUE_1: 5 (France)
- LA_LIGA: 3 (Spain)
- RUSSIAN_PREMIER_LEAGUE: 7 (Russia)
- UEFA_CHAMPIONS_LEAGUE: 268
- UEFA_EUROPA_LEAGUE: 245
- UEFA_CONFERENCE_LEAGUE: 446