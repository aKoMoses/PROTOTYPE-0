// Game entry point and main loop
import "../styles.css";
import { sandbox, matchState, globals, player, input, mapState } from "./state.js";
import { sandboxModes } from "./config.js";
import { canvas } from "./dom.js";
import * as dom from "./dom.js";
import { resetMapState } from "./maps.js";
import { updatePortalCooldowns, resolveCharacterBodyBlocking } from "./maps.js";
import { updateBullets, absorbPlayerProjectiles, absorbEnemyProjectiles, resolveCombat, getAllBots, resetBotsForMode, clearCombatArtifacts } from "./gameplay/combat.js";
import { updateDuelMatch, showRoundBanner, startDuelRound, finishDuelRound, bindMatchDeps, relaunchCurrentSession, launchSelectedSession, handlePrematchAction, bindPrematchButton } from "./gameplay/match.js";
import { updateImpacts } from "./gameplay/combat.js";
import { updatePlayer, resetPlayer, setWeapon } from "./gameplay/player.js";
import { updateEnemy, updateEnemyShockJavelins, updateShockJavelins } from "./gameplay/enemy.js";
import { updateTrainingBots } from "./gameplay/enemy.js";
import { drawWorld, resize } from "./gameplay/renderer.js";
import { updateHud } from "./gameplay/hud.js";
import { setupInputListeners } from "./gameplay/input.js";
import { startDashInput, releaseDashInput, startAbilityInput, releaseAbilityInput, castUltimate } from "./gameplay/abilities.js";
import { openPrematch, closePrematch, renderPrematch, toggleHelpPanel, bindUIDeps, setPrematchStep } from "./build/ui.js";
import { setBotBuildMode } from "./build/loadout.js";
import { bullets, enemyBullets, shockJavelins, enemyShockJavelins, supportZones } from "./state.js";
import { updateSupportZones } from "./gameplay/combat.js";
import { initializeAudio, updateAudio } from "./audio.js";

// Wire up cross-module dependencies
bindMatchDeps({ resetPlayer, openPrematch, closePrematch, renderPrematch });
bindUIDeps({ resetPlayer, startDuelRound, showRoundBanner, releaseDashInput });

// Game loop
function frame(time) {
  const dt = Math.min(0.033, (time - globals.lastTime) / 1000);
  globals.lastTime = time;

  updatePortalCooldowns(dt);
  updatePlayer(dt);
  updateEnemy(dt);
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
  updateImpacts(dt);
  updateAudio(dt);
  updateHud();
  drawWorld();

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
openPrematch("mode");
renderPrematch();
dom.statusLine.textContent = "Prototype 0 online. Set the mode, build, and drop into the arena.";
requestAnimationFrame(frame);
