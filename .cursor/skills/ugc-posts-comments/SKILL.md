---
name: ugc-posts-comments
description: Maintains user-generated content flows for posts, comments, and votes in Payload. Use when editing src/collections/Posts.ts, Comments.ts, CommentVotes.ts, related API routes, or feed/profile UI tied to UGC.
---

# UGC: posts, comments, votes

## Collections

- `src/collections/Posts.ts` — post types, slugs, prediction fields (`fixtureId`, `matchId`, etc.).
- `src/collections/Comments.ts` — threaded comments (`parent`).
- `src/collections/CommentVotes.ts` — voting constraints (one vote per user patterns—mirror existing hooks/access).

## Access model (see `ai.md` §5)

- Reads are often public; creates require auth; update/delete restricted to **admin** or **owner**—keep parity with current access functions when extending.

## Safety

- Sanitize rich text / plain content consistently with existing hooks and rendering components.
- Rate limiting: follow patterns on API routes if present when adding new mutation endpoints.

## Verify

- `pnpm run type-check`
- Exercise create/edit flows locally for both `admin` and `user` roles.
