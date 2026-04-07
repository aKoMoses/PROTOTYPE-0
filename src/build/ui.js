// Prematch / Build Lab UI rendering
import { config, sandboxModes, abilityConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { abilityState, loadout, uiState, sandbox, matchState, input, botBuildState, trainingBots, trainingToolState } from "../state.js";
import * as dom from "../dom.js";
import { sanitizeIconClass } from "../utils.js";
import { mapChoices, duelMapRegistry, buildLabVisiblePools, getSelectableMapsForMode, normalizeSelectedMap, getSelectedMapMeta, getMapLayout } from "../maps.js";
import { getContentItem, getAbilityBySlot, getVisibleContentItems, normalizeLoadoutSelections,
  hasPerk, getRuneValue, getBuildStats, getSpentRunePoints, getRemainingRunePoints, getSelectedRuneUltimateTree,
  getIconMarkup, ensureBotLoadoutFilled, createRandomBotLoadout, getCurrentBotBuildPreview,
  setBotBuildMode, applyBotCustomWeapon, toggleBotCustomAbility, getPulseMagazineSize, getAbilityCooldown, getWeaponCooldown, getStatusDuration } from "./loadout.js";
import { clearCombatArtifacts, getAllBots, resetBotsForMode, getPlayerSpawn } from "../gameplay/combat.js";
import { getAxeComboProfile } from "../gameplay/weapons.js";

// Forward declarations
let _resetPlayer = null;
let _startDuelRound = null;
let _showRoundBanner = null;
let _releaseDashInput = null;
let _restartSurvivalRun = null;

export function bindUIDeps({ resetPlayer, startDuelRound, showRoundBanner, releaseDashInput, restartSurvivalRun }) {
  _resetPlayer = resetPlayer;
  _startDuelRound = startDuelRound;
  _showRoundBanner = showRoundBanner;
  _releaseDashInput = releaseDashInput;
  _restartSurvivalRun = restartSurvivalRun;
}

export function setPrematchStep(step) {
  uiState.prematchStep = step;
  if (step === "build") {
    dom.botConfigCard?.classList.add("is-hidden");
    if (dom.botConfigToggle) dom.botConfigToggle.textContent = "Configure Bot";
  }
  dom.modeScreen.classList.toggle("prematch-screen--active", step === "mode");
  dom.mapScreen.classList.toggle("prematch-screen--active", step === "map");
  dom.buildScreen.classList.toggle("prematch-screen--active", step === "build");
  dom.runeScreen?.classList.toggle("prematch-screen--active", step === "runes");
  dom.stepMode?.classList.toggle("is-active", step === "mode");
  dom.stepMap?.classList.toggle("is-active", step === "map");
  dom.stepBuild?.classList.toggle("is-active", step === "build");
}

export function syncPrematchState() {
  dom.gameShell.classList.toggle("prematch-open", uiState.prematchOpen);
  updateTrainingBuildButton();
}

export function updateTrainingBuildButton() {
  dom.trainingBuildButton?.classList.toggle(
    "is-visible",
    sandbox.mode === sandboxModes.training.key && !uiState.prematchOpen,
  );
}

export function openPrematch(step = "mode") {
  uiState.prematchOpen = true;
  input.keys.clear();
  input.firing = false;
  _releaseDashInput();
  abilityState.javelin.charging = false;
  abilityState.field.charging = false;
  setPrematchStep(step);
  dom.prematchOverlay.classList.remove("is-hidden");
  syncPrematchState();
  clearCombatArtifacts();
}

export function closePrematch() {
  uiState.prematchOpen = false;
  dom.prematchOverlay.classList.add("is-hidden");
  syncPrematchState();
}

export function relaunchCurrentSession() {
  clearCombatArtifacts();
  if (sandbox.mode === sandboxModes.duel.key) {
    _startDuelRound({ resetScore: true });
    dom.statusLine.textContent = `${getMapLayout(sandbox.mode, sandbox.mapKey).name} rematch primed. Clean reset, same stakes.`;
    return;
  }

  if (sandbox.mode === sandboxModes.survival.key) {
    _restartSurvivalRun?.({ resetProgress: true });
    dom.statusLine.textContent = `${getMapLayout(sandbox.mode, sandbox.mapKey).name} survival gauntlet reset. New wave one, same build.`;
    return;
  }

  _resetPlayer({ silent: true });
  resetBotsForMode(sandboxModes.training.key);
  _showRoundBanner("", "", false);
  dom.statusLine.textContent = `${getMapLayout(sandbox.mode, sandbox.mapKey).name} reset. Keep labbing the build.`;
}

export function updatePrematchSummary() {
  const selectedMode = sandboxModes[uiState.selectedMode];
  const selectedMap = getSelectedMapMeta(uiState.selectedMode, uiState.selectedMap);
  const selectedWeapon = weapons[loadout.weapon] ?? null;
  const remainingPoints = getRemainingRunePoints();
  const selectedUltimateTree = getSelectedRuneUltimateTree();
  const selectedAvatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;

  if (dom.selectedModeLabel) {
    dom.selectedModeLabel.textContent = selectedMode.name;
  }
  if (dom.selectedMapLabel) {
    dom.selectedMapLabel.textContent = selectedMap.name;
  }
  if (dom.selectedWeaponLabel) {
    dom.selectedWeaponLabel.textContent = selectedWeapon?.name ?? "Weapon slot empty";
  }
  if (dom.runePointsLabel) {
    dom.runePointsLabel.textContent = `${remainingPoints} remaining`;
  }
  if (dom.runePointsInline) {
    dom.runePointsInline.textContent = `${remainingPoints} points remaining`;
  }
  if (dom.runeUltimateInline) {
    dom.runeUltimateInline.textContent = selectedUltimateTree
      ? `${content.runeTrees[selectedUltimateTree].name} Main Shard active`
      : "No Main Shard selected";
  }
  if (dom.continueRunes) {
    dom.continueRunes.disabled = !isBuildComplete();
    dom.continueRunes.textContent = isBuildComplete() ? "Continue to Runes ->" : "Lock all build slots first";
  }
  if (dom.startSession) {
    dom.startSession.disabled = !isBuildComplete();
  }
  if (dom.prematchDescription) {
    dom.prematchDescription.textContent =
      uiState.selectedMode === sandboxModes.training.key
        ? "Training mode loads a clean firing lane with static bots so you can lab timing, spacing, and projectile denial."
        : uiState.selectedMode === sandboxModes.survival.key
          ? `${selectedMap.name}: escalating solo waves against adaptive arena hunters.`
        : `${selectedMap.name}: ${selectedMap.subtitle}`;
  }
  if (dom.cosmeticPreviewName) {
    dom.cosmeticPreviewName.textContent = selectedAvatar.name;
  }
}

export function renderSelectionGrid(container, items, selectedKeys, onSelect, options = {}) {
  container.textContent = "";

  items.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "item-row";
    if (item.locked) {
      row.classList.add("is-locked");
    }
    if (selectedKeys.includes(item.key)) {
      row.classList.add("is-selected");
    }
    if (options.activeKeys?.includes(item.key)) {
      row.classList.add("is-active");
    }
    if (options.previewKey === item.key) {
      row.classList.add("is-previewing");
    }

    let stateLabel = "";
    let stateClass = "";
    if (options.previewKey === item.key) {
      stateLabel = "PREVIEW";
      stateClass = " item-row__state--pending";
    } else if (selectedKeys.includes(item.key)) {
      stateLabel = "LOCKED IN";
    } else if (item.state === "preview") {
      stateLabel = "PREVIEW";
      stateClass = " item-row__state--preview";
    } else if (item.state !== "playable") {
      stateLabel = "LOCKED";
    }

    row.innerHTML = `
      ${getIconMarkup(item, options.iconType ?? "generic")}
      <span class="item-row__name">${item.name}</span>
      ${stateLabel ? `<span class="item-row__state${stateClass}">${stateLabel}</span>` : ""}
    `;

    if (!item.locked) {
      row.addEventListener("click", () => onSelect(item.key));
    } else {
      row.disabled = true;
    }

    container.appendChild(row);
  });
}

