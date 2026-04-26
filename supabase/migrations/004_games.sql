create table games (
  id           uuid primary key default gen_random_uuid(),
  player1_id   uuid references players(id) on delete set null,
  player2_id   uuid references players(id) on delete set null,
  state_json   jsonb not null,
  active_side  text  not null check (active_side in ('player','opponent')),
  status       text  not null default 'waiting' check (status in ('waiting','active','finished')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table games enable row level security;
-- Both participants can read/update; only authenticated users can insert (creating a game)
create policy "games: participants read" on games for select
  using (auth.uid() = player1_id or auth.uid() = player2_id);
create policy "games: participants update" on games for update
  using (auth.uid() = player1_id or auth.uid() = player2_id);
create policy "games: authenticated insert" on games for insert
  with check (auth.uid() = player1_id);
-- updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger games_updated_at before update on games
  for each row execute procedure set_updated_at();
