// Input event listeners (keyboard, mouse, touch)
import { arena, sandboxModes, config } from "../config.js";
import { weapons } from "../content.js";
import { player, input, sandbox, moduleState, trainingBots } from "../state.js";
import { uiState, trainingToolState } from "../state/app-state.js";
import { canvas, helpToggle, menuButton, rematchButton,
  stepMap, stepBuild, continueBuild,
  backMode, backMap, startSession, moveJoystick, moveStick, aimJoystick, aimStick, statusLine,
  trainingBuildButton, slotDash, slotModule1, slotModule2, slotModule3, coreSlot } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { startDashInput, releaseDashInput, startModuleInput, releaseModuleInput, castReactorCore } from "./modules.js";
import { setWeapon } from "./player.js";
import { relaunchCurrentSession, bindPrematchButton } from "./match.js";
import { toggleHelpPanel, openPrematch, renderPrematch, resetBuildWizard } from "../build/ui.js";
import { resize, getCameraState } from "./renderer.js";
import { playUiCue, unlockAudio } from "../audio.js";
import { isCombatLive } from "./combat.js";

let menuConfirmExpiresAt = 0;
let aimTouchId = null;

const TOUCH_AIM_RANGE = 420;
const JOYSTICK_DEADZONE = 0.18;
const JOYSTICK_FIRE_THRESHOLD = 0.34;

const boltSvg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#00ff66" stroke="black" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="16" r="6" fill="#111" /></svg>`;
const boltCursorUrl = `url('data:image/svg+xml;base64,${btoa(boltSvg)}') 16 16, pointer`;

function isGameplayInputBlocked() {
  return uiState.prematchOpen || document.querySelector(".app-shell")?.dataset.gameOrientationLock === "true";
}

function isTouchCombatHudActive() {
  const appShell = document.querySelector(".app-shell");
  const layout = appShell?.dataset.shellLayout;
  const isMobileLayout = layout === "compact" || layout === "handset" || layout === "narrow";
  return Boolean(
    appShell &&
    isMobileLayout &&
    appShell.dataset.activeView === "game" &&
    appShell.dataset.gameOrientationLock !== "true"
  );
}

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
  openPrematch("map");
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

function setAimVector(normX, normY) {
  const magnitude = Math.min(1, Math.hypot(normX, normY));
  if (magnitude <= JOYSTICK_DEADZONE) {
    input.firing = false;
    input.lookX = 0;
    input.lookY = 0;
    return;
  }

  const direction = normalize(normX, normY);
  const scaledMagnitude = (magnitude - JOYSTICK_DEADZONE) / (1 - JOYSTICK_DEADZONE);
  input.lookX = direction.x * scaledMagnitude;
  input.lookY = direction.y * scaledMagnitude;
  input.mouseX = clamp(player.x + input.lookX * TOUCH_AIM_RANGE, 0, arena.width);
  input.mouseY = clamp(player.y + input.lookY * TOUCH_AIM_RANGE, 0, arena.height);
  input.firing = magnitude >= JOYSTICK_FIRE_THRESHOLD;
}

export function updateAimJoystick(clientX, clientY) {
  const rect = aimJoystick.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const rawX = clientX - centerX;
  const rawY = clientY - centerY;
  const maxDistance = rect.width * 0.32;
  const magnitude = Math.min(maxDistance, length(rawX, rawY));
  const direction = normalize(rawX, rawY);
  const offsetX = direction.x * magnitude;
  const offsetY = direction.y * magnitude;

  setAimVector(offsetX / maxDistance, offsetY / maxDistance);
  aimStick.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  aimJoystick.classList.add("active");
  aimJoystick.classList.toggle("is-engaged", input.firing);
}

export function clearJoystick() {
  input.moveTouchId = null;
  input.moveTouchX = 0;
  input.moveTouchY = 0;
  moveStick.style.transform = "translate(0px, 0px)";
  moveJoystick.classList.remove("active");
}

export function clearAimJoystick() {
  aimTouchId = null;
  input.firing = false;
  aimStick.style.transform = "translate(0px, 0px)";
  aimJoystick.classList.remove("active", "is-engaged");
}

function bindVirtualJoystick(joystick, handlers) {
  if (!joystick) {
    return;
  }

  joystick.addEventListener("touchstart", (event) => {
    if (!isTouchCombatHudActive() || isGameplayInputBlocked()) {
      return;
    }
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    event.preventDefault();
    unlockAudio();
    handlers.start(touch);
  }, { passive: false });

  joystick.addEventListener("touchmove", (event) => {
    if (isGameplayInputBlocked()) {
      return;
    }
    for (const touch of event.changedTouches) {
      if (handlers.move(touch)) {
        event.preventDefault();
      }
    }
  }, { passive: false });

  const release = (event) => {
    for (const touch of event.changedTouches) {
      if (handlers.end(touch)) {
        event.preventDefault();
      }
    }
  };

  joystick.addEventListener("touchend", release, { passive: false });
  joystick.addEventListener("touchcancel", release, { passive: false });
}

