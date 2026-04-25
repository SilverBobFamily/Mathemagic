-- supabase/migrations/002_players.sql

create table players (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  created_at  timestamptz default now()
);

alter table players enable row level security;

create policy "players: read own row"
  on players for select
  using (auth.uid() = id);

create policy "players: insert own row"
  on players for insert
  with check (auth.uid() = id);

create policy "players: update own row"
  on players for update
  using (auth.uid() = id);
