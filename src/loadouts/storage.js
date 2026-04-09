import { createInitialRuneAllocation } from "../state/app-state.js";
import { getStarterPresetTags, playerStarterPresets } from "./catalog.js";

export const LOADOUT_STORAGE_KEY = "p0-loadouts";
const LOADOUT_STARTERS_SEEDED_KEY = "p0-loadouts-starters-seeded-v1";

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

export function normalizeStoredBuild(source = {}) {
  const safeSource = source && typeof source === "object" ? source : {};
  const sourceAbilities = Array.isArray(safeSource.abilities) ? safeSource.abilities : [];
  const perkKey = safeSource.perk ?? (Array.isArray(safeSource.perks) ? safeSource.perks[0] ?? null : null);

  return {
    weapon: safeSource.weapon ?? null,
    abilities: Array.from({ length: 3 }, (_, index) => sourceAbilities[index] ?? null),
    perks: perkKey ? [perkKey] : [],
    ultimate: safeSource.ultimate ?? null,
    runes: cloneRuneAllocation(safeSource.runes),
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
    presetKey: overrides.presetKey ?? null,
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

function createStarterSeedLoadouts() {
  return playerStarterPresets.map((preset) => createStoredLoadout({
    name: preset.name,
    source: "starter",
    presetKey: preset.key,
    role: preset.role,
    description: preset.description,
    tags: getStarterPresetTags(preset.key),
    build: preset.loadout,
  }));
}

function readSeedFlag() {
  if (!canUseLocalStorage()) {
    return true;
  }

  try {
    return window.localStorage.getItem(LOADOUT_STARTERS_SEEDED_KEY) === "1";
  } catch {
    return true;
  }
}

function writeSeedFlag() {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(LOADOUT_STARTERS_SEEDED_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
}

function seedStarterLoadoutsOnce(list) {
  if (readSeedFlag()) {
    return list;
  }

  const existingPresetKeys = new Set(list.map((entry) => entry.presetKey).filter(Boolean));
  const starterEntries = createStarterSeedLoadouts().filter((entry) => !existingPresetKeys.has(entry.presetKey));
  const seededList = [...starterEntries, ...list];

  writeSeedFlag();
  return seededList;
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

export function readStoredLoadouts() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LOADOUT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const sanitizedList = Array.isArray(parsed) ? parsed.map((entry) => createStoredLoadout(entry)) : [];
    const seededList = seedStarterLoadoutsOnce(sanitizedList);

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