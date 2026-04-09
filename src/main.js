// Game entry point and main loop
import "../styles.css";
import { sandbox, matchState, globals, player, input, mapState } from "./state.js";
import { uiState } from "./state/app-state.js";
import { sandboxModes } from "./config.js";
import { canvas } from "./dom.js";
import * as dom from "./dom.js";
import { resetMapState } from "./maps.js";
import { updateMapObjects, resolveCharacterBodyBlocking } from "./maps.js";
import { updateBullets, absorbPlayerProjectiles, absorbEnemyProjectiles, resolveCombat, getAllBots, resetBotsForMode, clearCombatArtifacts, updateMapInteractables } from "./gameplay/combat.js";
import { updateDuelMatch, showRoundBanner, startDuelRound, finishDuelRound, bindMatchDeps, relaunchCurrentSession, launchSelectedSession, handlePrematchAction, bindPrematchButton } from "./gameplay/match.js";
import { updateImpacts } from "./gameplay/combat.js";
import { updatePlayer, resetPlayer, setWeapon } from "./gameplay/player.js";
import { updateEnemy, updateEnemyShockJavelins, updateShockJavelins } from "./gameplay/enemy.js";
import { updateTrainingBots } from "./gameplay/enemy.js";
import { bindSurvivalDeps, startSurvivalRun, updateSurvivalEnemies, updateSurvivalMode } from "./gameplay/survival.js";
import { drawWorld, resize } from "./gameplay/renderer.js";
import { updateHud } from "./gameplay/hud.js";
import { setupInputListeners } from "./gameplay/input.js";
import { startDashInput, releaseDashInput, startAbilityInput, releaseAbilityInput, castUltimate } from "./gameplay/abilities.js";
import { updatePhantomClone } from "./gameplay/phantom.js";
import { openPrematch, closePrematch, renderPrematch, toggleHelpPanel, bindUIDeps, setPrematchStep, initRobotWizardZoneClicks } from "./build/ui.js";
import { applySavedPlayerLoadout, setBotBuildMode } from "./build/loadout.js";
import { bullets, enemyBullets, shockJavelins, enemyShockJavelins, supportZones } from "./state.js";
import { updateSupportZones } from "./gameplay/combat.js";
import { initializeAudio, updateAudio } from "./audio.js";
import { installSessionPersistence, restoreSessionSnapshot } from "./session.js";
import { content } from "./content.js";

// Expose content for non-module scripts (loadout builder)
window.__P0_CONTENT = content;

let sessionPersistAccumulator = 0;
const persistSession = installSessionPersistence();

// Wire up cross-module dependencies
bindMatchDeps({ resetPlayer, openPrematch, closePrematch, renderPrematch });
bindUIDeps({ resetPlayer, startDuelRound, showRoundBanner, releaseDashInput, restartSurvivalRun: startSurvivalRun });
bindSurvivalDeps({ resetPlayer, openPrematch, resetBotsForMode });

// Game loop
function frame(time) {
  try {
  const dt = Math.min(0.033, (time - globals.lastTime) / 1000);
  globals.lastTime = time;

  const gameplayPaused = uiState.prematchOpen;

  if (!gameplayPaused) {
    updateMapObjects(dt);
    updatePlayer(dt);
    updatePhantomClone(dt);
    updateEnemy(dt);
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
  requestAnimationFrame(frame);
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
initRobotWizardZoneClicks();

// Bind core prematch navigation buttons
bindPrematchButton(dom.modeDuel, "mode-duel");
bindPrematchButton(dom.modeSurvival, "mode-survival");
bindPrematchButton(dom.modeTraining, "mode-training");
bindPrematchButton(dom.continueMap, "continue-map");
bindPrematchButton(dom.backMode, "back-mode");
bindPrematchButton(dom.continueBuild, "continue-build");
bindPrematchButton(dom.botDifficultyEasy, "bot-difficulty-easy");
bindPrematchButton(dom.botDifficultyNormal, "bot-difficulty-normal");
bindPrematchButton(dom.botDifficultyHard, "bot-difficulty-hard");

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
  if (!applySavedPlayerLoadout(selectedLoadout)) {
    return;
  }

  document.querySelector('[data-shell-view="game"]')?.click();
  openPrematch("build");
  renderPrematch();
  dom.statusLine.textContent = `${selectedLoadout?.name ?? "Loadout"} loaded into combat launch.`;
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
requestAnimationFrame(frame);
