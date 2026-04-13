// Duel match flow, round management, session launch
import { config, sandboxModes } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, trainingBots, moduleState, sandbox, matchState, mapState, allyBot, teamEnemies } from "../state.js";
import { loadout, uiState, botBuildState, matchSettings, trainingToolState } from "../state/app-state.js";
import { getMapLayout, resetMapState, buildMapState, mapChoices, normalizeSelectedMap, resolveMapKey } from "../maps.js";
import { getAllBots, isCombatLive, clearCombatArtifacts, getPlayerSpawn, resetBotsForMode, refreshHunterLoadout } from "./combat.js";
import { addImpact, addShake } from "./effects.js";
import { normalizeLoadoutSelections, ensureBotLoadoutFilled, createRandomBotLoadout } from "../build/loadout.js";
import { setPrematchStep, resetBuildWizard, prevBuildWizardStep, commitBuildStepSelection, commitActivePreviewSelection, updateTrainingBuildButton, isBuildComplete, getFirstIncompleteBuildSlot, goToBuildWizardStep } from "../build/ui.js";
import { startSurvivalRun } from "./survival.js";
import * as dom from "../dom.js";
import { playUiCue, unlockAudio } from "../audio.js";
import { addXp, getProgressionSnapshot } from "../progression.js";
import { syncServerProgressionAfterMatch } from "../lib/account/progression-sync.js";
import { PrematchOrchestrator } from "../matchmaking/orchestrator.js";
export { relaunchCurrentSession } from "../build/ui.js";

window.addEventListener("p0-prematch-action", (event) => {
  const action = event.detail?.action;
  if (typeof action !== "string") {
    return;
  }
  handlePrematchAction(action);
});

// Forward declarations - these will be set by the modules that define them
let _resetPlayer = null;
let _openPrematch = null;
let _closePrematch = null;
let _renderPrematch = null;
let prematchOrchestrator = null;
let launchActionLocked = false;

function getPrematchOrchestrator() {
  if (!prematchOrchestrator) {
    prematchOrchestrator = new PrematchOrchestrator({ uiState, dom, setPrematchStep });
  }
  return prematchOrchestrator;
}

export function bindMatchDeps({ resetPlayer, openPrematch, closePrematch, renderPrematch }) {
  _resetPlayer = resetPlayer;
  _openPrematch = openPrematch;
  _closePrematch = closePrematch;
  _renderPrematch = renderPrematch;
  getPrematchOrchestrator().syncFromUiStep();
}

function resetMatchmakingState() {
  getPrematchOrchestrator().resetState();
}

function persistCompletedMatch(mode, result) {
  const progression = getProgressionSnapshot();

  void syncServerProgressionAfterMatch({
    xp: progression.xp,
    level: progression.level,
    result,
  });
}

export function showRoundBanner(label, title, visible = true) {
  matchState.bannerLabel = label;
  matchState.bannerTitle = title;
  matchState.bannerVisible = visible;
}

export function getRoundIntroSequence(roundNumber) {
  return [
    { label: `ROUND ${roundNumber}`, title: "", duration: 0.8, style: "intro" },
    { label: "Get Ready", title: "3", duration: 0.55, style: "countdown" },
    { label: "Get Ready", title: "2", duration: 0.55, style: "countdown" },
    { label: "Get Ready", title: "1", duration: 0.55, style: "countdown" },
    { label: `ROUND ${roundNumber}`, title: "FIGHT!", duration: 0.7, style: "fight" },
  ];
}

export function startDuelRound({ resetScore = false } = {}) {
  if (resetScore) {
    matchState.playerRounds = 0;
    matchState.enemyRounds = 0;
    matchState.roundNumber = 1;
    matchState.formatWins = matchSettings.format === "bo5" ? 3 : 2;
  }

  clearCombatArtifacts();
  _resetPlayer?.({ silent: true });
  resetBotsForMode(sandboxModes.duel.key);
  matchState.phase = "round_intro";
  matchState.introSequence = getRoundIntroSequence(matchState.roundNumber);
  matchState.introIndex = 0;
  matchState.timer = matchState.introSequence[0].duration;
  matchState.bannerStyle = matchState.introSequence[0].style;
  showRoundBanner(matchState.introSequence[0].label, matchState.introSequence[0].title, true);
  dom.statusLine.textContent = `${getMapLayout(sandboxModes.duel.key, sandbox.mapKey).name} - round ${matchState.roundNumber} incoming. Hold center and be ready.`;
}

