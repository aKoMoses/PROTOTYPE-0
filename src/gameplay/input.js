// Input event listeners (keyboard, mouse, touch)
import { arena, sandboxModes, config } from "../config.js";
import { weapons } from "../content.js";
import { player, input, uiState, sandbox, abilityState, loadout, botBuildState, trainingBots, trainingToolState } from "../state.js";
import { canvas, helpToggle, menuButton, hudMenuButton, rematchButton, hudRematchButton,
  modeDuel, modeSurvival, modeTraining, stepMode, stepMap, stepBuild, continueMap, continueBuild,
  backMode, backMap, startSession, labTabLoadout, labTabStyle, labLoadout, labStyle,
  libraryTabs, loadoutSlotButtons, moveJoystick, moveStick, statusLine,
  botModeRandom, botModeCustom, trainingFireOff, trainingFireOn,
  buildStepPrev, buildStepNext, botConfigToggle, botConfigCard,
  detailLockButton, detailSecondaryButton,
  continueRunes, backBuild, runeResetButton, trainingBuildButton } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { startDashInput, releaseDashInput, startAbilityInput, releaseAbilityInput, castUltimate } from "./abilities.js";
import { setWeapon } from "./player.js";
import { relaunchCurrentSession, bindPrematchButton } from "./match.js";
import { toggleHelpPanel, openPrematch, renderPrematch, getSlotCategory, getLoadoutItemForSlot, goToBuildWizardStep, resetBuildWizard, resetRuneAllocation, lockActivePreviewSelection, cancelPreviewSelection, unlockLoadoutSlot } from "../build/ui.js";
import { setBotBuildMode } from "../build/loadout.js";
import { resize, updateCameraState } from "./renderer.js";

export function screenToArena(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const camera = updateCameraState(rect.width, rect.height);

  return {
    x: clamp((clientX - rect.left - camera.offsetX) / camera.scale + camera.x, 0, arena.width),
    y: clamp((clientY - rect.top - camera.offsetY) / camera.scale + camera.y, 0, arena.height),
  };
}

export function updatePointer(clientX, clientY) {
  const point = screenToArena(clientX, clientY);
  input.mouseX = point.x;
  input.mouseY = point.y;
}

export function updateJoystick(clientX, clientY) {
  const rect = moveJoystick.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const rawX = clientX - centerX;
  const rawY = clientY - centerY;
  const maxDistance = rect.width * 0.32;
  const magnitude = Math.min(maxDistance, length(rawX, rawY));
  const direction = normalize(rawX, rawY);
  const offsetX = direction.x * magnitude;
  const offsetY = direction.y * magnitude;

  input.moveTouchX = offsetX / maxDistance;
  input.moveTouchY = offsetY / maxDistance;
  moveStick.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
}

export function clearJoystick() {
  input.moveTouchId = null;
  input.moveTouchX = 0;
  input.moveTouchY = 0;
  moveStick.style.transform = "translate(0px, 0px)";
  moveJoystick.classList.remove("active");
}

function formatBuildSlotLabel(slotKey) {
  if (slotKey === "weapon") return "Weapon";
  if (slotKey === "ultimate") return "Ultimate";
  if (slotKey === "perk-0") return "Perk";
  if (slotKey === "ability-0") return "Ability 1";
  if (slotKey === "ability-1") return "Ability 2";
  if (slotKey === "ability-2") return "Ability 3";
  return "Slot";
}

export function setupInputListeners() {
  window.addEventListener("resize", resize);
  resize();

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyH" && !event.repeat) {
    toggleHelpPanel();
    return;
  }

  if (uiState.prematchOpen) {
    return;
  }

  input.keys.add(event.code);

  if (
    (event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") &&
    !event.repeat
  ) {
    event.preventDefault();
    startDashInput();
  }

  if (event.code === "Backspace") {
    event.preventDefault();
    relaunchCurrentSession();
    return;
  }

  if (event.code === "KeyQ" && !event.repeat) {
    startAbilityInput(0);
  }

  if (event.code === "KeyE" && !event.repeat) {
    startAbilityInput(1);
  }

  if (event.code === "KeyF" && !event.repeat) {
    startAbilityInput(2);
  }

  if (event.code === "KeyR" && !event.repeat) {
    castUltimate();
  }

  if (event.code === "KeyC") {
    input.altFiring = true;
  }

  if (sandbox.mode !== sandboxModes.training.key) {
    return;
  }

  if (event.code === "Digit1") {
    setWeapon(weapons.pulse.key);
  }

  if (event.code === "Digit2") {
    setWeapon(weapons.axe.key);
  }

  if (event.code === "Digit3") {
    setWeapon(weapons.shotgun.key);
  }

  if (event.code === "Digit4") {
    setWeapon(weapons.sniper.key);
  }

  if (event.code === "Digit5") {
    setWeapon(weapons.staff.key);
  }

  if (event.code === "Digit6") {
    setWeapon(weapons.injector.key);
  }

  if (event.code === "Digit7") {
    setWeapon(weapons.lance.key);
  }

  if (event.code === "Digit8") {
    setWeapon(weapons.cannon.key);
  }
});

