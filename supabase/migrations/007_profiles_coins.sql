-- supabase/migrations/005_profiles_coins.sql

-- Profile and stats columns
alter table players
  add column if not exists avatar_url    text,
  add column if not exists coins         int not null default 0 check (coins >= 0),
  add column if not exists games_won     int not null default 0 check (games_won >= 0),
  add column if not exists games_played  int not null default 0 check (games_played >= 0);

-- Public profile reads (drop the combined policy, replace with granular ones)
drop policy if exists "players: read own row"   on players;
drop policy if exists "players: insert own row" on players;
drop policy if exists "players: update own row" on players;
create policy "players: public read"  on players for select using (true);
create policy "players: own insert"   on players for insert with check (auth.uid() = id);
create policy "players: own update"   on players for update using (auth.uid() = id);

-- Award win: +10 coins, +1 win, +1 played for winner; +1 played for loser
-- SECURITY DEFINER runs as owner (postgres), bypassing RLS
create or replace function award_win(p_winner_id uuid, p_loser_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  update players set
    coins        = coins + 10,
    games_won    = games_won + 1,
    games_played = games_played + 1
  where id = p_winner_id;

  update players set
    games_played = games_played + 1
  where id = p_loser_id;
end;
$$;

-- Award tie: only played count, no coins
create or replace function award_tie(p_player1_id uuid, p_player2_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  update players set
    games_played = games_played + 1
  where id in (p_player1_id, p_player2_id);
end;
$$;

-- Restrict direct RPC calls: only service_role can call award functions
-- (prevents browser clients from calling award_win directly)
revoke execute on function award_win  from public, anon, authenticated;
revoke execute on function award_tie  from public, anon, authenticated;
grant  execute on function award_win  to service_role;
grant  execute on function award_tie  to service_role;
