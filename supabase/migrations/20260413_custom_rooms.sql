-- Custom rooms for lobby/matchmaking (Étape 4)
-- Requires: 20260412_account_layer.sql already applied

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.custom_rooms (
  id            uuid        primary key default gen_random_uuid(),
  creator_id    uuid        not null references public.profiles(id) on delete cascade,
  name          text        not null check (char_length(name) >= 1 and char_length(name) <= 40),
  format        text        not null check (format in ('1v1', '2v2')),
  status        text        not null default 'waiting'
                              check (status in ('waiting', 'in_progress', 'closed')),
  bot_count     integer     not null default 0,
  bot_difficulty text       not null default 'normal'
                              check (bot_difficulty in ('easy', 'normal', 'hard')),
  max_players   integer     not null default 2,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (
    (
      format = '1v1'
      and bot_count between 0 and 1
      and max_players between 1 and 2
      and max_players + bot_count = 2
    )
    or
    (
      format = '2v2'
      and bot_count between 0 and 3
      and max_players between 1 and 4
      and max_players + bot_count = 4
    )
  )
);

create table if not exists public.room_members (
  room_id      uuid        not null references public.custom_rooms(id) on delete cascade,
  player_id    uuid        not null references public.profiles(id) on delete cascade,
  display_name text        not null,
  avatar_key   text        not null default 'vanguard',
  is_ready     boolean     not null default false,
  is_host      boolean     not null default false,
  joined_at    timestamptz not null default now(),
  primary key (room_id, player_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: updated_at on custom_rooms
-- ─────────────────────────────────────────────────────────────────────────────

create trigger set_custom_rooms_updated_at
  before update on public.custom_rooms
  for each row
  execute function public.set_current_timestamp_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.custom_rooms  enable row level security;
alter table public.room_members  enable row level security;

-- custom_rooms: any authenticated user may browse waiting rooms
drop policy if exists "Authenticated users can view waiting rooms" on public.custom_rooms;
create policy "Authenticated users can view waiting rooms"
  on public.custom_rooms for select
  using (auth.uid() is not null);

-- custom_rooms: insert — creator must match current user
drop policy if exists "Users can create rooms" on public.custom_rooms;
create policy "Users can create rooms"
  on public.custom_rooms for insert
  with check ((select auth.uid()) = creator_id);

-- custom_rooms: update — only the creator may update their own room
drop policy if exists "Hosts can update own room" on public.custom_rooms;
create policy "Hosts can update own room"
  on public.custom_rooms for update
  using ((select auth.uid()) = creator_id);

-- custom_rooms: delete — only the creator may close/delete their room
drop policy if exists "Hosts can delete own room" on public.custom_rooms;
create policy "Hosts can delete own room"
  on public.custom_rooms for delete
  using ((select auth.uid()) = creator_id);

-- room_members: any authenticated user may view members of any room
drop policy if exists "Authenticated users can view room members" on public.room_members;
create policy "Authenticated users can view room members"
  on public.room_members for select
  using (auth.uid() is not null);

-- room_members: insert — the joining user must match player_id
drop policy if exists "Users can join rooms" on public.room_members;
create policy "Users can join rooms"
  on public.room_members for insert
  with check ((select auth.uid()) = player_id);

-- room_members: update — member may only update their own row (ready state)
drop policy if exists "Members can update own ready state" on public.room_members;
create policy "Members can update own ready state"
  on public.room_members for update
  using ((select auth.uid()) = player_id);

-- room_members: delete — member may leave their own row
drop policy if exists "Members can leave rooms" on public.room_members;
create policy "Members can leave rooms"
  on public.room_members for delete
  using ((select auth.uid()) = player_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime publication
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel rel
    join pg_class cls on cls.oid = rel.prrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    join pg_publication pub on pub.oid = rel.prpubid
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and cls.relname = 'custom_rooms'
  ) then
    alter publication supabase_realtime add table public.custom_rooms;
  end if;

  if not exists (
    select 1
    from pg_publication_rel rel
    join pg_class cls on cls.oid = rel.prrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    join pg_publication pub on pub.oid = rel.prpubid
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and cls.relname = 'room_members'
  ) then
    alter publication supabase_realtime add table public.room_members;
  end if;
end $$;