export function startTeamDuelRound({ resetScore = false } = {}) {
  if (resetScore) {
    matchState.playerRounds = 0;
    matchState.enemyRounds = 0;
    matchState.roundNumber = 1;
    matchState.formatWins = matchSettings.format === "bo5" ? 3 : 2;
  }

  clearCombatArtifacts();
  _resetPlayer?.({ silent: true });
  resetBotsForMode(sandboxModes.teamDuel.key);
  matchState.phase = "round_intro";
  matchState.introSequence = getRoundIntroSequence(matchState.roundNumber);
  matchState.introIndex = 0;
  matchState.timer = matchState.introSequence[0].duration;
  matchState.bannerStyle = matchState.introSequence[0].style;
  showRoundBanner(matchState.introSequence[0].label, matchState.introSequence[0].title, true);
  dom.statusLine.textContent = `${getMapLayout(sandboxModes.teamDuel.key, sandbox.mapKey).name} - squad round ${matchState.roundNumber} incoming.`;
}

export function finishDuelRound(winner) {
  if (sandbox.mode !== sandboxModes.duel.key || matchState.phase !== "active") {
    return;
  }

  if (winner === "player") {
    matchState.playerRounds += 1;
    matchState.phase = "round_end";
    matchState.timer = 1.45;
    showRoundBanner(`Round ${matchState.roundNumber}`, "Round Won");
    dom.statusLine.textContent = "Round won. Stay sharp for the reset.";
  } else {
    matchState.enemyRounds += 1;
    matchState.phase = "round_end";
    matchState.timer = 1.45;
    showRoundBanner(`Round ${matchState.roundNumber}`, "Round Lost");
    dom.statusLine.textContent = "Round lost. Reset and re-enter clean.";
  }
}

export function finishTeamDuelRound(winner) {
  if (sandbox.mode !== sandboxModes.teamDuel.key || matchState.phase !== "active") {
    return;
  }

  if (winner === "player") {
    matchState.playerRounds += 1;
    matchState.phase = "round_end";
    matchState.timer = 1.45;
    showRoundBanner(`Round ${matchState.roundNumber}`, "Team Won");
    dom.statusLine.textContent = "Round won. Enemy squad wiped.";
  } else {
    matchState.enemyRounds += 1;
    matchState.phase = "round_end";
    matchState.timer = 1.45;
    showRoundBanner(`Round ${matchState.roundNumber}`, "Team Lost");
    dom.statusLine.textContent = "Round lost. Your squad collapsed.";
  }
}

export function updateDuelMatch(dt) {
  if (sandbox.mode !== sandboxModes.duel.key) {
    showRoundBanner("", "", false);
    return;
  }

  if (matchState.phase === "active") {
    dom.gameShell.classList.add("is-combat-active");
    showRoundBanner("", "", false);
    return;
  } else {
    dom.gameShell.classList.remove("is-combat-active");
  }

  matchState.timer = Math.max(0, matchState.timer - dt);

  if (matchState.phase === "round_intro") {
    if (matchState.timer <= 0) {
      matchState.introIndex += 1;

      if (matchState.introIndex >= matchState.introSequence.length) {
        matchState.phase = "active";
        matchState.bannerStyle = "intro";
        showRoundBanner("", "", false);
        dom.statusLine.textContent = "Fight. Contest space and close the round.";
      } else {
        const step = matchState.introSequence[matchState.introIndex];
        matchState.timer = step.duration;
        matchState.bannerStyle = step.style;
        showRoundBanner(step.label, step.title, true);
      }
    }
    return;
  }

  if (matchState.phase === "round_end") {
    if (matchState.timer <= 0) {
      if (
        matchState.playerRounds >= matchState.formatWins ||
        matchState.enemyRounds >= matchState.formatWins
      ) {
        const didPlayerWin = matchState.playerRounds > matchState.enemyRounds;
        if (didPlayerWin) {
          const progression = addXp(1, "duel-win");
          const levelText = progression.leveledUp
            ? ` Level ${progression.snapshot.level} reached.`
            : ` XP ${progression.snapshot.xp}.`;
          dom.statusLine.textContent = `Match won. +1 XP earned.${levelText}`;
        }
        persistCompletedMatch(sandboxModes.duel.key, didPlayerWin ? "win" : "loss");
        matchState.phase = "match_end";
        matchState.timer = 2.2;
        showRoundBanner(
          "Match Point",
          matchState.playerRounds > matchState.enemyRounds ? "Victory" : "Defeat",
          true,
        );
        if (matchState.playerRounds <= matchState.enemyRounds) {
          dom.statusLine.textContent = "Match lost. Duel sequence resetting.";
        }
      } else {
        matchState.roundNumber += 1;
        startDuelRound();
      }
    }
    return;
  }

  if (matchState.phase === "match_end" && matchState.timer <= 0) {
    startDuelRound({ resetScore: true });
  }
}

