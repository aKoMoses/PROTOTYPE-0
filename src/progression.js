import { content } from "./content.js";
import collectionGroups from "./data/content-groups.json";
import { buildLabVisiblePools } from "./maps.js";

export const PROGRESSION_STORAGE_KEY = "p0-progression-v1";
export const PROGRESSION_CHANGED_EVENT = "p0-progression-changed";

const PROGRESSION_GROUPS = collectionGroups.map((group) => group.key);

const INITIAL_UNLOCKS = {
  weapons: ["pulse", "shotgun", "sniper"],
  abilities: [...buildLabVisiblePools.abilities],
  perks: ["reactiveArmor", "executionRelay", "dashCooling"],
  ultimates: ["phantomSplit"],
};

const LEVEL_UNLOCKS = [
  { level: 2, group: "weapons", key: "axe" },
  { level: 3, group: "perks", key: "scavengerPlates" },
  { level: 4, group: "ultimates", key: "revivalProtocol" },
  { level: 5, group: "weapons", key: "staff" },
  { level: 6, group: "perks", key: "omnivampCore" },
  { level: 7, group: "ultimates", key: "empCataclysm" },
  { level: 8, group: "weapons", key: "injector" },
  { level: 9, group: "perks", key: "lastStandBuffer" },
  { level: 10, group: "weapons", key: "lance" },
  { level: 11, group: "perks", key: "precisionMomentum" },
  { level: 12, group: "weapons", key: "cannon" },
  { level: 13, group: "perks", key: "shockBuffer" },
];

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function sanitizeXp(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function getLevelForXp(xp) {
  return Math.max(1, sanitizeXp(xp) + 1);
}

export function getXpForLevel(level) {
  return Math.max(0, Math.floor(Number(level) || 1) - 1);
}

export function getMaxDefinedLevel() {
  return LEVEL_UNLOCKS.reduce((highest, entry) => Math.max(highest, entry.level), 1);
}

function createUnlockBucket() {
  return Object.fromEntries(PROGRESSION_GROUPS.map((group) => [group, []]));
}

function collectUnlockedKeysForLevel(level) {
  const unlocked = createUnlockBucket();
  const sets = Object.fromEntries(
    PROGRESSION_GROUPS.map((group) => [group, new Set(INITIAL_UNLOCKS[group] ?? [])]),
  );

  for (const entry of LEVEL_UNLOCKS) {
    if (entry.level <= level) {
      sets[entry.group].add(entry.key);
    }
  }

  for (const group of PROGRESSION_GROUPS) {
    unlocked[group] = (buildLabVisiblePools[group] ?? []).filter((key) => sets[group].has(key));
  }

  return unlocked;
}

function createProgressionSnapshot(xp = 0) {
  const safeXp = sanitizeXp(xp);
  const level = getLevelForXp(safeXp);
  return {
    xp: safeXp,
    level,
    unlockedKeys: collectUnlockedKeysForLevel(level),
  };
}

function normalizeProgression(source = null) {
  const xp = sanitizeXp(source?.xp);
  return createProgressionSnapshot(xp);
}

function emitProgressionChanged(detail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PROGRESSION_CHANGED_EVENT, { detail }));
}

function readStoredProgressionSnapshot() {
  if (!canUseLocalStorage()) {
    return createProgressionSnapshot(0);
  }

  try {
    const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) {
      return createProgressionSnapshot(0);
    }
    return normalizeProgression(JSON.parse(raw));
  } catch {
    return createProgressionSnapshot(0);
  }
}

let progressionState = readStoredProgressionSnapshot();

function persistProgression(snapshot) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify({ xp: snapshot.xp }));
  } catch {
    // Ignore storage failures and keep the session usable.
  }
}

function updateProgression(xp, reason = "update") {
  const previous = progressionState;
  const next = createProgressionSnapshot(xp);
  progressionState = next;
  persistProgression(next);

  const unlockedEntries = LEVEL_UNLOCKS.filter((entry) => entry.level > previous.level && entry.level <= next.level);
  const detail = {
    reason,
    previous,
    snapshot: getProgressionSnapshot(),
    leveledUp: next.level > previous.level,
    unlockedEntries,
  };
  emitProgressionChanged(detail);
  return detail;
}

export function getProgressionSnapshot() {
  return {
    xp: progressionState.xp,
    level: progressionState.level,
    unlockedKeys: {
      weapons: [...progressionState.unlockedKeys.weapons],
      abilities: [...progressionState.unlockedKeys.abilities],
      perks: [...progressionState.unlockedKeys.perks],
      ultimates: [...progressionState.unlockedKeys.ultimates],
    },
  };
}

export function setXp(nextXp, reason = "update") {
  return updateProgression(nextXp, reason);
}

