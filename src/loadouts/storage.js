import { getAccountSnapshot, subscribeAccountState } from "../lib/account/service.js";
import { fetchRemoteLoadouts, replaceRemoteLoadouts } from "../lib/loadouts/service.js";
import { newSystemStarterTemplates } from "./catalog.js";

export const LOADOUT_STORAGE_KEY = "p0-loadouts-v2-custom";
export const LOADOUTS_CHANGED_EVENT = "p0-loadouts-changed";
export const LOADOUT_SYNC_STATUS_CHANGED_EVENT = "p0-loadout-sync-status-changed";

const LOADOUT_V2_STARTERS_SEEDED_KEY = "p0-loadouts-v2-starters-seeded-v2";
const LEGACY_LOADOUT_STORAGE_KEYS = [
  "p0-loadouts",
  "p0-loadouts-starters-seeded-v1",
];

let cachedLoadouts = [];
let loadoutStorageInitialized = false;
let hydratedPlayerId = null;
let hydratingPlayerId = null;
let remoteSyncChain = Promise.resolve();
let loadoutSyncStatus = createInitialLoadoutSyncStatus();

function createInitialLoadoutSyncStatus() {
  return {
    scope: "remote-required",
    phase: "idle",
    message: "Sign in to access server loadouts.",
    error: null,
    updatedAt: null,
    userId: null,
  };
}

function canUseLocalStorage() {
  return false;
}

function createTimestamp() {
  return new Date().toISOString();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function normalizePresetUnlockLevel(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function getScopedLoadoutStorageKey(snapshot = getAccountSnapshot()) {
  const playerId = snapshot?.user?.id ?? null;
  return playerId ? `${LOADOUT_STORAGE_KEY}:${playerId}` : LOADOUT_STORAGE_KEY;
}

function getScopedSeededKey(snapshot = getAccountSnapshot()) {
  const playerId = snapshot?.user?.id ?? null;
  return playerId ? `${LOADOUT_V2_STARTERS_SEEDED_KEY}:${playerId}` : LOADOUT_V2_STARTERS_SEEDED_KEY;
}

function compareTimestamps(left, right) {
  const leftTime = Date.parse(left ?? "") || 0;
  const rightTime = Date.parse(right ?? "") || 0;
  return leftTime - rightTime;
}

function sanitizeList(list = []) {
  return Array.isArray(list) ? list.map((entry) => createStoredLoadout(entry)) : [];
}

function listsAreEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneLoadoutSyncStatus() {
  return {
    ...loadoutSyncStatus,
  };
}

function emitLoadoutSyncStatusChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(LOADOUT_SYNC_STATUS_CHANGED_EVENT, {
    detail: cloneLoadoutSyncStatus(),
  }));
}

function setLoadoutSyncStatus(nextState) {
  const previous = JSON.stringify(loadoutSyncStatus);
  loadoutSyncStatus = {
    ...loadoutSyncStatus,
    ...nextState,
  };

  if (JSON.stringify(loadoutSyncStatus) !== previous) {
    emitLoadoutSyncStatusChanged();
  }
}

function describeSyncError(error) {
  const message = String(error?.message ?? "").trim();
  if (!message) {
    return "Cloud sync failed. Changes remain local on this browser.";
  }

  return `Cloud sync failed. ${message}`;
}

function setLocalOnlySyncStatus(snapshot = getAccountSnapshot()) {
  setLoadoutSyncStatus({
    scope: "remote-required",
    phase: "idle",
    message: snapshot.configReady
      ? "Sign in to access server loadouts."
      : "Supabase not configured. Server loadouts are unavailable.",
    error: null,
    updatedAt: null,
    userId: snapshot.user?.id ?? null,
  });
}

function sortLoadouts(list = []) {
  return [...list].sort((left, right) => {
    const favoriteDelta = Number(right.favorite) - Number(left.favorite);
    if (favoriteDelta !== 0) {
      return favoriteDelta;
    }

    const updatedDelta = compareTimestamps(right.updatedAt ?? right.updated_at, left.updatedAt ?? left.updated_at);
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return String(left.name ?? "").localeCompare(String(right.name ?? ""));
  });
}

