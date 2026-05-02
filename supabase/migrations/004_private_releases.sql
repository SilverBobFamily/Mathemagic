-- Add private flag to releases (default public)
alter table releases add column private boolean not null default false;

-- SilverBobs release is private
update releases set private = true where name ilike '%silverbob%';

-- Track which players have access to private releases
create table player_release_access (
  player_id  uuid not null references auth.users(id) on delete cascade,
  release_id int  not null references releases(id)   on delete cascade,
  primary key (player_id, release_id)
);

alter table player_release_access enable row level security;

create policy "player_release_access: read own"
  on player_release_access for select
  using (auth.uid() = player_id);

-- RLS on releases: public releases visible to everyone,
-- private releases only to players with explicit access
alter table releases enable row level security;

create policy "releases: public visible to all"
  on releases for select
  using (not private);

create policy "releases: private visible to authorized players"
  on releases for select
  using (
    private and exists (
      select 1 from player_release_access pra
      where pra.player_id = auth.uid() and pra.release_id = releases.id
    )
  );
