alter table public.custom_rooms
  add column if not exists map_key text not null default 'electroGallery';

update public.custom_rooms
set map_key = 'electroGallery'
where map_key is null or btrim(map_key) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'custom_rooms_map_key_check'
      and conrelid = 'public.custom_rooms'::regclass
  ) then
    alter table public.custom_rooms
      add constraint custom_rooms_map_key_check
      check (map_key in ('electroGallery', 'bricABroc'));
  end if;
end $$;
