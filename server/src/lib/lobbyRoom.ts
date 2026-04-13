import { getSupabaseAdminClient } from "./supabaseAdmin";

export interface LobbyRoomMember {
  userId: string;
  displayName: string;
  joinedAt: string;
  selectedLoadoutId: string | null;
  loadoutSnapshot: Record<string, unknown> | null;
}

export interface LobbyRoomConfig {
  id: string;
  format: "1v1" | "2v2";
  status: "waiting" | "in_progress" | "closed";
  mapKey: string;
  botCount: number;
  botDifficulty: "easy" | "normal" | "hard";
  maxPlayers: number;
}

export async function loadLobbyRoomConfig(lobbyRoomId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured on the Colyseus server.");
  }

  const { data, error } = await supabase
    .from("custom_rooms")
    .select("id, format, status, map_key, bot_count, bot_difficulty, max_players")
    .eq("id", lobbyRoomId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Lobby room not found.");
  }

  const format = data.format === "2v2" ? "2v2" : "1v1";
  const status = data.status === "in_progress"
    ? "in_progress"
    : data.status === "closed"
      ? "closed"
      : "waiting";
  const botDifficulty = data.bot_difficulty === "easy" || data.bot_difficulty === "hard"
    ? data.bot_difficulty
    : "normal";

  return {
    id: typeof data.id === "string" ? data.id : lobbyRoomId,
    format,
    status,
    mapKey: typeof data.map_key === "string" && data.map_key.trim() ? data.map_key.trim() : "electroGallery",
    botCount: Number.isFinite(data.bot_count) ? Math.max(0, Math.trunc(data.bot_count)) : 0,
    botDifficulty,
    maxPlayers: Number.isFinite(data.max_players) ? Math.max(1, Math.trunc(data.max_players)) : 2,
  } satisfies LobbyRoomConfig;
}

export async function loadLobbyRoomMembers(lobbyRoomId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured on the Colyseus server.");
  }

  const { data, error } = await supabase
    .from("room_members")
    .select("player_id, display_name, joined_at, selected_loadout_id, loadout_snapshot")
    .eq("room_id", lobbyRoomId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter((row) => typeof row.player_id === "string" && row.player_id)
    .map((row) => ({
      userId: row.player_id,
      displayName: typeof row.display_name === "string" && row.display_name.trim()
        ? row.display_name.trim()
        : "Pilot",
      joinedAt: typeof row.joined_at === "string" ? row.joined_at : "",
      selectedLoadoutId: typeof row.selected_loadout_id === "string" && row.selected_loadout_id.trim()
        ? row.selected_loadout_id.trim()
        : null,
      loadoutSnapshot: row.loadout_snapshot && typeof row.loadout_snapshot === "object"
        ? row.loadout_snapshot as Record<string, unknown>
        : null,
    })) as LobbyRoomMember[];
}