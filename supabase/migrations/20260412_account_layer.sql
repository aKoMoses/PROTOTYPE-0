create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text not null,
  avatar_key text not null default 'vanguard',
  account_kind text not null default 'registered' check (account_kind in ('registered')),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.player_progression (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  best_survival_wave integer not null default 0 check (best_survival_wave >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  winstreak integer not null default 0 check (winstreak >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_loadouts (
  player_id uuid not null references public.profiles(id) on delete cascade,
  id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  favorite boolean not null default false,
  source text not null default 'custom' check (source in ('custom', 'system')),
  system_preset boolean not null default false,
  preset_key text,
  preset_unlock_level integer not null default 1 check (preset_unlock_level >= 1),
  role text not null default '',
  description text not null default '',
  tags text[] not null default '{}',
  build jsonb not null default '{}'::jsonb,
  primary key (player_id, id)
);

alter table public.profiles enable row level security;
alter table public.player_progression enable row level security;
alter table public.player_loadouts enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read own progression" on public.player_progression;
create policy "Users can read own progression"
on public.player_progression
for select
using ((select auth.uid()) = player_id);

drop policy if exists "Users can insert own progression" on public.player_progression;
create policy "Users can insert own progression"
on public.player_progression
for insert
with check ((select auth.uid()) = player_id);

drop policy if exists "Users can update own progression" on public.player_progression;
create policy "Users can update own progression"
on public.player_progression
for update
using ((select auth.uid()) = player_id)
with check ((select auth.uid()) = player_id);

drop policy if exists "Users can read own loadouts" on public.player_loadouts;
create policy "Users can read own loadouts"
on public.player_loadouts
for select
using ((select auth.uid()) = player_id);

drop policy if exists "Users can insert own loadouts" on public.player_loadouts;
create policy "Users can insert own loadouts"
on public.player_loadouts
for insert
with check ((select auth.uid()) = player_id);

drop policy if exists "Users can update own loadouts" on public.player_loadouts;
create policy "Users can update own loadouts"
on public.player_loadouts
for update
using ((select auth.uid()) = player_id)
with check ((select auth.uid()) = player_id);

drop policy if exists "Users can delete own loadouts" on public.player_loadouts;
create policy "Users can delete own loadouts"
on public.player_loadouts
for delete
using ((select auth.uid()) = player_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_player_progression_updated_at on public.player_progression;
create trigger set_player_progression_updated_at
before update on public.player_progression
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_player_loadouts_updated_at on public.player_loadouts;
create trigger set_player_loadouts_updated_at
before update on public.player_loadouts
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_new_user()
returns trigger
set search_path = ''
as $$
declare
  derived_display_name text;
begin
  derived_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(new.email, '@', 1),
    'Pilot'
  );

  insert into public.profiles (id, display_name, avatar_key, account_kind, last_seen_at)
  values (new.id, left(derived_display_name, 24), 'vanguard', 'registered', now())
  on conflict (id) do update
  set display_name = excluded.display_name,
      last_seen_at = now();

  insert into public.player_progression (player_id)
  values (new.id)
  on conflict (player_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();