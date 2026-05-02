-- Add admin flag to players (only settable via migrations / service role)
alter table players add column is_admin boolean not null default false;

-- Grant admin to joshbob@gmail.com
update players
set is_admin = true
where id in (select id from auth.users where email = 'joshbob@gmail.com');

-- Prevent privilege escalation: a player cannot grant themselves admin
-- (is_admin can only remain true if they were already an admin before the update)
drop policy "players: update own row" on players;

create policy "players: update own row"
  on players for update
  using (auth.uid() = id)
  with check (
    not is_admin
    or exists (select 1 from players p where p.id = auth.uid() and p.is_admin = true)
  );

-- Admins can see ALL releases, including private ones
create policy "releases: admin can read all"
  on releases for select
  using (
    exists (select 1 from players where id = auth.uid() and is_admin = true)
  );

-- Admins can update releases (e.g. toggle private)
create policy "releases: admin can update"
  on releases for update
  using (
    exists (select 1 from players where id = auth.uid() and is_admin = true)
  );
