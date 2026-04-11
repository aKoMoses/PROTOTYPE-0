import { createInitialRuneAllocation } from "../state/app-state.js";
import { newSystemStarterTemplates } from "./catalog.js";

export const LOADOUT_STORAGE_KEY = "p0-loadouts-v2-custom";
const LOADOUT_V2_STARTERS_SEEDED_KEY = "p0-loadouts-v2-starters-seeded-v2";
const LEGACY_LOADOUT_STORAGE_KEYS = [
  "p0-loadouts",
  "p0-loadouts-starters-seeded-v1",
];

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function createTimestamp() {
  return new Date().toISOString();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function cloneRuneAllocation(source = null) {
  const next = createInitialRuneAllocation();
  if (!source || typeof source !== "object") {
    return next;
  }

  for (const [treeKey, values] of Object.entries(next)) {
    const sourceTree = source[treeKey] ?? {};
    values.secondary = Math.max(0, Number(sourceTree.secondary ?? 0));
    values.primary = Math.max(0, Number(sourceTree.primary ?? 0));
    values.ultimate = Math.max(0, Number(sourceTree.ultimate ?? 0));
  }

  return next;
}

function normalizePresetUnlockLevel(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
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
    runes: cloneRuneAllocation(safeSource.runes),
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
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: overrides.updatedAt ?? timestamp,
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

  window.dispatchEvent(new CustomEvent("p0-loadouts-changed", {
    detail: {
      count: list.length,
    },
  }));
}

function hasSeededV2Starters() {
  if (!canUseLocalStorage()) {
    return true;
  }

  try {
    return window.localStorage.getItem(LOADOUT_V2_STARTERS_SEEDED_KEY) === "1";
  } catch {
    return true;
  }
}

function markV2StartersSeeded() {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(LOADOUT_V2_STARTERS_SEEDED_KEY, "1");
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

function seedV2StartersOnce(list) {
  const templateMap = new Map(newSystemStarterTemplates.map((t) => [t.key, t]));

  let needsPersist = false;

  // Refresh stale system presets in-place
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

  const existingPresetKeys = new Set(refreshedList.map((e) => e.presetKey).filter(Boolean));
  const starterEntries = createV2StarterLoadouts().filter((entry) => !existingPresetKeys.has(entry.presetKey));

  if (!starterEntries.length) {
    if (!hasSeededV2Starters()) {
      markV2StartersSeeded();
    }
    if (needsPersist) {
      window.localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(refreshedList));
    }
    return refreshedList;
  }

  const seededList = [...starterEntries, ...refreshedList];
  markV2StartersSeeded();
  return seededList;
}

export function readStoredLoadouts() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    for (const legacyKey of LEGACY_LOADOUT_STORAGE_KEYS) {
      window.localStorage.removeItem(legacyKey);
    }

    const raw = window.localStorage.getItem(LOADOUT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const sanitizedList = Array.isArray(parsed)
      ? parsed
        .map((entry) => createStoredLoadout(entry))
        .filter((entry) => entry.source === "custom" || entry.source === "system")
      : [];
    const seededList = seedV2StartersOnce(sanitizedList);

    if (seededList.length !== sanitizedList.length) {
      window.localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(seededList));
    }

    return seededList;
  } catch {
    return [];
  }
}

export function writeStoredLoadouts(list) {
  const sanitizedList = Array.isArray(list) ? list.map((entry) => createStoredLoadout(entry)) : [];

  if (!canUseLocalStorage()) {
    return sanitizedList;
  }

  try {
    window.localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(sanitizedList));
  } catch {
    return sanitizedList;
  }

  emitLoadoutsChanged(sanitizedList);
  return sanitizedList;
}

export function updateStoredLoadouts(mutator) {
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
