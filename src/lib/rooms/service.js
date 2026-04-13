/**
 * Custom Rooms Service
 * Handles CRUD and realtime for custom_rooms + room_members via Supabase.
 */
import { getSupabaseClient, isSupabaseConfigured } from "../supabase/client.js";

const ROOMS_TABLE   = "custom_rooms";
const MEMBERS_TABLE = "room_members";

/** Fetch all rooms with their current member count, filtered by status. */
export async function listRooms({ format = null } = {}) {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  const sb = getSupabaseClient();
  let query = sb
    .from(ROOMS_TABLE)
    .select("id, name, format, status, map_key, max_players, bot_count, created_at")
    .order("created_at", { ascending: false });
  if (format) query = query.eq("format", format);
  return query;
}

/** Fetch members of a room. */
export async function listRoomMembers(roomId) {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  const sb = getSupabaseClient();
  return sb
    .from(MEMBERS_TABLE)
    .select("player_id, display_name, avatar_key, is_ready, is_host, selected_loadout_id, loadout_snapshot")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
}

/** Create a new room; creator is automatically added as host on the server via RLS. */
export async function createRoom({ name, format, mapKey = "electroGallery", loadoutSnapshot = {} }) {
  if (!isSupabaseConfigured()) return { data: null, error: new Error("Supabase not configured") };
  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { data: null, error: new Error("Not authenticated") };

  const maxPlayers = format === "2v2" ? 4 : 2;
  const { data, error } = await sb
    .from(ROOMS_TABLE)
    .insert({ name: name.trim(), format, map_key: mapKey, max_players: maxPlayers, creator_id: session.user.id })
    .select("id, name, format, status, map_key, max_players")
    .single();

  if (error) return { data: null, error };

  // Join as host member
  const { error: joinError } = await sb.from(MEMBERS_TABLE).insert({
    room_id: data.id,
    player_id: session.user.id,
    display_name: session.user.user_metadata?.display_name ?? session.user.email?.split("@")[0] ?? "Player",
    avatar_key: "vanguard",
    is_host: true,
    is_ready: false,
    loadout_snapshot: loadoutSnapshot,
  });

  return { data, error: joinError ?? null };
}

/** Join an existing room as a non-host member. */
export async function joinRoom(roomId, loadoutSnapshot = {}) {
  if (!isSupabaseConfigured()) return { data: null, error: new Error("Supabase not configured") };
  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { data: null, error: new Error("Not authenticated") };

  const { error } = await sb.from(MEMBERS_TABLE).upsert({
    room_id: roomId,
    player_id: session.user.id,
    display_name: session.user.user_metadata?.display_name ?? session.user.email?.split("@")[0] ?? "Player",
    avatar_key: "vanguard",
    is_host: false,
    is_ready: false,
    loadout_snapshot: loadoutSnapshot,
  }, { onConflict: "room_id,player_id" });

  return { data: null, error };
}

/** Update the local player's deck choice (selected_loadout_id + loadout_snapshot). */
export async function updateMemberLoadout(roomId, loadoutId, snapshot) {
  if (!isSupabaseConfigured()) return { error: null };
  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: new Error("Not authenticated") };
  const { error } = await sb
    .from(MEMBERS_TABLE)
    .update({
      selected_loadout_id: loadoutId ?? null,
      loadout_snapshot: snapshot,
    })
    .eq("room_id", roomId)
    .eq("player_id", session.user.id);
  return { error };
}

/** Leave a room (removes member row). */
export async function leaveRoom(roomId) {
  if (!isSupabaseConfigured()) return { error: null };
  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: new Error("Not authenticated") };
  const { error } = await sb
    .from(MEMBERS_TABLE)
    .delete()
    .eq("room_id", roomId)
    .eq("player_id", session.user.id);
  return { error };
}

/** Set the local player's ready state. */
export async function setReady(roomId, isReady) {
  if (!isSupabaseConfigured()) return { error: null };
  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: new Error("Not authenticated") };
  const { error } = await sb
    .from(MEMBERS_TABLE)
    .update({ is_ready: isReady })
    .eq("room_id", roomId)
    .eq("player_id", session.user.id);
  return { error };
}

/** Host-only: kick a member. */
export async function kickMember(roomId, playerId) {
  if (!isSupabaseConfigured()) return { error: null };
  const sb = getSupabaseClient();
  const { error } = await sb
    .from(MEMBERS_TABLE)
    .delete()
    .eq("room_id", roomId)
    .eq("player_id", playerId);
  return { error };
}

/** Host-only: swap a member to the opposite team (team is implicit by slot order; we toggle a `team` column if present, otherwise it's positional). */
export async function swapMemberTeam(roomId, playerId) {
  // Team assignment is managed client-side by slot index (< max_players/2 = blue, >= = red).
  // To persist it we'd need a `team` column in room_members. For now this is a local UI swap only.
  // This stub exists so the UI can call it and the backend migration can add the column later.
  return { error: null };
}

/** Host-only: mark room as in_progress. */
export async function startRoom(roomId) {
  if (!isSupabaseConfigured()) return { error: null };
  const sb = getSupabaseClient();
  const { error } = await sb
    .from(ROOMS_TABLE)
    .update({ status: "in_progress" })
    .eq("id", roomId);
  return { error };
}

/** Subscribe to realtime changes in a room's members table. Returns an unsubscribe function. */
export function subscribeToRoom(roomId, onChange) {
  if (!isSupabaseConfigured()) return () => {};
  const sb = getSupabaseClient();
  const channel = sb
    .channel(`room-members-${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: MEMBERS_TABLE, filter: `room_id=eq.${roomId}` },
      onChange
    )
    .subscribe();
  return () => sb.removeChannel(channel);
}

/** Subscribe to realtime changes in the rooms list (for the browser). Returns an unsubscribe function. */
export function subscribeToRoomsList(onChange) {
  if (!isSupabaseConfigured()) return () => {};
  const sb = getSupabaseClient();
  const channel = sb
    .channel("rooms-list")
    .on("postgres_changes", { event: "*", schema: "public", table: ROOMS_TABLE }, onChange)
    .subscribe();
  return () => sb.removeChannel(channel);
}
