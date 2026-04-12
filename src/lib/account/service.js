import { setXp } from "../../progression.js";
import { getSupabaseClient, getSupabaseConfigSummary, isSupabaseConfigured } from "../supabase/client.js";

export const ACCOUNT_STATE_CHANGED_EVENT = "p0-account-state-changed";

const DEFAULT_AVATAR_KEY = "vanguard";

let authSubscription = null;
let initPromise = null;

let accountState = {
  initialized: false,
  loading: false,
  configReady: isSupabaseConfigured(),
  isAuthenticated: false,
  session: null,
  user: null,
  profile: null,
  progression: null,
  matchHistory: [],
  error: null,
};

function cloneState() {
  return {
    ...accountState,
    session: accountState.session ? { ...accountState.session } : null,
    user: accountState.user ? { ...accountState.user } : null,
    profile: accountState.profile ? { ...accountState.profile } : null,
    progression: accountState.progression ? { ...accountState.progression } : null,
    matchHistory: Array.isArray(accountState.matchHistory)
      ? accountState.matchHistory.map((entry) => ({ ...entry, build: entry?.build ? { ...entry.build } : {} }))
      : [],
    configSummary: getSupabaseConfigSummary(),
  };
}

function emitStateChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(ACCOUNT_STATE_CHANGED_EVENT, {
    detail: cloneState(),
  }));
}

function patchState(patch) {
  accountState = {
    ...accountState,
    ...patch,
  };
  emitStateChanged();
}

function isMissingRelationError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("relation") && message.includes("does not exist");
}

function formatAuthError(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }
  return error.message ?? fallbackMessage;
}

function getDisplayNameFromUser(user) {
  const metadataName = user?.user_metadata?.display_name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  const email = user?.email ?? "";
  if (email.includes("@")) {
    return email.split("@")[0].slice(0, 24);
  }

  return "Pilot";
}

function normalizeProfile(profile, user) {
  if (!user) {
    return null;
  }

  const safeProfile = profile && typeof profile === "object" ? profile : {};
  return {
    id: safeProfile.id ?? user.id,
    display_name: safeProfile.display_name ?? getDisplayNameFromUser(user),
    avatar_key: safeProfile.avatar_key ?? DEFAULT_AVATAR_KEY,
    account_kind: safeProfile.account_kind ?? "registered",
    created_at: safeProfile.created_at ?? user.created_at ?? null,
    updated_at: safeProfile.updated_at ?? null,
    last_seen_at: safeProfile.last_seen_at ?? null,
  };
}

function normalizeProgression(row) {
  const safeRow = row && typeof row === "object" ? row : {};
  return {
    player_id: safeRow.player_id ?? null,
    xp: Number(safeRow.xp ?? 0),
    level: Number(safeRow.level ?? 1),
    best_survival_wave: Number(safeRow.best_survival_wave ?? 0),
    wins: Number(safeRow.wins ?? 0),
    losses: Number(safeRow.losses ?? 0),
    winstreak: Number(safeRow.winstreak ?? 0),
    updated_at: safeRow.updated_at ?? null,
  };
}

function syncLocalProgression(progression) {
  if (!progression) {
    return;
  }

  setXp(Number(progression.xp ?? 0), "account-hydrate");
}

async function ensureProfileRow(user) {
  const supabase = getSupabaseClient();
  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_key, account_kind, created_at, updated_at, last_seen_at")
    .eq("id", user.id)
    .maybeSingle();

  if (readError && !isMissingRelationError(readError)) {
    throw readError;
  }

  if (existingProfile) {
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id, display_name, avatar_key, account_kind, created_at, updated_at, last_seen_at")
      .single();

    if (updateError && !isMissingRelationError(updateError)) {
      throw updateError;
    }

    return normalizeProfile(updatedProfile ?? existingProfile, user);
  }

  if (readError && isMissingRelationError(readError)) {
    throw new Error("Supabase schema missing: create the public.profiles table before using account auth.");
  }

  const payload = {
    id: user.id,
    display_name: getDisplayNameFromUser(user),
    avatar_key: DEFAULT_AVATAR_KEY,
    account_kind: "registered",
    last_seen_at: new Date().toISOString(),
  };

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert(payload)
    .select("id, display_name, avatar_key, account_kind, created_at, updated_at, last_seen_at")
    .single();

  if (insertError) {
    if (isMissingRelationError(insertError)) {
      throw new Error("Supabase schema missing: create the public.profiles table before using account auth.");
    }
    throw insertError;
  }

  return normalizeProfile(insertedProfile, user);
}

