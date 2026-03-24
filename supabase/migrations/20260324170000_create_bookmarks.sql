create extension if not exists pgcrypto;

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  title text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookmarks_user_created_at_idx
  on public.bookmarks (user_id, created_at desc);

create index if not exists bookmarks_tags_idx
  on public.bookmarks using gin (tags);

create or replace function public.set_bookmarks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bookmarks_updated_at on public.bookmarks;
create trigger set_bookmarks_updated_at
before update on public.bookmarks
for each row
execute function public.set_bookmarks_updated_at();

alter table public.bookmarks enable row level security;

drop policy if exists "Users can view their own bookmarks" on public.bookmarks;
create policy "Users can view their own bookmarks"
on public.bookmarks
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own bookmarks" on public.bookmarks;
create policy "Users can insert their own bookmarks"
on public.bookmarks
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own bookmarks" on public.bookmarks;
create policy "Users can delete their own bookmarks"
on public.bookmarks
for delete
using (auth.uid() = user_id);

alter publication supabase_realtime add table public.bookmarks;