export function normalizeStoredBuild(source = {}) {
  const safeSource = source && typeof source === "object" ? source : {};
  const sourceModules = Array.isArray(safeSource.modules)
    ? safeSource.modules
    : (Array.isArray(safeSource.abilities) ? safeSource.abilities : []);
  const implantKey = safeSource.implant
    ?? safeSource.perk
    ?? (Array.isArray(safeSource.implants) ? safeSource.implants[0] ?? null : null)
    ?? (Array.isArray(safeSource.perks) ? safeSource.perks[0] ?? null : null);
  const coreKey = safeSource.core ?? safeSource.ultimate ?? null;
  const modules = Array.from({ length: 3 }, (_, index) => sourceModules[index] ?? null);
  const implants = implantKey ? [implantKey] : [];

  return {
    weapon: safeSource.weapon ?? null,
    modules,
    implants,
    core: coreKey,
    abilities: [...modules],
    perks: [...implants],
    ultimate: coreKey,
  };
}

export function createStoredLoadout(overrides = {}) {
  const timestamp = createTimestamp();
  return {
    id: overrides.id ?? generateId(),
    name: String(overrides.name ?? "New Loadout").trim().slice(0, 40) || "New Loadout",
    favorite: Boolean(overrides.favorite),
    tags: Array.isArray(overrides.tags) ? [...new Set(overrides.tags.filter(Boolean))] : [],
    source: overrides.source ?? "custom",
    systemPreset: Boolean(overrides.systemPreset),
    presetKey: overrides.presetKey ?? null,
    presetUnlockLevel: normalizePresetUnlockLevel(overrides.presetUnlockLevel),
    role: overrides.role ?? "",
    description: overrides.description ?? "",
    createdAt: overrides.createdAt ?? overrides.created_at ?? timestamp,
    updatedAt: overrides.updatedAt ?? overrides.updated_at ?? timestamp,
    build: normalizeStoredBuild(overrides.build ?? overrides.loadout ?? {}),
  };
}

export function cloneStoredLoadout(entry, overrides = {}) {
  const source = createStoredLoadout(entry ?? {});
  const timestamp = createTimestamp();

  return createStoredLoadout({
    ...source,
    ...overrides,
    id: overrides.id ?? generateId(),
    tags: overrides.tags ?? [...source.tags],
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: overrides.updatedAt ?? timestamp,
    build: overrides.build ?? source.build,
  });
}

function cloneStoredLoadoutList(list = []) {
  return Array.isArray(list) ? list.map((entry) => createStoredLoadout(entry)) : [];
}

function emitLoadoutsChanged(list) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(LOADOUTS_CHANGED_EVENT, {
    detail: {
      count: list.length,
    },
  }));
}

function hasSeededV2Starters(snapshot = getAccountSnapshot()) {
  if (!canUseLocalStorage()) {
    return true;
  }

  try {
    return window.localStorage.getItem(getScopedSeededKey(snapshot)) === "1";
  } catch {
    return true;
  }
}

function markV2StartersSeeded(snapshot = getAccountSnapshot()) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(getScopedSeededKey(snapshot), "1");
  } catch {
    // Ignore storage failures.
  }
}

function createV2StarterLoadouts() {
  return newSystemStarterTemplates.map((template) => createStoredLoadout({
    name: template.name,
    source: "system",
    systemPreset: true,
    presetKey: template.key,
    presetUnlockLevel: template.unlockLevel,
    role: template.role,
    description: template.description,
    tags: template.tags,
    build: template.build,
    favorite: true,
  }));
}

function isBuiltStale(stored, template) {
  const build = stored?.build;
  if (!build) return true;
  const hasModules = Array.isArray(build.modules) && build.modules.some(Boolean);
  const hasImplant = Array.isArray(build.implants) && build.implants.some(Boolean);
  const hasCore = Boolean(build.core);
  const templateHasModules = Array.isArray(template.build?.modules) && template.build.modules.some(Boolean);
  const templateHasImplant = Array.isArray(template.build?.implants) && template.build.implants.some(Boolean);
  const templateHasCore = Boolean(template.build?.core);
  if (templateHasModules && !hasModules) return true;
  if (templateHasImplant && !hasImplant) return true;
  if (templateHasCore && !hasCore) return true;
  return false;
}

