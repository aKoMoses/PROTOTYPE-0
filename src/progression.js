import { content } from "./content.js";
import collectionGroups from "./data/content-groups.json";
import { buildLabVisiblePools } from "./maps.js";

export const PROGRESSION_STORAGE_KEY = "p0-progression-v1";
export const PROGRESSION_CHANGED_EVENT = "p0-progression-changed";

const PROGRESSION_GROUPS = collectionGroups.map((group) => group.key);

const INITIAL_UNLOCKS = {
  weapons: ["pulse", "shotgun", "sniper"],
  modules: [...buildLabVisiblePools.modules],
  implants: ["reactiveArmor", "dashCoolingLoop"],
  cores: ["phantomCore"],
};

const LEVEL_UNLOCKS = [
  { level: 2, group: "weapons", key: "axe" },
  { level: 3, group: "implants", key: "scavengerPlates" },
  { level: 4, group: "cores", key: "rebootProtocol" },
  { level: 5, group: "weapons", key: "staff" },
  { level: 6, group: "implants", key: "bioDrainLink" },
  { level: 7, group: "cores", key: "empCataclysmCore" },
  { level: 8, group: "weapons", key: "injector" },
  { level: 9, group: "implants", key: "lastStandProtocol" },
  { level: 10, group: "weapons", key: "lance" },
  { level: 11, group: "implants", key: "adrenalInjector" },
  { level: 12, group: "weapons", key: "cannon" },
  { level: 13, group: "implants", key: "shockBuffer" },
];

function sanitizeXp(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function getLevelForXp(xp) {
  return Math.max(1, sanitizeXp(xp) + 1);
}

export function getXpForLevel(level) {
  return Math.max(0, Math.floor(Number(level) || 1) - 1);
}

export function getBotDifficultyTierForLevel(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  if (safeLevel <= 3) {
    return "easy";
  }
  if (safeLevel <= 7) {
    return "normal";
  }
  if (safeLevel <= 11) {
    return "hard";
  }
  return "nightmare";
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
  return createProgressionSnapshot(0);
}

let progressionState = readStoredProgressionSnapshot();

function persistProgression(snapshot) {
  return snapshot;
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
      modules: [...(progressionState.unlockedKeys.modules ?? [])],
      implants: [...(progressionState.unlockedKeys.implants ?? [])],
      cores: [...(progressionState.unlockedKeys.cores ?? [])],
    },
  };
}

export function getCurrentBotDifficultyTier() {
  return getBotDifficultyTierForLevel(progressionState.level);
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
  const moduleSource = Array.isArray(safeSource.modules) ? safeSource.modules : (Array.isArray(safeSource.abilities) ? safeSource.abilities : []);
  const implantKey = safeSource.implant ?? safeSource.perk ?? (Array.isArray(safeSource.implants) ? safeSource.implants[0] ?? null : null) ?? (Array.isArray(safeSource.perks) ? safeSource.perks[0] ?? null : null);
  const coreKey = safeSource.core ?? safeSource.ultimate ?? null;

  return {
    weapon: safeSource.weapon ?? null,
    modules: Array.from({ length: 3 }, (_, index) => moduleSource[index] ?? null),
    implants: implantKey ? [implantKey] : [],
    core: coreKey,
  };
}

function normalizePresetUnlockLevel(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
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

  normalized.modules.forEach((moduleKey, index) => {
    if (!moduleKey || isContentUnlocked("modules", moduleKey)) {
      return;
    }
    missing.push({
      slot: `Ability ${index + 1}`,
      group: "modules",
      key: moduleKey,
      requiredLevel: getUnlockLevelForContent("modules", moduleKey),
      name: content.modules[moduleKey]?.name ?? moduleKey,
    });
  });

  const implantKey = normalized.implants[0] ?? null;
  if (implantKey && !isContentUnlocked("implants", implantKey)) {
    missing.push({
      slot: "Perk",
      group: "implants",
      key: implantKey,
      requiredLevel: getUnlockLevelForContent("implants", implantKey),
      name: content.implants[implantKey]?.name ?? implantKey,
    });
  }

  if (normalized.core && !isContentUnlocked("cores", normalized.core)) {
    missing.push({
      slot: "Ultimate",
      group: "cores",
      key: normalized.core,
      requiredLevel: getUnlockLevelForContent("cores", normalized.core),
      name: content.cores[normalized.core]?.name ?? normalized.core,
    });
  }

  return missing;
}

export function canEquipStoredLoadout(source = {}) {
  return !getLoadoutAccessState(source).locked;
}

export function getRequiredLevelForBuild(source = {}) {
  return getMissingUnlocksForBuild(source).reduce(
    (highest, entry) => Math.max(highest, entry.requiredLevel ?? 1),
    1,
  );
}

export function getLoadoutAccessState(source = {}) {
  const currentLevel = progressionState.level;
  const normalized = normalizeBuildLike(source?.build ?? source);
  const missing = getMissingUnlocksForBuild(normalized);
  const buildRequiredLevel = missing.reduce((highest, entry) => Math.max(highest, entry.requiredLevel ?? 1), 1);
  const presetUnlockLevel = normalizePresetUnlockLevel(source?.presetUnlockLevel);
  const lockedByPreset = currentLevel < presetUnlockLevel;
  const requiredLevel = Math.max(1, buildRequiredLevel, presetUnlockLevel);
  const locked = missing.length > 0 || lockedByPreset;

  let reason = "";
  if (lockedByPreset && missing.length > 0) {
    reason = `Preset unlocks at level ${presetUnlockLevel}. ${formatMissingUnlocks(missing)}`;
  } else if (lockedByPreset) {
    reason = `Preset unlocks at level ${presetUnlockLevel}.`;
  } else if (missing.length > 0) {
    reason = formatMissingUnlocks(missing);
  }

  return {
    locked,
    lockedByPreset,
    currentLevel,
    presetUnlockLevel,
    buildRequiredLevel,
    requiredLevel,
    missing,
    reason,
  };
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
