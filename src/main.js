// Game entry point and main loop
import "../styles.css";
import { sandbox, matchState, globals, input } from "./state.js";
import { uiState } from "./state/app-state.js";
import * as dom from "./dom.js";
import { updatePortalCooldowns, resolveCharacterBodyBlocking } from "./maps.js";
import { updateBullets, absorbPlayerProjectiles, absorbEnemyProjectiles, resolveCombat, resetBotsForMode, updateMapInteractables } from "./gameplay/combat.js";
import { updateDuelMatch, updateTeamDuelMatch, showRoundBanner, startDuelRound, startTeamDuelRound, bindMatchDeps, bindPrematchButton } from "./gameplay/match.js";
import { updateImpacts } from "./gameplay/combat.js";
import { updatePlayer, resetPlayer } from "./gameplay/player.js";
import { updateEnemy, updateEnemyBoltLinkJavelins, updateBoltLinkJavelins } from "./gameplay/enemy.js";
import { updateTrainingBots } from "./gameplay/enemy.js";
import { updateTeamDuelBots } from "./gameplay/team-ai.js";
import { bindSurvivalDeps, startSurvivalRun, updateSurvivalEnemies, updateSurvivalMode } from "./gameplay/survival.js";
import { drawWorld, reportFramePerformance, resize } from "./gameplay/renderer.js";
import { updateHud } from "./gameplay/hud.js";
import { clearAimJoystick, clearJoystick, setupInputListeners } from "./gameplay/input.js";
import { releaseDashInput, releaseModuleInput } from "./gameplay/modules.js";
import { updatePhantomClone } from "./gameplay/phantom.js";
import { openPrematch, closePrematch, renderPrematch, toggleHelpPanel, bindUIDeps, syncPrematchState } from "./build/ui.js";
import { applySavedPlayerLoadout } from "./build/loadout.js";
import { bullets, enemyBullets } from "./state.js";
import { updateSupportZones } from "./gameplay/combat.js";
import { initializeAudio, resumeAudio, suspendAudio, updateAudio } from "./audio.js";
import { PROGRESSION_CHANGED_EVENT } from "./progression.js";
import { initNetworkService, subscribeNetworkState } from "./lib/network/service.js";
import { initMobileLifecycleService, subscribeMobileLifecycleState } from "./lib/mobile/lifecycle.js";

const gameOrientationGuard = document.getElementById("game-orientation-guard");
const mapStatus = document.getElementById("map-status");
let networkSnapshot = initNetworkService();
let lifecycleSnapshot = initMobileLifecycleService();

// Game loop control
let isGameRunning = true;
let frameId = null;
let isOrientationLocked = false;
let isLifecyclePaused = lifecycleSnapshot.phase === "background";

function getIdleStatusCopy(snapshot = networkSnapshot) {
  return snapshot.isOnline
    ? "Prototype 0 online. Set the mode, build, and drop into the arena."
    : "Mode hors ligne actif. Training, Survie et Versus IA local restent jouables.";
}

function syncNetworkStatusCopy(snapshot = networkSnapshot) {
  networkSnapshot = snapshot;

  if (mapStatus) {
    mapStatus.textContent = snapshot.isOnline
      ? "Arena data online."
      : "Offline mode active. Network rooms unavailable.";
  }
}

function syncOrientationGuardState(locked) {
  if (!gameOrientationGuard) {
    return;
  }

  gameOrientationGuard.setAttribute("aria-hidden", locked ? "false" : "true");
}

function releaseActiveInputs() {
  input.keys.clear();
  input.firing = false;
  input.altFiring = false;
  clearJoystick();
  clearAimJoystick();
  releaseDashInput();
  releaseModuleInput(0);
  releaseModuleInput(1);
  releaseModuleInput(2);
}

