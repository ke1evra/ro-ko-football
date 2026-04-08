---
name: match-widgets-data
description: Implements or debugs home and match widgets that combine Payload league config with LiveScore match data. Use when editing src/components/home, TopMatchesLeagues global, /api/matches routes, or widgets like LiveMatchesWidget, UpcomingMatches, YesterdaysMatches.
---

# Match widgets & data flow

## Pattern

1. **League selection** often comes from Payload globals/collections (e.g. top leagues IDs) via server helpers like existing `getTopMatchesLeagueIds()` patterns in `src/components/home/`.
2. **Match payloads** are fetched **on the server** through `src/app/api/...` routes that call LiveScore wrappers (`src/lib/http/livescore/`).
3. **Client components** consume only your JSON API—never LiveScore keys.

## Files to inspect first

- `src/globals/TopMatchesLeagues.ts` (and related home data helpers).
- `src/components/home/*` for established widget composition.
- `src/app/api/` for routes named like `matches`, `fixtures`, `history`.

## Checklist

- [ ] Loading and empty states match sibling widgets.
- [ ] Timezones and `date-fns` usage follow nearby components (ru locale where used).
- [ ] No secret env vars referenced from client bundles.

## Verify

- `pnpm run type-check`
- Manual: load the home route and confirm network calls hit **your** API only.
