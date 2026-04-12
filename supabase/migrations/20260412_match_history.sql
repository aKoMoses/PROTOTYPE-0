create table if not exists public.player_match_history (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  player_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid references public.profiles(id) on delete set null,
  room_id text not null default '',
  room_kind text not null default 'duel',
  mode text not null default 'duel',
  result text not null check (result in ('win', 'loss', 'draw')),
  map_key text not null default 'unknown',
  map_name text not null default 'Unknown Arena',
  rounds_won integer not null default 0 check (rounds_won >= 0),
  rounds_lost integer not null default 0 check (rounds_lost >= 0),
  score text not null default '--',
  xp_delta integer not null default 0 check (xp_delta >= 0),
  selected_loadout_id text,
  loadout_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (match_id, player_id)
);

create index if not exists player_match_history_player_completed_idx
  on public.player_match_history (player_id, completed_at desc);

alter table public.player_match_history enable row level security;

drop policy if exists "Users can read own match history" on public.player_match_history;
create policy "Users can read own match history"
on public.player_match_history
for select
using ((select auth.uid()) = player_id);

drop function if exists public.record_authoritative_match_result(text, text, text, text, text, text, timestamptz, timestamptz, jsonb);
create or replace function public.record_authoritative_match_result(
  p_match_id text,
  p_room_id text,
  p_room_kind text,
  p_mode text,
  p_map_key text,
  p_map_name text,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_players jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  entry record;
  current_progression public.player_progression%rowtype;
  inserted_history_id uuid;
  next_xp integer;
  next_wins integer;
  next_losses integer;
  next_winstreak integer;
begin
  if jsonb_typeof(coalesce(p_players, '[]'::jsonb)) <> 'array' then
    raise exception 'record_authoritative_match_result expects p_players to be a JSON array';
  end if;

  for entry in
    select *
    from jsonb_to_recordset(coalesce(p_players, '[]'::jsonb)) as payload(
      player_id uuid,
      opponent_id uuid,
      result text,
      rounds_won integer,
      rounds_lost integer,
      xp_delta integer,
      selected_loadout_id text,
      loadout_snapshot jsonb
    )
  loop
    if entry.player_id is null then
      raise exception 'player_id is required for every match participant';
    end if;

    inserted_history_id := null;

    insert into public.player_match_history (
      match_id,
      player_id,
      opponent_id,
      room_id,
      room_kind,
      mode,
      result,
      map_key,
      map_name,
      rounds_won,
      rounds_lost,
      score,
      xp_delta,
      selected_loadout_id,
      loadout_snapshot,
      started_at,
      completed_at,
      metadata
    ) values (
      p_match_id,
      entry.player_id,
      entry.opponent_id,
      coalesce(p_room_id, ''),
      coalesce(nullif(trim(p_room_kind), ''), 'duel'),
      coalesce(nullif(trim(p_mode), ''), 'duel'),
      case when entry.result = 'win' then 'win' when entry.result = 'loss' then 'loss' else 'draw' end,
      coalesce(nullif(trim(p_map_key), ''), 'unknown'),
      coalesce(nullif(trim(p_map_name), ''), 'Unknown Arena'),
      greatest(coalesce(entry.rounds_won, 0), 0),
      greatest(coalesce(entry.rounds_lost, 0), 0),
      greatest(coalesce(entry.rounds_won, 0), 0)::text || '-' || greatest(coalesce(entry.rounds_lost, 0), 0)::text,
      greatest(coalesce(entry.xp_delta, 0), 0),
      nullif(trim(coalesce(entry.selected_loadout_id, '')), ''),
      coalesce(entry.loadout_snapshot, '{}'::jsonb),
      p_started_at,
      coalesce(p_completed_at, now()),
      jsonb_build_object('source', 'colyseus_authoritative')
    )
    on conflict (match_id, player_id) do nothing
    returning id into inserted_history_id;

    if inserted_history_id is null then
      continue;
    end if;

    select * into current_progression
    from public.player_progression
    where player_id = entry.player_id
    for update;

    if not found then
      insert into public.player_progression (player_id, xp, level, wins, losses, winstreak, best_survival_wave)
      values (entry.player_id, 0, 1, 0, 0, 0, 0)
      returning * into current_progression;
    end if;

    next_xp := greatest(coalesce(current_progression.xp, 0), 0) + greatest(coalesce(entry.xp_delta, 0), 0);
    next_wins := coalesce(current_progression.wins, 0) + case when entry.result = 'win' then 1 else 0 end;
    next_losses := coalesce(current_progression.losses, 0) + case when entry.result = 'loss' then 1 else 0 end;
    next_winstreak := case
      when entry.result = 'win' then coalesce(current_progression.winstreak, 0) + 1
      when entry.result = 'loss' then 0
      else coalesce(current_progression.winstreak, 0)
    end;

    update public.player_progression
    set xp = next_xp,
        level = greatest(1, next_xp + 1),
        wins = next_wins,
        losses = next_losses,
        winstreak = next_winstreak
    where player_id = entry.player_id;
  end loop;
end;
$$;

grant execute on function public.record_authoritative_match_result(text, text, text, text, text, text, timestamptz, timestamptz, jsonb) to authenticated;
grant execute on function public.record_authoritative_match_result(text, text, text, text, text, text, timestamptz, timestamptz, jsonb) to service_role;