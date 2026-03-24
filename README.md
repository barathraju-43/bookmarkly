# Smart Bookmark

A polished bookmark manager built with Next.js App Router, Supabase Auth/Postgres/Realtime, Tailwind CSS, and shadcn/ui.

## Stack

- Next.js 16 App Router
- TypeScript
- Supabase Auth with Google OAuth
- Supabase Postgres + Row Level Security
- Supabase Realtime `postgres_changes`
- Tailwind CSS v4 + shadcn/ui
- Vitest + Testing Library
- Playwright

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env.local
```

3. Add values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Run the SQL migration in Supabase SQL Editor or through the Supabase CLI:

`supabase/migrations/20260324170000_create_bookmarks.sql`

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Auth Setup

### Google OAuth

Enable Google as the only provider in Supabase Auth.

Google Cloud OAuth client configuration:

- Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

Supabase Auth URL configuration:

- Site URL: `http://localhost:3000` for local development
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>/auth/callback`

### App flow

- The landing page starts Google OAuth from the browser using Supabase Auth.
- Supabase redirects back to `/auth/callback`.
- The callback route exchanges the code for a session and redirects to `/app`.
- `/app` is protected through Next.js proxy logic plus a server-side user check.

## Row Level Security

The `bookmarks` table is private per user and enforced in Postgres, not just in the UI.

Schema highlights:

- `user_id` references `auth.users(id)`
- `tags` uses `text[]`
- `updated_at` is maintained by a trigger
- Realtime publication includes `public.bookmarks`

Policies:

- `select`: `auth.uid() = user_id`
- `insert`: `with check (auth.uid() = user_id)`
- `delete`: `auth.uid() = user_id`

Why this is correct:

- A signed-in user can only read rows whose `user_id` matches their auth user id.
- Inserts cannot forge ownership because the database rejects rows where `user_id` does not match the session user.
- Deletes only succeed for owned rows.
- The app never uses the service role key, so browser and server requests both go through the same RLS boundary.

## Realtime Sync

The `/app` page fetches the initial bookmark list on the server for a stable first render.

After hydration, the client subscribes to Supabase Realtime with `postgres_changes`:

- `INSERT` events are filtered to `user_id=eq.<current-user-id>`
- `DELETE` events are handled by bookmark id
- local state uses an upsert helper so current-tab optimistic updates and incoming realtime events do not duplicate rows

Cleanup:

- the dashboard subscribes in a client component effect
- the returned cleanup function removes the Realtime channel on unmount
- if the component remounts under a different session, it will establish a fresh channel

## Bonus Feature

The bonus feature is search plus tag filtering.

Why I chose it:

- it makes the app materially better without inflating the scope
- it demonstrates product sense because users usually need retrieval, not just storage
- it fits the bookmark workflow naturally and stays readable in a short take-home window

Behavior:

- tags are optional on creation
- search matches title and URL client-side
- tag pills are generated from saved bookmarks
- clicking a tag applies a single active tag filter

## Problems I Ran Into

1. The local Node version in this environment (`22.8.0`) was incompatible with the newest Vitest bootstrap path I initially installed. I fixed that by downgrading Vitest to a compatible version and separating pure helper tests from browser-like component tests.
2. Next.js 16 warns that `middleware.ts` is deprecated in favor of `proxy.ts`. I switched to the new convention so the auth gate follows the current framework direction.
3. Supabase Realtime delete events are not filterable the same way insert events are. I handled deletes by id and relied on authenticated Realtime access plus RLS-backed visibility.

## One Thing I’d Improve With More Time

I would add bookmark metadata enrichment on save, especially automatic page title and hostname extraction with graceful fallbacks. That would improve capture speed without making the core data model much more complex.

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

Current automated coverage includes:

- URL normalization and tag parsing
- dashboard validation and empty state
- create flow
- search and tag filtering
- delete confirmation
- realtime insert handling and subscription cleanup
- landing page CTA
- unauthenticated `/app` redirect smoke

## Deployment Notes

Deploy to Vercel with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

After deployment, add the production callback URL to Supabase Auth Redirect URLs:

- `https://<your-vercel-domain>/auth/callback`

The live Vercel URL can be added here once deployed.

## Loom Outline

Keep the recording under 5 minutes:

1. Show the landing page and Google sign-in entry point.
2. Show the `/app` dashboard after login.
3. Add a bookmark with tags.
4. Open a second tab and demonstrate realtime sync.
5. Search by text and filter by a tag.
6. Delete a bookmark and show the confirmation dialog.
7. Briefly walk through:
   - `supabase/migrations/...create_bookmarks.sql`
   - `src/app/app/actions.ts`
   - `src/components/bookmarks/bookmark-dashboard-shell.tsx`
   - `src/lib/supabase/*`
