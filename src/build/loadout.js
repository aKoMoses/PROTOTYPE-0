// Loadout, build stats, rune calculations, bot loadout management
import { config, arena, abilityConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, abilityState } from "../state.js";
import { loadout, botBuildState, uiState, createInitialRuneAllocation } from "../state/app-state.js";
import { buildLabVisiblePools } from "../maps.js";
import { sanitizeIconClass } from "../utils.js";
import { getStatusState } from "../gameplay/combat.js";
import { renderPrematch } from "./ui.js";
import { createPresetRunes } from "../loadouts/catalog.js";
import { normalizeStoredBuild } from "../loadouts/storage.js";
import { canEquipStoredLoadout, getMissingUnlocksForBuild, getVisibleUnlockedKeys, isContentUnlocked } from "../progression.js";

function cloneRuneAllocation(source = null) {
  const next = createInitialRuneAllocation();
  if (!source) {
    return next;
  }

  for (const [treeKey, treeState] of Object.entries(next)) {
    const sourceTree = source[treeKey] ?? {};
    treeState.secondary = Math.max(0, Number(sourceTree.secondary ?? 0));
    treeState.primary = Math.max(0, Number(sourceTree.primary ?? 0));
    treeState.ultimate = Math.max(0, Number(sourceTree.ultimate ?? 0));
  }

  return next;
}

