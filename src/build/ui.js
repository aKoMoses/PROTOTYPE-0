// Prematch / Build Lab UI rendering
import { config, sandboxModes, abilityConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { player, abilityState, loadout, uiState, sandbox, matchState, input, botBuildState, trainingBots, trainingToolState } from "../state.js";
import * as dom from "../dom.js";
import { sanitizeIconClass } from "../utils.js";
import { mapChoices, duelMapRegistry, buildLabVisiblePools, getSelectableMapsForMode, normalizeSelectedMap, getSelectedMapMeta, getMapLayout } from "../maps.js";
import { getContentItem, getAbilityBySlot, getVisibleContentItems, normalizeLoadoutSelections,
  hasPerk, getRuneValue, getBuildStats, getSpentRunePoints, getRemainingRunePoints, getSelectedRuneUltimateTree,
  getIconMarkup, ensureBotLoadoutFilled, createRandomBotLoadout, getCurrentBotBuildPreview,
  setBotBuildMode, applyBotCustomWeapon, toggleBotCustomAbility, getPulseMagazineSize } from "./loadout.js";
import { clearCombatArtifacts, getAllBots, resetBotsForMode, getPlayerSpawn } from "../gameplay/combat.js";

// Forward declarations
let _resetPlayer = null;
let _startDuelRound = null;
let _showRoundBanner = null;
let _releaseDashInput = null;

export function bindUIDeps({ resetPlayer, startDuelRound, showRoundBanner, releaseDashInput }) {
  _resetPlayer = resetPlayer;
  _startDuelRound = startDuelRound;
  _showRoundBanner = showRoundBanner;
  _releaseDashInput = releaseDashInput;
}

export function setPrematchStep(step) {
  uiState.prematchStep = step;
  dom.modeScreen.classList.toggle("prematch-screen--active", step === "mode");
  dom.mapScreen.classList.toggle("prematch-screen--active", step === "map");
  dom.buildScreen.classList.toggle("prematch-screen--active", step === "build");
  dom.stepMode?.classList.toggle("is-active", step === "mode");
  dom.stepMap?.classList.toggle("is-active", step === "map");
  dom.stepBuild?.classList.toggle("is-active", step === "build");
}

export function syncPrematchState() {
  dom.gameShell.classList.toggle("prematch-open", uiState.prematchOpen);
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

  _resetPlayer({ silent: true });
  resetBotsForMode(sandboxModes.training.key);
  _showRoundBanner("", "", false);
  dom.statusLine.textContent = `${getMapLayout(sandbox.mode, sandbox.mapKey).name} reset. Keep labbing the build.`;
}

export function updatePrematchSummary() {
  const selectedMode = sandboxModes[uiState.selectedMode];
  const selectedMap = getSelectedMapMeta(uiState.selectedMode, uiState.selectedMap);
  const selectedWeapon = weapons[loadout.weapon];
  const remainingPoints = getRemainingRunePoints();
  const selectedUltimateTree = getSelectedRuneUltimateTree();
  const selectedAvatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;

  dom.selectedModeLabel.textContent = selectedMode.name;
  dom.selectedMapLabel.textContent = selectedMap.name;
  dom.selectedWeaponLabel.textContent = selectedWeapon.name;
  dom.runePointsLabel.textContent = `${remainingPoints} remaining`;
  dom.runePointsInline.textContent = `${remainingPoints} points remaining`;
  dom.runeUltimateInline.textContent = selectedUltimateTree
    ? `${content.runeTrees[selectedUltimateTree].name} ultimate active`
    : "No ultimate selected";
  dom.prematchDescription.textContent =
    uiState.selectedMode === sandboxModes.training.key
      ? "Training mode loads a clean firing lane with static bots so you can lab timing, spacing, and projectile denial."
      : `${selectedMap.name}: ${selectedMap.subtitle}`;
  dom.cosmeticPreviewName.textContent = selectedAvatar.name;
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

    const stateLabel = item.state === "playable" ? "" : item.state === "preview" ? "PREVIEW" : "LOCKED";
    const stateClass = item.state === "preview" ? " item-row__state--preview" : "";

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
      <span class="mode-card__tag">${uiState.selectedMode === sandboxModes.training.key ? "Training" : mapChoice.key === "randomMap" ? "Random" : "Duel Map"}</span>
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
      selectedKeys: [loadout.weapon],
      compatibleSlots: ["weapon"],
    },
    ability: {
      title: "Active Abilities",
      hint: "Pick a tool, then snap it into Ability 1, 2, or 3. Replacing a slot is instant.",
      iconType: "ability",
      selectedKeys: loadout.abilities,
      compatibleSlots: ["ability-0", "ability-1", "ability-2"],
    },
    perk: {
      title: "Passive Perks",
      hint: "Lock one balancing perk for this test pass so its effect is easy to read in combat.",
      iconType: "perk",
      selectedKeys: loadout.perks.slice(0, 1),
      compatibleSlots: ["perk-0"],
    },
    ultimate: {
      title: "Ultimates",
      hint: "Lock one round-defining spike from the current balancing set.",
      iconType: "ultimate",
      selectedKeys: [loadout.ultimate],
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

export function updateDetailPanel() {
  const detail = uiState.selectedDetail ?? { type: "weapon", key: loadout.weapon };
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
    if (dom.detailFloat) dom.detailFloat.classList.add("is-hidden");
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
  { slotKey: "weapon",    category: "weapon" },
  { slotKey: "ability-0", category: "ability" },
  { slotKey: "ability-1", category: "ability" },
  { slotKey: "ability-2", category: "ability" },
  { slotKey: "perk-0",    category: "perk" },
  { slotKey: "ultimate",  category: "ultimate" },
  { slotKey: "runes",     category: "runes" },
];
const STEP_LABELS = {
  weapon:      "Weapon",
  "ability-0": "Ability 1",
  "ability-1": "Ability 2",
  "ability-2": "Ability 3",
  "perk-0":    "Passive Perk",
  ultimate:    "Ultimate",
  runes:       "Runes",
};
const WIZARD_SEQUENCE = BUILD_WIZARD_STEPS.filter((s) => s.slotKey !== "runes").map((s) => s.slotKey);

export function resetBuildWizard() {
  uiState.buildWizardStep = 0;
}

export function advanceBuildWizard() {
  const next = uiState.buildWizardStep + 1;
  if (next < BUILD_WIZARD_STEPS.length) {
    uiState.buildWizardStep = next;
  }
}

export function prevBuildWizardStep() {
  const prev = uiState.buildWizardStep - 1;
  if (prev >= 0) {
    uiState.buildWizardStep = prev;
  }
}

export function goToBuildWizardStep(slotKey) {
  const idx = BUILD_WIZARD_STEPS.findIndex((s) => s.slotKey === slotKey);
  if (idx >= 0) {
    uiState.buildWizardStep = idx;
  }
}

function updateBuildStepNav() {
  const labelEl = document.getElementById("build-step-label");
  const prevBtn = document.getElementById("build-step-prev");
  const nextBtn = document.getElementById("build-step-next");
  if (!labelEl) return;
  const idx = uiState.buildWizardStep;
  const step = BUILD_WIZARD_STEPS[idx] ?? BUILD_WIZARD_STEPS[BUILD_WIZARD_STEPS.length - 1];
  labelEl.textContent = `${idx + 1} / ${BUILD_WIZARD_STEPS.length} — ${STEP_LABELS[step.slotKey]}`;
  if (prevBtn) prevBtn.disabled = idx === 0;
  if (nextBtn) nextBtn.textContent = idx >= BUILD_WIZARD_STEPS.length - 1 ? "Done ✓" : "Skip →";
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

    // Sync side robot-slot button state
    const slotBtn = document.getElementById(`loadout-slot-${slotKey}`);
    if (slotBtn) {
      slotBtn.classList.toggle("is-filled", isFilled);
      slotBtn.classList.toggle("is-locked", isLocked);
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
    const button = dom.loadoutSlotButtons[key.replace("-", "")] ?? dom.loadoutSlotButtons[key];
    const item = getLoadoutItemForSlot(key);
    const icon = document.getElementById(`loadout-slot-${key}-icon`);
    const name = document.getElementById(`loadout-slot-${key}-name`);
    const meta = document.getElementById(`loadout-slot-${key}-meta`);
    const buttonNode = document.getElementById(`loadout-slot-${key}`);

    if (!buttonNode || !icon || !name || !item) {
      return;
    }

    buttonNode.classList.toggle("is-active", uiState.selectedLoadoutSlot === key);
    buttonNode.classList.toggle("is-compatible", compatibleSlots.includes(key));
    icon.className = `content-icon content-icon--${sanitizeIconClass(item.icon ?? `${type}-${item.key}`)}`;
    if (item.category) {
      icon.classList.add(`content-icon--${item.category}`);
    }
    name.textContent = item.name;
    if (meta) {
      meta.textContent = item.role ?? item.description;
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

  if (category === "weapon") {
    loadout.weapon = itemKey;
    player.weapon = itemKey;
  } else if (category === "ultimate") {
    loadout.ultimate = itemKey;
  } else if (category === "ability") {
    const targetIndex = Number(slotKey.split("-")[1]);
    loadout.abilities = loadout.abilities.filter((key) => key !== itemKey);
    while (loadout.abilities.length < 3) {
      loadout.abilities.push(null);
    }
    loadout.abilities[targetIndex] = itemKey;
    loadout.abilities = loadout.abilities.filter(Boolean);
    while (loadout.abilities.length < 3) {
      loadout.abilities.push(["shockJavelin", "magneticField", "energyShield"].find((fallback) => !loadout.abilities.includes(fallback)) ?? "shockJavelin");
      loadout.abilities = [...new Set(loadout.abilities)];
    }
    loadout.abilities = loadout.abilities.slice(0, 3);
  } else if (category === "perk") {
    loadout.perks = [itemKey];
  }

  // Auto-advance wizard when this slot matches the current step
  const currentWizardStep = BUILD_WIZARD_STEPS[uiState.buildWizardStep];
  if (currentWizardStep && currentWizardStep.slotKey === slotKey) {
    advanceBuildWizard();
  }

  uiState.selectedLoadoutSlot = slotKey;
  uiState.selectedDetail = { type: category, key: itemKey };
  renderPrematch();
}

export function renderBuildLibrary() {
  // Sync category and selected slot from current wizard step
  const wizardStep = BUILD_WIZARD_STEPS[uiState.buildWizardStep] ?? BUILD_WIZARD_STEPS[BUILD_WIZARD_STEPS.length - 1];
  uiState.buildCategory = wizardStep.category;
  if (wizardStep.slotKey !== "runes") {
    uiState.selectedLoadoutSlot = wizardStep.slotKey;
  }
  updateBuildStepNav();

  const isRunesTab = uiState.buildCategory === "runes";

  dom.buildLibraryGrid.style.display = isRunesTab ? "none" : "";
  if (dom.runePanel) {
    dom.runePanel.classList.toggle("is-hidden", !isRunesTab);
  }

  dom.libraryTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.library === uiState.buildCategory);
  });

  if (isRunesTab) {
    return;
  }

  const config = getPrematchCategoryConfig(uiState.buildCategory);
  const items = getPrematchCategoryItems(uiState.buildCategory);

  renderSelectionGrid(
    dom.buildLibraryGrid,
    items,
    config.selectedKeys,
    (itemKey) => {
      const targetSlot = getCategoryTargetSlot(uiState.buildCategory);
      assignLoadoutItem(uiState.buildCategory, targetSlot, itemKey);
    },
    {
      activeKeys: config.selectedKeys,
      iconType: config.iconType,
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

  dom.botConfigCard.classList.remove("is-hidden");

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
          <div class="rune-node-v2__info">
            <span class="rune-node-v2__name">${node.name}</span>
            <span class="rune-node-v2__tier">${isUltimate ? "Capstone" : node.key === "primary" ? "Core" : "Minor"} · ${points}/${node.max}</span>
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

      if (action === "toggle") {
        toggleRuneUltimate(treeKey);
        return;
      }

      adjustRuneNode(treeKey, nodeKey, action === "add" ? 1 : -1);
    });
  });
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

export function renderPrematch() {
  normalizeLoadoutSelections();
  if (
    uiState.selectedDetail &&
    ["weapon", "ability", "perk", "ultimate"].includes(uiState.selectedDetail.type) &&
    !getPrematchCategoryItems(uiState.selectedDetail.type).some((item) => item.key === uiState.selectedDetail.key)
  ) {
    uiState.selectedDetail = {
      type: uiState.selectedDetail.type,
      key:
        uiState.selectedDetail.type === "weapon"
          ? loadout.weapon
          : uiState.selectedDetail.type === "ultimate"
            ? loadout.ultimate
            : uiState.selectedDetail.type === "perk"
              ? loadout.perks[0]
              : loadout.abilities[0],
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
}

export function toggleHelpPanel(forceOpen) {
  sandbox.helpOpen = forceOpen ?? !sandbox.helpOpen;
  dom.helpPanel.classList.toggle("is-hidden", !sandbox.helpOpen);
  dom.helpToggle.textContent = sandbox.helpOpen ? "Hide" : "Help";
}
