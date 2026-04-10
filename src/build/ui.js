// Prematch / Build Lab UI rendering
import { config, sandboxModes, abilityConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { abilityState, sandbox, matchState, input, trainingBots } from "../state.js";
import { loadout, uiState, botBuildState, matchSettings, trainingToolState } from "../state/app-state.js";
import * as dom from "../dom.js";
import { sanitizeIconClass } from "../utils.js";
import { mapChoices, duelMapRegistry, buildLabVisiblePools, getSelectableMapsForMode, normalizeSelectedMap, getSelectedMapMeta, getMapLayout } from "../maps.js";
import { getContentItem, getAbilityBySlot, getVisibleContentItems, normalizeLoadoutSelections,
  hasPerk, getRuneValue, getBuildStats, getSpentRunePoints, getRemainingRunePoints, getSelectedRuneUltimateTree,
  getIconMarkup, ensureBotLoadoutFilled, createRandomBotLoadout, getCurrentBotBuildPreview,
  setBotBuildMode, applyBotCustomWeapon, toggleBotCustomAbility, getPulseMagazineSize, getAbilityCooldown, getWeaponCooldown, getStatusDuration,
  applySavedPlayerLoadout, getBotPresets, applyBotPreset } from "./loadout.js";
import { clearCombatArtifacts, getAllBots, resetBotsForMode, getPlayerSpawn } from "../gameplay/combat.js";
import { getAxeComboProfile } from "../gameplay/weapons.js";
import { playUiCue, unlockAudio } from "../audio.js";
import { normalizeStoredBuild, readStoredLoadouts } from "../loadouts/storage.js";
import { formatMissingUnlocks, getLoadoutAccessState, isContentUnlocked } from "../progression.js";
import { registerClickTooltip } from "../ui/tooltip-manager.js";

// Forward declarations
let _resetPlayer = null;
let _startDuelRound = null;
let _startTeamDuelRound = null;
let _showRoundBanner = null;
let _releaseDashInput = null;
let _restartSurvivalRun = null;
let loadoutRootHomeParent = null;
let loadoutRootHomeNextSibling = null;

export function bindUIDeps({ resetPlayer, startDuelRound, startTeamDuelRound, showRoundBanner, releaseDashInput, restartSurvivalRun }) {
  _resetPlayer = resetPlayer;
  _startDuelRound = startDuelRound;
  _startTeamDuelRound = startTeamDuelRound;
  _showRoundBanner = showRoundBanner;
  _releaseDashInput = releaseDashInput;
  _restartSurvivalRun = restartSurvivalRun;
}

function cacheLoadoutRootHome(rootNode) {
  if (!rootNode || loadoutRootHomeParent) {
    return;
  }
  loadoutRootHomeParent = rootNode.parentElement;
  loadoutRootHomeNextSibling = rootNode.nextSibling;
}

function moveLoadoutRootToPrematchHost() {
  const host = document.getElementById("prematch-loadout-host");
  const rootNode = document.getElementById("loadout-root");
  if (!host || !rootNode) {
    return;
  }

  cacheLoadoutRootHome(rootNode);
  if (rootNode.parentElement !== host) {
    host.appendChild(rootNode);
  }
}

function restoreLoadoutRootToShellView() {
  const rootNode = document.getElementById("loadout-root");
  if (!rootNode || !loadoutRootHomeParent) {
    return;
  }
  if (rootNode.parentElement === loadoutRootHomeParent) {
    return;
  }

  if (loadoutRootHomeNextSibling && loadoutRootHomeNextSibling.parentNode === loadoutRootHomeParent) {
    loadoutRootHomeParent.insertBefore(rootNode, loadoutRootHomeNextSibling);
    return;
  }

  loadoutRootHomeParent.appendChild(rootNode);
}

function syncPrematchLoadoutSurface() {
  const shouldUsePrematchLoadout = uiState.prematchStep === "build";
  const shell = document.getElementById("prematch-loadout-shell");

  dom.buildScreen?.classList.toggle("prematch-build--loadout", shouldUsePrematchLoadout);
  shell?.classList.toggle("is-hidden", !shouldUsePrematchLoadout);

  if (shouldUsePrematchLoadout) {
    moveLoadoutRootToPrematchHost();
    window.__P0_SHELL?.ensureViewModule?.("loadouts")
      ?.catch?.((error) => {
        console.error("[prematch] Failed to load loadouts shell module", error);
      });
    return;
  }

  restoreLoadoutRootToShellView();
}

export function setPrematchStep(step) {
  uiState.prematchStep = step;
  if (dom.prematchShell) {
    dom.prematchShell.dataset.prematchPhase =
      step === "game-found" ? "found" : step;
  }
  if (step === "build") {
    dom.botConfigCard?.classList.add("is-hidden");
  }
  dom.modeScreen.classList.toggle("prematch-screen--active", step === "mode");
  dom.queueScreen?.classList.toggle("prematch-screen--active", step === "queue");
  dom.gameFoundScreen?.classList.toggle("prematch-screen--active", step === "game-found");
  dom.mapScreen.classList.toggle("prematch-screen--active", step === "map");
  dom.buildScreen.classList.toggle("prematch-screen--active", step === "build");
  dom.runeScreen?.classList.toggle("prematch-screen--active", step === "runes");
  dom.lobbyScreen?.classList.toggle("prematch-screen--active", step === "lobby");
  dom.loadingScreen?.classList.toggle("prematch-screen--active", step === "loading");
  dom.stepMode?.classList.toggle("is-active", step === "mode");
  dom.stepMap?.classList.toggle("is-active", step === "map");
  dom.stepBuild?.classList.toggle("is-active", step === "build" || step === "runes");
  syncPrematchLoadoutSurface();
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
  if (step === "mode" && uiState.matchmaking?.active) {
    uiState.matchmaking.active = false;
    uiState.matchmaking.phase = "idle";
    uiState.matchmaking.queueRemaining = 0;
    uiState.matchmaking.queueSafetyRemaining = 0;
    uiState.matchmaking.buildRemaining = 0;
    uiState.matchmaking.lobbyRemaining = 0;
    uiState.matchmaking.loadingRemaining = 0;
    uiState.matchmaking.foundRemaining = 0;
    uiState.matchmaking.accepted = false;
    uiState.matchmaking.playerReady = false;
    uiState.matchmaking.roster = [];
  }
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  input.keys.clear();
  input.firing = false;
  _releaseDashInput();
  abilityState.boltLinkJavelin.recastReady = false;
  abilityState.boltLinkJavelin.activeTime = 0;
  abilityState.boltLinkJavelin.pendingCooldown = false;
  abilityState.orbitalDistorter.charging = false;
  setPrematchStep(step);
  dom.prematchOverlay.classList.remove("is-hidden");
  syncPrematchState();
  clearCombatArtifacts();
}

export function closePrematch() {
  if (uiState.matchmaking?.active) {
    uiState.matchmaking.active = false;
    uiState.matchmaking.phase = "idle";
    uiState.matchmaking.queueRemaining = 0;
    uiState.matchmaking.queueSafetyRemaining = 0;
    uiState.matchmaking.buildRemaining = 0;
    uiState.matchmaking.lobbyRemaining = 0;
    uiState.matchmaking.loadingRemaining = 0;
    uiState.matchmaking.foundRemaining = 0;
    uiState.matchmaking.accepted = false;
    uiState.matchmaking.playerReady = false;
    uiState.matchmaking.roster = [];
  }
  uiState.prematchOpen = false;
  dom.prematchOverlay.classList.add("is-hidden");
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
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

  if (sandbox.mode === sandboxModes.teamDuel.key) {
    _startTeamDuelRound?.({ resetScore: true });
    dom.statusLine.textContent = `${getMapLayout(sandbox.mode, sandbox.mapKey).name} squad duel reset. Fresh round one, same lineup.`;
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
    const matchmakingBuildFlow =
      uiState.matchmaking?.active &&
      (uiState.prematchStep === "build" || uiState.prematchStep === "runes");
    dom.startSession.disabled = !isBuildComplete();
    dom.startSession.textContent = matchmakingBuildFlow ? "Ready" : "Deploy Unit";
  }
  if (dom.continueMap) {
    dom.continueMap.textContent =
      uiState.selectedMode === sandboxModes.duel.key || uiState.selectedMode === sandboxModes.teamDuel.key
        ? "Queue for Match"
        : "Continue to Map";
  }
  if (dom.backMap) {
    dom.backMap.textContent =
      uiState.selectedMode === sandboxModes.duel.key || uiState.selectedMode === sandboxModes.teamDuel.key
        ? "Back to Mode Select"
        : "Back to Map Select";
  }
  if (dom.prematchDescription) {
    dom.prematchDescription.textContent =
      uiState.selectedMode === sandboxModes.training.key
        ? "Training mode loads a clean firing lane with static bots so you can lab timing, spacing, and projectile denial."
        : uiState.selectedMode === sandboxModes.survival.key
          ? `${selectedMap.name}: escalating solo waves against adaptive arena hunters.`
          : uiState.selectedMode === sandboxModes.teamDuel.key
            ? `${selectedMap.name}: coordinated 2v2 rounds with an allied hunter on your side.`
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
    if (options.equippedKeys?.includes(item.key)) {
      row.classList.add("is-equipped");
    }

    let stateLabel = "";
    let stateClass = "";

    if (options.previewKey === item.key) {
      stateLabel = "PREVIEW";
      stateClass = " item-row__state--pending";
    } else if (options.equippedKeys?.includes(item.key)) {
      stateLabel = "EQUIPPED";
      stateClass = " item-row__state--equipped";
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

    const isActuallyLocked = item.locked || options.equippedKeys?.includes(item.key);

    if (!isActuallyLocked) {
      row.addEventListener("click", () => {
        unlockAudio();
        playUiCue("click");
        onSelect(item.key);
      });
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
      <span class="mode-card__tag">${uiState.selectedMode === sandboxModes.training.key ? "Training" : uiState.selectedMode === sandboxModes.survival.key ? (mapChoice.key === "randomMap" ? "Random Survival" : "Survival Arena") : uiState.selectedMode === sandboxModes.teamDuel.key ? (mapChoice.key === "randomMap" ? "Random 2v2" : "Squad Arena") : mapChoice.key === "randomMap" ? "Random" : "Duel Map"}</span>
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
      return getVisibleContentItems("modules");
    case "perk":
      return getVisibleContentItems("implants");
    case "ultimate":
      return getVisibleContentItems("cores");
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
      title: "Active Modules",
      hint: "Pick a tool, then snap it into Module 1, 2, or 3. Replacing a slot is instant.",
      iconType: "ability",
      selectedKeys: loadout.modules.filter(Boolean),
      compatibleSlots: ["ability-0", "ability-1", "ability-2"],
    },
    perk: {
      title: "Passive Implants",
      hint: "Lock one balancing implant for this test pass so its effect is easy to read in combat.",
      iconType: "perk",
      selectedKeys: loadout.implants.slice(0, 1).filter(Boolean),
      compatibleSlots: ["perk-0"],
    },
    ultimate: {
      title: "Reactor Cores",
      hint: "Lock one round-defining spike from the current balancing set.",
      iconType: "ultimate",
      selectedKeys: [loadout.core].filter(Boolean),
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
    "ability-0": "Module 1 selected",
    "ability-1": "Module 2 selected",
    "ability-2": "Module 3 selected",
    "perk-0": "Implant 1 selected",
    ultimate: "Reactor Core selected",
  };

  return map[slotKey] ?? "Loadout slot selected";
}

export function getLoadoutItemForSlot(slotKey) {
  const category = getSlotCategory(slotKey);

  if (slotKey === "weapon") {
    return getContentItem("weapons", loadout.weapon);
  }
  if (slotKey === "ultimate") {
    return getContentItem("cores", loadout.core);
  }
  if (slotKey === "ability-0" || slotKey === "ability-1" || slotKey === "ability-2") {
    const index = Number(slotKey.split("-")[1]);
    return getContentItem("modules", loadout.modules[index]) ?? null;
  }
  if (slotKey === "perk-0") {
    return getContentItem("implants", loadout.implants[0]) ?? null;
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
  if (item.state === "locked") return "Retired / unavailable";
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
      `Combo memory: ${formatSeconds(config.axeComboReset)} to continue the chain before it resets.`,
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
      `Hold to charge up to ${formatSeconds(config.sniperChargeTime)}.`,
      `Damage scales from ${config.sniperMinDamage} up to ${config.sniperMaxDamage} from charge plus travel distance.`,
      `Charged shot: faster rail, ${formatPercent(config.sniperChargedSnare)} snare for ${formatSeconds(config.sniperChargedSnareDuration)}.`,
      `Recovery: ${formatSeconds(getWeaponCooldown(item.key))}. Role: patience, spacing and hard punish.`,
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
      `Tap fire: shell detonates at your cursor up to ${formatNumber(config.cannonMaxRange)} range.`,
      `Base blast: ${config.cannonSplashDamage} explosion damage in ${formatNumber(config.cannonSplashRadius)} radius.`,
      `Hold fire: overloaded blast, ${formatNumber(Math.max(110, config.cannonSplashRadius * 1.3))} radius, burn plus ${formatPercent(config.cannonFreezeMagnitude)} slow for ${formatSeconds(config.cannonFreezeDuration)}.`,
      `Charged impact: pushes targets ${formatNumber(config.cannonChargedPushMin)} to ${formatNumber(config.cannonChargedPushMax)} units away based on proximity to center.`,
      `Cadence: ${formatSeconds(config.cannonPrimaryCooldown)} tap, ${formatSeconds(config.cannonAltCooldown)} charged. Role: artillery zoning and area denial.`,
    ];
  }

  return [];
}

function getAbilityValueLines(item) {
  const systemsShardActive = getSelectedRuneUltimateTree() === "systems";

  switch (item.key) {
    case "reflexAegis":
      return [
        `Startup: ${formatSeconds(config.reflexAegisStartup)}. Active parry: ${formatSeconds(config.reflexAegisWindow)}. Fail recovery: ${formatSeconds(config.reflexAegisFailRecovery)}.`,
        `If struck during the window: negate the hit, blink behind the attacker, gain ${formatNumber(config.reflexAegisShield)} shield for ${formatSeconds(config.reflexAegisShieldDuration)}.`,
        `Success buff: +${formatPercent(config.reflexAegisMoveBonus)} move speed for ${formatSeconds(config.reflexAegisMoveDuration)} and next hit +${formatNumber(config.reflexAegisHitBonusDamage)} within ${formatSeconds(config.reflexAegisHitBonusDuration)}.`,
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.reflexAegisCooldown))}.`,
        "Role: high-skill defensive counter that punishes predictable burst and engages.",
      ];
    case "boltLinkJavelin":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.boltLinkJavelinCooldown))}.`,
        `Initial hit: ${config.boltLinkJavelinDamage} damage and ${formatPercent(config.boltLinkJavelinSlow)} electrified slow for ${formatSeconds(getStatusDuration(config.boltLinkJavelinSlowDuration))}.`,
        `Recast window: while the target is electrified, blink ${formatNumber(config.boltLinkJavelinRecastDistance)} units behind them once.`,
        "Role: two-step engage tool for outplay, chase correction and burst setup.",
      ];
    case "orbitalDistorter":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.orbitalDistorterCooldown))}.`,
        `Tap cast: ${formatNumber(config.orbitalDistorterTapRadius)} radius on you for ${formatSeconds(config.orbitalDistorterTapDuration)}, ${formatPercent(config.orbitalDistorterTapProjectileSlowEdge)} to ${formatPercent(config.orbitalDistorterTapProjectileSlowCore)} projectile slow, and ${formatPercent(config.orbitalDistorterTapDamageReduction)} mitigation.`,
        `Charged cast: ${formatNumber(config.orbitalDistorterHoldRadius)} radius at target point for ${formatSeconds(config.orbitalDistorterHoldDuration + (systemsShardActive ? 0.6 : 0))}, ${formatPercent(config.orbitalDistorterHoldProjectileSlowEdge)} to ${formatPercent(config.orbitalDistorterHoldProjectileSlowCore)} projectile slow, and ${formatPercent(config.orbitalDistorterHoldSlow + (systemsShardActive ? 0.08 : 0))} movement slow.`,
        "Enemy projectiles are dragged while inside the field instead of being deleted, making dodge windows readable and fair.",
        "Role: anti-ranged timing tool and space-control bubble.",
      ];
    case "vGripHarpoon":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.vGripHarpoonCooldown))}.`,
        `Hook shot: ${formatNumber(config.vGripHarpoonRange)} range at ${formatNumber(config.vGripHarpoonProjectileSpeed)} speed.`,
        `On hit: drags the target toward you and applies ${formatPercent(config.vGripHarpoonSnare)} snare for ${formatSeconds(getStatusDuration(config.vGripHarpoonSnareDuration))}.`,
        "Recast during pull: cut the drag early to place the target exactly where you want.",
        "Role: signature catch tool for shotgun, axe and lance punish windows.",
      ];
    case "hexPlateProjector":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.shieldCooldown))}.`,
        `Grants ${formatNumber(config.shieldValue + getRuneValue("defense", "primary") * 3)} shield for ${formatSeconds(config.shieldDuration)}.`,
        "While the shield still exists, incoming slow, snare, shock and stun effects are denied.",
        `If enemies break the shield, HEX-PLATE Projector refunds about ${formatPercent(config.shieldBreakRefund)} of its cooldown.`,
        "Role: anti-burst and anti-control timing check that rewards clean reads.",
      ];
    case "emPulseEmitter":
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
    case "blink":
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
    case "swarmMissileRack":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.swarmMissileRackCooldown))}.`,
        `Fires ${config.swarmMissileRackMissiles} pulse missiles at ${formatNumber(config.swarmMissileRackBaseDamage)} base damage each.`,
        "Missiles lightly auto-guide toward the first visible enemy in front of them, but can still be dodged and are destroyed by terrain.",
        `Each extra missile on the same target deals exponentially more damage at x${formatNumber(config.swarmMissileRackDamageGrowth)} growth per connect.`,
        `If the full volley lands on one target, apply Burn for ${formatSeconds(config.swarmMissileRackBurnDuration)}.`,
        "Role: setup-dependent combo burst that cashes in on stuns, snares and clean confirms.",
      ];
    case "railShot":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(5.1))}.`,
        "Deals 46 damage and pierces.",
        `Applies ${formatPercent(0.22)} slow for ${formatSeconds(getStatusDuration(0.8))}.`,
        "Role: high-commit punish line that cashes in on clean aim.",
      ];
    case "voidCoreSingularity":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.voidCoreSingularityCooldown))}.`,
        `Creates a live singularity with ${formatNumber(config.voidCoreSingularityRadius)} radius for ${formatSeconds(config.voidCoreSingularityDuration)}.`,
        `Inside the zone: ${formatPercent(config.voidCoreSingularitySlow)} slow and steady pull toward the core.`,
        "Role: trap movement, stack follow-up skillshots and punish late exits.",
      ];
    case "ghostDriftModule":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(config.ghostDriftModuleCooldown))}.`,
        `Intangible for ${formatSeconds(config.ghostDriftModuleDuration)} and purges active debuffs on cast.`,
        "While phased: no damage taken, no control taken, no attacks, no modules. Dash only.",
        "Role: pure defensive outplay and reset timing, not an engage tool.",
      ];
    case "spectreProjector":
      return [
        `Cooldown: ${formatSeconds(getAbilityCooldown(6.2))}.`,
        `Creates a false read for ${formatSeconds(2.8)}.`,
        "Pairs well with sharp sidesteps and Phantom Core.",
        "Role: information denial and focus break.",
      ];
    case "overdriveServos":
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
    return loadout.weapon ?? getPrematchCategoryItems("weapon")[0]?.key ?? buildLabVisiblePools.weapons[0];
  }
  if (type === "ability") {
    return loadout.modules.find(Boolean) ?? getPrematchCategoryItems("ability")[0]?.key ?? buildLabVisiblePools.modules[0];
  }
  if (type === "perk") {
    return loadout.implants[0] ?? getPrematchCategoryItems("perk")[0]?.key ?? buildLabVisiblePools.implants[0];
  }
  if (type === "ultimate") {
    return loadout.core ?? getPrematchCategoryItems("ultimate")[0]?.key ?? buildLabVisiblePools.cores[0];
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
    case "omnivampCore":
      return ["Heal for 7% of confirmed damage dealt.", "Works on both weapon and ability damage.", "Role: broad sustain for clean traders and brawlers."];
    case "lastStandBuffer":
      return [
        `Once per round, lethal damage triggers ${formatSeconds(config.lastStandDuration)} of overloaded survival.`,
        "Immediately refills to full HP, then that HP decays continuously during the window.",
        `During overload: +${formatPercent(config.lastStandMoveBonus)} move speed and +${formatPercent(config.lastStandHasteBonus)} attack speed.`,
      ];
    case "precisionMomentum":
      return [
        `Confirmed auto attacks grant up to ${config.precisionMomentumMaxStacks} stacks.`,
        `Each stack adds +${formatPercent(config.precisionMomentumDamagePerStack)} damage to the next auto attack.`,
        "If an auto attack misses everything, the chain fully breaks.",
      ];
    case "shockBuffer":
      return ["-28% crowd-control duration taken.", "Role: anti-pick defensive stability."];
    default:
      return [];
  }
}

function getUltimateValueLines(item) {
  switch (item.key) {
    case "phantomCore":
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

const STEP_LABELS = {
  weapon: "Weapon",
  "ability-0": "Ability 1 [Q]",
  "ability-1": "Ability 2 [F]",
  "ability-2": "Ability 3 [E]",
  "perk-0": "Passive Perk",
  ultimate: "Ultimate",
};

const WIZARD_SEQUENCE = ["weapon", "ability-0", "ability-1", "ability-2", "perk-0", "ultimate"];

function clearPreviewSelection() {
  uiState.previewSelection = null;
}

function getCurrentBuildStep() {
  const safeIndex = Math.max(0, Math.min(uiState.buildWizardStep ?? 0, WIZARD_SEQUENCE.length - 1));
  const slotKey = WIZARD_SEQUENCE[safeIndex];
  return {
    slotKey,
    category: getSlotCategory(slotKey),
  };
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

export function resetBuildWizard() {
  uiState.buildWizardStep = 0;
  clearPreviewSelection();
}

function advanceBuildWizard() {
  const next = (uiState.buildWizardStep ?? 0) + 1;
  uiState.buildWizardStep = Math.min(next, WIZARD_SEQUENCE.length - 1);
  clearPreviewSelection();
}

export function prevBuildWizardStep() {
  const prev = (uiState.buildWizardStep ?? 0) - 1;
  uiState.buildWizardStep = Math.max(prev, 0);
  clearPreviewSelection();
}

export function goToBuildWizardStep(slotKey) {
  const idx = WIZARD_SEQUENCE.indexOf(slotKey);
  if (idx >= 0) {
    uiState.buildWizardStep = idx;
    uiState.selectedLoadoutSlot = slotKey;
    uiState.buildCategory = getSlotCategory(slotKey);
    clearPreviewSelection();
  }
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

  if ((uiState.buildWizardStep ?? 0) >= WIZARD_SEQUENCE.length - 1) {
    return isBuildComplete() ? "runes" : "incomplete";
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

export function renderTrainingBotPanel() {
  if (!dom.botConfigCard || !dom.botConfigCopy) {
    return;
  }

  // Match rules card — visible only in duel mode
  const isDuel = uiState.selectedMode === sandboxModes.duel.key || uiState.selectedMode === sandboxModes.teamDuel.key;
  dom.matchRulesCard?.classList.toggle("is-hidden", !isDuel);

  if (isDuel) {
    dom.botDifficultyEasy?.classList.toggle("is-active", matchSettings.difficulty === "easy");
    dom.botDifficultyNormal?.classList.toggle("is-active", matchSettings.difficulty === "normal");
    dom.botDifficultyHard?.classList.toggle("is-active", matchSettings.difficulty === "hard");
    dom.botDifficultyNightmare?.classList.toggle("is-active", matchSettings.difficulty === "nightmare");
    dom.ruleFormatBo3?.classList.toggle("is-active", matchSettings.format === "bo3");
    dom.ruleFormatBo5?.classList.toggle("is-active", matchSettings.format === "bo5");
    dom.ruleTimerOff?.classList.toggle("is-active", matchSettings.timer === 0);
    dom.ruleTimer60?.classList.toggle("is-active", matchSettings.timer === 60);
    dom.ruleTimer75?.classList.toggle("is-active", matchSettings.timer === 75);
    dom.ruleSuddendeathOff?.classList.toggle("is-active", !matchSettings.suddenDeath);
    dom.ruleSuddendeathOn?.classList.toggle("is-active", matchSettings.suddenDeath);
    dom.ruleMirrorOff?.classList.toggle("is-active", !matchSettings.mirror);
    dom.ruleMirrorOn?.classList.toggle("is-active", matchSettings.mirror);
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
      : previewBuild.description ?? "Custom mode locks the hunter build. Use it to lab exact matchup pressure before entering the arena.";

  renderSelectionGrid(
    dom.botWeaponGrid,
    getVisibleContentItems("weapons", { ignoreProgression: true }),
    [botBuildState.custom.weapon],
    (weaponKey) => applyBotCustomWeapon(weaponKey),
    {
      iconType: "weapon",
      activeKeys: [previewBuild.weapon],
    },
  );

  renderSelectionGrid(
    dom.botAbilityGrid,
    getVisibleContentItems("abilities", { ignoreProgression: true }),
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

function renderPresetButtons(container, presets, activeKey, onApply, options = {}) {
  if (!container) {
    return;
  }

  if (!presets.length) {
    container.innerHTML = options.emptyMessage
      ? `<div class="preset-empty">${options.emptyMessage}</div>`
      : "";
    return;
  }

  const eyebrowFor = options.getEyebrow ?? ((preset) => preset.role);
  const copyFor = options.getCopy ?? ((preset) => preset.description);
  const tooltipFor = options.getTooltip ?? ((preset) => {
    const eyebrow = eyebrowFor(preset);
    const copy = copyFor(preset);
    const lines = [preset.name];
    if (eyebrow) lines.push(eyebrow);
    if (copy) lines.push(copy);
    return lines.join("\n");
  });
  const disabledFor = options.isDisabled ?? (() => false);
  const disabledCopyFor = options.getDisabledCopy ?? (() => "Locked");

  container.textContent = "";
  presets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-chip";
    const isDisabled = disabledFor(preset);
    const tooltip = tooltipFor(preset);
    if (tooltip) {
      button.dataset.tooltip = tooltip;
      button.setAttribute("aria-label", tooltip.replace(/\n+/g, " - "));
      registerClickTooltip(button, tooltip, { stopClick: isDisabled, maxWidth: 420 });
    }
    if (preset.key === activeKey) {
      button.classList.add("is-active");
    }
    if (isDisabled) {
      button.classList.add("is-disabled");
      button.setAttribute("aria-disabled", "true");
    }
    button.innerHTML = `
      <span class="preset-chip__eyebrow">${eyebrowFor(preset)}</span>
      <strong>${preset.name}</strong>
      <span class="preset-chip__copy">${isDisabled ? disabledCopyFor(preset) : copyFor(preset)}</span>
    `;
    if (!isDisabled) {
      button.addEventListener("click", () => {
        // First click reveals the tooltip; second click confirms preset apply.
        if (button.classList.contains("is-tooltip-open")) {
          return;
        }
        unlockAudio();
        playUiCue("confirm");
        onApply(preset.key);
      });
    }
    container.appendChild(button);
  });
}

function getSavedLoadoutSummary(entry) {
  const build = normalizeStoredBuild(entry.build);
  const weaponName = content.weapons[build.weapon]?.name ?? "Unknown weapon";
  const perkName = content.perks[build.perks[0]]?.name ?? "No perk";
  const abilityNames = build.abilities
    .map((abilityKey) => content.abilities[abilityKey]?.name ?? null)
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");

  if (abilityNames) {
    return `${weaponName} · ${abilityNames} · ${perkName}`;
  }

  return `${weaponName} · ${perkName}`;
}

function getSavedLoadoutTooltip(entry) {
  const build = normalizeStoredBuild(entry.build);
  const weaponName = content.weapons[build.weapon]?.name ?? "Unknown weapon";
  const weaponDesc = content.weapons[build.weapon]?.description ?? "";

  const abilityNames = build.abilities.map((abilityKey) => content.abilities[abilityKey]?.name ?? "None");
  const abilityDescs = build.abilities.map((abilityKey) => content.abilities[abilityKey]?.description ?? "");

  const perkKey = build.perks[0] ?? null;
  const perkName = perkKey ? (content.perks[perkKey]?.name ?? "None") : "None";
  const perkDesc = perkKey ? (content.perks[perkKey]?.description ?? "") : "";

  const ultimateKey = build.ultimate ?? null;
  const ultimateName = ultimateKey ? (content.ultimates[ultimateKey]?.name ?? "None") : "None";
  const ultimateDesc = ultimateKey ? (content.ultimates[ultimateKey]?.description ?? "") : "";

  const lines = [entry.name ?? "Loadout", ""];

  appendTooltipSection(lines, "W", weaponName, buildTooltipMeta("weapon", build.weapon), weaponDesc);
  appendTooltipSection(lines, "Q", abilityNames[0] ?? "None", buildTooltipMeta("ability", build.abilities[0]), abilityDescs[0] ?? "");
  appendTooltipSection(lines, "E", abilityNames[1] ?? "None", buildTooltipMeta("ability", build.abilities[1]), abilityDescs[1] ?? "");
  appendTooltipSection(lines, "F", abilityNames[2] ?? "None", buildTooltipMeta("ability", build.abilities[2]), abilityDescs[2] ?? "");
  appendTooltipSection(lines, "P", perkName, buildTooltipMeta("perk", perkKey), perkDesc);
  appendTooltipSection(lines, "R", ultimateName, buildTooltipMeta("ultimate", ultimateKey), ultimateDesc);

  while (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}

function appendTooltipSection(lines, slotKey, name, metaLines, desc) {
  lines.push(`${slotKey} ${name}`);
  metaLines.forEach((line) => lines.push(`- ${line}`));
  if (desc) {
    lines.push(desc);
  }
  lines.push("");
}

function buildTooltipMeta(type, key) {
  const item = key ? getContentItemByType(type, key) : null;
  if (!item) {
    return [];
  }

  const lines = [];
  if (type === "weapon") {
    if (item.slotLabel) lines.push(`Profile: ${item.slotLabel}`);
    if (item.rhythm) lines.push(`Rhythm: ${item.rhythm}`);
    if (item.rangeProfile) lines.push(`Range: ${item.rangeProfile}`);
    if (item.commitment) lines.push(`Commitment: ${item.commitment}`);
    if (typeof item.cooldown === "number") lines.push(`Cadence: ${formatSecondsTooltip(item.cooldown)}s`);
  }

  if (type === "ability") {
    if (item.input) lines.push(`Input: ${item.input}`);
    if (item.role) lines.push(`Role: ${item.role}`);
    if (item.category) lines.push(`Category: ${formatTooltipLabel(item.category)}`);
  }

  if (item.state) {
    lines.push(`State: ${item.state === "playable" ? "Playable" : "Locked"}`);
  }

  return lines;
}

function getContentItemByType(type, key) {
  const group = type === "weapon"
    ? "weapons"
    : type === "ability"
      ? "abilities"
      : type === "perk"
        ? "perks"
        : "ultimates";
  return content[group]?.[key] ?? null;
}

function formatTooltipLabel(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSecondsTooltip(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function findActiveSavedLoadoutKey(savedLoadouts) {
  return savedLoadouts.find((entry) => {
    const build = normalizeStoredBuild(entry.build);
    return loadout.weapon === build.weapon
      && loadout.ultimate === build.ultimate
      && (loadout.perks[0] ?? null) === (build.perks[0] ?? null)
      && loadout.abilities.every((abilityKey, index) => abilityKey === build.abilities[index]);
  })?.key ?? null;
}

function renderBuildPresets() {
  const savedLoadouts = readStoredLoadouts().map((entry) => ({
    ...entry,
    key: entry.id,
  }));
  renderPresetButtons(
    dom.playerPresetGrid,
    savedLoadouts,
    findActiveSavedLoadoutKey(savedLoadouts),
    (loadoutId) => {
      const selectedLoadout = savedLoadouts.find((entry) => entry.id === loadoutId);
      if (!selectedLoadout) {
        return;
      }

      const result = applySavedPlayerLoadout(selectedLoadout);
      if (!result.ok) {
        const access = getLoadoutAccessState(selectedLoadout);
        dom.statusLine.textContent = access.reason
          ? `Loadout locked. ${access.reason}`
          : "Loadout locked.";
        return;
      }

      const step = getCurrentBuildStep();
      uiState.selectedLoadoutSlot = step.slotKey;
      uiState.buildCategory = step.category;
      uiState.selectedDetail = { type: step.category, key: getLoadoutItemForSlot(step.slotKey)?.key ?? getFallbackDetailKey(step.category) };
      clearPreviewSelection();
      renderPrematch();
      dom.statusLine.textContent = `${selectedLoadout.name} loaded from saved loadouts.`;
    },
    {
      emptyMessage: "No loadouts yet. Forge one from the Loadouts page.",
      getEyebrow: (entry) => entry.tags.length ? entry.tags.join(" / ") : (entry.role || "Loadout"),
      getCopy: (entry) => getSavedLoadoutSummary(entry),
      getTooltip: (entry) => getSavedLoadoutTooltip(entry),
      isDisabled: (entry) => getLoadoutAccessState(entry).locked,
      getDisabledCopy: (entry) => {
        const access = getLoadoutAccessState(entry);
        if (access.lockedByPreset) {
          return `Unlock at level ${access.requiredLevel}`;
        }
        return formatMissingUnlocks(access.missing, { short: true });
      },
    },
  );

  const previewBuild = getCurrentBotBuildPreview();
  renderPresetButtons(
    dom.botPresetGrid,
    getBotPresets(),
    previewBuild.presetKey,
    (presetKey) => {
      if (!applyBotPreset(presetKey)) {
        return;
      }
      renderPrematch();
      const preset = getBotPresets().find((entry) => entry.key === presetKey);
      dom.statusLine.textContent = `${preset?.name ?? "Bot preset"} armed for the arena bot.`;
    },
  );
}

function getRuneNodeValueLines(treeKey, nodeKey) {
  const points = getRuneValue(treeKey, nodeKey);

  if (treeKey === "attack" && nodeKey === "secondary") {
    return [
      `Current: +${formatPercent(points * 0.015)} damage.`,
      "Per point: +1.5% weapon and ability damage.",
      "Use it for cleaner punish thresholds and faster round closes.",
    ];
  }
  if (treeKey === "attack" && nodeKey === "primary") {
    return [
      `Current: +${formatPercent(points * 0.03)} damage to slowed or stunned targets.`,
      `Current: +${formatPercent(points * 0.04)} Electro Axe finisher damage.`,
      "Per point: +3% controlled-target damage and +4% axe finisher damage.",
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
      `Current: -${formatPercent(points * 0.008)} incoming damage.`,
      `Current: -${formatPercent(points * 0.018)} crowd-control duration taken.`,
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
    const reduction = Math.min(0.18, points * 0.03);
    return [
      `Current: -${formatPercent(reduction)} ability cooldowns.`,
      `Current: +${formatPercent(points * 0.03)} status duration.`,
      "Per point: -3% cooldowns and +3% status duration.",
    ];
  if (treeKey === "systems" && nodeKey === "secondary") {
    return [
      "+8% Module cooldown reduction per point.",
      "+12% Status duration bonus per point.",
    ];
  }
  if (treeKey === "systems" && nodeKey === "primary") {
    return [
      "Technical Reset: Hitting 3 distinct technical module hits within 5s grants 12% CDR to all parts.",
    ];
  }
  if (treeKey === "systems" && nodeKey === "ultimate") {
    return [
      "Module Overclock: Triggering an ultimate grants 24% CDR to active technical modules for 6s.",
      "Gameplay change: module-driven builds get cleaner punish windows and chaining payoff.",
    ];
  }

  if (treeKey === "support" && nodeKey === "secondary") {
    return [
      `Current: +${formatPercent(points * 0.012, 1)} move speed.`,
      `Current: +${formatPercent(points * 0.008)} haste multiplier.`,
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
      const canAdd = isUltimate
        ? canSelectRuneUltimate(tree.key)
        : canAddRuneNode(tree.key, node.key);
      const canRemove = canRemoveRuneNode(tree.key, node.key);
      const lockReason = isUltimate
        ? getRuneUltimateLockReason(tree.key, selectedUltimateTree)
        : getRuneNodeLockReason(tree.key, node.key);

      if (i > 0) {
        const prevNode = nodes[i - 1];
        const prevHasPoints = treeState[prevNode.key] > 0;
        nodesMarkup += `<div class="rune-tree__connector ${prevHasPoints ? "is-lit" : ""}"></div>`;
      }

      nodesMarkup += `
        <div class="rune-node-v2 ${isUltimate ? "rune-node-v2--ultimate" : ""} ${isUltimate && points > 0 ? "is-selected" : ""} ${!canAdd && points <= 0 ? "is-locked" : ""}">
          <div class="rune-node-v2__dot ${points > 0 ? "has-points" : ""}">${points}</div>
          <div class="rune-node-v2__info" data-rune-detail="${tree.key}:${node.key}">
            <span class="rune-node-v2__name">${node.name}</span>
            <span class="rune-node-v2__tier">${isUltimate ? "Main Shard" : node.key === "primary" ? "Core Node" : "Minor Node"} · ${points}/${node.max}${!canAdd && points <= 0 && lockReason ? ` · ${lockReason}` : ""}</span>
          </div>
          <div class="rune-node-v2__controls">
            <button type="button" data-rune-tree="${tree.key}" data-rune-node="${node.key}" data-rune-action="remove" ${!canRemove ? "disabled" : ""}>−</button>
            <button type="button" data-rune-tree="${tree.key}" data-rune-node="${node.key}" data-rune-action="${isUltimate ? "toggle" : "add"}" ${!canAdd && points <= 0 ? "disabled" : ""}>${isUltimate ? (points > 0 ? "✓" : "◆") : "+"}</button>
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
    if (!canAddRuneNode(treeKey, nodeKey)) {
      return;
    }
    treeState[nodeKey] += 1;
  } else if (delta < 0) {
    if (!canRemoveRuneNode(treeKey, nodeKey)) {
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

  if (!canSelectRuneUltimate(treeKey)) {
    return;
  }

  treeState.ultimate = 1;
  renderPrematch();
}

function canAddRuneNode(treeKey, nodeKey) {
  const tree = content.runeTrees[treeKey];
  const treeState = loadout.runes[treeKey];
  const node = tree?.nodes?.[nodeKey];
  if (!tree || !treeState || !node || nodeKey === "ultimate") {
    return false;
  }
  if (getRemainingRunePoints() <= 0 || treeState[nodeKey] >= node.max) {
    return false;
  }
  if (nodeKey === "primary" && treeState.secondary < tree.nodes.secondary.max) {
    return false;
  }
  return true;
}

function canRemoveRuneNode(treeKey, nodeKey) {
  const tree = content.runeTrees[treeKey];
  const treeState = loadout.runes[treeKey];
  if (!tree || !treeState || nodeKey === "ultimate" || treeState[nodeKey] <= 0) {
    return false;
  }
  if (nodeKey === "secondary" && (treeState.primary > 0 || treeState.ultimate > 0)) {
    return false;
  }
  if (nodeKey === "primary" && treeState.ultimate > 0) {
    return false;
  }
  return true;
}

function canSelectRuneUltimate(treeKey) {
  const tree = content.runeTrees[treeKey];
  const treeState = loadout.runes[treeKey];
  const selectedUltimateTree = getSelectedRuneUltimateTree();
  if (!tree || !treeState) {
    return false;
  }
  if (treeState.ultimate > 0) {
    return true;
  }
  if (selectedUltimateTree && selectedUltimateTree !== treeKey) {
    return false;
  }
  if (getRemainingRunePoints() <= 0) {
    return false;
  }
  return (
    treeState.secondary >= tree.nodes.secondary.max &&
    treeState.primary >= tree.nodes.primary.max
  );
}

function getRuneNodeLockReason(treeKey, nodeKey) {
  const tree = content.runeTrees[treeKey];
  const treeState = loadout.runes[treeKey];
  if (!tree || !treeState) {
    return "";
  }
  if (nodeKey === "primary" && treeState.secondary < tree.nodes.secondary.max) {
    return "Fill minor first";
  }
  if (getRemainingRunePoints() <= 0) {
    return "No points";
  }
  return "";
}

function getRuneUltimateLockReason(treeKey, selectedUltimateTree) {
  const tree = content.runeTrees[treeKey];
  const treeState = loadout.runes[treeKey];
  if (!tree || !treeState) {
    return "";
  }
  if (selectedUltimateTree && selectedUltimateTree !== treeKey) {
    return "Keystone used";
  }
  if (treeState.secondary < tree.nodes.secondary.max) {
    return "Finish minor";
  }
  if (treeState.primary < tree.nodes.primary.max) {
    return "Finish core";
  }
  if (getRemainingRunePoints() <= 0 && treeState.ultimate <= 0) {
    return "No points";
  }
  return "";
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
  syncPrematchLoadoutSurface();
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
  dom.modeSurvival.classList.toggle("is-selected", uiState.selectedMode === sandboxModes.survival.key);
  dom.modeTeamDuel.classList.toggle("is-selected", uiState.selectedMode === sandboxModes.teamDuel.key);
  dom.modeTraining.classList.toggle("is-selected", uiState.selectedMode === sandboxModes.training.key);
  const avatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;

  setPreviewAvatar(dom.cosmeticAvatarPreview, avatar);
  renderMapSelection();
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
