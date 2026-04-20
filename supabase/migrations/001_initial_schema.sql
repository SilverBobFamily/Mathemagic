-- supabase/migrations/001_initial_schema.sql

create table releases (
  id          serial primary key,
  name        text not null,
  icon        text not null,
  number      int  not null unique,
  color_hex   text not null
);

create table cards (
  id             serial primary key,
  release_id     int  not null references releases(id),
  name           text not null,
  type           text not null check (type in ('creature','item','action','event')),
  value          int,
  operator       text,
  operator_value numeric,
  effect_type    text check (effect_type in ('zero_out','banish','mirror','x100','swap','reverse')),
  art_emoji      text not null,
  art_url        text,
  flavor_text    text not null,
  effect_text    text
);
