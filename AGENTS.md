# Agent instructions (Rocoscore / payload-starter)

Use this file as the **short** repo map. Deep context lives in `ai.md` (product + dev process) and `AGENTS_SYSTEM.md` (multi-agent roles and domains).

## Stack

- **Next.js** 15 (App Router), **React** 19, **TypeScript** 5.7 (strict), **Tailwind** 4.
- **Payload CMS** 3.70 + **MongoDB** (`@payloadcms/db-mongodb`).
- **LiveScore** HTTP client under `src/lib/http/livescore/` (env: `LIVESCORE_*`).
- **Package manager**: `pnpm` (see `package.json` / `packageManager`).

## Layout

| Area | Path |
|------|------|
| App routes & API | `src/app/` |
| Payload collections | `src/collections/` |
| Globals | `src/globals/` |
| Payload config | `src/payload.config.ts` |
| UI components | `src/components/` |
| Shared lib | `src/lib/` |
| Sync / workers | `scripts/` |

## Commands (verify before finishing a task)

- Full typecheck (required for “done”): `pnpm run type-check` (uses `tsconfig.typecheck.json`).
- Lint (often fixes + format): `pnpm run lint`.
- Both: `pnpm run check`.
- Regenerate Payload types after schema changes: `pnpm run generate:types`.
- Regenerate import map when admin components change: `pnpm run generate:importmap`.

## Product scope (from `ai.md`)

In scope: football stats UX, UGC (posts/comments/votes), predictions and leaderboards, news, auth via Payload.

Out of scope for MVP doc: chat, notifications, social login, deep player analytics—do not expand scope unless the user asks.

## Cursor project AI

- Rules: `.cursor/rules/*.mdc`
- Skills: `.cursor/skills/*/SKILL.md`

When a task matches a skill’s description, follow that skill’s steps and link to existing code instead of inventing new patterns.