function updateOrientationLock(locked) {
  if (isOrientationLocked === locked) {
    return;
  }

  isOrientationLocked = locked;
  syncOrientationGuardState(locked);

  if (locked) {
    releaseActiveInputs();
    dom.statusLine.textContent = "Portrait detected. Rotate to landscape to resume gameplay.";
    return;
  }

  if (!uiState.prematchOpen) {
    dom.statusLine.textContent = "Landscape restored. Gameplay resumed.";
  }
}

function pauseRuntimeForLifecycle(snapshot = lifecycleSnapshot) {
  releaseActiveInputs();

  if (!isGameRunning || isLifecyclePaused) {
    void suspendAudio();
    return;
  }

  isLifecyclePaused = true;
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }

  void suspendAudio();

  if (!uiState.prematchOpen) {
    dom.statusLine.textContent = snapshot.isOnline
      ? "Application mise en veille. Le runtime reprendra a la reouverture."
      : "Application mise en veille hors ligne. Les modes reseau restent suspendus.";
  }
}

function resumeRuntimeFromLifecycle(snapshot = lifecycleSnapshot) {
  const wasPaused = isLifecyclePaused;
  isLifecyclePaused = false;
  globals.lastTime = performance.now();

  if (isGameRunning && frameId === null) {
    frameId = requestAnimationFrame(frame);
  }

  void resumeAudio();

  if (wasPaused && !uiState.prematchOpen && !isOrientationLocked) {
    dom.statusLine.textContent = snapshot.isOnline
      ? "Application reprise. Session, input et audio resynchronises."
      : "Application reprise hors ligne. Les modes reseau restent suspendus.";
  }
}

window.addEventListener("p0-game-orientation-lock-changed", (event) => {
  updateOrientationLock(Boolean(event.detail?.locked));
});

updateOrientationLock(document.querySelector(".app-shell")?.dataset.gameOrientationLock === "true");
syncNetworkStatusCopy(networkSnapshot);
subscribeNetworkState(syncNetworkStatusCopy);
subscribeMobileLifecycleState((nextSnapshot) => {
  const previousPhase = lifecycleSnapshot.phase;
  lifecycleSnapshot = nextSnapshot;

  if (nextSnapshot.phase === "background") {
    pauseRuntimeForLifecycle(nextSnapshot);
    return;
  }

  if (previousPhase === "background") {
    resumeRuntimeFromLifecycle(nextSnapshot);
  }
});

// Wire up cross-module dependencies
bindMatchDeps({ resetPlayer, openPrematch, closePrematch, renderPrematch });
bindUIDeps({ resetPlayer, startDuelRound, startTeamDuelRound, showRoundBanner, releaseDashInput, restartSurvivalRun: startSurvivalRun });
bindSurvivalDeps({ resetPlayer, openPrematch, resetBotsForMode });

// Game loop
function frame(time) {
  if (!isGameRunning) {
    return;
  }

  const frameStartedAt = performance.now();

  try {
  const dt = Math.min(0.033, (time - globals.lastTime) / 1000);
  globals.lastTime = time;

  const gameplayPaused = uiState.prematchOpen || isOrientationLocked || isLifecyclePaused;
  if (!gameplayPaused) {
    updatePortalCooldowns(dt);
    updatePlayer(dt);
    updatePhantomClone(dt);
    updateEnemy(dt);
    updateTeamDuelBots(dt);
    updateSurvivalEnemies(dt);
    updateTrainingBots(dt);
    resolveCharacterBodyBlocking();
    updateBullets(bullets, dt);
    updateBullets(enemyBullets, dt);
    updateBoltLinkJavelins(dt);
    updateEnemyBoltLinkJavelins(dt);
    updateSupportZones(dt);
    absorbPlayerProjectiles();
    absorbEnemyProjectiles();
    resolveCombat();
    updateDuelMatch(dt);
    updateTeamDuelMatch(dt);
    updateSurvivalMode(dt);
    updateImpacts(dt);
    updateMapInteractables(dt);
  }

  updateAudio(dt);
  updateHud();
  drawWorld();
  reportFramePerformance(performance.now() - frameStartedAt, { paused: gameplayPaused });

  } catch (err) {
    document.body.style.background = 'black';
    document.body.style.color = 'red';
    document.body.style.zIndex = '99999';
    document.body.innerHTML = '<pre style="font-size: 20px; white-space: pre-wrap; padding: 20px">' + err.stack + '</pre>';
    throw err;
  }
  frameId = requestAnimationFrame(frame);
}

