# Bookmarkly

A polished bookmark manager built for the Abstrabit Fullstack Engineer take-home assessment.

- Live URL: [https://bookmarkly-rose.vercel.app](https://bookmarkly-rose.vercel.app)
- GitHub Repo: [https://github.com/barathraju-43/bookmarkly](https://github.com/barathraju-43/bookmarkly)

## What I Built

Bookmarkly is a private bookmark manager with:

- Google OAuth only authentication
- private per-user bookmarks enforced with Supabase Row Level Security
- realtime cross-tab sync using Supabase Realtime
- create, edit, delete, and restore flows
- a polished dashboard with `List` and `Icons` layouts
- tag-based organization and fast client-side retrieval

The goal was to ship something that feels like a real product, not just a CRUD demo.

## Stack

- Next.js 16 with App Router
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Realtime
- Tailwind CSS
- shadcn/ui primitives
- Vitest + Testing Library
- Playwright
- Vercel

## Features

### Core Requirements

- Google OAuth login
- add bookmarks with validation
- private bookmarks per user
- realtime sync across tabs
- delete with confirmation
- deployed on Vercel
- responsive polished UI

### Additional UX Improvements

- editable bookmarks
- recently deleted view with restore
- deterministic tag colors for quicker scanning
- two dashboard display modes: `List` and `Icons`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
cp .env.example .env.local
```

3. Add:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Run the SQL migration in Supabase:

```text
supabase/migrations/20260324170000_create_bookmarks.sql
```

5. Start the app:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Supabase Auth Setup

### Google OAuth

I enabled Google as the only Supabase auth provider, matching the assessment requirement exactly.

Google Cloud configuration:

- OAuth client type: `Web application`
- Authorized redirect URI:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`

Supabase Auth configuration:

- Local Site URL:
  - `http://localhost:3000`
- Production Site URL:
  - `https://bookmarkly-rose.vercel.app`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://bookmarkly-rose.vercel.app/auth/callback`

### Auth Flow

- The landing page starts the Google OAuth flow from the browser.
- Supabase handles the provider redirect.
- `/auth/callback` exchanges the auth code for a session.
- Protected navigation is enforced both in `src/proxy.ts` and again on the server in `src/app/app/page.tsx`.

This avoids login flicker while still keeping the authenticated route safe on the server.

## Database Schema And RLS

The app uses one main table:

```sql
public.bookmarks
```

Key columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `url text not null`
- `title text not null`
- `tags text[] not null default '{}'`
- `created_at timestamptz`
- `updated_at timestamptz`

Supporting pieces:

- index on `(user_id, created_at desc)`
- GIN index on `tags`
- `updated_at` trigger
- realtime publication for `public.bookmarks`

### RLS Policies

Policies in [supabase/migrations/20260324170000_create_bookmarks.sql](/Users/barathraju/Documents/smart_bookmark_manager/.worktrees/stitch-layout/supabase/migrations/20260324170000_create_bookmarks.sql):

- `select`
  - `auth.uid() = user_id`
- `insert`
  - `with check (auth.uid() = user_id)`
- `delete`
  - `auth.uid() = user_id`

Why this is correct:

- users can only read rows they own
- users cannot insert bookmarks on behalf of another user
- users cannot delete another user’s bookmarks
- the app does not use a service role key in runtime, so requests still go through RLS

That means privacy is enforced by the database, not just by conditional frontend rendering.

## Realtime Sync

Initial bookmark data is fetched server-side in [src/app/app/page.tsx](/Users/barathraju/Documents/smart_bookmark_manager/.worktrees/stitch-layout/src/app/app/page.tsx) for a stable first render.

After hydration, the client sets up a Supabase Realtime subscription in [src/components/bookmarks/bookmark-dashboard-shell.tsx](/Users/barathraju/Documents/smart_bookmark_manager/.worktrees/stitch-layout/src/components/bookmarks/bookmark-dashboard-shell.tsx).

Implementation details:

- uses `postgres_changes`
- listens to `INSERT`, `UPDATE`, and `DELETE`
- insert and update are filtered by:
  - `user_id=eq.<current-user-id>`
- delete is reconciled by bookmark id
- incoming records are merged with an upsert helper to avoid duplicates

Important cleanup details:

- the subscription function returns a cleanup callback
- on unmount, the channel is removed with `supabase.removeChannel(channel)`
- the realtime auth token is applied before the channel subscribes
- auth state changes refresh the realtime token if the session changes

This matters because with authenticated realtime plus RLS, subscribing before `realtime.setAuth(...)` can silently break cross-tab sync.

## Bonus Feature

The official bonus feature is:

- `search + tag filtering`

Why I chose it:

- bookmark managers become useful when retrieval is fast, not just when storage works
- it improves the core product loop immediately
- it adds product value without exploding scope

Behavior:

- tags are optional on create/edit
- search matches bookmark title and URL
- tags are generated from the user’s saved bookmarks
- clicking a tag applies a single active tag filter

## Other Product Decisions

I also added two small usability improvements because they made the product feel more complete without changing the core scope:

- editable bookmarks
  - users can fix titles, URLs, or tags without deleting and recreating entries
- recently deleted with restore
  - deleted bookmarks are recoverable for seven days from local state

I consider these UX refinements, not the official bonus feature.

## Design Approach

I aimed for a polished editorial productivity interface rather than a default admin-style CRUD dashboard.

Design decisions:

- stitch-inspired layout direction
- strong card geometry and soft gradients
- compact top navigation
- focused sidebar
- clear empty and loading states
- responsive layout behavior

I intentionally kept only `List` and `Icons` layout modes in the final version. That kept the product more coherent and avoided shipping a visually interesting but less truthful “preview” mode.

## Problems I Ran Into And How I Solved Them

1. Supabase table not found after login

- Problem:
  - login succeeded, but `/app` crashed because the `public.bookmarks` table did not exist in the configured project
- Fix:
  - ran the migration in the correct Supabase project and verified the table plus policies existed before continuing

2. Next.js 16 routing conventions changed

- Problem:
  - `middleware.ts` is deprecated in favor of `proxy.ts`
- Fix:
  - used `src/proxy.ts` for route protection so the app follows the current framework direction

3. Hydration mismatch from browser-only state

- Problem:
  - `recently deleted` data depends on `localStorage`, which can differ between server and client render
- Fix:
  - initialized state safely on the server, then hydrated from `localStorage` in an effect and gated the write-back effect

4. Realtime cross-tab sync regressed during later UI work

- Problem:
  - the realtime channel could subscribe before the auth token was applied
- Fix:
  - explicitly waited for the session token and called `realtime.setAuth(...)` before subscribing

5. URL validation was too loose initially

- Problem:
  - plain values like `bookmark` could be normalized into something that passed URL parsing
- Fix:
  - added hostname-level validation and rejected non-domain hosts unless they are localhost or an IP

## One Thing I’d Improve With More Time

I would add bookmark metadata enrichment on save:

- automatic page title extraction
- hostname/favicon enrichment
- smarter previews when sites expose safe metadata

That would make capture faster and the library richer without changing the app’s core architecture.

## Testing

Run:

```bash
npm test
npm run lint
npm run build
```

Playwright smoke:

```bash
npm run test:e2e
```

Current coverage includes:

- URL normalization and tag parsing
- client-side validation
- create flow
- edit flow
- search and tag filtering
- delete confirmation
- recently deleted restore flow
- realtime auth ordering and subscription cleanup
- landing page CTA
- unauthenticated `/app` redirect behavior

## Deployment Notes

Vercel env vars used:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Production setup:

- Site URL:
  - `https://bookmarkly-rose.vercel.app`
- Redirect URL:
  - `https://bookmarkly-rose.vercel.app/auth/callback`

## Loom Walkthrough Outline

Suggested demo order:

1. Landing page and Google login
2. Authenticated dashboard
3. Add bookmark
4. Edit bookmark
5. Search and tag filtering
6. Realtime sync across two tabs
7. Delete confirmation
8. Recently deleted and restore
9. Code walkthrough:
   - [supabase/migrations/20260324170000_create_bookmarks.sql](/Users/barathraju/Documents/smart_bookmark_manager/.worktrees/stitch-layout/supabase/migrations/20260324170000_create_bookmarks.sql)
   - [src/app/app/actions.ts](/Users/barathraju/Documents/smart_bookmark_manager/.worktrees/stitch-layout/src/app/app/actions.ts)
   - [src/components/bookmarks/bookmark-dashboard-shell.tsx](/Users/barathraju/Documents/smart_bookmark_manager/.worktrees/stitch-layout/src/components/bookmarks/bookmark-dashboard-shell.tsx)
   - [src/lib/supabase/server.ts](/Users/barathraju/Documents/smart_bookmark_manager/.worktrees/stitch-layout/src/lib/supabase/server.ts)
   - [src/proxy.ts](/Users/barathraju/Documents/smart_bookmark_manager/.worktrees/stitch-layout/src/proxy.ts)