export function addXp(amount = 1, reason = "duel-xp") {
  return updateProgression(progressionState.xp + sanitizeXp(amount), reason);
}

export function incrementLevelForTest() {
  return updateProgression(getXpForLevel(progressionState.level + 1), "test-level-up");
}

export function decrementLevelForTest() {
  return updateProgression(getXpForLevel(Math.max(1, progressionState.level - 1)), "test-level-down");
}

export function getUnlockedKeys(group) {
  return [...(progressionState.unlockedKeys[group] ?? [])];
}

export function getVisibleUnlockedKeys(group) {
  return getUnlockedKeys(group).filter((key) => buildLabVisiblePools[group]?.includes(key));
}

export function isContentUnlocked(group, key) {
  if (!key) {
    return false;
  }
  return progressionState.unlockedKeys[group]?.includes(key) ?? false;
}

export function getUnlockLevelForContent(group, key) {
  if (!buildLabVisiblePools[group]?.includes(key)) {
    return null;
  }

  if (INITIAL_UNLOCKS[group]?.includes(key)) {
    return 1;
  }

  return LEVEL_UNLOCKS.find((entry) => entry.group === group && entry.key === key)?.level ?? 1;
}

export function getCollectionEntries(group) {
  return (buildLabVisiblePools[group] ?? [])
    .map((key) => {
      const item = content[group]?.[key];
      if (!item) {
        return null;
      }

      return {
        key,
        item,
        unlocked: isContentUnlocked(group, key),
        unlockLevel: getUnlockLevelForContent(group, key),
      };
    })
    .filter(Boolean);
}

function normalizeBuildLike(source = {}) {
  const safeSource = source && typeof source === "object" ? source : {};
  const abilitySource = Array.isArray(safeSource.abilities) ? safeSource.abilities : [];
  const perkKey = safeSource.perk ?? (Array.isArray(safeSource.perks) ? safeSource.perks[0] ?? null : null);

  return {
    weapon: safeSource.weapon ?? null,
    abilities: Array.from({ length: 3 }, (_, index) => abilitySource[index] ?? null),
    perks: perkKey ? [perkKey] : [],
    ultimate: safeSource.ultimate ?? null,
  };
}

export function getMissingUnlocksForBuild(source = {}) {
  const normalized = normalizeBuildLike(source?.build ?? source);
  const missing = [];

  if (normalized.weapon && !isContentUnlocked("weapons", normalized.weapon)) {
    missing.push({
      slot: "Weapon",
      group: "weapons",
      key: normalized.weapon,
      requiredLevel: getUnlockLevelForContent("weapons", normalized.weapon),
      name: content.weapons[normalized.weapon]?.name ?? normalized.weapon,
    });
  }

  normalized.abilities.forEach((abilityKey, index) => {
    if (!abilityKey || isContentUnlocked("abilities", abilityKey)) {
      return;
    }
    missing.push({
      slot: `Ability ${index + 1}`,
      group: "abilities",
      key: abilityKey,
      requiredLevel: getUnlockLevelForContent("abilities", abilityKey),
      name: content.abilities[abilityKey]?.name ?? abilityKey,
    });
  });

  const perkKey = normalized.perks[0] ?? null;
  if (perkKey && !isContentUnlocked("perks", perkKey)) {
    missing.push({
      slot: "Perk",
      group: "perks",
      key: perkKey,
      requiredLevel: getUnlockLevelForContent("perks", perkKey),
      name: content.perks[perkKey]?.name ?? perkKey,
    });
  }

  if (normalized.ultimate && !isContentUnlocked("ultimates", normalized.ultimate)) {
    missing.push({
      slot: "Ultimate",
      group: "ultimates",
      key: normalized.ultimate,
      requiredLevel: getUnlockLevelForContent("ultimates", normalized.ultimate),
      name: content.ultimates[normalized.ultimate]?.name ?? normalized.ultimate,
    });
  }

  return missing;
}

export function canEquipStoredLoadout(source = {}) {
  return getMissingUnlocksForBuild(source).length === 0;
}

export function getRequiredLevelForBuild(source = {}) {
  return getMissingUnlocksForBuild(source).reduce(
    (highest, entry) => Math.max(highest, entry.requiredLevel ?? 1),
    1,
  );
}

export function formatMissingUnlocks(missing = [], { short = false } = {}) {
  if (!missing.length) {
    return "";
  }

  if (short) {
    const requiredLevel = missing.reduce((highest, entry) => Math.max(highest, entry.requiredLevel ?? 1), 1);
    return `Unlock at level ${requiredLevel}`;
  }

  return missing
    .map((entry) => `${entry.slot}: ${entry.name} (level ${entry.requiredLevel})`)
    .join(" | ");
}

export function getNextUnlockEntry(level = progressionState.level) {
  return LEVEL_UNLOCKS.find((entry) => entry.level > level) ?? null;
}