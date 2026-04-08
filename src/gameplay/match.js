// Duel match flow, round management, session launch
import { config, sandboxModes } from "../config.js";
import { player, enemy, trainingBots, abilityState, sandbox, matchState, mapState } from "../state.js";
import { loadout, uiState, botBuildState, trainingToolState } from "../state/app-state.js";
import { getMapLayout, resetMapState, buildMapState, mapChoices, normalizeSelectedMap, resolveMapKey } from "../maps.js";
import { getAllBots, isCombatLive, clearCombatArtifacts, getPlayerSpawn, resetBotsForMode, refreshHunterLoadout } from "./combat.js";
import { addImpact, addShake } from "./effects.js";
import { normalizeLoadoutSelections, ensureBotLoadoutFilled, createRandomBotLoadout } from "../build/loadout.js";
import { setPrematchStep, resetBuildWizard, prevBuildWizardStep, commitBuildStepSelection, commitActivePreviewSelection, updateTrainingBuildButton, isBuildComplete, getFirstIncompleteBuildSlot, goToBuildWizardStep } from "../build/ui.js";
import { startSurvivalRun } from "./survival.js";
import * as dom from "../dom.js";
import { playUiCue, unlockAudio } from "../audio.js";
export { relaunchCurrentSession } from "../build/ui.js";

// Forward declarations - these will be set by the modules that define them
let _resetPlayer = null;
let _openPrematch = null;
let _closePrematch = null;
let _renderPrematch = null;

export function bindMatchDeps({ resetPlayer, openPrematch, closePrematch, renderPrematch }) {
  _resetPlayer = resetPlayer;
  _openPrematch = openPrematch;
  _closePrematch = closePrematch;
  _renderPrematch = renderPrematch;
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

export function updateDuelMatch(dt) {
  if (sandbox.mode !== sandboxModes.duel.key) {
    showRoundBanner("", "", false);
    return;
  }

  if (matchState.phase === "active") {
    showRoundBanner("", "", false);
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
        matchState.phase = "match_end";
        matchState.timer = 2.2;
        showRoundBanner(
          "Match Point",
          matchState.playerRounds > matchState.enemyRounds ? "Victory" : "Defeat",
          true,
        );
        dom.statusLine.textContent =
          matchState.playerRounds > matchState.enemyRounds
            ? "Match won. Duel sequence resetting."
            : "Match lost. Duel sequence resetting.";
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
  } else {
    startDuelRound({ resetScore: true });
  }

  if (uiState.selectedMode === sandboxModes.training.key) {
    dom.statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} started. Test ranges, hitboxes, and defensive timings.`;
  } else if (uiState.selectedMode === sandboxModes.survival.key) {
    dom.statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} loaded. Survive the gauntlet and scale through the waves.`;
  } else {
    dom.statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} loaded. Read the round and contest space cleanly.`;
  }
  trainingToolState.editingBuild = false;
  updateTrainingBuildButton();
}


export function handlePrematchAction(buttonId) {
  unlockAudio();

  if (buttonId === "mode-duel") {
    playUiCue("click");
    uiState.selectedMode = sandboxModes.duel.key;
    uiState.selectedMap = normalizeSelectedMap(sandboxModes.duel.key, uiState.selectedMap);
    dom.statusLine.textContent = "Arena (1v1) selected.";
    _renderPrematch?.();
    return;
  }

  if (buttonId === "mode-survival") {
    playUiCue("click");
    uiState.selectedMode = sandboxModes.survival.key;
    uiState.selectedMap = normalizeSelectedMap(sandboxModes.survival.key, uiState.selectedMap);
    dom.statusLine.textContent = "Survival Mode selected.";
    _renderPrematch?.();
    return;
  }

  if (buttonId === "mode-training") {
    playUiCue("click");
    uiState.selectedMode = sandboxModes.training.key;
    uiState.selectedMap = mapChoices.trainingGround.key;
    dom.statusLine.textContent = "Training Lab selected.";
    _renderPrematch?.();
    return;
  }

  if (buttonId === "step-mode" || buttonId === "back-mode") {
    playUiCue("click");
    setPrematchStep("mode");
    dom.statusLine.textContent = "Mode select open.";
    return;
  }

  if (buttonId === "step-map" || buttonId === "continue-map" || buttonId === "back-map") {
    playUiCue("click");
    setPrematchStep("map");
    dom.statusLine.textContent = "Map select open.";
    return;
  }

  if (buttonId === "step-build" || buttonId === "continue-build") {
    playUiCue("click");
    trainingToolState.editingBuild = false;
    resetBuildWizard();
    setPrematchStep("build");
    dom.statusLine.textContent = "Build phase open. Lock the loadout, then press Ready.";
    return;
  }

  if (buttonId === "continue-runes") {
    playUiCue("confirm");
    commitActivePreviewSelection();
    if (!isBuildComplete()) {
      const missingSlot = getFirstIncompleteBuildSlot();
      if (missingSlot) {
        goToBuildWizardStep(missingSlot);
      }
      setPrematchStep("build");
      _renderPrematch?.();
      dom.statusLine.textContent = "Complete and lock every slot before opening runes.";
      return;
    }
    setPrematchStep("runes");
    _renderPrematch?.();
    dom.statusLine.textContent = "Neural augmentation station. Allocate core points across the talent tree.";
    return;
  }

  if (buttonId === "back-build") {
    playUiCue("click");
    setPrematchStep("build");
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
    if (result === "runes") {
      setPrematchStep("runes");
      dom.statusLine.textContent = "Rune pass open. Lock your main shard and final stat line.";
    } else if (result === "blocked") {
      dom.statusLine.textContent = "Preview an option, then lock it in before moving on.";
    } else if (result === "incomplete") {
      const missingSlot = getFirstIncompleteBuildSlot();
      if (missingSlot) {
        goToBuildWizardStep(missingSlot);
      }
      dom.statusLine.textContent = "Every slot must be locked before you can move to runes.";
    }
    _renderPrematch?.();
    return;
  }

  if (buttonId === "start-session") {
    playUiCue("confirm");
    launchSelectedSession();
  }
}

window.handlePrematchAction = handlePrematchAction;

export function bindPrematchButton(button, actionId) {
  if (!button) {
    return;
  }

  if (button.dataset.codexBound === "true") {
    return;
  }
  button.dataset.codexBound = "true";
  if (!button.getAttribute("onclick")) {
    button.addEventListener("click", (event) => {
      if (!uiState.prematchOpen) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      handlePrematchAction(actionId);
    });
  }
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