window.addEventListener("keyup", (event) => {
  if (uiState.prematchOpen) {
    return;
  }

  input.keys.delete(event.code);

  if (event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
    releaseDashInput();
  } else if (event.code === "KeyQ") {
    releaseAbilityInput(0);
  } else if (event.code === "KeyE") {
    releaseAbilityInput(1);
  } else if (event.code === "KeyF") {
    releaseAbilityInput(2);
  } else if (event.code === "KeyC") {
    input.altFiring = false;
  }
});

helpToggle.addEventListener("click", () => {
  toggleHelpPanel();
});

[menuButton, hudMenuButton].forEach((button) => {
  button?.addEventListener("click", () => openPrematch("mode"));
});

[rematchButton, hudRematchButton].forEach((button) => {
  button?.addEventListener("click", () => relaunchCurrentSession());
});

bindPrematchButton(modeDuel, "mode-duel");
bindPrematchButton(modeSurvival, "mode-survival");
bindPrematchButton(modeTraining, "mode-training");
bindPrematchButton(stepMode, "step-mode");
bindPrematchButton(stepMap, "step-map");
bindPrematchButton(stepBuild, "step-build");
bindPrematchButton(continueMap, "continue-map");
bindPrematchButton(continueBuild, "continue-build");
bindPrematchButton(backMode, "back-mode");
bindPrematchButton(backMap, "back-map");
bindPrematchButton(startSession, "start-session");
bindPrematchButton(buildStepPrev, "build-step-prev");
  bindPrematchButton(buildStepNext, "build-step-next");
  bindPrematchButton(continueRunes, "continue-runes");
  bindPrematchButton(backBuild, "back-build");

  detailLockButton?.addEventListener("click", () => {
    const slotKey = uiState.selectedLoadoutSlot ?? "weapon";
    if (!lockActivePreviewSelection()) {
      statusLine.textContent = "Preview an item first, then lock it in.";
      return;
    }
    renderPrematch();
    const lockedItem = getLoadoutItemForSlot(slotKey);
    statusLine.textContent = `${formatBuildSlotLabel(slotKey)} locked: ${lockedItem?.name ?? "selection confirmed"}.`;
  });

  detailSecondaryButton?.addEventListener("click", () => {
    const slotKey = uiState.selectedLoadoutSlot ?? "weapon";
    const previewPending =
      uiState.previewSelection?.slotKey === slotKey &&
      getLoadoutItemForSlot(slotKey)?.key !== uiState.previewSelection.key;
    if (previewPending) {
      if (!cancelPreviewSelection()) {
        statusLine.textContent = "No preview to cancel.";
        return;
      }
      statusLine.textContent = `${formatBuildSlotLabel(slotKey)} preview canceled.`;
      return;
    }

    if (!unlockLoadoutSlot(slotKey)) {
      statusLine.textContent = `${formatBuildSlotLabel(slotKey)} is already empty.`;
      return;
    }
    statusLine.textContent = `${formatBuildSlotLabel(slotKey)} unlocked. Pick a new option to preview.`;
  });

  runeResetButton?.addEventListener("click", () => {
    resetRuneAllocation();
    statusLine.textContent = "Rune allocation reset.";
  });

botConfigToggle?.addEventListener("click", () => {
  const hidden = botConfigCard?.classList.toggle("is-hidden");
  if (botConfigToggle) botConfigToggle.textContent = hidden ? "Configure Bot" : "Close Bot Config";
});

/* Lab tab switching (LOADOUT / STYLE) */
if (labTabLoadout && labTabStyle && labLoadout && labStyle) {
  [labTabLoadout, labTabStyle].forEach((tab) => {
    tab.addEventListener("click", () => {
      const panel = tab.dataset.lab;
      labTabLoadout.classList.toggle("is-active", panel === "loadout");
      labTabStyle.classList.toggle("is-active", panel === "style");
      labLoadout.classList.toggle("lab-panel--active", panel === "loadout");
      labStyle.classList.toggle("lab-panel--active", panel === "style");
    });
  });
}

libraryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const category = tab.dataset.library;
    const targetSlot =
      category === "weapon"
        ? "weapon"
        : category === "perk"
          ? "perk-0"
          : category === "ultimate"
            ? "ultimate"
            : uiState.selectedLoadoutSlot?.startsWith("ability")
              ? uiState.selectedLoadoutSlot
              : "ability-0";

    goToBuildWizardStep(targetSlot);
    uiState.selectedLoadoutSlot = targetSlot;
    uiState.buildCategory = getSlotCategory(targetSlot);
    const item = getLoadoutItemForSlot(targetSlot);
    uiState.selectedDetail = { type: uiState.buildCategory, key: item?.key ?? null };
    renderPrematch();
  });
});

Object.entries(loadoutSlotButtons).forEach(([slotKey, button]) => {
  if (!button) {
    return;
  }

  const normalizedSlot =
    slotKey === "ability0"
      ? "ability-0"
      : slotKey === "ability1"
        ? "ability-1"
        : slotKey === "ability2"
          ? "ability-2"
          : slotKey === "perk0"
            ? "perk-0"
            : slotKey;

  button.addEventListener("click", () => {
    goToBuildWizardStep(normalizedSlot);
    uiState.selectedLoadoutSlot = normalizedSlot;
    uiState.buildCategory = getSlotCategory(normalizedSlot);
    const item = getLoadoutItemForSlot(normalizedSlot);
    uiState.selectedDetail = { type: uiState.buildCategory, key: item?.key ?? null };
    renderPrematch();
  });
});

botModeRandom?.addEventListener("click", () => {
  setBotBuildMode("random");
  statusLine.textContent = "Hunter bot set to randomized loadouts.";
});

botModeCustom?.addEventListener("click", () => {
  setBotBuildMode("custom");
  statusLine.textContent = "Hunter bot locked to a custom build.";
});

trainingFireOff?.addEventListener("click", () => {
  trainingToolState.botsFire = false;
  for (const bot of trainingBots) {
    bot.shootCooldown = 999;
  }
  renderPrematch();
  statusLine.textContent = "Training bots set to silent.";
});

trainingFireOn?.addEventListener("click", () => {
  trainingToolState.botsFire = true;
  trainingBots.forEach((bot, index) => {
    bot.shootCooldown = 0.35 + index * 0.08;
  });
  renderPrematch();
  statusLine.textContent = "Training bots now fire steady pulse shots.";
});

trainingBuildButton?.addEventListener("click", () => {
  if (sandbox.mode !== sandboxModes.training.key) {
    return;
  }
  trainingToolState.editingBuild = true;
  uiState.selectedMode = sandboxModes.training.key;
  uiState.selectedMap = sandbox.mapKey;
  resetBuildWizard();
  openPrematch("build");
  renderPrematch();
  statusLine.textContent = "Build Lab opened in training. Preview, validate, then jump straight back into the lane.";
});

canvas.addEventListener("mousemove", (event) => {
  updatePointer(event.clientX, event.clientY);
});

canvas.addEventListener("mousedown", (event) => {
  if (uiState.prematchOpen) {
    return;
  }
  updatePointer(event.clientX, event.clientY);
  if (event.button === 2) {
    input.altFiring = true;
    return;
  }
  input.firing = true;
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

window.addEventListener("mouseup", () => {
  input.firing = false;
  input.altFiring = false;
});

canvas.addEventListener("mouseleave", () => {
  input.firing = false;
  input.altFiring = false;
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    if (uiState.prematchOpen) {
      return;
    }
    for (const touch of event.changedTouches) {
      if (touch.clientX < window.innerWidth * 0.5 && input.moveTouchId === null) {
        input.moveTouchId = touch.identifier;
        moveJoystick.classList.add("active");
        updateJoystick(touch.clientX, touch.clientY);
      } else {
        input.firing = true;
        updatePointer(touch.clientX, touch.clientY);
      }
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    if (uiState.prematchOpen) {
      return;
    }
    for (const touch of event.changedTouches) {
      if (touch.identifier === input.moveTouchId) {
        updateJoystick(touch.clientX, touch.clientY);
      } else {
        updatePointer(touch.clientX, touch.clientY);
      }
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "touchend",
  (event) => {
    for (const touch of event.changedTouches) {
      if (touch.identifier === input.moveTouchId) {
        clearJoystick();
      } else {
        input.firing = false;
      }
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "touchcancel",
  () => {
    input.firing = false;
    clearJoystick();
  },
  { passive: true },
);
}