async function ensureProgressionRow(userId) {
  const supabase = getSupabaseClient();
  const { data: existingProgression, error: readError } = await supabase
    .from("player_progression")
    .select("player_id, xp, level, best_survival_wave, wins, losses, winstreak, updated_at")
    .eq("player_id", userId)
    .maybeSingle();

  if (readError && !isMissingRelationError(readError)) {
    throw readError;
  }

  if (existingProgression) {
    return normalizeProgression(existingProgression);
  }

  if (readError && isMissingRelationError(readError)) {
    throw new Error("Supabase schema missing: create the public.player_progression table before using account auth.");
  }

  const { data: insertedProgression, error: insertError } = await supabase
    .from("player_progression")
    .insert({
      player_id: userId,
      xp: 0,
      level: 1,
      best_survival_wave: 0,
      wins: 0,
      losses: 0,
      winstreak: 0,
    })
    .select("player_id, xp, level, best_survival_wave, wins, losses, winstreak, updated_at")
    .single();

  if (insertError) {
    if (isMissingRelationError(insertError)) {
      throw new Error("Supabase schema missing: create the public.player_progression table before using account auth.");
    }
    throw insertError;
  }

  return normalizeProgression(insertedProgression);
}

async function hydrateFromSession(session) {
  if (!session?.user) {
    patchState({
      initialized: true,
      loading: false,
      isAuthenticated: false,
      session: null,
      user: null,
      profile: null,
      progression: null,
      matchHistory: [],
      error: null,
    });
    return null;
  }

  try {
    patchState({ loading: true, error: null });
    const [profile, progression, matchHistory] = await Promise.all([
      ensureProfileRow(session.user),
      ensureProgressionRow(session.user.id),
      fetchPlayerMatchHistory(session.user.id),
    ]);
    syncLocalProgression(progression);
    patchState({
      initialized: true,
      loading: false,
      isAuthenticated: true,
      session,
      user: session.user,
      profile,
      progression,
      matchHistory,
      error: null,
    });
    return { profile, progression, matchHistory };
  } catch (error) {
    patchState({
      initialized: true,
      loading: false,
      isAuthenticated: false,
      session: null,
      user: null,
      profile: null,
      progression: null,
      matchHistory: [],
      error: formatAuthError(error, "Failed to load the player account."),
    });
    return null;
  }
}

async function fetchPlayerMatchHistory(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("player_match_history")
    .select("id, match_id, mode, result, map_key, map_name, score, rounds_won, rounds_lost, xp_delta, loadout_snapshot, completed_at")
    .eq("player_id", userId)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return Array.isArray(data) ? data.map((entry) => normalizeMatchHistoryEntry(entry)) : [];
}

function normalizeMatchHistoryEntry(entry) {
  const safeEntry = entry && typeof entry === "object" ? entry : {};
  return {
    id: safeEntry.id ?? safeEntry.match_id ?? `server-match-${Date.now()}`,
    matchId: safeEntry.match_id ?? null,
    mode: safeEntry.mode ?? "duel",
    result: safeEntry.result ?? "loss",
    mapKey: safeEntry.map_key ?? "unknown",
    mapName: safeEntry.map_name ?? "Unknown Arena",
    score: safeEntry.score ?? `${Number(safeEntry.rounds_won ?? 0)}-${Number(safeEntry.rounds_lost ?? 0)}`,
    wave: 0,
    xpDelta: Number(safeEntry.xp_delta ?? 0),
    build: normalizeMatchHistoryBuild(safeEntry.loadout_snapshot),
    date: safeEntry.completed_at ?? null,
    source: "server",
  };
}

function normalizeMatchHistoryBuild(source) {
  const safeSource = source && typeof source === "object" ? source : {};
  const modules = Array.isArray(safeSource.modules) ? safeSource.modules : [];
  const implants = Array.isArray(safeSource.implants)
    ? safeSource.implants
    : (safeSource.implants ? [safeSource.implants] : []);
  return {
    weapon: safeSource.weapon ?? null,
    modules: modules.filter(Boolean).slice(0, 3),
    implants: implants.filter(Boolean).slice(0, 2),
    core: safeSource.core ?? null,
  };
}

