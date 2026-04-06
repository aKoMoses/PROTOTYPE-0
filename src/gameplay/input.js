// Input event listeners (keyboard, mouse, touch)
import { arena, sandboxModes, config } from "../config.js";
import { weapons } from "../content.js";
import { player, input, uiState, sandbox, abilityState, loadout, botBuildState, trainingBots, trainingToolState } from "../state.js";
import { canvas, helpToggle, menuButton, hudMenuButton, rematchButton, hudRematchButton,
  modeDuel, modeTraining, stepMode, stepMap, stepBuild, continueMap, continueBuild,
  backMode, backMap, startSession, labTabLoadout, labTabStyle, labLoadout, labStyle,
  libraryTabs, loadoutSlotButtons, moveJoystick, moveStick, statusLine,
  botModeRandom, botModeCustom, trainingFireOff, trainingFireOn,
  buildStepPrev, buildStepNext } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { startDashInput, releaseDashInput, startAbilityInput, releaseAbilityInput, castUltimate } from "./abilities.js";
import { setWeapon } from "./player.js";
import { relaunchCurrentSession, bindPrematchButton } from "./match.js";
import { toggleHelpPanel, openPrematch, renderPrematch, getSlotCategory, getLoadoutItemForSlot, goToBuildWizardStep } from "../build/ui.js";
import { setBotBuildMode } from "../build/loadout.js";
import { resize } from "./renderer.js";

export function screenToArena(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / arena.width, rect.height / arena.height);
  const offsetX = (rect.width - arena.width * scale) * 0.5;
  const offsetY = (rect.height - arena.height * scale) * 0.5;

  return {
    x: clamp((clientX - rect.left - offsetX) / scale, 0, arena.width),
    y: clamp((clientY - rect.top - offsetY) / scale, 0, arena.height),
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
    uiState.buildCategory = tab.dataset.library;
    if (uiState.buildCategory !== "runes") {
      uiState.selectedDetail = {
        type: uiState.buildCategory,
        key:
          uiState.buildCategory === "weapon"
            ? loadout.weapon
            : uiState.buildCategory === "ultimate"
              ? loadout.ultimate
              : uiState.buildCategory === "perk"
                ? loadout.perks[0]
                : loadout.abilities[0],
      };
    }
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
    if (item) {
      uiState.selectedDetail = { type: uiState.buildCategory, key: item.key };
    }
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

window.addEventListener("keyup", (event) => {
  if (uiState.prematchOpen) {
    return;
  }

  input.keys.delete(event.code);

  if (event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
    releaseAbilityInput(0);
  }

  if (event.code === "KeyQ") {
      releaseAbilityInput(1);
  }

  if (event.code === "KeyF") {
    releaseAbilityInput(2);
  }
});

canvas.addEventListener("mousemove", (event) => {
  updatePointer(event.clientX, event.clientY);
});

canvas.addEventListener("mousedown", (event) => {
  if (uiState.prematchOpen) {
    return;
  }
  updatePointer(event.clientX, event.clientY);
  input.firing = true;
});

window.addEventListener("mouseup", () => {
  input.firing = false;
});

canvas.addEventListener("mouseleave", () => {
  input.firing = false;
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
