import { getSupabaseAdminClient } from "./supabaseAdmin";

interface MatchParticipantResult {
  userId: string;
  displayName: string;
  opponentUserId?: string | null;
  result: "win" | "loss";
  roundsWon: number;
  roundsLost: number;
}

interface PersistMatchOptions {
  matchId: string;
  roomId: string;
  roomKind: string;
  mode: string;
  startedAt: string;
  completedAt: string;
  lobbyRoomId: string | null;
  mapKey: string;
  mapName: string;
  players: MatchParticipantResult[];
}

interface LobbyMemberSnapshot {
  player_id: string;
  selected_loadout_id: string | null;
  loadout_snapshot: Record<string, unknown> | null;
}

export async function persistAuthoritativeMatchResult(options: PersistMatchOptions) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured on the Colyseus server.");
  }

  const lobbySnapshots = await loadLobbySnapshots(supabase, options.lobbyRoomId);

  const payload = options.players.map((player) => {
    const lobbySnapshot = lobbySnapshots.get(player.userId);
    return {
      player_id: player.userId,
      result: player.result,
      rounds_won: player.roundsWon,
      rounds_lost: player.roundsLost,
      xp_delta: player.result === "win" ? 1 : 0,
      opponent_id: player.opponentUserId ?? options.players.find((entry) => entry.userId !== player.userId)?.userId ?? null,
      loadout_snapshot: lobbySnapshot?.loadout_snapshot ?? {},
      selected_loadout_id: lobbySnapshot?.selected_loadout_id ?? null,
    };
  });

  const { error } = await supabase.rpc("record_authoritative_match_result", {
    p_match_id: options.matchId,
    p_room_id: options.roomId,
    p_room_kind: options.roomKind,
    p_mode: options.mode,
    p_map_key: options.mapKey,
    p_map_name: options.mapName,
    p_started_at: options.startedAt,
    p_completed_at: options.completedAt,
    p_players: payload,
  });

  if (error) {
    throw error;
  }

  if (options.lobbyRoomId) {
    await supabase
      .from("custom_rooms")
      .update({ status: "closed" })
      .eq("id", options.lobbyRoomId);
  }
}

async function loadLobbySnapshots(supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, lobbyRoomId: string | null) {
  const snapshots = new Map<string, LobbyMemberSnapshot>();
  if (!lobbyRoomId) {
    return snapshots;
  }

  const { data, error } = await supabase
    .from("room_members")
    .select("player_id, selected_loadout_id, loadout_snapshot")
    .eq("room_id", lobbyRoomId);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    if (typeof row.player_id === "string" && row.player_id) {
      snapshots.set(row.player_id, row as LobbyMemberSnapshot);
    }
  }

  return snapshots;
}