function seedV2StartersOnce(list, snapshot = getAccountSnapshot()) {
  const templateMap = new Map(newSystemStarterTemplates.map((template) => [template.key, template]));
  let needsPersist = false;

  const refreshedList = list.map((entry) => {
    if (!entry.systemPreset || !entry.presetKey) return entry;
    const template = templateMap.get(entry.presetKey);
    if (!template || !isBuiltStale(entry, template)) return entry;
    needsPersist = true;
    return createStoredLoadout({
      ...entry,
      name: template.name,
      role: template.role,
      description: template.description,
      tags: template.tags,
      presetUnlockLevel: template.unlockLevel,
      build: template.build,
    });
  });

  const existingPresetKeys = new Set(refreshedList.map((entry) => entry.presetKey).filter(Boolean));
  const starterEntries = createV2StarterLoadouts().filter((entry) => !existingPresetKeys.has(entry.presetKey));

  if (!starterEntries.length) {
    if (!hasSeededV2Starters(snapshot)) {
      markV2StartersSeeded(snapshot);
    }
    return {
      list: refreshedList,
      changed: needsPersist,
    };
  }

  markV2StartersSeeded(snapshot);
  return {
    list: [...starterEntries, ...refreshedList],
    changed: true,
  };
}

function readPersistedLoadouts(snapshot = getAccountSnapshot()) {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    LEGACY_LOADOUT_STORAGE_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));

    const storageKeys = [getScopedLoadoutStorageKey(snapshot)];
    if (storageKeys[0] !== LOADOUT_STORAGE_KEY) {
      storageKeys.push(LOADOUT_STORAGE_KEY);
    }

    let parsed = [];
    for (const storageKey of storageKeys) {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        continue;
      }

      const candidate = JSON.parse(raw);
      if (Array.isArray(candidate)) {
        parsed = candidate;
        break;
      }
    }

    const sanitizedList = parsed
      .map((entry) => createStoredLoadout(entry))
      .filter((entry) => entry.source === "custom" || entry.source === "system");
    const seeded = seedV2StartersOnce(sanitizedList, snapshot);

    if (seeded.changed) {
      persistLocalLoadouts(seeded.list, snapshot);
    }

    return sortLoadouts(seeded.list);
  } catch {
    return [];
  }
}

function persistLocalLoadouts(list, snapshot = getAccountSnapshot()) {
  const sanitizedList = sortLoadouts(sanitizeList(list));

  if (!canUseLocalStorage()) {
    return sanitizedList;
  }

  try {
    window.localStorage.setItem(getScopedLoadoutStorageKey(snapshot), JSON.stringify(sanitizedList));
  } catch {
    return sanitizedList;
  }

  return sanitizedList;
}

function mergeLoadoutLists(localList = [], remoteList = [], snapshot = getAccountSnapshot()) {
  const mergedById = new Map();

  for (const entry of [...sanitizeList(localList), ...sanitizeList(remoteList)]) {
    const existing = mergedById.get(entry.id);
    if (!existing) {
      mergedById.set(entry.id, entry);
      continue;
    }

    const incomingIsNewer = compareTimestamps(existing.updatedAt, entry.updatedAt) < 0;
    if (incomingIsNewer) {
      mergedById.set(entry.id, entry);
    }
  }

  const seeded = seedV2StartersOnce(Array.from(mergedById.values()), snapshot);
  return sortLoadouts(seeded.list);
}

function setCachedLoadouts(list, { snapshot = getAccountSnapshot(), emit = true, syncRemote = false } = {}) {
  const nextList = persistLocalLoadouts(list, snapshot);
  const changed = !listsAreEqual(cachedLoadouts, nextList);
  cachedLoadouts = nextList;

  if (emit && changed) {
    emitLoadoutsChanged(nextList);
  }

  if (syncRemote) {
    queueRemoteSync(nextList, snapshot.user?.id ?? null);
  }

  return nextList;
}

function queueRemoteSync(list, playerId) {
  if (!playerId) {
    return remoteSyncChain;
  }

  remoteSyncChain = remoteSyncChain
    .catch(() => null)
    .then(async () => {
      const snapshot = getAccountSnapshot();
      if (!snapshot.isAuthenticated || snapshot.user?.id !== playerId) {
        return null;
      }

      setLoadoutSyncStatus({
        scope: "remote",
        phase: "syncing",
        message: "Syncing loadouts to cloud...",
        error: null,
        userId: playerId,
      });

      try {
        await replaceRemoteLoadouts(list);
        setLoadoutSyncStatus({
          scope: "remote",
          phase: "synced",
          message: "Cloud sync complete.",
          error: null,
          updatedAt: new Date().toISOString(),
          userId: playerId,
        });
      } catch (error) {
        console.warn("Failed to sync loadouts to Supabase.", error);
        setLoadoutSyncStatus({
          scope: "remote",
          phase: "error",
          message: describeSyncError(error),
          error: String(error?.message ?? "sync-error"),
          userId: playerId,
        });
      }

      return null;
    });

  return remoteSyncChain;
}