export function updateTeamDuelMatch(dt) {
  if (sandbox.mode !== sandboxModes.teamDuel.key) {
    return;
  }

  if (matchState.phase === "active") {
    const playerTeamDefeated = !player.alive && !allyBot?.alive;
    const enemyTeamDefeated = teamEnemies.every((bot) => !bot?.alive);
    if (enemyTeamDefeated) {
      finishTeamDuelRound("player");
    } else if (playerTeamDefeated) {
      finishTeamDuelRound("enemy");
    } else {
      showRoundBanner("", "", false);
    }
    return;
  }

  matchState.timer = Math.max(0, matchState.timer - dt);

  if (matchState.phase === "round_intro") {
    if (matchState.timer <= 0) {
      matchState.introIndex += 1;

      if (matchState.introIndex >= matchState.introSequence.length) {
        matchState.phase = "active";
        matchState.bannerStyle = "intro";
        showRoundBanner("", "", false);
        dom.statusLine.textContent = "Fight. Keep your ally alive and clear both enemies.";
      } else {
        const step = matchState.introSequence[matchState.introIndex];
        matchState.timer = step.duration;
        matchState.bannerStyle = step.style;
        showRoundBanner(step.label, step.title, true);
      }
    }
    return;
  }

  if (matchState.phase === "round_end") {
    if (matchState.timer <= 0) {
      if (matchState.playerRounds >= matchState.formatWins || matchState.enemyRounds >= matchState.formatWins) {
        const didPlayerWin = matchState.playerRounds > matchState.enemyRounds;
        if (didPlayerWin) {
          const progression = addXp(1, "team-duel-win");
          const levelText = progression.leveledUp
            ? ` Level ${progression.snapshot.level} reached.`
            : ` XP ${progression.snapshot.xp}.`;
          dom.statusLine.textContent = `2v2 won. +1 XP earned.${levelText}`;
        }
        persistCompletedMatch(sandboxModes.teamDuel.key, didPlayerWin ? "win" : "loss");
        matchState.phase = "match_end";
        matchState.timer = 2.2;
        showRoundBanner(
          "Team Match",
          matchState.playerRounds > matchState.enemyRounds ? "Victory" : "Defeat",
          true,
        );
        if (matchState.playerRounds <= matchState.enemyRounds) {
          dom.statusLine.textContent = "2v2 lost. Match resetting.";
        }
      } else {
        matchState.roundNumber += 1;
        startTeamDuelRound();
      }
    }
    return;
  }

  if (matchState.phase === "match_end" && matchState.timer <= 0) {
    startTeamDuelRound({ resetScore: true });
  }
}

export function switchSandboxMode(nextMode, nextMapKey = sandbox.mapKey) {
  if (!sandboxModes[nextMode]) {
    return;
  }

  sandbox.mode = nextMode;
  uiState.selectedMode = nextMode;
  sandbox.mapKey = resolveMapKey(nextMode, nextMapKey);
  clearCombatArtifacts();

  if (nextMode === sandboxModes.training.key) {
    _resetPlayer?.({ silent: true });
    resetBotsForMode(nextMode);
    showRoundBanner("", "", false);
    dom.statusLine.textContent = `${getMapLayout(nextMode, sandbox.mapKey).name} active. Static targets are ready for build testing.`;
    updateTrainingBuildButton();
    return;
  }

  if (nextMode === sandboxModes.survival.key) {
    startSurvivalRun({ resetProgress: true });
    dom.statusLine.textContent = `${getMapLayout(nextMode, sandbox.mapKey).name} active. Survival gauntlet initialized.`;
    updateTrainingBuildButton();
    return;
  }

  if (nextMode === sandboxModes.teamDuel.key) {
    startTeamDuelRound({ resetScore: true });
    dom.statusLine.textContent = `${getMapLayout(nextMode, sandbox.mapKey).name} active. 2v2 flow initialized.`;
    updateTrainingBuildButton();
    return;
  }

  startDuelRound({ resetScore: true });
  dom.statusLine.textContent = `${getMapLayout(nextMode, sandbox.mapKey).name} active. Match flow initialized.`;
  updateTrainingBuildButton();
}