const botPresetLibrary = [
  {
    key: "bot-hunter",
    name: "Bot Hunter",
    role: "Poke / punish",
    description: "Keeps spacing, threatens long confirms, and punishes panic movement.",
    loadout: {
      weapon: weapons.sniper.key,
      modules: ["boltLinkJavelin", "orbitalDistorter", "ghostDriftModule"],
      implants: ["dashCoolingLoop"],
      core: "phantomCore",
      runes: createPresetRunes({
        attack: { secondary: 2, primary: 0, ultimate: 0 },
        systems: { secondary: 5, primary: 3, ultimate: 1 },
        support: { secondary: 5, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "bot-bourrin",
    name: "Bot Bourrin",
    role: "Commit / brawl",
    description: "Walks you down with heavy melee commitment and short brutal punish windows.",
    loadout: {
      weapon: weapons.axe.key,
      modules: ["vGripHarpoon", "hexPlateProjector", "swarmMissileRack"],
      implants: ["bioDrainLink"],
      core: "berserkCore",
      runes: createPresetRunes({
        attack: { secondary: 5, primary: 3, ultimate: 1 },
        defense: { secondary: 5, primary: 0, ultimate: 0 },
        support: { secondary: 2, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "bot-controller",
    name: "Bot Controller",
    role: "Zone / reset",
    description: "Controls exits, slows the duel down, and forces predictable movement.",
    loadout: {
      weapon: weapons.cannon.key,
      modules: ["voidCoreSingularity", "orbitalDistorter", "emPulseEmitter"],
      implants: ["shockBuffer"],
      core: "empCataclysmCore",
      runes: createPresetRunes({
        defense: { secondary: 2, primary: 0, ultimate: 0 },
        systems: { secondary: 5, primary: 3, ultimate: 1 },
        support: { secondary: 5, primary: 0, ultimate: 0 },
      }),
    },
  },
];

function getSelectablePoolKeys(group, { ignoreProgression = false } = {}) {
  if (ignoreProgression) {
    return [...(buildLabVisiblePools[group] ?? [])];
  }

  return getVisibleUnlockedKeys(group);
}

export function getVisibleContentItems(group, { ignoreProgression = false } = {}) {
  const pool = getSelectablePoolKeys(group, { ignoreProgression });
  return pool
    .map((key) => getContentItem(group, key))
    .filter((item) => item && item.state === "playable");
}

export function normalizeLoadoutSelections({ preserveEmptySlots = false } = {}) {
  const unlockedWeapons = getSelectablePoolKeys("weapons");
  const unlockedAbilities = getSelectablePoolKeys("modules");
  const unlockedPerks = getSelectablePoolKeys("implants");
  const unlockedUltimates = getSelectablePoolKeys("cores");

  loadout.weapon = unlockedWeapons.includes(loadout.weapon)
    ? loadout.weapon
    : preserveEmptySlots
      ? null
      : unlockedWeapons[0] ?? null;

  const seenAbilities = new Set();
  const normalizedAbilities = Array.from({ length: 3 }, (_, index) => {
    const abilityKey = loadout.modules[index] ?? null;
    if (!unlockedAbilities.includes(abilityKey) || seenAbilities.has(abilityKey)) {
      return null;
    }
    seenAbilities.add(abilityKey);
    return abilityKey;
  });

  if (!preserveEmptySlots) {
    for (const fallback of ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector", "vGripHarpoon", "emPulseEmitter"]) {
      if (!unlockedAbilities.includes(fallback) || normalizedAbilities.includes(fallback)) {
        continue;
      }

      const emptyIndex = normalizedAbilities.indexOf(null);
      if (emptyIndex === -1) {
        break;
      }
      normalizedAbilities[emptyIndex] = fallback;
    }
  }
  loadout.modules = normalizedAbilities;

  const perkKey = unlockedPerks.includes(loadout.implants[0]) ? loadout.implants[0] : null;
  loadout.implants = [preserveEmptySlots ? perkKey : perkKey ?? unlockedPerks[0] ?? null];

  const ultimateKey = unlockedUltimates.includes(loadout.core) ? loadout.core : null;
  loadout.core = preserveEmptySlots ? ultimateKey : ultimateKey ?? unlockedUltimates[0] ?? null;
}

export function getContentItem(group, key) {
  return content[group]?.[key] ?? null;
}

export function getAbilityBySlot(slotIndex) {
  return getContentItem("modules", loadout.modules[slotIndex]) ?? null;
}

export function getPlayableWeaponItems() {
  return Object.values(content.weapons).filter((weapon) => weapon.state === "playable");
}

export function getPlayableAbilityItems() {
  return Object.values(content.modules).filter((ability) => ability.state === "playable");
}

export function ensureBotLoadoutFilled(loadoutConfig) {
  const weaponKey = getContentItem("weapons", loadoutConfig.weapon)?.state === "playable"
    ? loadoutConfig.weapon
    : weapons.pulse.key;
  const playableAbilityKeys = getPlayableAbilityItems().map((ability) => ability.key);
  const uniqueAbilities = [...new Set((loadoutConfig.modules ?? loadoutConfig.abilities ?? []).filter((abilityKey) => playableAbilityKeys.includes(abilityKey)))];

  for (const fallback of ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector", "vGripHarpoon", "emPulseEmitter", "ghostDriftModule"]) {
    if (!uniqueAbilities.includes(fallback) && playableAbilityKeys.includes(fallback)) {
      uniqueAbilities.push(fallback);
    }
    if (uniqueAbilities.length >= 3) {
      break;
    }
  }

  const perkKey = getContentItem("implants", loadoutConfig.implant ?? loadoutConfig.perk)?.state === "playable"
    ? loadoutConfig.implant ?? loadoutConfig.perk
    : buildLabVisiblePools.implants[0];
  const ultimateKey = getContentItem("cores", loadoutConfig.core ?? loadoutConfig.ultimate)?.state === "playable"
    ? loadoutConfig.core ?? loadoutConfig.ultimate
    : buildLabVisiblePools.cores[0];

  return {
    weapon: weaponKey,
    modules: uniqueAbilities.slice(0, 3),
    implant: perkKey,
    core: ultimateKey,
    runes: cloneRuneAllocation(loadoutConfig.runes),
    presetKey: loadoutConfig.presetKey ?? null,
    name: loadoutConfig.name ?? null,
    role: loadoutConfig.role ?? null,
    description: loadoutConfig.description ?? null,
  };
}

export function pickRandomItems(source, count) {
  const pool = [...source];
  const picks = [];

  while (pool.length > 0 && picks.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }

  return picks;
}

export function createRandomBotLoadout() {
  const selectedPreset = botPresetLibrary[Math.floor(Math.random() * botPresetLibrary.length)] ?? botPresetLibrary[0];
  return ensureBotLoadoutFilled({
    ...selectedPreset.loadout,
    presetKey: selectedPreset.key,
    name: selectedPreset.name,
    role: selectedPreset.role,
    description: selectedPreset.description,
  });
}

export function getBotConfiguredLoadout() {
  return botBuildState.mode === "custom"
    ? ensureBotLoadoutFilled(botBuildState.custom)
    : createRandomBotLoadout();
}

export function enemyHasAbility(abilityKey) {
  return enemy.loadout?.modules?.includes(abilityKey);
}

export function setBotBuildMode(mode) {
  botBuildState.mode = mode === "custom" ? "custom" : "random";
  if (botBuildState.mode === "random") {
    botBuildState.current = createRandomBotLoadout();
  } else {
    botBuildState.current = ensureBotLoadoutFilled(botBuildState.custom);
  }
  renderPrematch();
}

export function applyBotCustomWeapon(weaponKey) {
  botBuildState.custom.weapon = weaponKey;
  if (botBuildState.mode === "custom") {
    botBuildState.current = ensureBotLoadoutFilled(botBuildState.custom);
  }
  renderPrematch();
}

export function toggleBotCustomAbility(abilityKey) {
  const selected = [...(botBuildState.custom.modules ?? [])];
  const existingIndex = selected.indexOf(abilityKey);

  if (existingIndex >= 0) {
    if (selected.length <= 1) {
      return;
    }
    selected.splice(existingIndex, 1);
  } else if (selected.length >= 3) {
    selected.shift();
    selected.push(abilityKey);
  } else {
    selected.push(abilityKey);
  }

  botBuildState.custom.modules = ensureBotLoadoutFilled({
    weapon: botBuildState.custom.weapon,
    modules: selected,
  }).modules;
  if (botBuildState.mode === "custom") {
    botBuildState.current = ensureBotLoadoutFilled(botBuildState.custom);
  }
  renderPrematch();
}

export function getCurrentBotBuildPreview() {
  return botBuildState.mode === "custom"
    ? ensureBotLoadoutFilled(botBuildState.custom)
    : ensureBotLoadoutFilled(botBuildState.current);
}

export function applySavedPlayerLoadout(savedLoadout) {
  const normalizedBuild = normalizeStoredBuild(savedLoadout?.build ?? savedLoadout);
  if (!normalizedBuild.weapon) {
    return { ok: false, missing: [] };
  }

  if (!canEquipStoredLoadout(normalizedBuild)) {
    return {
      ok: false,
      missing: getMissingUnlocksForBuild(normalizedBuild),
    };
  }

  loadout.weapon = normalizedBuild.weapon;
  loadout.modules = [...normalizedBuild.modules];
  loadout.implants = [...normalizedBuild.implants];
  loadout.core = normalizedBuild.core;
  loadout.runes = cloneRuneAllocation(normalizedBuild.runes);
  normalizeLoadoutSelections({ preserveEmptySlots: false });
  return { ok: true, missing: [] };
}

export function getBotPresets() {
  return botPresetLibrary;
}

export function applyBotPreset(presetKey) {
  const preset = botPresetLibrary.find((entry) => entry.key === presetKey);
  if (!preset) {
    return false;
  }

  botBuildState.mode = "custom";
  botBuildState.custom = ensureBotLoadoutFilled({
    ...preset.loadout,
    presetKey: preset.key,
    name: preset.name,
    role: preset.role,
    description: preset.description,
  });
  botBuildState.current = ensureBotLoadoutFilled(botBuildState.custom);
  return true;
}


export function hasPerk(key) {
  return loadout.implants.slice(0, 1).includes(key);
}

export function getRuneValue(treeKey, nodeKey) {
  return loadout.runes[treeKey]?.[nodeKey] ?? 0;
}

export function getStatusDuration(duration) {
  return duration * (1 + getRuneValue("systems", "secondary") * 0.03);
}

export function hasRuneShard(treeKey) {
  return getSelectedRuneUltimateTree() === treeKey;
}

export function getAbilityCooldown(baseCooldown) {
  const reduction = Math.min(0.18, getRuneValue("systems", "secondary") * 0.03);
  return baseCooldown * (1 - reduction);
}

export function getIconMarkup(item, type) {
  const iconKey = sanitizeIconClass(item.icon ?? `${type}-${item.key}`);
  const groupClass = item.category ? `content-icon--${item.category}` : "";
  return `<div class="content-icon ${groupClass} content-icon--${iconKey}"></div>`;
}

export function getPerkDamageMultiplier(target = null) {
  let multiplier = 1 + getRuneValue("attack", "secondary") * 0.015;

  if (hasPerk("critScanRelay") && target) {
    const targetStatus = getStatusState(target);
    if (targetStatus.slow > 0) {
      multiplier *= 1.12;
    }
    if ((targetStatus.slow > 0 || targetStatus.stunned) && getRuneValue("attack", "primary") > 0) {
      multiplier *= 1 + getRuneValue("attack", "primary") * 0.03;
    }
  }

  if (hasPerk("predatorLens") && target && target.hp / target.maxHp <= 0.35) {
    multiplier *= 1.1;
  }

  return multiplier;
}

export function getWeaponDamageMultiplier(target = null) {
  let multiplier = getPerkDamageMultiplier(target);

  if (hasPerk("seqShotCalculator") && player.precisionMomentumStacks > 0) {
    multiplier *= 1 + player.precisionMomentumStacks * config.precisionMomentumDamagePerStack;
  }

  return multiplier;
}

export function getBuildStats() {
  return {
    maxHp: config.playerMaxHp + (hasPerk("scavengerPlates") ? 30 : 0) + getRuneValue("defense", "secondary") * 5,
    damageReduction: (hasPerk("reactiveArmor") ? 0.1 : 0) + getRuneValue("defense", "secondary") * 0.008,
    ccReduction: (hasPerk("shockBuffer") ? 0.22 : 0) + getRuneValue("defense", "secondary") * 0.018,
    dashCooldownMultiplier: hasPerk("dashCooling") ? 0.84 : 1,
    hasteMultiplier:
      1 +
      (player.hasteTime > 0 ? 0.1 : 0) +
      (player.afterDashHasteTime > 0 ? 0.16 : 0) +
      (player.lastStandTime > 0 ? config.lastStandHasteBonus : 0) +
      getRuneValue("support", "secondary") * 0.008,
    moveMultiplier:
      1 +
      (hasPerk("staticMomentum") && player.hasteTime > 0 ? 0.06 : 0) +
      (player.reflexAegisSpeedTime > 0 ? config.reflexAegisMoveBonus : 0) +
      (player.lastStandTime > 0 ? config.lastStandMoveBonus : 0) +
      getRuneValue("support", "secondary") * 0.012,
    omnivamp: hasPerk("bioDrainLink") ? 0.07 : 0,
    abilityLeech: hasPerk("abilityLeech") ? 4 : 0,
    finisherBonus: getRuneValue("attack", "primary") * 0.04,
    controlledBonus: getRuneValue("attack", "primary") * 0.03,
    outOfCombatRegen: hasPerk("combatRecovery") ? 4 : 0,
    shieldOnBurst: hasPerk("arcFeedback") ? 16 : 0,
  };
}

export function getSpentRunePoints() {
  return Object.values(loadout.runes).reduce(
    (total, tree) => total + tree.secondary + tree.primary + tree.ultimate,
    0,
  );
}

export function getRemainingRunePoints() {
  return Math.max(0, config.runePoints - getSpentRunePoints());
}

export function getSelectedRuneUltimateTree() {
  return (
    Object.entries(loadout.runes).find(([, tree]) => tree.ultimate > 0)?.[0] ?? null
  );
}

export function getActiveDashCooldown() {
  return config.dashCooldown * getBuildStats().dashCooldownMultiplier;
}

export function getActiveDashCharges() {
  return 1;
}

export function getDashProfile(mode = abilityState.dash.mode) {
  if (mode === "hold") {
    return {
      duration: abilityConfig.dash.holdDuration,
      invulnerability: abilityConfig.dash.holdInvulnerability,
      speed: abilityConfig.dash.holdSpeed,
      trailColor: "#c8ffe4",
    };
  }

  return {
    duration: abilityConfig.dash.tapDuration,
    invulnerability: abilityConfig.dash.tapInvulnerability,
    speed: abilityConfig.dash.tapSpeed,
    trailColor: abilityConfig.dash.trailColor,
  };
}

export function getWeaponCooldown(weaponKey) {
  const weapon = weapons[weaponKey] ?? weapons.pulse;
  return weapon.cooldown / getBuildStats().hasteMultiplier;
}

export function getActiveMoveSpeed() {
  const buildStats = getBuildStats();
  const fieldBoost = abilityState.orbitalDistorter.moveBoostTime > 0 ? config.orbitalDistorterMoveBoost : 1;
  return config.playerSpeed * fieldBoost * buildStats.moveMultiplier;
}

export function addEnergy(amount) {
  return amount;
}

export function getPulseMagazineSize() {
  return config.pulseMagazineSize;
}
