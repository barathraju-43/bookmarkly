# Bookmarkly Decision Log

## Scope Decisions

- We kept the stack exactly as requested: Next.js App Router, Supabase Auth/DB/Realtime, Tailwind CSS, and Vercel deployment. This keeps the take-home aligned with the brief and avoids introducing extra infra or auth layers.
- We limited the v1 data model to a single `bookmarks` table and kept `recently deleted` as a client-side seven-day recovery layer. That preserves the required RLS boundary on the primary private data without expanding the schema for a feature that was explicitly framed as friendly enhancement.

## Product Decisions

- The bonus feature remained search plus tag filtering because it improves day-to-day retrieval immediately and fits the bookmark-manager core better than adding unrelated complexity.
- Editable bookmarks were added through the same modal used for creation. Reusing one flow keeps the UI consistent and reduces implementation surface area while still making the app feel more complete.
- Restore from `Recently deleted` recreates the bookmark through the normal create path instead of trying to undelete a removed row. The original row is gone after deletion, so restoration is treated as a new saved bookmark with the same user-facing data.

## UI Decisions

- The dashboard was pulled back toward the Stitch direction after a larger rewrite drifted away from the reference. The adjustment was to preserve the Stitch shell and make narrower functional edits rather than redesigning the workspace again.
- `Bookmarkly` now sits on the left of the top bar, while search and tag filters share a single compact toolbar beneath the hero. This matched the user feedback better than the centered brand and separated filter rows.
- Tags use deterministic color assignment derived from the tag text. That keeps the interface visually richer while ensuring the same tag always appears with the same color.
- The left sidebar was switched to a fixed-height, sticky layout so the primary actions remain visible without needing to scroll the page.
- The left sidebar was reduced to `Library` and `Recently deleted` only. `Tags` was removed from the rail because the same information already lives in the content toolbar, and duplicating it as navigation made the layout feel busier than the Stitch reference.
- The layout selector was changed from an always-visible segmented control to a compact `Layout` menu. This keeps the Stitch top bar cleaner while still exposing display modes only when the user asks for them.
- `Sign Out` was moved into the top-right profile menu to match common product patterns and free the sidebar for collection-oriented actions.
- The page now uses one main document scroll instead of an inner scroll region for the library pane. The nested scrolling worked mechanically, but it felt heavier and less natural than the broader Stitch composition.
- Search was moved back into the top header to better match Stitch, while tag filters stay as functional chips beneath the hero. That keeps the look closer to the reference without turning tags into dead navigation.
- The final layout system stays with `List` and `Icons`. Both modes were visually tightened to feel more like Stitch through stronger card geometry, larger visual anchors, and clearer typographic hierarchy rather than by introducing another layout mode.

## Technical Decisions

- Realtime now listens for `INSERT`, `UPDATE`, and `DELETE` so edits stay in sync across tabs, not just creates and removals.
- `recentlyDeleted` is initialized empty on first render and then hydrated from `localStorage` in an effect. This avoids server/client hydration mismatches caused by deleted counts differing between SSR and the browser.
- The `localStorage` write-back is gated until the deleted-bookmark list has first been loaded from storage. Without that guard, the initial empty client state could overwrite a valid stored recovery list before hydration completed.
- Bookmark URL validation is enforced with the same normalization helper on both the client modal and the server actions. That keeps add/edit behavior consistent and prevents obviously invalid entries from slipping through on direct action calls.

## Validation Decisions

- We kept the main safety net as unit/integration tests plus lint/build/e2e, then added a browser-level pass with `browser-use` for rendered verification.
- In this environment, `browser-use` could validate the live local app shell and capture screenshots, but it did not inherit the signed-in Supabase session from the user’s Comet browser profile. That limitation was recorded rather than hidden so manual authenticated review can remain explicit.
