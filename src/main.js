// Game entry point and main loop
import "../styles.css";
import { sandbox, matchState, globals, player, input, mapState } from "./state.js";
import { uiState } from "./state/app-state.js";
import { sandboxModes } from "./config.js";
import { canvas } from "./dom.js";
import * as dom from "./dom.js";
import { resetMapState } from "./maps.js";
import { updatePortalCooldowns, resolveCharacterBodyBlocking } from "./maps.js";
import { updateBullets, absorbPlayerProjectiles, absorbEnemyProjectiles, resolveCombat, getAllBots, resetBotsForMode, clearCombatArtifacts, updateMapInteractables } from "./gameplay/combat.js";
import { updateDuelMatch, updateTeamDuelMatch, showRoundBanner, startDuelRound, startTeamDuelRound, finishDuelRound, bindMatchDeps, relaunchCurrentSession, launchSelectedSession, handlePrematchAction, bindPrematchButton, updatePrematchFlow } from "./gameplay/match.js";
import { updateImpacts } from "./gameplay/combat.js";
import { updatePlayer, resetPlayer, setWeapon } from "./gameplay/player.js";
import { updateEnemy, updateEnemyShockJavelins, updateShockJavelins } from "./gameplay/enemy.js";
import { updateTrainingBots } from "./gameplay/enemy.js";
import { updateTeamDuelBots } from "./gameplay/team-ai.js";
import { bindSurvivalDeps, startSurvivalRun, updateSurvivalEnemies, updateSurvivalMode } from "./gameplay/survival.js";
import { drawWorld, resize } from "./gameplay/renderer.js";
import { updateHud } from "./gameplay/hud.js";
import { setupInputListeners } from "./gameplay/input.js";
import { startDashInput, releaseDashInput, startAbilityInput, releaseAbilityInput, castUltimate } from "./gameplay/abilities.js";
import { updatePhantomClone } from "./gameplay/phantom.js";
import { openPrematch, closePrematch, renderPrematch, toggleHelpPanel, bindUIDeps, setPrematchStep, syncPrematchState } from "./build/ui.js";
import { applySavedPlayerLoadout, setBotBuildMode } from "./build/loadout.js";
import { bullets, enemyBullets, shockJavelins, enemyShockJavelins, supportZones } from "./state.js";
import { updateSupportZones } from "./gameplay/combat.js";
import { initializeAudio, updateAudio } from "./audio.js";
import { installSessionPersistence, restoreSessionSnapshot, clearGameSession } from "./session.js";
import { PROGRESSION_CHANGED_EVENT } from "./progression.js";

let sessionPersistAccumulator = 0;
const persistSession = installSessionPersistence();

// Game loop control
let isGameRunning = true;
let frameId = null;

// Wire up cross-module dependencies
bindMatchDeps({ resetPlayer, openPrematch, closePrematch, renderPrematch });
bindUIDeps({ resetPlayer, startDuelRound, startTeamDuelRound, showRoundBanner, releaseDashInput, restartSurvivalRun: startSurvivalRun });
bindSurvivalDeps({ resetPlayer, openPrematch, resetBotsForMode });

// Game loop
function frame(time) {
  if (!isGameRunning) {
    return;
  }

  try {
  const dt = Math.min(0.033, (time - globals.lastTime) / 1000);
  globals.lastTime = time;

  const gameplayPaused = uiState.prematchOpen;
  updatePrematchFlow(dt);

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
    updateShockJavelins(dt);
    updateEnemyShockJavelins(dt);
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

  sessionPersistAccumulator += dt;
  if (sessionPersistAccumulator >= 0.8) {
    sessionPersistAccumulator = 0;
    persistSession();
  }

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
    event.detail.matchmakingActive = uiState.matchmaking?.active ?? false;
    event.detail.prematchStep = uiState.prematchStep ?? null;
  }

  document.querySelector('[data-shell-view="game"]')?.click();
  openPrematch("build");
  renderPrematch();
  dom.statusLine.textContent = `${selectedLoadout?.name ?? "Loadout"} loaded into combat launch.`;
  persistSession();
});

window.addEventListener(PROGRESSION_CHANGED_EVENT, () => {
  renderPrematch();
  persistSession();
});

const restoredSnapshot = restoreSessionSnapshot();
if (restoredSnapshot) {
  if (restoredSnapshot.resumeGameplay) {
    launchSelectedSession();
    dom.statusLine.textContent = `${dom.statusLine.textContent} Session restaurée automatiquement.`;
  } else {
    openPrematch(restoredSnapshot.ui?.prematchStep ?? "mode");
    renderPrematch();
    dom.statusLine.textContent = "Session prematch restaurée. Reprends la sélection sans repartir de zéro.";
  }
} else {
  openPrematch("mode");
  renderPrematch();
  dom.statusLine.textContent = "Prototype 0 online. Set the mode, build, and drop into the arena.";
}
persistSession();

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

  // Clear game session storage
  clearGameSession();
  
  // Update UI
  syncPrematchState();
  
  // Persist final state
  persistSession();
}

// Function to restart the game loop when launching a new session
function restartGameLoop() {
  if (!isGameRunning) {
    isGameRunning = true;
    globals.lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  }
}

// Expose functions globally for shell-ui and match.js
window.__P0_GAME = { stopGameSession, restartGameLoop };

requestAnimationFrame(frame);
