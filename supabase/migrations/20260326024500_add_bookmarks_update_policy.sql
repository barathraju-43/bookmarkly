drop policy if exists "Users can update their own bookmarks" on public.bookmarks;
create policy "Users can update their own bookmarks"
on public.bookmarks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