function bindTouchActionButton(element, { onPress, onRelease, tapOnly = false }) {
  if (!element) {
    return;
  }

  let activePointerId = null;

  const release = (pointerId) => {
    if (activePointerId !== pointerId) {
      return;
    }
    activePointerId = null;
    element.classList.remove("is-pressed");
    onRelease?.();
  };

  element.addEventListener("pointerdown", (event) => {
    if (!isTouchCombatHudActive() || isGameplayInputBlocked()) {
      return;
    }
    if (event.pointerType === "mouse") {
      return;
    }
    event.preventDefault();
    unlockAudio();
    activePointerId = event.pointerId;
    element.classList.add("is-pressed");
    element.setPointerCapture?.(event.pointerId);
    onPress?.();
    if (tapOnly) {
      release(event.pointerId);
    }
  });

  element.addEventListener("pointerup", (event) => {
    release(event.pointerId);
  });
  element.addEventListener("pointercancel", (event) => {
    release(event.pointerId);
  });
  element.addEventListener("lostpointercapture", (event) => {
    release(event.pointerId);
  });
}

export function setupInputListeners() {
  window.addEventListener("resize", resize);
  resize();

  bindVirtualJoystick(moveJoystick, {
    start(touch) {
      if (input.moveTouchId !== null) {
        return;
      }
      input.moveTouchId = touch.identifier;
      moveJoystick.classList.add("active");
      updateJoystick(touch.clientX, touch.clientY);
    },
    move(touch) {
      if (touch.identifier !== input.moveTouchId) {
        return false;
      }
      updateJoystick(touch.clientX, touch.clientY);
      return true;
    },
    end(touch) {
      if (touch.identifier !== input.moveTouchId) {
        return false;
      }
      clearJoystick();
      return true;
    },
  });

  bindVirtualJoystick(aimJoystick, {
    start(touch) {
      if (aimTouchId !== null) {
        return;
      }
      aimTouchId = touch.identifier;
      updateAimJoystick(touch.clientX, touch.clientY);
    },
    move(touch) {
      if (touch.identifier !== aimTouchId) {
        return false;
      }
      updateAimJoystick(touch.clientX, touch.clientY);
      return true;
    },
    end(touch) {
      if (touch.identifier !== aimTouchId) {
        return false;
      }
      clearAimJoystick();
      return true;
    },
  });

  bindTouchActionButton(slotDash, {
    onPress: () => startDashInput(),
    onRelease: () => releaseDashInput(),
  });
  bindTouchActionButton(slotModule1, {
    onPress: () => startModuleInput(0),
    onRelease: () => releaseModuleInput(0),
  });
  bindTouchActionButton(slotModule2, {
    onPress: () => startModuleInput(1),
    onRelease: () => releaseModuleInput(1),
  });
  bindTouchActionButton(slotModule3, {
    onPress: () => startModuleInput(2),
    onRelease: () => releaseModuleInput(2),
  });
  bindTouchActionButton(coreSlot, {
    onPress: () => castReactorCore(),
    tapOnly: true,
  });

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyH" && !event.repeat) {
    toggleHelpPanel();
    return;
  }

  if (isGameplayInputBlocked()) {
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
    startModuleInput(0);
  }

  if (event.code === "KeyE" && !event.repeat) {
    startModuleInput(1);
  }

  if (event.code === "KeyF" && !event.repeat) {
    startModuleInput(2);
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
    moduleState.boltLinkJavelin.cooldown = 0;
    moduleState.orbitalDistorter.cooldown = 0;
    moduleState.hexPlateProjector.cooldown = 0;
    moduleState.core.cooldown = 0;
    moduleState.reflexAegis.cooldown = 0;
    moduleState.dash.charges = 2;
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
  if (isGameplayInputBlocked()) {
    return;
  }

  input.keys.delete(event.code);

  if (event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
    releaseDashInput();
  } else if (event.code === "KeyQ") {
    releaseModuleInput(0);
  } else if (event.code === "KeyE") {
    releaseModuleInput(1);
  } else if (event.code === "KeyF") {
    releaseModuleInput(2);
  } else if (event.code === "KeyC") {
    input.altFiring = false;
  }
});

helpToggle.addEventListener("click", () => {
  toggleHelpPanel();
});

[menuButton].forEach((button) => {
  button?.addEventListener("click", () => {
    unlockAudio();
    tryOpenPrematchMenu();
  });
});

[rematchButton].forEach((button) => {
  button?.addEventListener("click", () => {
    unlockAudio();
    playUiCue("confirm");
    relaunchCurrentSession();
  });
});

bindPrematchButton(stepMap, "step-map");
bindPrematchButton(stepBuild, "step-build");
bindPrematchButton(continueBuild, "continue-build");
bindPrematchButton(backMode, "back-mode");
bindPrematchButton(backMap, "back-map");
bindPrematchButton(startSession, "start-session");

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
  if (isGameplayInputBlocked()) {
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
      statusLine.textContent = "Aucune cible detectee sous le curseur. Reessaie.";
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
}
