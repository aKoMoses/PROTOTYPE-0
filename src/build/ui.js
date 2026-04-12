// Prematch / Build Lab UI rendering
import { config, sandboxModes, abilityConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { abilityState, sandbox, matchState, input, trainingBots } from "../state.js";
import { loadout, uiState } from "../state/app-state.js";
import * as dom from "../dom.js";
import { mapChoices, duelMapRegistry, buildLabVisiblePools, getSelectableMapsForMode, normalizeSelectedMap, getSelectedMapMeta, getMapLayout } from "../maps.js";
import { getContentItem, getAbilityBySlot, getVisibleContentItems, normalizeLoadoutSelections,
  getIconMarkup, getPulseMagazineSize, getAbilityCooldown, getWeaponCooldown, getStatusDuration } from "./loadout.js";
import { clearCombatArtifacts, getAllBots, resetBotsForMode, getPlayerSpawn } from "../gameplay/combat.js";
import { getAxeComboProfile } from "../gameplay/weapons.js";
import { playUiCue, unlockAudio } from "../audio.js";
import { isContentUnlocked } from "../progression.js";
import { registerClickTooltip } from "../ui/tooltip-manager.js";
import { readStoredLoadouts, normalizeStoredBuild } from "../loadouts/storage.js";
import { sanitizeIconClass } from "../utils.js";

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
  _closeDeckDrawer();
  if (dom.prematchShell) {
    dom.prematchShell.dataset.prematchPhase =
      step === "game-found" ? "found" : step;
  }
  dom.mapScreen.classList.toggle("prematch-screen--active", step === "map");
  dom.buildScreen.classList.toggle("prematch-screen--active", step === "build");
  dom.roomBrowserScreen?.classList.toggle("prematch-screen--active", step === "room-browser");
  dom.customLobbyScreen?.classList.toggle("prematch-screen--active", step === "custom-lobby");
  dom.stepMap?.classList.toggle("is-active", step === "map");
  dom.stepBuild?.classList.toggle("is-active", step === "build");
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
  if (dom.startSession) {
    dom.startSession.disabled = !isBuildComplete();
    dom.startSession.textContent = "Deploy Unit";
  }
  if (dom.backMap) {
    dom.backMap.textContent = "Back to Map Select";
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
  const systemsShardActive = false;

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
        `Grants ${formatNumber(config.shieldValue)} shield for ${formatSeconds(config.shieldDuration)}.`,
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
    loadout.core = null;
  } else if (slotKey === "perk-0") {
    loadout.implants = [null];
  } else if (slotKey.startsWith("ability")) {
    const index = Number(slotKey.split("-")[1]);
    const nextModules = [...loadout.modules];
    while (nextModules.length < 3) {
      nextModules.push(null);
    }
    nextModules[index] = null;
    loadout.modules = nextModules.slice(0, 3);
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
    loadout.core = itemKey;
  } else if (category === "ability") {
    const targetIndex = Number(slotKey.split("-")[1]);
    const nextModules = Array.from({ length: 3 }, (_, index) => loadout.modules[index] ?? null);
    for (let index = 0; index < nextModules.length; index += 1) {
      if (nextModules[index] === itemKey) {
        nextModules[index] = null;
      }
    }
    nextModules[targetIndex] = itemKey;
    loadout.modules = nextModules;
  } else if (category === "perk") {
    loadout.implants = [itemKey];
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
    return isBuildComplete() ? "done" : "incomplete";
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

// ── Deck Quick Drawer (Phase 3 — Matchmaking build phase) ──────────────────

let _deckDrawerOpen = false;
let _deckDrawerEl = null;
let _deckDrawerBackdrop = null;

function _closeDeckDrawer() {
  _deckDrawerOpen = false;
  _deckDrawerEl?.remove();
  _deckDrawerBackdrop?.remove();
  _deckDrawerEl = null;
  _deckDrawerBackdrop = null;
  const btn = document.getElementById("deck-quick-btn");
  btn?.setAttribute("aria-expanded", "false");
}

function _openDeckDrawer() {
  if (_deckDrawerOpen) { _closeDeckDrawer(); return; }
  _deckDrawerOpen = true;

  const btn = document.getElementById("deck-quick-btn");
  btn?.setAttribute("aria-expanded", "true");

  const savedLoadouts = readStoredLoadouts();

  // Build drawer panel
  const panel = document.createElement("div");
  panel.className = "deck-drawer";
  panel.setAttribute("role", "listbox");

  if (!savedLoadouts.length) {
    panel.innerHTML = `<div class="deck-drawer__empty">Aucun deck sauvegardé</div>`;
  } else {
    panel.innerHTML = savedLoadouts.map((entry) => {
      const build = normalizeStoredBuild(entry.build);
      const weaponKey = build.weapon ?? "";
      const isCurrent = uiState.selectedLoadoutId === entry.id;
      const iconClass = weaponKey
        ? `content-icon content-icon--weapon-${sanitizeIconClass(weaponKey)}`
        : "content-icon content-icon--empty-slot";
      return `
        <button class="deck-drawer__row${isCurrent ? " is-current" : ""}"
          type="button" role="option" aria-selected="${isCurrent}"
          data-deck-id="${entry.id}">
          <span class="${iconClass}" aria-hidden="true"></span>
          <span class="deck-drawer__name">${entry.name}</span>
          ${isCurrent ? '<span class="deck-drawer__badge">ACTUEL</span>' : ""}
          ${entry.favorite ? '<span class="deck-drawer__fav" aria-hidden="true">★</span>' : ""}
        </button>`;
    }).join("");
  }

  // Backdrop (click-outside to close)
  const backdrop = document.createElement("div");
  backdrop.className = "deck-drawer__backdrop";
  backdrop.addEventListener("click", _closeDeckDrawer);
  _deckDrawerBackdrop = backdrop;

  document.body.appendChild(backdrop);

  // Position panel below the button
  const btnRect = btn?.getBoundingClientRect();
  if (btnRect) {
    panel.style.top = `${btnRect.bottom + 6}px`;
    panel.style.left = `${btnRect.left}px`;
  }

  panel.addEventListener("click", (e) => {
    const row = e.target.closest("[data-deck-id]");
    if (!row) return;
    const id = row.dataset.deckId;
    const entry = savedLoadouts.find((l) => l.id === id);
    if (!entry) return;
    _closeDeckDrawer();
    // Reuse the same equip event handled in main.js (sets selectedLoadoutId + applies build)
    window.dispatchEvent(new CustomEvent("loadout-equip", {
      detail: { loadout: entry, _fromDeckDrawer: true },
    }));
  });

  document.body.appendChild(panel);
  _deckDrawerEl = panel;
}

function _initDeckQuickBtn() {
  const btn = document.getElementById("deck-quick-btn");
  if (!btn || btn.dataset.deckDrawerBound) return;
  btn.dataset.deckDrawerBound = "1";
  btn.addEventListener("click", _openDeckDrawer);
}

function _updateDeckQuickBtn() {
  const btn = document.getElementById("deck-quick-btn");
  const label = document.getElementById("deck-quick-label");
  if (!btn) return;

  btn.classList.toggle("is-hidden", uiState.prematchStep !== "build");

  if (label) {
    if (uiState.selectedLoadoutId) {
      const saved = readStoredLoadouts();
      const active = saved.find((e) => e.id === uiState.selectedLoadoutId);
      label.textContent = active ? `${active.name} ▾` : "DECK ▾";
    } else {
      label.textContent = "DECK ▾";
    }
  }
}

// ── End Deck Quick Drawer ───────────────────────────────────────────────────

export function renderPrematch() {
  syncPrematchLoadoutSurface();
  normalizeLoadoutSelections({ preserveEmptySlots: true });
  _initDeckQuickBtn();
  _updateDeckQuickBtn();
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
  renderMapSelection();
  updatePrematchSummary();
  updateTrainingBuildButton();
}

export function toggleHelpPanel(forceOpen) {
  sandbox.helpOpen = forceOpen ?? !sandbox.helpOpen;
  dom.helpPanel.classList.toggle("is-hidden", !sandbox.helpOpen);
  dom.helpToggle.textContent = sandbox.helpOpen ? "Hide" : "Help";
}
