import { getAccountSnapshot } from "../account/service.js";
import { getSupabaseClient } from "../supabase/client.js";

function getLoadoutSyncSnapshot() {
  const snapshot = getAccountSnapshot();
  const playerId = snapshot.user?.id ?? null;
  return {
    snapshot,
    playerId,
    canSync: Boolean(snapshot.configReady && snapshot.isAuthenticated && playerId),
  };
}

function normalizeRemoteBuild(build = {}) {
  const safeBuild = build && typeof build === "object" ? build : {};
  const sourceModules = Array.isArray(safeBuild.modules)
    ? safeBuild.modules
    : (Array.isArray(safeBuild.abilities) ? safeBuild.abilities : []);
  const implantKey = safeBuild.implant
    ?? safeBuild.perk
    ?? (Array.isArray(safeBuild.implants) ? safeBuild.implants[0] ?? null : null)
    ?? (Array.isArray(safeBuild.perks) ? safeBuild.perks[0] ?? null : null);
  const coreKey = safeBuild.core ?? safeBuild.ultimate ?? null;

  return {
    weapon: safeBuild.weapon ?? null,
    modules: Array.from({ length: 3 }, (_, index) => sourceModules[index] ?? null),
    implants: implantKey ? [implantKey] : [],
    core: coreKey,
  };
}

function normalizeRemoteEntry(row = {}) {
  const build = normalizeRemoteBuild(row.build);
  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : null,
    name: typeof row.name === "string" ? row.name : "New Loadout",
    favorite: Boolean(row.favorite),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    source: row.source === "system" ? "system" : "custom",
    systemPreset: Boolean(row.system_preset),
    presetKey: typeof row.preset_key === "string" && row.preset_key.trim() ? row.preset_key.trim() : null,
    presetUnlockLevel: Math.max(1, Math.floor(Number(row.preset_unlock_level) || 1)),
    role: typeof row.role === "string" ? row.role : "",
    description: typeof row.description === "string" ? row.description : "",
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    build,
    abilities: [...build.modules],
    perks: [...build.implants],
    ultimate: build.core,
  };
}

function createRemotePayload(entry = {}) {
  const build = normalizeRemoteBuild(entry.build ?? entry);
  return {
    id: String(entry.id ?? "").trim(),
    player_id: entry.player_id,
    name: String(entry.name ?? "New Loadout").trim().slice(0, 40) || "New Loadout",
    favorite: Boolean(entry.favorite),
    source: entry.source === "system" ? "system" : "custom",
    system_preset: Boolean(entry.systemPreset),
    preset_key: typeof entry.presetKey === "string" && entry.presetKey.trim() ? entry.presetKey.trim() : null,
    preset_unlock_level: Math.max(1, Math.floor(Number(entry.presetUnlockLevel) || 1)),
    role: typeof entry.role === "string" ? entry.role : "",
    description: typeof entry.description === "string" ? entry.description : "",
    tags: Array.isArray(entry.tags) ? [...new Set(entry.tags.filter(Boolean))] : [],
    build,
    created_at: entry.createdAt ?? new Date().toISOString(),
    updated_at: entry.updatedAt ?? new Date().toISOString(),
  };
}

export function canSyncRemoteLoadouts() {
  return getLoadoutSyncSnapshot().canSync;
}

export async function fetchRemoteLoadouts() {
  const { canSync, playerId } = getLoadoutSyncSnapshot();
  if (!canSync) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("player_loadouts")
    .select("id, name, favorite, source, system_preset, preset_key, preset_unlock_level, role, description, tags, build, created_at, updated_at")
    .eq("player_id", playerId)
    .order("favorite", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map((row) => normalizeRemoteEntry(row)).filter((entry) => Boolean(entry.id)) : [];
}

export async function replaceRemoteLoadouts(list = []) {
  const { canSync, playerId } = getLoadoutSyncSnapshot();
  if (!canSync) {
    return [];
  }

  const supabase = getSupabaseClient();
  const sanitizedList = Array.isArray(list)
    ? list
      .map((entry) => createRemotePayload({ ...entry, player_id: playerId }))
      .filter((entry) => Boolean(entry.id))
    : [];

  const { error } = await supabase.rpc("replace_player_loadouts", {
    p_loadouts: sanitizedList,
  });

  if (error) {
    throw error;
  }

  return sanitizedList.map((entry) => normalizeRemoteEntry(entry));
}