export function launchSelectedSession() {
  commitActivePreviewSelection();
  normalizeLoadoutSelections({ preserveEmptySlots: true });
  if (!isBuildComplete()) {
    const missingSlot = getFirstIncompleteBuildSlot();
    if (missingSlot) {
      goToBuildWizardStep(missingSlot);
    }
    setPrematchStep("build");
    _renderPrematch?.();
    dom.statusLine.textContent = "Lock every build slot before deploying the match.";
    return;
  }

  botBuildState.current = botBuildState.mode === "custom"
    ? ensureBotLoadoutFilled(botBuildState.custom)
    : createRandomBotLoadout();
  if (matchSettings.mirror) {
    botBuildState.current.weapon = loadout.weapon;
  }
  player.weapon = loadout.weapon;
  const previousMode = sandbox.mode;
  const previousMapKey = sandbox.mapKey;
  const resolvedMapKey = resolveMapKey(uiState.selectedMode, uiState.selectedMap, true);
  _closePrematch?.();

  if (
    trainingToolState.editingBuild &&
    previousMode === sandboxModes.training.key &&
    uiState.selectedMode === sandboxModes.training.key &&
    previousMapKey === resolvedMapKey
  ) {
    trainingToolState.editingBuild = false;
    _resetPlayer?.({ silent: true });
    resetBotsForMode(sandboxModes.training.key);
    showRoundBanner("", "", false);
    dom.statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} build applied. Training lane refreshed instantly.`;
    updateTrainingBuildButton();
    window.__P0_GAME?.restartGameLoop?.();
    return;
  }

  if (previousMode !== uiState.selectedMode || previousMapKey !== resolvedMapKey) {
    switchSandboxMode(uiState.selectedMode, resolvedMapKey);
  } else if (uiState.selectedMode === sandboxModes.training.key) {
    _resetPlayer?.({ silent: true });
    resetBotsForMode(sandboxModes.training.key);
    showRoundBanner("", "", false);
  } else if (uiState.selectedMode === sandboxModes.survival.key) {
    startSurvivalRun({ resetProgress: true });
  } else if (uiState.selectedMode === sandboxModes.teamDuel.key) {
    startTeamDuelRound({ resetScore: true });
  } else {
    startDuelRound({ resetScore: true });
  }

  if (uiState.selectedMode === sandboxModes.training.key) {
    dom.statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} started. Test ranges, hitboxes, and defensive timings.`;
  } else if (uiState.selectedMode === sandboxModes.survival.key) {
    dom.statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} loaded. Survive the gauntlet and scale through the waves.`;
  } else if (uiState.selectedMode === sandboxModes.teamDuel.key) {
    dom.statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} loaded. Hold the line with your ally and eliminate both hunters.`;
  } else {
    dom.statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} loaded. Read the round and contest space cleanly.`;
  }
  trainingToolState.editingBuild = false;
  updateTrainingBuildButton();
  window.__P0_GAME?.restartGameLoop?.();
}

function releaseLaunchActionLock() {
  launchActionLocked = false;
  dom.startSession?.classList.remove("is-locking");
}

function lockLaunchAction() {
  if (launchActionLocked) {
    return false;
  }

  launchActionLocked = true;
  dom.startSession?.classList.add("is-locking");
  return true;
}

export function handlePrematchAction(buttonId) {
  unlockAudio();

  if (buttonId === "mode-duel") {
    playUiCue("click");
    resetMatchmakingState();
    uiState.selectedMode = sandboxModes.duel.key;
    uiState.selectedMap = normalizeSelectedMap(sandboxModes.duel.key, uiState.selectedMap);
    getPrematchOrchestrator().enterMap();
    dom.statusLine.textContent = "1v1 Bot Duel selected.";
    _renderPrematch?.();
    return;
  }

  if (buttonId === "mode-survival") {
    playUiCue("click");
    resetMatchmakingState();
    uiState.selectedMode = sandboxModes.survival.key;
    uiState.selectedMap = normalizeSelectedMap(sandboxModes.survival.key, uiState.selectedMap);
    getPrematchOrchestrator().enterMap();
    dom.statusLine.textContent = "Survival Mode selected.";
    _renderPrematch?.();
    return;
  }

  if (buttonId === "mode-team-duel") {
    playUiCue("click");
    resetMatchmakingState();
    uiState.selectedMode = sandboxModes.teamDuel.key;
    uiState.selectedMap = normalizeSelectedMap(sandboxModes.teamDuel.key, uiState.selectedMap);
    getPrematchOrchestrator().enterMap();
    dom.statusLine.textContent = "2v2 Arena selected.";
    _renderPrematch?.();
    return;
  }

  if (buttonId === "mode-training") {
    playUiCue("click");
    resetMatchmakingState();
    uiState.selectedMode = sandboxModes.training.key;
    uiState.selectedMap = mapChoices.trainingExpanse.key;
    getPrematchOrchestrator().enterBuild();
    dom.statusLine.textContent = "Training Lab selected.";
    _renderPrematch?.();
    return;
  }

  if (buttonId === "mode-custom") {
    playUiCue("click");
    resetMatchmakingState();
    dom.statusLine.textContent = "Custom Game — Room Browser.";
    getPrematchOrchestrator().enterRoomBrowser();
    return;
  }

  if (buttonId === "back-to-modes") {
    playUiCue("click");
    window.__P0_SHELL?.setView("play");
    dom.statusLine.textContent = "Back to mode select.";
    return;
  }

  if (buttonId === "step-mode" || buttonId === "back-mode") {
    playUiCue("click");
    resetMatchmakingState();
    window.__P0_SHELL?.setView("play");
    dom.statusLine.textContent = "Back to mode select.";
    return;
  }

  if (buttonId === "step-map" || buttonId === "back-map") {
    playUiCue("click");
    if (buttonId === "back-map") {
      getPrematchOrchestrator().enterMap();
      dom.statusLine.textContent = "Map select open.";
      return;
    }
    getPrematchOrchestrator().enterMap();
    dom.statusLine.textContent = "Map select open.";
    return;
  }

  if (buttonId === "step-build" || buttonId === "continue-build") {
    playUiCue("click");
    releaseLaunchActionLock();
    trainingToolState.editingBuild = false;
    resetBuildWizard();
    getPrematchOrchestrator().enterBuild();
    dom.statusLine.textContent = "Configuration phase open. Pick your modules, then engage deployment.";
    return;
  }

  if (buttonId === "back-build") {
    playUiCue("click");
    getPrematchOrchestrator().enterBuild();
    dom.statusLine.textContent = "Back to build config.";
    return;
  }

  if (buttonId === "build-step-prev") {
    playUiCue("click");
    prevBuildWizardStep();
    _renderPrematch?.();
    return;
  }

  if (buttonId === "build-step-next") {
    const result = commitBuildStepSelection();
    playUiCue(result === "blocked" ? "cancel" : "confirm");
    if (result === "done") {
      dom.statusLine.textContent = "All slots locked. Deploy when ready.";
    } else if (result === "blocked") {
      dom.statusLine.textContent = "Preview an option, then lock it in before moving on.";
    } else if (result === "incomplete") {
      const missingSlot = getFirstIncompleteBuildSlot();
      if (missingSlot) {
        goToBuildWizardStep(missingSlot);
      }
      dom.statusLine.textContent = "Every slot must be locked before you can proceed.";
    }
    _renderPrematch?.();
    return;
  }

  if (buttonId === "start-session") {
    if (!lockLaunchAction()) {
      return;
    }
    playUiCue("confirm");
    try {
      launchSelectedSession();
    } finally {
      requestAnimationFrame(() => {
        releaseLaunchActionLock();
      });
    }
  }
}

window.handlePrematchAction = handlePrematchAction;

// Direct launch for Custom Room — bypasses the fake matchmaking queue.
// Switches to game view and starts the selected mode immediately.
window.launchCustomRoomMatch = async function launchCustomRoomMatch({ mode = "teamDuel" } = {}) {
  if (!window.__P0_SHELL) return;
  await window.__P0_SHELL.setView("game");

  const modeKey = sandboxModes[mode]?.key ?? sandboxModes.teamDuel.key;
  const resolvedMapKey = resolveMapKey(modeKey, mapChoices.randomMap.key, true);

  uiState.selectedMode = modeKey;
  uiState.selectedMap = resolvedMapKey;

  botBuildState.current = botBuildState.mode === "custom"
    ? ensureBotLoadoutFilled(botBuildState.custom)
    : createRandomBotLoadout();
  player.weapon = loadout.weapon;

  _closePrematch?.();
  switchSandboxMode(modeKey, resolvedMapKey);
  window.__P0_GAME?.restartGameLoop?.();
};

// Custom room navigation events from room components
window.addEventListener("p0-enter-custom-lobby", () => {
  getPrematchOrchestrator().enterCustomLobby();
});

window.addEventListener("p0-leave-custom-lobby", () => {
  getPrematchOrchestrator().enterRoomBrowser();
});

export function bindPrematchButton(button, actionId) {
  if (!button) {
    return;
  }

  if (button.dataset.codexBound === "true") {
    return;
  }
  button.dataset.codexBound = "true";
  button.addEventListener("click", (event) => {
    if (!uiState.prematchOpen) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    handlePrematchAction(actionId);
  });
  button.addEventListener("keydown", (event) => {
    if (!uiState.prematchOpen) {
      return;
    }
    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();
      event.stopPropagation();
      handlePrematchAction(actionId);
    }
  });
}
