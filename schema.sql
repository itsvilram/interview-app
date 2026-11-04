-- Run this in Supabase: SQL Editor -> New query -> paste -> Run

create table if not exists public.items (
  id          bigint generated always as identity primary key,
  title       text not null check (char_length(title) between 1 and 200),
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Turn on Row Level Security with no policies:
-- the public (publishable/anon) key can't read or write this table directly.
-- Our backend uses the secret key, which bypasses RLS, so only the API can access it.
alter table public.items enable row level security;
