---
name: quality-gate
description: Validates TypeScript and lint before finishing a change. Use when the user asks if the branch is ready, before a commit or PR, or after substantive edits to src/ or scripts/.
---

# Quality gate

## Required (per `ai.md` §6)

1. **TypeScript**: `pnpm run type-check`  
   - Uses `tsconfig.typecheck.json`. A clean run is required before calling work “done”.
2. **Lint/format**: `pnpm run lint` (Next ESLint + Prettier) when you changed style-sensitive files or touched many files.

## Fast single-file ESLint (optional)

```bash
npx eslint path/to/file.ts
```

## Combined

- `pnpm run check` → `type-check` + `lint`.

## When type errors involve Payload `Where`

- Follow `ai.md` §6: narrow `unknown` first; use intentional `as unknown as …` or a single-line `eslint-disable-next-line @typescript-eslint/no-explicit-any` **with a comment** only when Payload typings block progress.

## Iteration docs (optional team habit)

- If the team tracks iterations in markdown, create/update `NN_ITERATION_*.md` describing behavior and verification commands run.
