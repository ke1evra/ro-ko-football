---
name: payload-schema-change
description: Updates Payload collections or globals safely and regenerates types. Use when adding or changing fields, access control, hooks, indexes, or registering collections in payload.config.ts.
---

# Payload schema change

## Before editing

1. Open the target collection/global and **one similar existing file** (e.g. `Fixtures`, `Posts`) to mirror patterns for `access`, `admin`, `labels`, and hooks.
2. Check whether the data is **sync-only** (no user CRUD) vs **UGC**—set `access.create` / `update` / `delete` accordingly.

## Edit checklist

- [ ] Fields: `name`, `type`, `required`, `index: true` when filtering/sorting in admin or API.
- [ ] `access`: explicit rules; reuse `User` role checks (`admin` vs owner) like `src/collections/Users.ts`.
- [ ] `hooks`: only for behavior that belongs in CMS (slug, denormalized fields, revalidation side effects).
- [ ] Register new collections in `src/payload.config.ts` in the correct group order if admin UX matters.

## After editing

1. Run `pnpm run generate:types`.
2. Run `pnpm run type-check` and fix new errors in consumers (`src/app`, `src/lib`, API routes).
3. If admin UI uses custom components, run `pnpm run generate:importmap` when imports break.

## Do not

- Change `src/payload-types.ts` by hand.
- Loosen `access` on sync-owned football collections without an explicit product/security decision.
