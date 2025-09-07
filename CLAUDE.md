# CLAUDE_MVP.md

## Overview
This project is a **fan football platform** combining community-driven content (like Pikabu), match predictions with scoring/leaderboards, and editorial news.  
Architecture is based on **Next.js frontend**, **Payload CMS + Mongo** for UGC/auth/news, and **Directus + Postgres** for football data imported from external APIs.

Goal: launch a working MVP fast, iterate with clear increments, and keep architecture simple and extensible.

---

## Architecture Update

### Responsibilities
- **Payload (MongoDB)**
    - Users & Auth (email + password, JWT).
    - UGC: posts, comments, votes.
    - Predictions: user inputs, scoring, leaderboard.
    - News: editorial content.

- **Directus (PostgreSQL)**
    - Imported football data (matches, teams, players, leagues, standings).
    - Only admin-facing, no site users.
    - Provides REST/GraphQL API for Next.js.

- **Next.js (App Router, shadcn/ui, Tailwind)**
    - Frontend that merges data from both CMS.
    - ISR + SWR for caching.
    - SEO: canonical, sitemap, JSON-LD, robots.

### Communication
- No shared DB.
- Linking by IDs via REST API (`post.matchId` → `directus/matches/:id`).
- Payload triggers revalidation webhooks to Next.

---

## 1. Product Requirements

### MVP scope
- **Auth**: registration/login via Payload.
- **UGC**: posts, comments, voting, feed (hot/new/top).
- **Matches**: list and match-center (from Directus).
- **Predictions**: W/D/L (+ optional score), scoring rules (2 pts for outcome, 5 pts for exact score).
- **Leaderboard**: top-10 predictors.
- **News**: editorial articles via Payload.
- **User profile**: posts + prediction stats.

### Non-goals (for MVP)
- No chat, notifications, or social login.
- No advanced stats (only score/result/standings).

---

## 2. Technical Requirements

### Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind v4, shadcn/ui.
- **Payload CMS + MongoDB**: users, posts, comments, votes, predictions, news.
- **Directus + PostgreSQL**: matches, teams, players, leagues, standings.
- **API Validation**: Zod schemas.
- **SEO**: generateMetadata, sitemap.xml, JSON-LD.
- **Cache**: ISR (with tags) + SWR.
- **Date formatting**: date-fns with Russian locale (`format`, `isToday`, `isTomorrow`).

### Structure
/src
/app
/(site) # Public pages
/(auth) # Register/login
/api # Custom route handlers
/cms-payload # Payload config
/cms-directus # Directus config
/components # UI (shadcn)
/contracts # Zod schemas
/lib # helpers (fetch, auth, seo)


### Infra
- Docker Compose: Next, Payload, Mongo, Directus, Postgres.
- Payload → Next webhooks for revalidate.
- Monitoring: healthchecks + logs.

---

## 3. QA Requirements

### Unit tests
- Prediction scoring logic.
- API validation with Zod.

### Integration tests
- Post creation + comment + vote.
- Prediction saved and scored after match.

### E2E (Playwright)
- Registration/login.
- Feed scrolling and sorting.
- Match-center (prediction before deadline, points after result).
- Leaderboard shows correct top.
- News pages render with OG-tags.

### SEO checks
- Titles, descriptions, canonical.
- JSON-LD valid.
- Sitemap and robots valid.

### Performance (Lighthouse)
- LCP ≤ 2.5s, CLS < 0.1, INP ≤ 200ms.
- Bundle main ≤ 180 KB.

### Security
- Passwords hashed (bcrypt).
- UGC sanitized.
- Rate limits for posts, comments, votes, predictions.

---

## 4. MVP Roadmap

### Iteration 1 — Auth + Users
- **Goal:** registration/login via Payload.
- **Exit:** user can register, login, logout; session in cookie.
- **DoD:** unit (bcrypt), E2E (register/login), passwords hashed.

### Iteration 2 — Posts + Feed
- **Goal:** posts and comments.
- **Exit:** user can create post/comment; feed displays.
- **DoD:** unit (post validation), E2E (create/view), SEO canonical.

### Iteration 3 — Voting + Ranking
- **Goal:** voting + hot/top sorting.
- **Exit:** votes update score; feed sorted.
- **DoD:** unit (score calc), E2E (vote once, score changes).

### Iteration 4 — Matches (Directus data)
- **Goal:** fixtures list + match-center.
- **Exit:** fixtures load from Directus; match detail page works.
- **DoD:** integration (Zod validation), E2E (list + detail), SEO SportsEvent.

### Iteration 5 — Predictions + Leaderboard
- **Goal:** users predict and get points.
- **Exit:** predictions before deadline; points after match; leaderboard updates.
- **DoD:** unit (scoring), integration (save+score), E2E (predict→result→points).

### Iteration 6 — News + SEO polish
- **Goal:** news section + SEO baseline.
- **Exit:** news render; sitemap+robots valid; JSON-LD everywhere.
- **DoD:** E2E (news open), SEO tests pass, Lighthouse LCP ≤ 2.5s.

---