export function renderMapSelection() {
  if (!dom.mapGrid) {
    return;
  }

  dom.mapGrid.textContent = "";
  const maps = getSelectableMapsForMode(uiState.selectedMode);
  const selectedMapKey = normalizeSelectedMap(uiState.selectedMode, uiState.selectedMap);

  maps.forEach((mapChoice) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "mode-card";
    if (mapChoice.key === selectedMapKey) {
      card.classList.add("is-selected");
    }
    card.innerHTML = `
      <span class="mode-card__tag">${uiState.selectedMode === sandboxModes.training.key ? "Training" : uiState.selectedMode === sandboxModes.survival.key ? (mapChoice.key === "randomMap" ? "Random Survival" : "Survival Arena") : mapChoice.key === "randomMap" ? "Random" : "Duel Map"}</span>
      <strong>${mapChoice.name}</strong>
      <span>${mapChoice.subtitle}</span>
    `;
    card.addEventListener("click", () => {
      uiState.selectedMap = mapChoice.key;
      dom.statusLine.textContent = `${mapChoice.name} selected.`;
      renderPrematch();
    });
    dom.mapGrid.appendChild(card);
  });
}

export function getPrematchCategoryItems(category) {
  switch (category) {
    case "weapon":
      return getVisibleContentItems("weapons");
    case "ability":
      return getVisibleContentItems("abilities");
    case "perk":
      return getVisibleContentItems("perks");
    case "ultimate":
      return getVisibleContentItems("ultimates");
    default:
      return [];
  }
}

export function getPrematchCategoryConfig(category) {
  const configs = {
    weapon: {
      title: "Weapons",
      hint: "Choose the weapon chassis that defines your round pacing and commitment level.",
      iconType: "weapon",
      selectedKeys: [loadout.weapon].filter(Boolean),
      compatibleSlots: ["weapon"],
    },
    ability: {
      title: "Active Abilities",
      hint: "Pick a tool, then snap it into Ability 1, 2, or 3. Replacing a slot is instant.",
      iconType: "ability",
      selectedKeys: loadout.abilities.filter(Boolean),
      compatibleSlots: ["ability-0", "ability-1", "ability-2"],
    },
    perk: {
      title: "Passive Perks",
      hint: "Lock one balancing perk for this test pass so its effect is easy to read in combat.",
      iconType: "perk",
      selectedKeys: loadout.perks.slice(0, 1).filter(Boolean),
      compatibleSlots: ["perk-0"],
    },
    ultimate: {
      title: "Ultimates",
      hint: "Lock one round-defining spike from the current balancing set.",
      iconType: "ultimate",
      selectedKeys: [loadout.ultimate].filter(Boolean),
      compatibleSlots: ["ultimate"],
    },
  };

  return configs[category];
}

export function getSlotCategory(slotKey) {
  if (slotKey === "weapon") return "weapon";
  if (slotKey === "ultimate") return "ultimate";
  if (slotKey.startsWith("ability")) return "ability";
  if (slotKey.startsWith("perk")) return "perk";
  return "weapon";
}

export function getSlotDisplayName(slotKey) {
  const map = {
    weapon: "Weapon slot selected",
    "ability-0": "Ability 1 selected",
    "ability-1": "Ability 2 selected",
    "ability-2": "Ability 3 selected",
    "perk-0": "Perk 1 selected",
    ultimate: "Ultimate slot selected",
  };

  return map[slotKey] ?? "Loadout slot selected";
}

export function getLoadoutItemForSlot(slotKey) {
  const category = getSlotCategory(slotKey);

  if (slotKey === "weapon") {
    return getContentItem("weapons", loadout.weapon);
  }
  if (slotKey === "ultimate") {
    return getContentItem("ultimates", loadout.ultimate);
  }
  if (slotKey === "ability-0" || slotKey === "ability-1" || slotKey === "ability-2") {
    const index = Number(slotKey.split("-")[1]);
    return getContentItem("abilities", loadout.abilities[index]) ?? null;
  }
  if (slotKey === "perk-0") {
    return getContentItem("perks", loadout.perks[0]) ?? null;
  }

  return getContentItem(`${category}s`, loadout.weapon) ?? null;
}

export function setPreviewAvatar(element, avatar) {
  if (!element || !avatar) {
    return;
  }

  element.style.setProperty("--avatar-body", avatar.bodyColor);
  element.style.setProperty("--avatar-accent", avatar.accentColor);
  element.style.setProperty("--avatar-detail", avatar.detailColor);
  element.style.background = `linear-gradient(180deg, ${avatar.bodyColor}, ${avatar.detailColor})`;
  element.style.boxShadow = `0 0 24px ${avatar.accentColor}22, inset 0 -10px 18px rgba(0,0,0,0.24)`;
}

export function getItemMetaLabel(item, type) {
  return item.slotLabel ?? item.role ?? item.category ?? type;
}

