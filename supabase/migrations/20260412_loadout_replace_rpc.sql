create or replace function public.replace_player_loadouts(p_loadouts jsonb default '[]'::jsonb)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  incoming_ids text[] := '{}'::text[];
begin
  if current_user_id is null then
    raise exception 'Authenticated user required';
  end if;

  if jsonb_typeof(coalesce(p_loadouts, '[]'::jsonb)) <> 'array' then
    raise exception 'replace_player_loadouts expects a JSON array';
  end if;

  select coalesce(array_agg(entry_id), '{}'::text[])
    into incoming_ids
  from (
    select nullif(trim(coalesce(entry.id, '')), '') as entry_id
    from jsonb_to_recordset(coalesce(p_loadouts, '[]'::jsonb)) as entry(
      id text
    )
  ) incoming
  where entry_id is not null;

  if coalesce(array_length(incoming_ids, 1), 0) = 0 then
    delete from public.player_loadouts
    where player_id = current_user_id;
    return;
  end if;

  delete from public.player_loadouts
  where player_id = current_user_id
    and not (id = any(incoming_ids));

  insert into public.player_loadouts (
    player_id,
    id,
    name,
    favorite,
    source,
    system_preset,
    preset_key,
    preset_unlock_level,
    role,
    description,
    tags,
    build,
    created_at,
    updated_at
  )
  select
    current_user_id,
    trim(entry.id),
    left(coalesce(nullif(trim(entry.name), ''), 'New Loadout'), 40),
    coalesce(entry.favorite, false),
    case when entry.source = 'system' then 'system' else 'custom' end,
    coalesce(entry.system_preset, false),
    nullif(trim(coalesce(entry.preset_key, '')), ''),
    greatest(coalesce(entry.preset_unlock_level, 1), 1),
    coalesce(entry.role, ''),
    coalesce(entry.description, ''),
    coalesce(entry.tags, '{}'::text[]),
    coalesce(entry.build, '{}'::jsonb),
    coalesce(entry.created_at, now()),
    coalesce(entry.updated_at, now())
  from jsonb_to_recordset(coalesce(p_loadouts, '[]'::jsonb)) as entry(
    id text,
    name text,
    favorite boolean,
    source text,
    system_preset boolean,
    preset_key text,
    preset_unlock_level integer,
    role text,
    description text,
    tags text[],
    build jsonb,
    created_at timestamptz,
    updated_at timestamptz
  )
  where nullif(trim(coalesce(entry.id, '')), '') is not null
  on conflict (player_id, id) do update
  set name = excluded.name,
      favorite = excluded.favorite,
      source = excluded.source,
      system_preset = excluded.system_preset,
      preset_key = excluded.preset_key,
      preset_unlock_level = excluded.preset_unlock_level,
      role = excluded.role,
      description = excluded.description,
      tags = excluded.tags,
      build = excluded.build,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.replace_player_loadouts(jsonb) to authenticated;