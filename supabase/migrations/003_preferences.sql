-- supabase/migrations/003_preferences.sql

alter table players
  add column active_release_ids  int[]   default null,
  add column learning_mode       boolean default false;
