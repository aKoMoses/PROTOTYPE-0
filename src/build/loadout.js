// Loadout, build stats, rune calculations, bot loadout management
import { config, arena, abilityConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { loadout, player, enemy, botBuildState, uiState, abilityState } from "../state.js";
import { buildLabVisiblePools } from "../maps.js";
import { sanitizeIconClass } from "../utils.js";
import { getStatusState } from "../gameplay/combat.js";
import { renderPrematch } from "./ui.js";

export function getVisibleContentItems(group) {
  const pool = buildLabVisiblePools[group] ?? [];
  return pool
    .map((key) => getContentItem(group, key))
    .filter((item) => item && item.state === "playable");
}

export function normalizeLoadoutSelections() {
  if (!buildLabVisiblePools.weapons.includes(loadout.weapon)) {
    loadout.weapon = buildLabVisiblePools.weapons[0];
  }

  loadout.abilities = [...new Set(loadout.abilities.filter((key) => buildLabVisiblePools.abilities.includes(key)))];
  for (const fallback of ["shockJavelin", "magneticField", "energyShield", "magneticGrapple", "empBurst"]) {
    if (!loadout.abilities.includes(fallback) && buildLabVisiblePools.abilities.includes(fallback)) {
      loadout.abilities.push(fallback);
    }
    if (loadout.abilities.length >= 3) {
      break;
    }
  }
  loadout.abilities = loadout.abilities.slice(0, 3);

  if (!buildLabVisiblePools.perks.includes(loadout.perks[0])) {
    loadout.perks = [buildLabVisiblePools.perks[0]];
  } else {
    loadout.perks = [loadout.perks[0]];
  }

  if (!buildLabVisiblePools.ultimates.includes(loadout.ultimate)) {
    loadout.ultimate = buildLabVisiblePools.ultimates[0];
  }
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

  return {
    weapon: weaponKey,
    abilities: uniqueAbilities.slice(0, 3),
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
  const archetypes = [
    {
      weapon: weapons.pulse.key,
      abilities: ["shockJavelin", "magneticField", "energyShield"],
    },
    {
      weapon: weapons.pulse.key,
      abilities: ["shockJavelin", "empBurst", "phaseShift"],
    },
    {
      weapon: weapons.shotgun.key,
      abilities: ["magneticGrapple", "empBurst", "blinkStep"],
    },
    {
      weapon: weapons.shotgun.key,
      abilities: ["shockJavelin", "magneticGrapple", "energyShield"],
    },
    {
      weapon: weapons.axe.key,
      abilities: ["magneticGrapple", "energyShield", "phaseDash"],
    },
    {
      weapon: weapons.axe.key,
      abilities: ["magneticField", "magneticGrapple", "shockJavelin"],
    },
    {
      weapon: weapons.sniper.key,
      abilities: ["shockJavelin", "energyShield", "magneticField"],
    },
    {
      weapon: weapons.staff.key,
      abilities: ["magneticField", "energyShield", "chainLightning"],
    },
    {
      weapon: weapons.injector.key,
      abilities: ["shockJavelin", "empBurst", "magneticGrapple"],
    },
    {
      weapon: weapons.lance.key,
      abilities: ["magneticGrapple", "phaseDash", "energyShield"],
    },
    {
      weapon: weapons.cannon.key,
      abilities: ["gravityWell", "magneticField", "phaseShift"],
    },
  ];

  const selectedArchetype = archetypes[Math.floor(Math.random() * archetypes.length)];
  return ensureBotLoadoutFilled(selectedArchetype);
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


export function hasPerk(key) {
  return loadout.perks.slice(0, 1).includes(key);
}

export function getRuneValue(treeKey, nodeKey) {
  return loadout.runes[treeKey]?.[nodeKey] ?? 0;
}

export function getStatusDuration(duration) {
  return duration * (1 + getRuneValue("spells", "secondary") * 0.03);
}

export function getIconMarkup(item, type) {
  const iconKey = sanitizeIconClass(item.icon ?? `${type}-${item.key}`);
  const groupClass = item.category ? `content-icon--${item.category}` : "";
  return `<div class="content-icon ${groupClass} content-icon--${iconKey}"></div>`;
}

export function getPerkDamageMultiplier(target = null) {
  let multiplier = 1 + getRuneValue("attack", "secondary") * 0.02;

  if (hasPerk("executionRelay") && target) {
    const targetStatus = getStatusState(target);
    if (targetStatus.slow > 0) {
      multiplier *= 1.18;
    }
    if ((targetStatus.slow > 0 || targetStatus.stunned) && getRuneValue("attack", "primary") > 0) {
      multiplier *= 1 + getRuneValue("attack", "primary") * 0.04;
    }
  }

  if (hasPerk("predatorInstinct") && target && target.hp / target.maxHp <= 0.35) {
    multiplier *= 1.14;
  }

  return multiplier;
}

export function getBuildStats() {
  return {
    maxHp: config.playerMaxHp + (hasPerk("scavengerPlates") ? 30 : 0) + getRuneValue("defense", "secondary") * 5,
    damageReduction: (hasPerk("reactiveArmor") ? 0.12 : 0) + getRuneValue("defense", "secondary") * 0.01,
    ccReduction: (hasPerk("shockBuffer") ? 0.28 : 0) + getRuneValue("defense", "secondary") * 0.02,
    dashCooldownMultiplier: hasPerk("dashCooling") ? 0.84 : 1,
    hasteMultiplier:
      1 +
      (player.hasteTime > 0 ? 0.12 : 0) +
      (player.afterDashHasteTime > 0 ? 0.2 : 0) +
      getRuneValue("support", "secondary") * 0.01,
    moveMultiplier:
      1 +
      (hasPerk("staticMomentum") && player.hasteTime > 0 ? 0.08 : 0) +
      getRuneValue("support", "secondary") * 0.015,
    omnivamp: hasPerk("omnivampCore") ? 0.08 : 0,
    abilityLeech: hasPerk("abilityLeech") ? 4 : 0,
    finisherBonus: (hasPerk("comboDriver") ? 0.22 : 0) + getRuneValue("attack", "primary") * 0.05,
    controlledBonus: getRuneValue("attack", "primary") * 0.04,
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
