---
name: prediction-stats-workflow
description: Recalculates or inspects user prediction statistics stored in Payload. Use when the user mentions PredictionStats, leaderboard, scoring points, settle after full time, or scripts under scripts/prediction-stats/.
---

# Prediction stats workflow

## Domain

- Business logic helpers: `src/lib/predictions.ts` (and related imports—follow existing usage in collections/API).
- Collection: `src/collections/PredictionStats.ts`.
- Workers: `scripts/prediction-stats/*.mjs`.

## Commands

- Full recompute: `pnpm run predictions:stats:calc` (force: `pnpm run predictions:stats:calc:force`)
- Full rebuild from scratch: `pnpm run predictions:stats:recalc`
- Targeted: `pnpm run predictions:stats:by-match`, `by-user`, `by-post`
- Long-running loop (prod-like): `pnpm run predictions:stats:calc:loop`

## When changing scoring rules

1. Update **unit-testable** pure functions in `src/lib` first (if tests exist, extend them).
2. Adjust any **Payload fields** that store denormalized stats.
3. Run `pnpm run generate:types` if schema changed.
4. Run `pnpm run predictions:stats:recalc` or targeted scripts in dev to validate.

## Verification

- `pnpm run type-check`
- Spot-check a user doc in admin after recalculation.