async function hydrateRemoteLoadoutsForSnapshot(snapshot) {
  const playerId = snapshot.user?.id ?? null;
  if (!snapshot.configReady || !snapshot.isAuthenticated || !playerId) {
    hydratedPlayerId = null;
    hydratingPlayerId = null;
    setLocalOnlySyncStatus(snapshot);
    return;
  }

  if (hydratedPlayerId === playerId || hydratingPlayerId === playerId) {
    return;
  }

  hydratingPlayerId = playerId;
  setLoadoutSyncStatus({
    scope: "remote",
    phase: "syncing",
    message: "Loading cloud loadouts...",
    error: null,
    userId: playerId,
  });

  try {
    const localList = readPersistedLoadouts(snapshot);
    const remoteList = await fetchRemoteLoadouts();
    const mergedList = mergeLoadoutLists(localList, remoteList, snapshot);
    setCachedLoadouts(mergedList, {
      snapshot,
      emit: true,
      syncRemote: false,
    });
    await replaceRemoteLoadouts(mergedList);
    hydratedPlayerId = playerId;
    setLoadoutSyncStatus({
      scope: "remote",
      phase: "synced",
      message: "Cloud loadouts ready.",
      error: null,
      updatedAt: new Date().toISOString(),
      userId: playerId,
    });
  } catch (error) {
    console.warn("Failed to hydrate loadouts from Supabase.", error);
    setLoadoutSyncStatus({
      scope: "remote",
      phase: "error",
      message: describeSyncError(error),
      error: String(error?.message ?? "hydrate-error"),
      userId: playerId,
    });
  } finally {
    hydratingPlayerId = null;
  }
}

function initLoadoutStorageSync() {
  if (loadoutStorageInitialized) {
    return;
  }

  loadoutStorageInitialized = true;
  cachedLoadouts = readPersistedLoadouts();
  setLocalOnlySyncStatus();

  subscribeAccountState((snapshot) => {
    const nextLocalList = readPersistedLoadouts(snapshot);
    if (!listsAreEqual(cachedLoadouts, nextLocalList)) {
      cachedLoadouts = nextLocalList;
      emitLoadoutsChanged(cachedLoadouts);
    }

    if (!snapshot.isAuthenticated || !snapshot.user?.id) {
      hydratedPlayerId = null;
      hydratingPlayerId = null;
      setLocalOnlySyncStatus(snapshot);
      return;
    }

    void hydrateRemoteLoadoutsForSnapshot(snapshot);
  });
}

export function getLoadoutSyncStatus() {
  initLoadoutStorageSync();
  return cloneLoadoutSyncStatus();
}

export function retryRemoteLoadoutSync() {
  initLoadoutStorageSync();
  const snapshot = getAccountSnapshot();
  if (!snapshot.configReady || !snapshot.isAuthenticated || !snapshot.user?.id) {
    setLocalOnlySyncStatus(snapshot);
    return Promise.resolve(false);
  }

  return queueRemoteSync(cloneStoredLoadoutList(cachedLoadouts), snapshot.user.id)
    .then(() => true)
    .catch(() => false);
}

export function readStoredLoadouts() {
  initLoadoutStorageSync();
  return cloneStoredLoadoutList(cachedLoadouts);
}

export function writeStoredLoadouts(list) {
  initLoadoutStorageSync();
  const snapshot = getAccountSnapshot();
  if (!snapshot.configReady || !snapshot.isAuthenticated || !snapshot.user?.id) {
    setLocalOnlySyncStatus(snapshot);
    return cloneStoredLoadoutList(cachedLoadouts);
  }
  return setCachedLoadouts(list, {
    snapshot,
    emit: true,
    syncRemote: true,
  });
}

export function updateStoredLoadouts(mutator) {
  initLoadoutStorageSync();
  const workingList = cloneStoredLoadoutList(readStoredLoadouts());
  let nextList = workingList;
  let value = null;

  if (typeof mutator === "function") {
    const outcome = mutator(workingList);

    if (Array.isArray(outcome)) {
      nextList = outcome;
    } else if (outcome && typeof outcome === "object") {
      nextList = Array.isArray(outcome.list) ? outcome.list : workingList;
      value = outcome.value ?? null;
    } else if (outcome !== undefined) {
      value = outcome;
    }
  }

  return {
    list: writeStoredLoadouts(nextList),
    value,
  };
}

initLoadoutStorageSync();
