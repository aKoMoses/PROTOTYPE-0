// Input event listeners (keyboard, mouse, touch)
import { arena, sandboxModes, config } from "../config.js";
import { weapons } from "../content.js";
import { player, input, sandbox, abilityState, trainingBots } from "../state.js";
import { uiState, trainingToolState } from "../state/app-state.js";
import { canvas, helpToggle, menuButton, hudMenuButton, rematchButton, hudRematchButton,
  modeDuel, modeSurvival, modeTraining, stepMode, stepMap, stepBuild, continueMap, continueBuild,
  backMode, backMap, startSession, moveJoystick, moveStick, statusLine,
  trainingFireOff, trainingFireOn,
  continueRunes, backBuild, runeResetButton, trainingBuildButton, acceptMatchButton } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { startDashInput, releaseDashInput, startAbilityInput, releaseAbilityInput, castReactorCore } from "./abilities.js";
import { setWeapon } from "./player.js";
import { relaunchCurrentSession, bindPrematchButton } from "./match.js";
import { toggleHelpPanel, openPrematch, renderPrematch, resetBuildWizard, resetRuneAllocation } from "../build/ui.js";
import { resize, getCameraState } from "./renderer.js";
import { playUiCue, unlockAudio } from "../audio.js";
import { isCombatLive } from "./combat.js";

let menuConfirmExpiresAt = 0;

const boltSvg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#00ff66" stroke="black" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="16" r="6" fill="#111" /></svg>`;
const boltCursorUrl = `url('data:image/svg+xml;base64,${btoa(boltSvg)}') 16 16, pointer`;

function tryOpenPrematchMenu() {
  const now = performance.now();
  if (isCombatLive()) {
    if (now >= menuConfirmExpiresAt) {
      menuConfirmExpiresAt = now + 1200;
      playUiCue("cancel");
      statusLine.textContent = "Menu armé. Clique encore une fois rapidement pour revenir à l'accueil.";
      return;
    }
  }

  menuConfirmExpiresAt = 0;
  playUiCue("click");
  openPrematch("mode");
}

export function screenToArena(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const camera = getCameraState(rect.width, rect.height);

  return {
    x: clamp((clientX - rect.left - camera.offsetX) / camera.scale + camera.x, 0, arena.width),
    y: clamp((clientY - rect.top - camera.offsetY) / camera.scale + camera.y, 0, arena.height),
  };
}

export function updatePointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  input.lookX = clamp((clientX - centerX) / Math.max(1, rect.width * 0.5), -1, 1);
  input.lookY = clamp((clientY - centerY) / Math.max(1, rect.height * 0.5), -1, 1);
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
    castReactorCore();
  }

  if (event.code === "KeyC") {
    input.altFiring = true;
  }

  if (sandbox.mode !== sandboxModes.training.key) {
    return;
  }

  if (event.code === "KeyG") {
    player.fireCooldown = 0;
    abilityState.boltLinkJavelin.cooldown = 0;
    abilityState.orbitalDistorter.cooldown = 0;
    abilityState.hexPlateProjector.cooldown = 0;
    abilityState.core.cooldown = 0;
    abilityState.reflexAegis.cooldown = 0;
    abilityState.dash.charges = 2;
    statusLine.textContent = "Cooldowns reset.";
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
  button?.addEventListener("click", () => {
    unlockAudio();
    tryOpenPrematchMenu();
  });
});

[rematchButton, hudRematchButton].forEach((button) => {
  button?.addEventListener("click", () => {
    unlockAudio();
    playUiCue("confirm");
    relaunchCurrentSession();
  });
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
bindPrematchButton(continueRunes, "continue-runes");
bindPrematchButton(backBuild, "back-build");
bindPrematchButton(acceptMatchButton, "accept-match");

  runeResetButton?.addEventListener("click", () => {
    unlockAudio();
    playUiCue("cancel");
    resetRuneAllocation();
    statusLine.textContent = "Rune allocation reset.";
  });

trainingFireOff?.addEventListener("click", () => {
  unlockAudio();
  playUiCue("click");
  trainingToolState.botsFire = false;
  for (const bot of trainingBots) {
    bot.shootCooldown = 999;
  }
  renderPrematch();
  statusLine.textContent = "Training bots set to silent.";
});

trainingFireOn?.addEventListener("click", () => {
  unlockAudio();
  playUiCue("click");
  trainingToolState.botsFire = true;
  trainingBots.forEach((bot, index) => {
    bot.shootCooldown = 0.35 + index * 0.08;
  });
  renderPrematch();
  statusLine.textContent = "Training bots now fire steady pulse shots.";
});

trainingBuildButton?.addEventListener("click", () => {
  unlockAudio();
  playUiCue("click");
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

  if (sandbox.mode === sandboxModes.training.key && trainingToolState.trainingConfig?.isSelecting) {
    let anyHovered = false;
    for (const bot of trainingBots) {
      bot.isHovered = false;
      if (bot.alive && length(input.mouseX - bot.x, input.mouseY - bot.y) < 60) {
        bot.isHovered = true;
        anyHovered = true;
      }
    }
    canvas.style.cursor = boltCursorUrl;
  } else {
    for (const bot of trainingBots) bot.isHovered = false;
    if (canvas.style.cursor === boltCursorUrl || canvas.style.cursor === "pointer" || canvas.style.cursor === "crosshair") {
      canvas.style.cursor = "";
    }
  }
});

canvas.addEventListener("mousedown", (event) => {
  if (uiState.prematchOpen) {
    return;
  }
  unlockAudio();
  updatePointer(event.clientX, event.clientY);

  if (sandbox.mode === sandboxModes.training.key && trainingToolState.trainingConfig?.isSelecting) {
    let closestBot = null;
    let minDistance = 60;
    for (const bot of trainingBots) {
      if (!bot.alive) continue;
      const dist = length(input.mouseX - bot.x, input.mouseY - bot.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestBot = bot;
      }
    }
    if (closestBot) {
      trainingToolState.trainingConfig.selectedBotId = closestBot.kind;
      trainingToolState.trainingConfig.isSelecting = false;
      canvas.style.cursor = "";
      for (const b of trainingBots) b.isHovered = false;
      document.dispatchEvent(new CustomEvent('training-bot-selected', { detail: closestBot.kind }));
      statusLine.textContent = `Bot selected: ${closestBot.kind}.`;
    } else {
      statusLine.textContent = "No target found near cursor. Try again.";
    }
    return;
  }
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
