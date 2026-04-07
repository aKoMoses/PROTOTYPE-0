// Loadout, build stats, rune calculations, bot loadout management
import { config, arena, abilityConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { loadout, player, enemy, botBuildState, uiState, abilityState, createInitialRuneAllocation } from "../state.js";
import { buildLabVisiblePools } from "../maps.js";
import { sanitizeIconClass } from "../utils.js";
import { getStatusState } from "../gameplay/combat.js";
import { renderPrematch } from "./ui.js";

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

function createPresetRunes(overrides = {}) {
  const runes = createInitialRuneAllocation();
  for (const [treeKey, values] of Object.entries(overrides)) {
    if (!runes[treeKey]) {
      continue;
    }
    runes[treeKey].secondary = values.secondary ?? 0;
    runes[treeKey].primary = values.primary ?? 0;
    runes[treeKey].ultimate = values.ultimate ?? 0;
  }
  return runes;
}

const playerStarterPresets = [
  {
    key: "stalker-rig",
    name: "Stalker Rig",
    role: "Easy pressure / stable punish",
    description: "Pulse pressure with clean anti-burst tools and a forgiving clutch line.",
    loadout: {
      weapon: weapons.pulse.key,
      abilities: ["shockJavelin", "magneticField", "phaseShift"],
      perks: ["reactiveArmor"],
      ultimate: "revivalProtocol",
      runes: createPresetRunes({
        attack: { secondary: 2, primary: 0, ultimate: 0 },
        defense: { secondary: 5, primary: 3, ultimate: 1 },
        spells: { secondary: 5, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "breach-kit",
    name: "Breach Kit",
    role: "Simple engage / close punish",
    description: "Shotgun plus catch tools for players who want obvious punish windows and strong confirms.",
    loadout: {
      weapon: weapons.shotgun.key,
      abilities: ["magneticGrapple", "shockJavelin", "energyShield"],
      perks: ["executionRelay"],
      ultimate: "phantomSplit",
      runes: createPresetRunes({
        attack: { secondary: 5, primary: 3, ultimate: 1 },
        defense: { secondary: 2, primary: 0, ultimate: 0 },
        support: { secondary: 5, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "long-sight",
    name: "Long Sight",
    role: "Spacing / charged punish",
    description: "Rail Sniper setup with clean self-peel and a strong lane-control identity.",
    loadout: {
      weapon: weapons.sniper.key,
      abilities: ["shockJavelin", "gravityWell", "phaseShift"],
      perks: ["dashCooling"],
      ultimate: "phantomSplit",
      runes: createPresetRunes({
        attack: { secondary: 5, primary: 0, ultimate: 0 },
        spells: { secondary: 5, primary: 3, ultimate: 1 },
        support: { secondary: 2, primary: 0, ultimate: 0 },
      }),
    },
  },
];

const botPresetLibrary = [
  {
    key: "bot-hunter",
    name: "Bot Hunter",
    role: "Poke / punish",
    description: "Keeps spacing, threatens long confirms, and punishes panic movement.",
    loadout: {
      weapon: weapons.sniper.key,
      abilities: ["shockJavelin", "magneticField", "phaseShift"],
      perk: "dashCooling",
      ultimate: "phantomSplit",
      runes: createPresetRunes({
        attack: { secondary: 2, primary: 0, ultimate: 0 },
        spells: { secondary: 5, primary: 3, ultimate: 1 },
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
      abilities: ["magneticGrapple", "energyShield", "phaseDash"],
      perk: "omnivampCore",
      ultimate: "berserkCore",
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
      abilities: ["gravityWell", "magneticField", "empBurst"],
      perk: "shockBuffer",
      ultimate: "empCataclysm",
      runes: createPresetRunes({
        defense: { secondary: 2, primary: 0, ultimate: 0 },
        spells: { secondary: 5, primary: 3, ultimate: 1 },
        support: { secondary: 5, primary: 0, ultimate: 0 },
      }),
    },
  },
];

export function getVisibleContentItems(group) {
  const pool = buildLabVisiblePools[group] ?? [];
  return pool
    .map((key) => getContentItem(group, key))
    .filter((item) => item && item.state === "playable");
}

export function normalizeLoadoutSelections({ preserveEmptySlots = false } = {}) {
  loadout.weapon = buildLabVisiblePools.weapons.includes(loadout.weapon)
    ? loadout.weapon
    : preserveEmptySlots
      ? null
      : buildLabVisiblePools.weapons[0];

  const seenAbilities = new Set();
  const normalizedAbilities = Array.from({ length: 3 }, (_, index) => {
    const abilityKey = loadout.abilities[index] ?? null;
    if (!buildLabVisiblePools.abilities.includes(abilityKey) || seenAbilities.has(abilityKey)) {
      return null;
    }
    seenAbilities.add(abilityKey);
    return abilityKey;
  });

  if (!preserveEmptySlots) {
    for (const fallback of ["shockJavelin", "magneticField", "energyShield", "magneticGrapple", "empBurst"]) {
      if (!buildLabVisiblePools.abilities.includes(fallback) || normalizedAbilities.includes(fallback)) {
        continue;
      }

      const emptyIndex = normalizedAbilities.indexOf(null);
      if (emptyIndex === -1) {
        break;
      }
      normalizedAbilities[emptyIndex] = fallback;
    }
  }
  loadout.abilities = normalizedAbilities;

  const perkKey = buildLabVisiblePools.perks.includes(loadout.perks[0]) ? loadout.perks[0] : null;
  loadout.perks = [preserveEmptySlots ? perkKey : perkKey ?? buildLabVisiblePools.perks[0]];

  const ultimateKey = buildLabVisiblePools.ultimates.includes(loadout.ultimate) ? loadout.ultimate : null;
  loadout.ultimate = preserveEmptySlots ? ultimateKey : ultimateKey ?? buildLabVisiblePools.ultimates[0];
}

export function getContentItem(group, key) {
  return content[group]?.[key] ?? null;
}

export function getAbilityBySlot(slotIndex) {
  return getContentItem("abilities", loadout.abilities[slotIndex]) ?? null;
}

export function getPlayableWeaponItems() {
  return Object.values(content.weapons).filter((weapon) => weapon.state === "playable");
}

export function getPlayableAbilityItems() {
  return Object.values(content.abilities).filter((ability) => ability.state === "playable");
}

export function ensureBotLoadoutFilled(loadoutConfig) {
  const weaponKey = getContentItem("weapons", loadoutConfig.weapon)?.state === "playable"
    ? loadoutConfig.weapon
    : weapons.pulse.key;
  const playableAbilityKeys = getPlayableAbilityItems().map((ability) => ability.key);
  const uniqueAbilities = [...new Set((loadoutConfig.abilities ?? []).filter((abilityKey) => playableAbilityKeys.includes(abilityKey)))];

  for (const fallback of ["shockJavelin", "magneticField", "energyShield", "magneticGrapple", "empBurst", "phaseShift"]) {
    if (!uniqueAbilities.includes(fallback) && playableAbilityKeys.includes(fallback)) {
      uniqueAbilities.push(fallback);
    }
    if (uniqueAbilities.length >= 3) {
      break;
    }
  }

  const perkKey = getContentItem("perks", loadoutConfig.perk)?.state === "playable"
    ? loadoutConfig.perk
    : buildLabVisiblePools.perks[0];
  const ultimateKey = getContentItem("ultimates", loadoutConfig.ultimate)?.state === "playable"
    ? loadoutConfig.ultimate
    : buildLabVisiblePools.ultimates[0];

  return {
    weapon: weaponKey,
    abilities: uniqueAbilities.slice(0, 3),
    perk: perkKey,
    ultimate: ultimateKey,
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
  return enemy.loadout?.abilities?.includes(abilityKey);
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
  const selected = [...(botBuildState.custom.abilities ?? [])];
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

  botBuildState.custom.abilities = ensureBotLoadoutFilled({
    weapon: botBuildState.custom.weapon,
    abilities: selected,
  }).abilities;
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

export function getPlayerStarterPresets() {
  return playerStarterPresets;
}

export function applyPlayerStarterPreset(presetKey) {
  const preset = playerStarterPresets.find((entry) => entry.key === presetKey);
  if (!preset) {
    return false;
  }

  loadout.weapon = preset.loadout.weapon;
  loadout.abilities = [...preset.loadout.abilities];
  loadout.perks = [...preset.loadout.perks];
  loadout.ultimate = preset.loadout.ultimate;
  loadout.runes = cloneRuneAllocation(preset.loadout.runes);
  return true;
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
  return loadout.perks.slice(0, 1).includes(key);
}

export function getRuneValue(treeKey, nodeKey) {
  return loadout.runes[treeKey]?.[nodeKey] ?? 0;
}

export function getStatusDuration(duration) {
  return duration * (1 + getRuneValue("spells", "secondary") * 0.03);
}

export function hasRuneShard(treeKey) {
  return getSelectedRuneUltimateTree() === treeKey;
}

export function getAbilityCooldown(baseCooldown) {
  const reduction = Math.min(0.18, getRuneValue("spells", "secondary") * 0.03);
  return baseCooldown * (1 - reduction);
}

export function getIconMarkup(item, type) {
  const iconKey = sanitizeIconClass(item.icon ?? `${type}-${item.key}`);
  const groupClass = item.category ? `content-icon--${item.category}` : "";
  return `<div class="content-icon ${groupClass} content-icon--${iconKey}"></div>`;
}

export function getPerkDamageMultiplier(target = null) {
  let multiplier = 1 + getRuneValue("attack", "secondary") * 0.015;

  if (hasPerk("executionRelay") && target) {
    const targetStatus = getStatusState(target);
    if (targetStatus.slow > 0) {
      multiplier *= 1.12;
    }
    if ((targetStatus.slow > 0 || targetStatus.stunned) && getRuneValue("attack", "primary") > 0) {
      multiplier *= 1 + getRuneValue("attack", "primary") * 0.03;
    }
  }

  if (hasPerk("predatorInstinct") && target && target.hp / target.maxHp <= 0.35) {
    multiplier *= 1.1;
  }

  return multiplier;
}

export function getWeaponDamageMultiplier(target = null) {
  let multiplier = getPerkDamageMultiplier(target);

  if (hasPerk("precisionMomentum") && player.precisionMomentumStacks > 0) {
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
      (player.lastStandTime > 0 ? config.lastStandMoveBonus : 0) +
      getRuneValue("support", "secondary") * 0.012,
    omnivamp: hasPerk("omnivampCore") ? 0.07 : 0,
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
  const fieldBoost = abilityState.field.moveBoostTime > 0 ? config.fieldTapMoveBoost : 1;
  return config.playerSpeed * fieldBoost * buildStats.moveMultiplier;
}

export function addEnergy(amount) {
  return amount;
}

export function getPulseMagazineSize() {
  return config.pulseMagazineSize;
}
