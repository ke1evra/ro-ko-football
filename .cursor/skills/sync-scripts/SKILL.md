---
name: sync-scripts
description: Runs and modifies ETL scripts under scripts/ for Payload football data. Use when editing sync-fixtures, sync-standings, sync-teams, import scripts, or when the user asks to sync leagues, fixtures, standings, teams, or countries.
---

# Sync scripts

## Location

- Primary workers: `scripts/sync-*.mjs`, imports: `scripts/import-*.mjs`, prediction stats: `scripts/prediction-stats/`.

## Commands (from package.json)

- Fixtures: `pnpm run sync:fixtures` (loop: `pnpm run sync:fixtures:loop`)
- Seasons / standings / teams / countries / events: `pnpm run sync:seasons`, `sync:standings`, `sync:teams`, `sync:countries`, `sync:match-events`, etc.
- Predictions analytics: `pnpm run predictions:stats:calc`, `predictions:stats:recalc`, and related `by-match` / `by-user` scripts.

## Editing principles

1. **Idempotent writes**: upsert by natural keys (`fixtureId`, league/team ids) as existing scripts do.
2. **Env**: load configuration the same way sibling scripts do (`dotenv`, CLI flags).
3. **Payload API**: use `getPayload` / patterns from neighboring scripts; avoid one-off Mongo clients unless the repo already does for that job.
4. After changing which fields are written, update the **collection schema** and run `pnpm run generate:types`.

## Safety

- Do not hardcode API keys; use env vars only.
- Large loops should respect rate limits (LiveScore) and existing throttling helpers.

## Verify

- Dry-run or small limit if the script supports it; otherwise run once against dev/staging DB.
- `pnpm run type-check` if you touch shared `src/lib` types used by scripts.