export function getAccountSnapshot() {
  return cloneState();
}

export function subscribeAccountState(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listener(cloneState());

  const handler = (event) => {
    listener(event.detail ?? cloneState());
  };

  window.addEventListener(ACCOUNT_STATE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(ACCOUNT_STATE_CHANGED_EVENT, handler);
}

export async function initAccountService() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (!isSupabaseConfigured()) {
      patchState({
        initialized: true,
        loading: false,
        configReady: false,
        isAuthenticated: false,
        error: "Supabase is not configured. Define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
      });
      return cloneState();
    }

    patchState({ loading: true, configReady: true, error: null });

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      patchState({
        initialized: true,
        loading: false,
        isAuthenticated: false,
        error: formatAuthError(error, "Failed to read the current session."),
      });
      return cloneState();
    }

    await hydrateFromSession(data.session ?? null);

    if (!authSubscription) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        void hydrateFromSession(session ?? null);
      });
      authSubscription = authListener.subscription;
    }

    return cloneState();
  })();

  return initPromise;
}

export async function signInWithEmail({ email, password }) {
  const supabase = getSupabaseClient();
  patchState({ loading: true, error: null });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    patchState({ loading: false, error: formatAuthError(error, "Unable to sign in.") });
    throw error;
  }

  await hydrateFromSession(data.session ?? null);
  return data;
}

export async function signUpWithEmail({ email, password, displayName }) {
  const supabase = getSupabaseClient();
  patchState({ loading: true, error: null });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    patchState({ loading: false, error: formatAuthError(error, "Unable to create the account.") });
    throw error;
  }

  if (data.session) {
    await hydrateFromSession(data.session);
  } else {
    patchState({ loading: false, error: null });
  }

  return {
    ...data,
    requiresEmailConfirmation: !data.session,
  };
}

export async function signOutAccount() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  await hydrateFromSession(null);
}

export async function updatePlayerProfile(updates) {
  if (!accountState.user?.id) {
    throw new Error("No authenticated player session.");
  }

  const payload = {};
  if (typeof updates?.display_name === "string" && updates.display_name.trim()) {
    payload.display_name = updates.display_name.trim().slice(0, 24);
  }
  if (typeof updates?.avatar_key === "string" && updates.avatar_key.trim()) {
    payload.avatar_key = updates.avatar_key.trim();
  }
  payload.last_seen_at = new Date().toISOString();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", accountState.user.id)
    .select("id, display_name, avatar_key, account_kind, created_at, updated_at, last_seen_at")
    .single();

  if (error) {
    throw error;
  }

  const nextProfile = normalizeProfile(data, accountState.user);
  patchState({ profile: nextProfile, error: null });
  return nextProfile;
}

export async function updatePlayerProgression(updates) {
  if (!accountState.user?.id) {
    throw new Error("No authenticated player session.");
  }

  const currentProgression = normalizeProgression(accountState.progression);
  const payload = {
    xp: Math.max(0, Math.floor(Number(updates?.xp ?? currentProgression.xp) || 0)),
    level: Math.max(1, Math.floor(Number(updates?.level ?? currentProgression.level) || 1)),
    best_survival_wave: Math.max(
      0,
      Math.floor(Number(updates?.best_survival_wave ?? currentProgression.best_survival_wave) || 0),
    ),
    wins: Math.max(0, Math.floor(Number(updates?.wins ?? currentProgression.wins) || 0)),
    losses: Math.max(0, Math.floor(Number(updates?.losses ?? currentProgression.losses) || 0)),
    winstreak: Math.max(0, Math.floor(Number(updates?.winstreak ?? currentProgression.winstreak) || 0)),
  };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("player_progression")
    .update(payload)
    .eq("player_id", accountState.user.id)
    .select("player_id, xp, level, best_survival_wave, wins, losses, winstreak, updated_at")
    .single();

  if (error) {
    throw error;
  }

  const nextProgression = normalizeProgression(data);
  syncLocalProgression(nextProgression);
  patchState({ progression: nextProgression, error: null });
  return nextProgression;
}

export async function refreshAccountState() {
  return hydrateFromSession(accountState.session ?? null);
}