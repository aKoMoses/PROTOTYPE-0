-- ============================================================
-- Migration: room_members — loadout snapshot + deck FK
-- Date: 2026-04-14
-- ============================================================

-- Ajout des colonnes sur room_members
alter table public.room_members
  add column if not exists selected_loadout_id text,
  add column if not exists loadout_snapshot jsonb not null default '{}'::jsonb;

comment on column public.room_members.selected_loadout_id is
  'Reference logique optionnelle vers le deck choisi dans player_loadouts.
   Cette colonne reste denormalisee pour eviter une FK composite fragile sur room_members.';

comment on column public.room_members.loadout_snapshot is
  'Snapshot dénormalisé du loadout actif au moment où le joueur rejoint ou change de deck.
   Format: {weapon, modules[], implants[], core, avatar, weaponSkin}
   Toujours lu par l''UI — ne nécessite pas de JOIN.';

-- Index GIN pour futures recherches sur composition
create index if not exists room_members_loadout_snapshot_gin
  on public.room_members using gin (loadout_snapshot);

-- RLS : un joueur peut mettre à jour son propre snapshot
drop policy if exists "Member can update own loadout snapshot" on public.room_members;
create policy "Member can update own loadout snapshot"
  on public.room_members for update
  using ((select auth.uid()) = player_id)
  with check ((select auth.uid()) = player_id);
