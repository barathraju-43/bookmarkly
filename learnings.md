# Learnings

## 2026-03-24

- If Google OAuth succeeds but `/app` crashes with `Could not find the table 'public.bookmarks' in the schema cache`, the auth flow is not the issue. The Supabase project configured in `.env.local` does not currently have the `public.bookmarks` table available. Check that the migration SQL was executed against the exact project referenced by `NEXT_PUBLIC_SUPABASE_URL`, and verify the table exists in `Database -> Tables` before debugging app code.
- If a dialog body depends on optional state like `pendingDelete`, guard the dialog content itself behind that state. Some dialog primitives still evaluate the subtree while closed, which can crash the dashboard on first render if the content reads properties from `null`.
- If a sidebar button includes a visible count badge inside the same clickable element, its accessible name becomes the combined label plus count. Tests and future selectors should match `Tags 3` style names or use a prefix pattern instead of assuming the plain text label alone.
- If the user asks for targeted functional changes on top of an approved UI direction, preserve the existing design shell and patch within it. Replacing the broader layout makes review harder and reads as missing the brief, even if the new UI is internally cleaner.
- If a client component reads browser-only state like `localStorage` during initial render and that state affects visible markup, it can cause hydration mismatch errors. Initialize with a server-safe value, then hydrate in an effect.
- If you hydrate state from `localStorage` in one effect and persist it back in another, guard the write effect until the initial read has completed. Otherwise the empty initial state can overwrite the stored value before hydration finishes.
- `browser-use` is usable in this environment through `uvx browser-use ...`, but it does not automatically share the signed-in Supabase session from the user’s Comet browser profile. It is still useful for rendered shell validation and screenshots, but authenticated dashboard review may require manual browser verification or a session-aware profile setup.

## 2026-03-25

- If a visible segmented control is replaced with an accessible dropdown menu, tests must follow the new ARIA roles. The selectable options become `menuitem`s, so querying them as plain `button`s will fail even though the UI works.
- If a desktop sidebar holds the only entry points for core actions like `Add Bookmark` or `Sign Out`, those actions can disappear entirely on smaller screens where the sidebar collapses. Mirror critical actions into the top bar or a mobile-specific control instead of assuming the desktop rail is always present.
- URL validation for bookmarks needs hostname-level checks, not just `new URL(...)`. Inputs like `bookmark` can parse after adding `https://`, so the validator should reject hosts that are not localhost, IPs, or dotted domains.
- Requiring only “contains a dot” for domains is still too weak for bookmark URLs. Hostnames like `github.local` will slip through unless the top-level label is checked against a domain-style suffix rule and reserved local-only suffixes such as `.local`, `.test`, `.invalid`, and `.example` are rejected.
- When a layout remap is the goal, keep the behavior tree stable and change the page geometry first. Replacing active controls or moving search/tags into entirely new interaction models makes it harder to judge whether the visual mismatch is fixed.
- `browser-use` can capture screenshots from a local worktree dev server, but its immediate DOM state probe may still report an empty tree if queried too early. Treat the screenshot and the app server logs as the reliable signals in that situation.
- If the user asks for the Stitch look and feel but not the Stitch feature set, preserve the reference geometry first and avoid inventing new layout modes. A tighter `List` and `Icons` pass is easier to review than adding a third mode the user did not ask to keep.
- If Supabase Realtime is protected by auth/RLS, do not open the channel before `realtime.setAuth(...)` has been applied with the current session token. Subscribing first can silently leave cross-tab sync dead even though local create and delete flows still appear to work.