// Initialization
window.addEventListener("resize", resize);
resize();
setupInputListeners();
initializeAudio({
  muteButton: dom.audioMuteButton,
  musicSlider: dom.audioMusicVolume,
  sfxSlider: dom.audioSfxVolume,
  ambienceSlider: dom.audioAmbienceVolume,
});

resetPlayer({ silent: true });
resetBotsForMode(sandbox.mode);
showRoundBanner("", "", false);
toggleHelpPanel(false);

// Bind core prematch navigation buttons
bindPrematchButton(dom.modeDuel, "mode-duel");
bindPrematchButton(dom.modeSurvival, "mode-survival");
bindPrematchButton(dom.modeTeamDuel, "mode-team-duel");
bindPrematchButton(dom.modeTraining, "mode-training");
bindPrematchButton(dom.modeCustom, "mode-custom");
bindPrematchButton(document.getElementById("back-to-modes"), "back-to-modes");
bindPrematchButton(dom.continueMap, "continue-map");
bindPrematchButton(dom.backMode, "back-mode");
bindPrematchButton(dom.continueBuild, "continue-build");

const matchPanelToggle = document.getElementById("match-panel-toggle");
const matchPanel = document.getElementById("match-panel");
matchPanelToggle?.addEventListener("click", () => {
  matchPanel?.classList.toggle("is-collapsed");
});

const ttPanelToggle = document.getElementById("tt-panel-toggle");
const ttPanel = document.getElementById("training-tools-panel");
ttPanelToggle?.addEventListener("click", () => {
  ttPanel?.classList.toggle("is-collapsed");
});

window.addEventListener("loadout-equip", (event) => {
  const selectedLoadout = event.detail?.loadout;
  const result = applySavedPlayerLoadout(selectedLoadout);
  if (!result.ok) {
    dom.statusLine.textContent = `Loadout locked. ${event.detail?.message ?? "Unlock the missing items first."}`;
    return;
  }

  if (event.detail && typeof event.detail === "object") {
    event.detail.prematchStep = uiState.prematchStep ?? null;
  }

  const deckId = selectedLoadout?.id ?? null;
  uiState.selectedLoadoutId = deckId;

  document.querySelector('[data-shell-view="game"]')?.click();
  openPrematch("build");
  renderPrematch();
  dom.statusLine.textContent = `${selectedLoadout?.name ?? "Loadout"} loaded into combat launch.`;
});

window.addEventListener(PROGRESSION_CHANGED_EVENT, () => {
  renderPrematch();
});

openPrematch("mode");
renderPrematch();
dom.statusLine.textContent = getIdleStatusCopy(networkSnapshot);

// Function to stop the game session when navigating away (e.g., clicking Home)
export function stopGameSession() {
  // Stop the game loop
  isGameRunning = false;
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }

  // Close prematch overlay
  closePrematch();

  // Reset all game states
  resetPlayer({ silent: true });
  matchState.roundNumber = 1;
  matchState.roundActive = false;
  matchState.duelScore = 0;
  matchState.enemyScore = 0;
  matchState.teamScore = 0;
  matchState.teamEnemyScore = 0;
  globals.lastTime = performance.now();

  // Update UI
  syncPrematchState();
}

// Function to restart the game loop when launching a new session
function restartGameLoop() {
  globals.lastTime = performance.now();
  if (!isGameRunning) {
    isGameRunning = true;
  }

  if (!isLifecyclePaused && frameId === null) {
    frameId = requestAnimationFrame(frame);
  }
}

// Expose functions globally for shell-ui and match.js
window.__P0_GAME = { stopGameSession, restartGameLoop };

if (!isLifecyclePaused) {
  requestAnimationFrame(frame);
}
