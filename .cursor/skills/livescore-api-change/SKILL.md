---
name: livescore-api-change
description: Adds or modifies LiveScore-backed server endpoints and HTTP usage using the project wrappers. Use when working under src/lib/http/livescore, ApiRequestLogs, or API routes that fetch competitions, matches, standings, fixtures, or events.
---

# LiveScore API change

## Architecture

- **Secrets**: `LIVESCORE_*` environment variables; only use in **server** code (route handlers, server components, `scripts/`).
- **HTTP entrypoints**: `src/lib/http/livescore/customFetch.ts` and `logged-fetch.ts`—extend here instead of scattering raw `fetch`.
- **Logging**: align with `src/collections/ApiRequestLogs.ts` when the codebase records outbound calls.

## Adding a server API route

1. Place handler under `src/app/api/.../route.ts`.
2. Call into existing Kubb-generated clients or lib wrappers—do not duplicate base URLs or auth headers.
3. Validate query/body with Zod where other routes do.
4. Return JSON with stable shapes for any `useEffect` clients.

## Client components

- Widgets may call **your** `/api/...` routes, not LiveScore directly (see `ai.md` §4.1 pattern: server route + client consumer).

## Verification

- `pnpm run type-check`
- Hit the route locally and confirm no secret leakage in responses or browser bundles (`next build` / bundle analysis if unsure).

## Reference

- Service list and method families: `ai.md` §5 (catalogs, matches, tables, fixtures, events, lineups, utility).