export function getItemStateLabel(item) {
  if (item.state === "playable") return "Playable now";
  if (item.state === "preview") return "Preview foundation";
  if (item.locked) return "Locked / future content";
  return "Selectable";
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatSeconds(value) {
  return `${formatNumber(value)}s`;
}

function formatPercent(value, digits = 0) {
  return `${(value * 100).toFixed(digits).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function renderDetailValues(lines) {
  if (!dom.detailValues) {
    return;
  }
  dom.detailValues.textContent = "";
  lines.forEach((line) => {
    const row = document.createElement("div");
    row.className = "detail-values__row";
    row.innerHTML = `<span class="detail-values__bullet"></span><span>${line}</span>`;
    dom.detailValues.appendChild(row);
  });
}

function getWeaponValueLines(item) {
  if (item.key === weapons.pulse.key) {
    return [
      `Deals ${config.pulseDamage} damage per shot.`,
      `Fires every ${formatSeconds(getWeaponCooldown(item.key))}.`,
      `Magazine: ${getPulseMagazineSize()} shots, reload ${formatSeconds(config.pulseReloadTime)}.`,
      "Role: medium-long lane pressure with low commitment.",
    ];
  }

  if (item.key === weapons.axe.key) {
    const hit1 = getAxeComboProfile(1);
    const hit2 = getAxeComboProfile(2);
    const hit3 = getAxeComboProfile(3);
    return [
      `Hit 1: ${formatNumber(hit1.damage)} damage, ${formatNumber(hit1.range)} range, ${formatSeconds(hit1.startup)} startup.`,
      `Hit 2: ${formatNumber(hit2.damage)} damage, ${formatNumber(hit2.range)} reach, wide cleave.`,
      `Hit 3: ${formatNumber(hit3.damage)} damage, dash engage, ${formatSeconds(hit3.stun)} stun on hit.`,
      "Role: slow brutal melee with strong punish if you commit cleanly.",
    ];
  }

  if (item.key === weapons.shotgun.key) {
    return [
      "6 pellets at 9 damage each.",
      "Point-blank burst: up to 54 damage.",
      `Recovery: ${formatSeconds(getWeaponCooldown(item.key))}.`,
      "Role: close punish weapon that cashes in on forced spacing.",
    ];
  }

  if (item.key === weapons.sniper.key) {
    return [
      "Deals 34 damage on hit.",
      "Applies 12% slow for 0.45s.",
      `Recovery: ${formatSeconds(getWeaponCooldown(item.key))}.`,
      "Role: precision punish and long lane denial.",
    ];
  }

  if (item.key === weapons.staff.key) {
    return [
      "Deals 12 damage on hit.",
      "On hit: heals 8 and grants 6 shield for 0.8s.",
      `Recovery: ${formatSeconds(getWeaponCooldown(item.key))}.`,
      "Role: sustain hybrid for measured trading.",
    ];
  }

  if (item.key === weapons.injector.key) {
    return [
      "Deals 9 damage on hit.",
      "Applies a 4.2s bio-mark, up to 3 stacks.",
      "At 3 marks: consumes for 12 heal.",
      `Recovery: ${formatSeconds(getWeaponCooldown(item.key))}.`,
    ];
  }

  if (item.key === weapons.lance.key) {
    return [
      `Primary: ${config.lancePrimaryDamage} damage, ${config.lancePrimaryRange} range, ${formatPercent(config.lancePrimarySlow)} slow for ${formatSeconds(config.lancePrimarySlowDuration)}.`,
      `Alt fire: ${config.lanceAltDamage} damage, ${config.lanceAltRange} range, ${formatSeconds(config.lanceAltShockDuration)} stun.`,
      `Primary cadence ${formatSeconds(config.lancePrimaryCooldown)}, alt cadence ${formatSeconds(config.lanceAltCooldown)}.`,
      "Role: engage bruiser that cashes in on straight-line confirms.",
    ];
  }

  if (item.key === weapons.cannon.key) {
    return [
      `Primary: ${config.cannonPrimaryDamage} direct, ${config.cannonSplashDamage} splash in ${formatNumber(config.cannonSplashRadius)} radius.`,
      `Primary burn: ${formatPercent(config.cannonBurnMagnitude)} slow for ${formatSeconds(config.cannonBurnDuration)}.`,
      `Alt fire: ${config.cannonAltDamage} direct, ${formatSeconds(config.cannonFreezeDuration)} freeze.`,
      `Cadence: ${formatSeconds(config.cannonPrimaryCooldown)} primary, ${formatSeconds(config.cannonAltCooldown)} cryo.`,
    ];
  }

  return [];
}

function getAbilityValueLines(item) {
  const spellsShardActive = getSelectedRuneUltimateTree() === "spells";

  switch (item.key) {
    case "shockJavelin":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.javelinCooldown))}.`,
        `Tap cast: ${config.javelinTapDamage} damage and ${formatPercent(config.javelinTapSlow)} slow for ${formatSeconds(getStatusDuration(config.javelinTapSlowDuration))}.`,
        `Charged cast: ${config.javelinHoldDamage + (spellsShardActive ? 12 : 0)} damage and ${formatSeconds(getStatusDuration(config.javelinHoldStun + (spellsShardActive ? 0.18 : 0)))} stun.`,
        "Role: punish tool that turns charge timing into a clean confirm.",
      ];
    case "magneticField":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.fieldCooldown))}.`,
        `Tap cast: ${formatNumber(config.fieldTapRadius)} radius, ${formatSeconds(config.fieldTapDuration)} duration, ${formatPercent(config.fieldTapSlow)} slow, ${formatPercent(config.fieldTapDamageReduction)} mitigation.`,
        `Charged cast: ${formatNumber(config.fieldHoldRadius)} radius, ${formatSeconds(config.fieldHoldDuration + (spellsShardActive ? 0.6 : 0))} duration, ${formatPercent(config.fieldHoldSlow + (spellsShardActive ? 0.08 : 0))} slow.`,
        "Role: space control and projectile timing denial.",
      ];
    case "magneticGrapple":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.grappleCooldown))}.`,
        `Reach: ${formatNumber(config.grappleRange)} with a ${formatNumber(config.grappleWidth)} width catch line.`,
        `On hit: pulls the target ${formatNumber(config.grapplePullDistance)} units and applies ${formatPercent(config.grappleSnare)} snare for ${formatSeconds(getStatusDuration(config.grappleSnareDuration))}.`,
        "Role: engage confirm for shotgun, axe and lance punish windows.",
      ];
    case "energyShield":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.shieldCooldown))}.`,
        `Grants ${formatNumber(26 + getRuneValue("defense", "primary") * 3)} shield for ${formatSeconds(2.4)}.`,
        "Absorbs burst without giving away movement control.",
        "Role: anti-burst defensive timing check.",
      ];
    case "empBurst":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.boosterCooldown))}.`,
        "Radius: 120.",
        `Applies ${formatPercent(0.38)} slow for ${formatSeconds(getStatusDuration(1))} and delays bot fire by 0.8s.`,
        "Destroys enemy projectiles inside the pulse.",
      ];
    case "chainLightning":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(5.4))}.`,
        "Range: 520 first snap, then up to 2 extra hops within 220.",
        "Damage: 28 first hit, then each hop deals 72% of the previous hit.",
        `Applies 18 to 26% slow for ${formatSeconds(getStatusDuration(0.55))}.`,
      ];
    case "blinkStep":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(3.4))}.`,
        "Teleports 148 units to your aim.",
        "No damage, pure spacing and outplay.",
        "Role: instant reposition without commit frames.",
      ];
    case "phaseDash":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(4.6))}.`,
        "Dash speed: 1580 for 0.18s.",
        "Untargetable for 0.42s during the pass.",
        "Role: projectile break and hard timing outplay.",
      ];
    case "pulseBurst":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(3.2))}.`,
        "Fires 5 pulse bolts at 12 damage each.",
        "Total burst if all connect: 60 damage.",
        "Role: close-mid lane flood for punish windows.",
      ];
    case "railShot":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(5.1))}.`,
        "Deals 46 damage and pierces.",
        `Applies ${formatPercent(0.22)} slow for ${formatSeconds(getStatusDuration(0.8))}.`,
        "Role: high-commit punish line that cashes in on clean aim.",
      ];
    case "gravityWell":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(5.8))}.`,
        `Creates a ${formatNumber(118)} radius trap for ${formatSeconds(2.1)}.`,
        `Inside the zone: ${formatPercent(0.44)} slow.`,
        "Role: deny exits and force predictable movement.",
      ];
    case "phaseShift":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(5.6))}.`,
        `Intangible for ${formatSeconds(0.55)}.`,
        "No displacement, pure timing answer to burst.",
        "Role: defensive clutch button.",
      ];
    case "hologramDecoy":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(6.2))}.`,
        `Creates a false read for ${formatSeconds(2.8)}.`,
        "Pairs well with sharp sidesteps and Phantom Split.",
        "Role: information denial and focus break.",
      ];
    case "speedSurge":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(4.2))}.`,
        `Haste window: ${formatSeconds(2.2)}.`,
        `After-dash tempo extension: ${formatSeconds(1.2)}.`,
        "Role: tempo spike for chase, disengage or reset.",
      ];
    default:
      return [];
  }
}

function getFallbackDetailKey(type) {
  if (type === "weapon") {
    return loadout.weapon ?? buildLabVisiblePools.weapons[0];
  }
  if (type === "ability") {
    return loadout.abilities.find(Boolean) ?? buildLabVisiblePools.abilities[0];
  }
  if (type === "perk") {
    return loadout.perks[0] ?? buildLabVisiblePools.perks[0];
  }
  if (type === "ultimate") {
    return loadout.ultimate ?? buildLabVisiblePools.ultimates[0];
  }
  return null;
}

function getPerkValueLines(item) {
  switch (item.key) {
    case "scavengerPlates":
      return ["+30 max HP.", "Role: pure durability and easier mistake survival."];
    case "reactiveArmor":
      return ["-12% incoming damage.", "Role: softens burst matchups."];
    case "dashCooling":
      return ["-16% dash cooldown.", "Role: more access to core mobility."];
    case "executionRelay":
      return ["+18% damage to slowed targets.", "+4% more per Attack Core point.", "Role: turns control into real punish."];
    case "comboDriver":
      return ["+22% Electro Axe finisher damage.", "Role: all-in melee payoff."];
    case "shockBuffer":
      return ["-28% crowd-control duration taken.", "Role: anti-pick defensive stability."];
    default:
      return [];
  }
}

function getUltimateValueLines(item) {
  switch (item.key) {
    case "phantomSplit":
      return [
        `Cooldown: ${formatSeconds(config.ultimateCooldown)}.`,
        `Creates a live clone for ${formatSeconds(config.phantomDuration)} with ${formatPercent(config.phantomHpScale)} HP and ${formatPercent(config.phantomDamageScale)} damage.`,
        `Clone shields, healing and status durations are scaled to ${formatPercent(config.phantomShieldScale)} / ${formatPercent(config.phantomHealScale)} / ${formatPercent(config.phantomStatusScale)}.`,
        `Replay delay: ${formatSeconds(config.phantomReplayDelay)}, action echo: ${formatSeconds(config.phantomActionDelay)}.`,
      ];
    case "revivalProtocol":
      return [
        `Cooldown: ${formatSeconds(config.ultimateCooldown)}.`,
        "Primes a 5s lethal-save window.",
        "If lethal damage hits during the window, you survive and reset the fight once.",
        "Role: clutch anti-burst safety net.",
      ];
    case "empCataclysm":
      return [
        `Cooldown: ${formatSeconds(config.ultimateCooldown)}.`,
        "Triggers EMP Burst immediately.",
        `Adds a ${formatSeconds(getStatusDuration(0.45))} stun and 1.6s enemy dash lock.`,
        "Role: round-breaking anti-tech punish.",
      ];
    case "arenaLockdown":
      return [
        `Cooldown: ${formatSeconds(config.ultimateCooldown)}.`,
        `Shrinks the arena with a ${formatNumber(278)} radius lockdown for ${formatSeconds(4.2)}.`,
        "Outside the zone: 24% movement penalty.",
        "Role: force the duel into a no-kite finish.",
      ];
    case "berserkCore":
      return [
        `Cooldown: ${formatSeconds(config.ultimateCooldown)}.`,
        `Gain haste, shield and after-dash tempo for ${formatSeconds(4.2)}.`,
        "Shield amount: 28.",
        "Role: aggressive all-in closer.",
      ];
    default:
      return [];
  }
}

function getDetailValueLines(item, type) {
  if (type === "weapon") return getWeaponValueLines(item);
  if (type === "ability") return getAbilityValueLines(item);
  if (type === "perk") return getPerkValueLines(item);
  if (type === "ultimate") return getUltimateValueLines(item);
  return [];
}

export function updateDetailPanel() {
  const detail = uiState.selectedDetail ?? { type: "weapon", key: getFallbackDetailKey("weapon") };
  const resolvedKey =
    detail.key ??
    (["weapon", "ability", "perk", "ultimate"].includes(detail.type)
      ? getFallbackDetailKey(detail.type)
      : null);
  const collectionName =
    detail.type === "ability"
      ? "abilities"
      : detail.type === "perk"
        ? "perks"
        : detail.type === "ultimate"
          ? "ultimates"
          : detail.type === "avatar"
            ? "avatars"
            : detail.type === "skin"
              ? "weaponSkins"
              : "weapons";
  const item = getContentItem(collectionName, resolvedKey);

  if (!item) {
    if (dom.detailFloat) dom.detailFloat.classList.add("is-hidden");
    renderDetailValues([]);
    updateDetailActions();
    return;
  }

  if (dom.detailFloat) dom.detailFloat.classList.remove("is-hidden");
  dom.detailIcon.className = `content-icon content-icon--${sanitizeIconClass(item.icon ?? `${detail.type}-${item.key}`)}`;
  if (item.category) {
    dom.detailIcon.classList.add(`content-icon--${item.category}`);
  }
  dom.detailName.textContent = item.name;
  dom.detailMeta.textContent = `${getItemMetaLabel(item, detail.type)} · ${getItemStateLabel(item)}`;
  dom.detailDescription.textContent = item.description;
  const previewDetail =
    uiState.previewSelection &&
    uiState.previewSelection.category === detail.type &&
    uiState.previewSelection.key === detail.key;
  dom.detailMeta.textContent = previewDetail
    ? `${getSlotDisplayName(uiState.previewSelection.slotKey)} | Preview pending`
    : dom.detailMeta.textContent.replace("Â·", "|");
  dom.detailMeta.textContent = previewDetail
    ? `${getSlotDisplayName(uiState.previewSelection.slotKey)} | Preview pending`
    : dom.detailMeta.textContent.replace("Â·", "|");
  renderDetailValues(getDetailValueLines(item, detail.type));
  const slotState = getBuildSlotState();
  const slotPreviewDetail =
    slotState.previewPending &&
    slotState.preview?.category === detail.type &&
    slotState.preview?.key === item.key;
  const lockedDetail =
    slotState.lockedItem?.key === item.key &&
    slotState.category === detail.type;
  dom.detailMeta.textContent = slotPreviewDetail
    ? `${STEP_LABELS[slotState.slotKey] ?? getSlotDisplayName(slotState.slotKey)} | Preview pending`
    : lockedDetail
      ? `${STEP_LABELS[slotState.slotKey] ?? getSlotDisplayName(slotState.slotKey)} | Locked in`
      : `${getItemMetaLabel(item, detail.type)} | ${getItemStateLabel(item)}`;
  updateDetailActions();
}

export function syncDetailPanelEnhancements() {
  updateDetailActions();
  return;
  const detail = uiState.selectedDetail ?? { type: "weapon", key: getFallbackDetailKey("weapon") };
  const collectionName =
    detail.type === "ability"
      ? "abilities"
      : detail.type === "perk"
        ? "perks"
        : detail.type === "ultimate"
          ? "ultimates"
          : detail.type === "avatar"
            ? "avatars"
            : detail.type === "skin"
              ? "weaponSkins"
              : "weapons";
  const item = getContentItem(collectionName, detail.key);

  if (!item) {
    renderDetailValues([]);
    return;
  }

  const previewDetail =
    uiState.previewSelection &&
    uiState.previewSelection.category === detail.type &&
    uiState.previewSelection.key === detail.key;
  if (previewDetail) {
    dom.detailMeta.textContent = `${getSlotDisplayName(uiState.previewSelection.slotKey)} · Preview`;
  }
  renderDetailValues(getDetailValueLines(item, detail.type));
}

function getBuildSlotState(slotKey = uiState.selectedLoadoutSlot ?? getCurrentBuildStep().slotKey) {
  const resolvedSlotKey = slotKey ?? "weapon";
  const category = getSlotCategory(resolvedSlotKey);
  const lockedItem = getLoadoutItemForSlot(resolvedSlotKey);
  const preview = getPreviewSelectionForSlot(resolvedSlotKey);
  return {
    slotKey: resolvedSlotKey,
    category,
    lockedItem,
    preview,
    previewPending: isPreviewPendingForSlot(resolvedSlotKey),
    empty: !lockedItem,
  };
}

function getEmptySlotLabel(slotKey) {
  if (slotKey === "weapon") return "Empty weapon slot";
  if (slotKey === "ultimate") return "Empty ultimate slot";
  if (slotKey === "perk-0") return "Empty perk slot";
  return `${STEP_LABELS[slotKey] ?? "Empty slot"}`;
}

export function isBuildComplete() {
  return WIZARD_SEQUENCE.every((slotKey) => Boolean(getLoadoutItemForSlot(slotKey)));
}

export function getFirstIncompleteBuildSlot() {
  return WIZARD_SEQUENCE.find((slotKey) => !getLoadoutItemForSlot(slotKey)) ?? null;
}

export function cancelPreviewSelection() {
  if (!uiState.previewSelection) {
    return false;
  }
  const { slotKey, category } = uiState.previewSelection;
  clearPreviewSelection();
  uiState.selectedLoadoutSlot = slotKey;
  uiState.buildCategory = getSlotCategory(slotKey);
  uiState.selectedDetail = {
    type: category,
    key: getLoadoutItemForSlot(slotKey)?.key ?? getFallbackDetailKey(category),
  };
  renderPrematch();
  return true;
}

export function unlockLoadoutSlot(slotKey = uiState.selectedLoadoutSlot ?? getCurrentBuildStep().slotKey) {
  if (!slotKey) {
    return false;
  }

  if (!getLoadoutItemForSlot(slotKey)) {
    return false;
  }

  if (slotKey === "weapon") {
    loadout.weapon = null;
  } else if (slotKey === "ultimate") {
    loadout.ultimate = null;
  } else if (slotKey === "perk-0") {
    loadout.perks = [null];
  } else if (slotKey.startsWith("ability")) {
    const index = Number(slotKey.split("-")[1]);
    const nextAbilities = [...loadout.abilities];
    while (nextAbilities.length < 3) {
      nextAbilities.push(null);
    }
    nextAbilities[index] = null;
    loadout.abilities = nextAbilities.slice(0, 3);
  } else {
    return false;
  }

  clearPreviewSelection();
  uiState.selectedLoadoutSlot = slotKey;
  uiState.buildCategory = getSlotCategory(slotKey);
  uiState.selectedDetail = {
    type: uiState.buildCategory,
    key: getFallbackDetailKey(uiState.buildCategory),
  };
  renderPrematch();
  return true;
}

export function lockActivePreviewSelection() {
  const slotState = getBuildSlotState();
  if (!slotState.previewPending || !slotState.preview) {
    return false;
  }
  return applyLoadoutItemSelection(slotState.preview.category, slotState.preview.slotKey, slotState.preview.key);
}

function updateDetailActions() {
  if (!dom.detailActions || !dom.detailLockButton || !dom.detailSecondaryButton) {
    return;
  }

  const slotState = getBuildSlotState();
  const buildDetailActive = ["weapon", "ability", "perk", "ultimate"].includes(
    uiState.selectedDetail?.type ?? slotState.category,
  );
  dom.detailActions.classList.toggle("is-hidden", uiState.prematchStep !== "build" || !buildDetailActive);

  if (uiState.prematchStep !== "build" || !buildDetailActive) {
    return;
  }

  dom.detailLockButton.disabled = false;
  dom.detailSecondaryButton.disabled = false;
  dom.detailLockButton.classList.remove("is-hidden");
  dom.detailSecondaryButton.classList.remove("is-hidden");

  if (slotState.previewPending) {
    dom.detailLockButton.textContent = "Lock In";
    dom.detailSecondaryButton.textContent = "Cancel Preview";
    return;
  }

  if (slotState.lockedItem) {
    dom.detailLockButton.textContent = "Locked In";
    dom.detailLockButton.disabled = true;
    dom.detailSecondaryButton.textContent = "Unlock Slot";
    return;
  }

  dom.detailLockButton.textContent = "Lock In";
  dom.detailLockButton.disabled = true;
  dom.detailSecondaryButton.classList.add("is-hidden");
}

export function renderValidationChips(container, items, type) {
  if (!container) {
    return;
  }
  container.textContent = "";

  items.forEach((item) => {
    if (!item) {
      return;
    }

    const chip = document.createElement("div");
    chip.className = "validation-chip";
    chip.innerHTML = `${getIconMarkup(item, type)}<span>${item.name}</span>`;
    container.appendChild(chip);
  });
}

export function updateLoadoutSummaryPanels() {
  const selectedWeapon = getContentItem("weapons", loadout.weapon);
  const selectedAbilities = loadout.abilities.map((key) => getContentItem("abilities", key)).filter(Boolean);
  const selectedPerks = loadout.perks.slice(0, 1).map((key) => getContentItem("perks", key)).filter(Boolean);

  const offense = Math.min(100, 30 + (selectedWeapon?.category === "offense" ? 24 : 10) + selectedAbilities.filter((item) => item.category === "offense").length * 14 + getRuneValue("attack", "secondary") * 6);
  const defense = Math.min(100, 24 + selectedAbilities.filter((item) => item.category === "defense").length * 20 + selectedPerks.filter((item) => item.category === "defense").length * 18 + getRuneValue("defense", "secondary") * 8);
  const utility = Math.min(100, 20 + selectedAbilities.filter((item) => item.category === "utility" || item.category === "mobility").length * 18 + selectedPerks.filter((item) => item.category === "utility").length * 12 + getRuneValue("support", "secondary") * 8);
  const control = Math.min(100, 16 + selectedAbilities.filter((item) => item.category === "control").length * 22 + getRuneValue("spells", "primary") * 10);

  dom.powerOffense.style.width = `${offense}%`;
  dom.powerDefense.style.width = `${defense}%`;
  dom.powerUtility.style.width = `${utility}%`;
  dom.powerControl.style.width = `${control}%`;
}

// Step-by-step wizard order: weapon → abilities → perk → ultimate → runes
const BUILD_WIZARD_STEPS = [
  {
    slotKey: "weapon",    category: "weapon",
    title: "Choose your Weapon",
    hint: "The weapon defines your pacing and commitment level for the whole run.",
    colorClass: "c-weapon",
  },
  {
    slotKey: "ability-0", category: "ability",
    title: "Slot 1 \u2014 Active Ability",
    hint: "Your first active ability. Pick a tool that shapes your opening pattern.",
    colorClass: "c-ability",
  },
  {
    slotKey: "ability-1", category: "ability",
    title: "Slot 2 \u2014 Active Ability",
    hint: "Second ability slot. Add depth \u2014 mobility, denial, or extra threat.",
    colorClass: "c-ability",
  },
  {
    slotKey: "ability-2", category: "ability",
    title: "Slot 3 \u2014 Active Ability",
    hint: "Third slot. Round out your toolkit or double down on a strategy.",
    colorClass: "c-ability",
  },
  {
    slotKey: "perk-0",    category: "perk",
    title: "Passive Perk",
    hint: "Lock one passive that amplifies your playstyle without cluttering your reads.",
    colorClass: "c-perk",
  },
  {
    slotKey: "ultimate",  category: "ultimate",
    title: "Ultimate",
    hint: "Your round-deciding spike. Pick the capstone that fits your win condition.",
    colorClass: "c-ultimate",
  },
];
const STEP_LABELS = {
  weapon:      "Weapon",
  "ability-0": "Ability 1",
  "ability-1": "Ability 2",
  "ability-2": "Ability 3",
  "perk-0":    "Passive Perk",
  ultimate:    "Ultimate",
};
const WIZARD_SEQUENCE = BUILD_WIZARD_STEPS.map((s) => s.slotKey);

function clearPreviewSelection() {
  uiState.previewSelection = null;
}

export function resetBuildWizard() {
  uiState.buildWizardStep = 0;
  clearPreviewSelection();
}

export function advanceBuildWizard() {
  const next = uiState.buildWizardStep + 1;
  if (next < BUILD_WIZARD_STEPS.length) {
    uiState.buildWizardStep = next;
    clearPreviewSelection();
  }
}

export function prevBuildWizardStep() {
  const prev = uiState.buildWizardStep - 1;
  if (prev >= 0) {
    uiState.buildWizardStep = prev;
    clearPreviewSelection();
  }
}

export function goToBuildWizardStep(slotKey) {
  const idx = BUILD_WIZARD_STEPS.findIndex((s) => s.slotKey === slotKey);
  if (idx >= 0) {
    uiState.buildWizardStep = idx;
    clearPreviewSelection();
  }
}

function getCurrentBuildStep() {
  return BUILD_WIZARD_STEPS[uiState.buildWizardStep] ?? BUILD_WIZARD_STEPS[BUILD_WIZARD_STEPS.length - 1];
}

function getPreviewSelectionForSlot(slotKey) {
  if (!uiState.previewSelection || uiState.previewSelection.slotKey !== slotKey) {
    return null;
  }
  return uiState.previewSelection;
}

function isPreviewPendingForSlot(slotKey) {
  const preview = getPreviewSelectionForSlot(slotKey);
  if (!preview) {
    return false;
  }
  return getLoadoutItemForSlot(slotKey)?.key !== preview.key;
}

function updateBuildStepNav() {
  const labelEl = document.getElementById("build-step-label");
  const prevBtn = document.getElementById("build-step-prev");
  const nextBtn = document.getElementById("build-step-next");
  const eyebrow = document.getElementById("wizard-eyebrow");
  const titleEl = document.getElementById("wizard-title");
  const hintEl  = document.getElementById("wizard-hint");
  if (!labelEl) return;
  const total = BUILD_WIZARD_STEPS.length;
  const idx = uiState.buildWizardStep;
  const step = getCurrentBuildStep();
  const pendingPreview = isPreviewPendingForSlot(step.slotKey);
  const slotFilled = Boolean(getLoadoutItemForSlot(step.slotKey));
  if (eyebrow) eyebrow.textContent = `Step ${idx + 1} of ${total}`;
  if (titleEl) titleEl.textContent = step.title;
  if (hintEl)  hintEl.textContent  = step.hint;
  labelEl.textContent = `${idx + 1} / ${total} \u2014 ${STEP_LABELS[step.slotKey]}`;
  // Swap color class
  const allColorClasses = ["c-weapon", "c-ability", "c-perk", "c-ultimate"];
  labelEl.classList.remove(...allColorClasses);
  if (step.colorClass) labelEl.classList.add(step.colorClass);
  if (prevBtn) prevBtn.disabled = idx === 0;
  if (nextBtn) {
    nextBtn.disabled = !pendingPreview && !slotFilled;
    nextBtn.textContent = idx >= total - 1
      ? pendingPreview ? "Validate & Runes \u2192" : "Continue to Runes \u2192"
      : pendingPreview ? "Validate & Next \u2192" : slotFilled ? "Next Slot \u2192" : "Lock a choice first";
  }
}

function getZoneIdForSlot(slotKey) {
  // SVG zone data-zone mapping
  const map = {
    weapon: "weapon",
    "ability-0": "ability-0",
    "ability-1": "ability-1",
    "ability-2": "ability-2",
    "perk-0": "perk-0",
    ultimate: "ultimate",
  };
  return map[slotKey] ?? slotKey;
}

export function updateRobotWizard() {
  const robotSvg = document.querySelector(".robot-svg");
  if (!robotSvg) return;

  // Always in spotlight mode during build wizard
  robotSvg.classList.add("wizard-spotlight");

  // Determine which slots are "filled" (have a real item)
  const filled = new Set(
    WIZARD_SEQUENCE.filter((slotKey) => !!getLoadoutItemForSlot(slotKey)),
  );

  // Determine first unfilled slot = current wizard step
  const firstUnfilled = WIZARD_SEQUENCE.find((s) => !filled.has(s)) ?? null;

  // Unlock up to and including the first unfilled slot
  const unlockedUntil = firstUnfilled
    ? WIZARD_SEQUENCE.indexOf(firstUnfilled)
    : WIZARD_SEQUENCE.length - 1;

  WIZARD_SEQUENCE.forEach((slotKey, idx) => {
    const zoneId = getZoneIdForSlot(slotKey);
    const zones = robotSvg.querySelectorAll(`[data-zone="${zoneId}"]`);
    const isFilled = filled.has(slotKey);
    const isActive = uiState.selectedLoadoutSlot === slotKey;
    const isLocked = idx > unlockedUntil + 1;

    zones.forEach((zone) => {
      zone.classList.toggle("is-filled", isFilled);
      zone.classList.toggle("is-active", isActive);
      zone.classList.toggle("is-locked", isLocked);
    });

    // Sync summary chip state
    const slotBtn = document.getElementById(`loadout-slot-${slotKey}`);
    if (slotBtn) {
      slotBtn.classList.toggle("is-filled", isFilled);
      slotBtn.classList.toggle("is-locked", isLocked);
      slotBtn.classList.toggle("is-active", uiState.selectedLoadoutSlot === slotKey);
    }

    // Sync progress pip
    const pip = document.querySelector(`.robot-wizard__step[data-step="${slotKey}"]`);
    if (pip) {
      pip.classList.toggle("is-filled", isFilled);
      pip.classList.toggle("is-active", isActive && !isFilled);
    }
  });

  // Full robot glow when all slots filled
  robotSvg.classList.toggle("is-complete", filled.size === WIZARD_SEQUENCE.length);
}

export function initRobotWizardZoneClicks() {
  const robotSvg = document.querySelector(".robot-svg");
  if (!robotSvg) return;

  WIZARD_SEQUENCE.forEach((slotKey) => {
    const zoneId = getZoneIdForSlot(slotKey);
    const zones = robotSvg.querySelectorAll(`[data-zone="${zoneId}"]`);
    zones.forEach((zone) => {
      zone.setAttribute("role", "button");
      zone.setAttribute("aria-label", slotKey);
      zone.style.cursor = "pointer";
      zone.addEventListener("click", () => {
        const btn = document.getElementById(`loadout-slot-${slotKey}`);
        if (btn) btn.click();
      });
    });
  });
}

export function updateLoadoutSlots() {
  const slotDescriptors = [
    { key: "weapon", type: "weapon" },
    { key: "ability-0", type: "ability" },
    { key: "ability-1", type: "ability" },
    { key: "ability-2", type: "ability" },
    { key: "perk-0", type: "perk" },
    { key: "ultimate", type: "ultimate" },
  ];

  const compatibleSlots = getPrematchCategoryConfig(uiState.buildCategory)?.compatibleSlots ?? [];

  slotDescriptors.forEach(({ key, type }) => {
    const lockedItem = getLoadoutItemForSlot(key);
    const preview = getPreviewSelectionForSlot(key);
    const previewItem = preview
      ? getContentItem(
          type === "ability"
            ? "abilities"
            : type === "perk"
              ? "perks"
              : type === "ultimate"
                ? "ultimates"
                : "weapons",
          preview.key,
        )
      : null;
    const item = previewItem ?? lockedItem;
    const icon = document.getElementById(`loadout-slot-${key}-icon`);
    const name = document.getElementById(`loadout-slot-${key}-name`);
    const meta = document.getElementById(`loadout-slot-${key}-meta`);
    const buttonNode = document.getElementById(`loadout-slot-${key}`);

    if (!buttonNode || !icon || !name) {
      return;
    }

    const previewPending = Boolean(preview && lockedItem?.key !== preview.key);
    buttonNode.classList.toggle("is-active", uiState.selectedLoadoutSlot === key);
    buttonNode.classList.toggle("is-compatible", compatibleSlots.includes(key));
    buttonNode.classList.toggle("is-previewing", previewPending);
    buttonNode.classList.toggle("is-filled", Boolean(lockedItem));
    if (item) {
      icon.className = `content-icon content-icon--${sanitizeIconClass(item.icon ?? `${type}-${item.key}`)}`;
      if (item.category) {
        icon.classList.add(`content-icon--${item.category}`);
      }
    } else {
      icon.className = "content-icon content-icon--empty-slot";
    }
    name.textContent = item?.name ?? getEmptySlotLabel(key);
    if (meta) {
      meta.classList.remove("is-hidden");
      meta.textContent = previewPending
        ? "Preview pending. Lock it in or cancel the preview."
        : lockedItem
          ? lockedItem.role ?? lockedItem.description
          : "Click an item, preview it, then lock it in.";
    }
  });

  updateRobotWizard();
}

export function getCategoryTargetSlot(category) {
  const compatibleSlots = getPrematchCategoryConfig(category)?.compatibleSlots ?? [];
  if (compatibleSlots.includes(uiState.selectedLoadoutSlot)) {
    return uiState.selectedLoadoutSlot;
  }

  if (category === "ability") {
    return compatibleSlots.find((slot) => !getLoadoutItemForSlot(slot)) ?? compatibleSlots[0];
  }
  if (category === "perk") {
    return "perk-0";
  }

  return compatibleSlots[0] ?? "weapon";
}

export function assignLoadoutItem(category, slotKey, itemKey) {
  const item = getContentItem(
    category === "ability"
      ? "abilities"
      : category === "perk"
        ? "perks"
        : category === "ultimate"
          ? "ultimates"
          : "weapons",
    itemKey,
  );

  if (!item || item.state !== "playable") {
    uiState.selectedDetail = { type: category, key: itemKey };
    renderPrematch();
    return;
  }

  uiState.selectedLoadoutSlot = slotKey;
  uiState.selectedDetail = { type: category, key: itemKey };
  if (getLoadoutItemForSlot(slotKey)?.key === itemKey) {
    clearPreviewSelection();
    renderPrematch();
    return;
  }
  uiState.previewSelection = { category, slotKey, key: itemKey };
  renderPrematch();
}

function applyLoadoutItemSelection(category, slotKey, itemKey) {
  const item = getContentItem(
    category === "ability"
      ? "abilities"
      : category === "perk"
        ? "perks"
        : category === "ultimate"
          ? "ultimates"
          : "weapons",
    itemKey,
  );

  if (!item || item.state !== "playable") {
    return false;
  }

  if (category === "weapon") {
    loadout.weapon = itemKey;
  } else if (category === "ultimate") {
    loadout.ultimate = itemKey;
  } else if (category === "ability") {
    const targetIndex = Number(slotKey.split("-")[1]);
    const nextAbilities = Array.from({ length: 3 }, (_, index) => loadout.abilities[index] ?? null);
    for (let index = 0; index < nextAbilities.length; index += 1) {
      if (nextAbilities[index] === itemKey) {
        nextAbilities[index] = null;
      }
    }
    nextAbilities[targetIndex] = itemKey;
    loadout.abilities = nextAbilities;
  } else if (category === "perk") {
    loadout.perks = [itemKey];
  }

  uiState.selectedLoadoutSlot = slotKey;
  uiState.selectedDetail = { type: category, key: itemKey };
  clearPreviewSelection();
  return true;
}

export function commitBuildStepSelection() {
  const step = getCurrentBuildStep();
  const preview = getPreviewSelectionForSlot(step.slotKey);
  const lockedItem = getLoadoutItemForSlot(step.slotKey);

  if (preview) {
    applyLoadoutItemSelection(preview.category, preview.slotKey, preview.key);
  } else if (!lockedItem) {
    return "blocked";
  }

  if (uiState.buildWizardStep >= BUILD_WIZARD_STEPS.length - 1) {
    if (!isBuildComplete()) {
      return "incomplete";
    }
    return "runes";
  }

  advanceBuildWizard();
  return "next";
}

export function commitActivePreviewSelection() {
  if (!uiState.previewSelection) {
    return false;
  }

  const { category, slotKey, key } = uiState.previewSelection;
  return applyLoadoutItemSelection(category, slotKey, key);
}

export function renderBuildLibrary() {
  const wizardStep = getCurrentBuildStep();
  uiState.buildCategory = wizardStep.category;
  uiState.selectedLoadoutSlot = wizardStep.slotKey;
  updateBuildStepNav();
  dom.buildLibraryGrid.style.display = "";

  dom.libraryTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.library === uiState.buildCategory);
  });

  const config = getPrematchCategoryConfig(uiState.buildCategory);
  const items = getPrematchCategoryItems(uiState.buildCategory);
  const targetSlot = getCategoryTargetSlot(uiState.buildCategory);
  const previewKey = getPreviewSelectionForSlot(targetSlot)?.key ?? null;

  renderSelectionGrid(
    dom.buildLibraryGrid,
    items,
    config.selectedKeys,
    (itemKey) => {
      assignLoadoutItem(uiState.buildCategory, targetSlot, itemKey);
    },
    {
      activeKeys: config.selectedKeys,
      iconType: config.iconType,
      previewKey,
    },
  );
}

export function renderCosmetics() {
  renderSelectionGrid(
    dom.avatarOptions,
    Object.values(content.avatars),
    [loadout.avatar],
    (avatarKey) => {
      loadout.avatar = avatarKey;
      uiState.selectedDetail = { type: "avatar", key: avatarKey };
      renderPrematch();
    },
    { iconType: "avatar" },
  );

  renderSelectionGrid(
    dom.weaponSkinOptions,
    Object.values(content.weaponSkins),
    [loadout.weaponSkin],
    (skinKey) => {
      loadout.weaponSkin = skinKey;
      uiState.selectedDetail = { type: "skin", key: skinKey };
      renderPrematch();
    },
    { iconType: "skin" },
  );

  const avatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;
  const skin = content.weaponSkins[loadout.weaponSkin] ?? content.weaponSkins.stock;
  setPreviewAvatar(dom.cosmeticAvatarPreview, avatar);
  dom.cosmeticWeaponIcon.className = `content-icon content-icon--${sanitizeIconClass(skin.icon)}`;
  dom.cosmeticWeaponName.textContent = skin.name;
  dom.cosmeticWeaponCopy.textContent = skin.description;
}

export function renderTrainingBotPanel() {
  if (!dom.botConfigCard || !dom.botConfigCopy) {
    return;
  }

  if (uiState.selectedMode === sandboxModes.training.key) {
    dom.botConfigCard.classList.remove("is-randomized");
    dom.botConfigLabel.textContent = "Training Tool";
    dom.botConfigTitle.textContent = "Static Dummy Controls";
    dom.botConfigCopy.textContent = trainingToolState.botsFire
      ? "Training bots stay fixed in lane and fire steady pulse shots so you can test dodge timing, field denial, and real build pressure."
      : "Training bots stay static and silent so you can test range, cleave, hitboxes, and combo timing with no pressure.";
    dom.botConfigDuel?.classList.add("is-hidden");
    dom.botConfigTraining?.classList.remove("is-hidden");
    dom.trainingFireOff?.classList.toggle("is-active", !trainingToolState.botsFire);
    dom.trainingFireOn?.classList.toggle("is-active", trainingToolState.botsFire);
    renderValidationChips(
      dom.trainingBuildSummary,
      [
        {
          key: "training-range",
          name: "5 Static Bots",
          icon: "ability-decoy",
          category: "utility",
        },
        {
          key: trainingToolState.botsFire ? "live-fire" : "silent-line",
          name: trainingToolState.botsFire ? "Live Fire" : "Silent Range",
          icon: trainingToolState.botsFire ? "weapon-pulse" : "ability-shield",
          category: trainingToolState.botsFire ? "offense" : "defense",
        },
      ],
      "ability",
    );
    return;
  }

  const previewBuild = getCurrentBotBuildPreview();
  const previewWeapon = getContentItem("weapons", previewBuild.weapon) ?? weapons.pulse;
  const previewAbilities = previewBuild.abilities
    .map((abilityKey) => getContentItem("abilities", abilityKey))
    .filter(Boolean);

  dom.botConfigLabel.textContent = "Duel Tool";
  dom.botConfigTitle.textContent = "Hunter Bot Loadout";
  dom.botConfigDuel?.classList.remove("is-hidden");
  dom.botConfigTraining?.classList.add("is-hidden");
  dom.botConfigCard.classList.toggle("is-randomized", botBuildState.mode === "random");
  dom.botModeRandom.classList.toggle("is-active", botBuildState.mode === "random");
  dom.botModeCustom.classList.toggle("is-active", botBuildState.mode === "custom");
  dom.botConfigCopy.textContent =
    botBuildState.mode === "random"
      ? "Hunter bot randomizes a full playable loadout on each duel reset so every spar feels different."
      : "Custom mode locks the hunter build. Use it to lab exact matchup pressure before entering the arena.";

  renderSelectionGrid(
    dom.botWeaponGrid,
    getVisibleContentItems("weapons"),
    [botBuildState.custom.weapon],
    (weaponKey) => applyBotCustomWeapon(weaponKey),
    {
      iconType: "weapon",
      activeKeys: [previewBuild.weapon],
    },
  );

  renderSelectionGrid(
    dom.botAbilityGrid,
    getVisibleContentItems("abilities"),
    botBuildState.custom.abilities,
    (abilityKey) => toggleBotCustomAbility(abilityKey),
    {
      iconType: "ability",
      activeKeys: previewBuild.abilities,
    },
  );

  renderValidationChips(
    dom.botBuildSummary,
    [previewWeapon, ...previewAbilities],
    "ability",
  );
}

function getRuneNodeValueLines(treeKey, nodeKey) {
  const points = getRuneValue(treeKey, nodeKey);

  if (treeKey === "attack" && nodeKey === "secondary") {
    return [
      `Current: +${formatPercent(points * 0.02)} damage.`,
      "Per point: +2% weapon and ability damage.",
      "Use it for cleaner punish thresholds and faster round closes.",
    ];
  }
  if (treeKey === "attack" && nodeKey === "primary") {
    return [
      `Current: +${formatPercent(points * 0.04)} damage to slowed or stunned targets.`,
      `Current: +${formatPercent(points * 0.05)} Electro Axe finisher damage.`,
      "Per point: +4% controlled-target damage and +5% axe finisher damage.",
    ];
  }
  if (treeKey === "attack" && nodeKey === "ultimate") {
    return [
      "Main Rune Shard: Execution Surge.",
      "Hitting a target below 35% HP grants a brief combat surge.",
      "Gameplay change: punish windows snowball much harder.",
    ];
  }

  if (treeKey === "defense" && nodeKey === "secondary") {
    return [
      `Current: +${points * 5} max HP.`,
      `Current: -${formatPercent(points * 0.01)} incoming damage.`,
      `Current: -${formatPercent(points * 0.02)} crowd-control duration taken.`,
    ];
  }
  if (treeKey === "defense" && nodeKey === "primary") {
    return [
      `Current: abilities heal ${points * 2} HP on cast.`,
      `Current: heavy hits can grant ${points * 4} shield.`,
      "Per point: +2 heal on cast and +4 reactive shield on burst.",
    ];
  }
  if (treeKey === "defense" && nodeKey === "ultimate") {
    return [
      "Main Rune Shard: Last Stand Capacitor.",
      "Once per round, lethal damage leaves you alive and grants a shield.",
      "Gameplay change: much stronger clutch stability versus burst.",
    ];
  }

  if (treeKey === "spells" && nodeKey === "secondary") {
    const reduction = Math.min(0.24, points * 0.04);
    return [
      `Current: -${formatPercent(reduction)} ability cooldowns.`,
      `Current: +${formatPercent(points * 0.03)} status duration.`,
      "Per point: -4% cooldowns and +3% status duration.",
    ];
  }
  if (treeKey === "spells" && nodeKey === "primary") {
    return [
      `Current: ability casts grant ${formatSeconds(0.35 + points * 0.12)} haste tempo.`,
      `Current: +${formatPercent(points * 0.06)} haste while the buff is active.`,
      "Per point: stronger weave window after casting.",
    ];
  }
  if (treeKey === "spells" && nodeKey === "ultimate") {
    return [
      "Main Rune Shard: Arc Script.",
      "Charged Javelin and charged Magnetic Field gain a stronger payoff.",
      "Gameplay change: charge-based abilities become real threat multipliers.",
    ];
  }

  if (treeKey === "support" && nodeKey === "secondary") {
    return [
      `Current: +${formatPercent(points * 0.015, 1)} move speed.`,
      `Current: +${formatPercent(points * 0.01)} haste multiplier.`,
      "Per point: stronger spacing, chase and disengage.",
    ];
  }
  if (treeKey === "support" && nodeKey === "primary") {
    return [
      `Current: control actions grant ${points * 4} shield and a short tempo buff.`,
      `Current: dash follow-up window ${formatSeconds(0.4 + points * 0.08)}.`,
      "Per point: more utility conversion after landing control.",
    ];
  }
  if (treeKey === "support" && nodeKey === "ultimate") {
    return [
      "Main Rune Shard: Command Uplink.",
      "Landing slow or stun grants a strong self-buff on a short cooldown.",
      "Gameplay change: control confirms turn directly into chase tempo.",
    ];
  }

  return [];
}

function renderRuneDetailPanel() {
  if (!dom.runeNodeDetail) {
    return;
  }

  const detail = uiState.selectedRuneDetail ?? { treeKey: "attack", nodeKey: "ultimate" };
  const tree = content.runeTrees[detail.treeKey];
  const node = tree?.nodes?.[detail.nodeKey];
  if (!tree || !node) {
    dom.runeNodeDetail.innerHTML = `<p class="rune-holo-detail__placeholder">Click a node to view its effect</p>`;
    return;
  }

  const isMainShard = detail.nodeKey === "ultimate";
  const lines = getRuneNodeValueLines(detail.treeKey, detail.nodeKey);
  dom.runeNodeDetail.innerHTML = `
    <span class="eyebrow">${tree.name} · ${isMainShard ? "Main Shard" : detail.nodeKey === "primary" ? "Core Node" : "Minor Node"}</span>
    <h3>${node.name}</h3>
    <p>${node.description}</p>
    <div class="detail-values">
      ${lines.map((line) => `<div class="detail-values__row"><span class="detail-values__bullet"></span><span>${line}</span></div>`).join("")}
    </div>
  `;
}

export function renderRuneTrees() {
  dom.runeGrid.textContent = "";
  const selectedUltimateTree = getSelectedRuneUltimateTree();

  Object.values(content.runeTrees).forEach((tree) => {
    const treeState = loadout.runes[tree.key];
    const treeEl = document.createElement("div");
    treeEl.className = "rune-tree";
    const totalPts = treeState.secondary + treeState.primary + treeState.ultimate;
    const nodes = Object.values(tree.nodes);

    let nodesMarkup = "";
    nodes.forEach((node, i) => {
      const points = treeState[node.key];
      const isUltimate = node.key === "ultimate";
      const disabledAdd =
        points >= node.max ||
        (!isUltimate && getRemainingRunePoints() <= 0) ||
        (isUltimate && selectedUltimateTree && selectedUltimateTree !== tree.key) ||
        (isUltimate && getRemainingRunePoints() <= 0 && points === 0);

      if (i > 0) {
        const prevNode = nodes[i - 1];
        const prevHasPoints = treeState[prevNode.key] > 0;
        nodesMarkup += `<div class="rune-tree__connector ${prevHasPoints ? "is-lit" : ""}"></div>`;
      }

      nodesMarkup += `
        <div class="rune-node-v2 ${isUltimate ? "rune-node-v2--ultimate" : ""} ${isUltimate && points > 0 ? "is-selected" : ""}">
          <div class="rune-node-v2__dot ${points > 0 ? "has-points" : ""}">${points}</div>
          <div class="rune-node-v2__info" data-rune-detail="${tree.key}:${node.key}">
            <span class="rune-node-v2__name">${node.name}</span>
            <span class="rune-node-v2__tier">${isUltimate ? "Main Shard" : node.key === "primary" ? "Core Node" : "Minor Node"} · ${points}/${node.max}</span>
          </div>
          <div class="rune-node-v2__controls">
            <button type="button" data-rune-tree="${tree.key}" data-rune-node="${node.key}" data-rune-action="remove" ${points <= 0 ? "disabled" : ""}>−</button>
            <button type="button" data-rune-tree="${tree.key}" data-rune-node="${node.key}" data-rune-action="${isUltimate ? "toggle" : "add"}" ${disabledAdd ? "disabled" : ""}>${isUltimate ? (points > 0 ? "✓" : "◆") : "+"}</button>
          </div>
        </div>
      `;
    });

    treeEl.innerHTML = `
      <div class="rune-tree__header">
        <strong>${tree.name}</strong>
        <span class="rune-tree__pts">${totalPts}</span>
      </div>
      <div class="rune-tree__nodes">${nodesMarkup}</div>
    `;

    dom.runeGrid.appendChild(treeEl);
  });

  dom.runeGrid.querySelectorAll("[data-rune-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const treeKey = button.dataset.runeTree;
      const nodeKey = button.dataset.runeNode;
      const action = button.dataset.runeAction;
      uiState.selectedRuneDetail = { treeKey, nodeKey };

      if (action === "toggle") {
        toggleRuneUltimate(treeKey);
        return;
      }

      adjustRuneNode(treeKey, nodeKey, action === "add" ? 1 : -1);
    });
  });

  dom.runeGrid.querySelectorAll("[data-rune-detail]").forEach((detailNode) => {
    detailNode.addEventListener("click", () => {
      const [treeKey, nodeKey] = detailNode.dataset.runeDetail.split(":");
      uiState.selectedRuneDetail = { treeKey, nodeKey };
      renderRuneDetailPanel();
    });
  });

  renderRuneDetailPanel();
}

export function adjustRuneNode(treeKey, nodeKey, delta) {
  const tree = content.runeTrees[treeKey];
  if (!tree) {
    return;
  }

  const node = tree.nodes[nodeKey];
  const treeState = loadout.runes[treeKey];
  if (!node || !treeState || nodeKey === "ultimate") {
    return;
  }

  if (delta > 0) {
    if (getRemainingRunePoints() <= 0 || treeState[nodeKey] >= node.max) {
      return;
    }
    treeState[nodeKey] += 1;
  } else if (delta < 0) {
    if (treeState[nodeKey] <= 0) {
      return;
    }
    treeState[nodeKey] -= 1;
  }

  renderPrematch();
}

export function toggleRuneUltimate(treeKey) {
  const tree = content.runeTrees[treeKey];
  const treeState = loadout.runes[treeKey];
  if (!tree || !treeState) {
    return;
  }

  const selectedUltimateTree = getSelectedRuneUltimateTree();

  if (treeState.ultimate > 0) {
    treeState.ultimate = 0;
    renderPrematch();
    return;
  }

  if (selectedUltimateTree && selectedUltimateTree !== treeKey) {
    return;
  }

  if (getRemainingRunePoints() <= 0) {
    return;
  }

  treeState.ultimate = 1;
  renderPrematch();
}

export function resetRuneAllocation() {
  Object.values(loadout.runes).forEach((treeState) => {
    treeState.secondary = 0;
    treeState.primary = 0;
    treeState.ultimate = 0;
  });
  renderPrematch();
}

export function renderPrematch() {
  normalizeLoadoutSelections({ preserveEmptySlots: true });
  if (
    uiState.selectedDetail &&
    ["weapon", "ability", "perk", "ultimate"].includes(uiState.selectedDetail.type) &&
    (
      !uiState.selectedDetail.key ||
      !getPrematchCategoryItems(uiState.selectedDetail.type).some((item) => item.key === uiState.selectedDetail.key)
    )
  ) {
    uiState.selectedDetail = {
      type: uiState.selectedDetail.type,
      key: getFallbackDetailKey(uiState.selectedDetail.type),
    };
  }
  dom.modeDuel.classList.toggle("is-selected", uiState.selectedMode === sandboxModes.duel.key);
  dom.modeTraining.classList.toggle("is-selected", uiState.selectedMode === sandboxModes.training.key);
  const avatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;

  setPreviewAvatar(dom.cosmeticAvatarPreview, avatar);
  renderMapSelection();
  renderBuildLibrary();
  renderCosmetics();
  updateLoadoutSlots();
  updateLoadoutSummaryPanels();
  updateDetailPanel();
  renderTrainingBotPanel();
  renderRuneTrees();
  updatePrematchSummary();
  updateTrainingBuildButton();
}

export function toggleHelpPanel(forceOpen) {
  sandbox.helpOpen = forceOpen ?? !sandbox.helpOpen;
  dom.helpPanel.classList.toggle("is-hidden", !sandbox.helpOpen);
  dom.helpToggle.textContent = sandbox.helpOpen ? "Hide" : "Help";
}
