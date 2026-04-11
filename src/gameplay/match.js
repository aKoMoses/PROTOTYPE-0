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
import { addXp } from "../progression.js";
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

const MATCHMAKING_QUEUE_SECONDS = 5;
const MATCHMAKING_QUEUE_HARD_TIMEOUT_SECONDS = 18;
const MATCH_FOUND_AUTO_ACCEPT_SECONDS = 8;
const BUILD_PHASE_SECONDS = 60;
const LOBBY_COUNTDOWN_SECONDS = 5;
const LOADING_SECONDS = 20;
const BOT_NAMES = ["N3XY0B0T", "N3XY0B07", "N3XY0B0-X", "N3XY0B0-OMEGA"];

function isMatchmakingMode(mode) {
  return mode === sandboxModes.duel.key || mode === sandboxModes.teamDuel.key;
}

function getBotLoadoutForRoster() {
  const generated = createRandomBotLoadout();
  const implants = Array.isArray(generated.implants)
    ? [...generated.implants]
    : (generated.implant ? [generated.implant] : []);
  return {
    weapon: generated.weapon,
    modules: [...(generated.modules ?? [])],
    implants,
    core: generated.core,
    avatar: Object.keys(content.avatars)[Math.floor(Math.random() * Object.keys(content.avatars).length)] ?? "drifter",
  };
}

function buildRosterEntry({ id, name, badge, isBot, ready, profileLoadout }) {
  return {
    id,
    name,
    badge,
    isBot,
    ready,
    loadout: {
      weapon: profileLoadout.weapon,
      modules: [...(profileLoadout.modules ?? [])],
      implants: [...(profileLoadout.implants ?? [])],
      core: profileLoadout.core,
      avatar: profileLoadout.avatar ?? "drifter",
    },
  };
}

function createMockRoster(mode) {
  const roster = [
    buildRosterEntry({
      id: "you",
      name: "YOU",
      badge: "Operator",
      isBot: false,
      ready: false,
      profileLoadout: loadout,
    }),
  ];

  const botCount = mode === sandboxModes.teamDuel.key ? 3 : 1;
  for (let index = 0; index < botCount; index += 1) {
    const botLoadout = getBotLoadoutForRoster();
    roster.push(
      buildRosterEntry({
        id: `bot-${index + 1}`,
        name: BOT_NAMES[index] ?? `N3XY0B0T-${index + 1}`,
        badge: mode === sandboxModes.teamDuel.key && index === 0 ? "ALLY BOT" : "BOT",
        isBot: true,
        ready: false,
        profileLoadout: botLoadout,
      }),
    );
  }

  return roster;
}

function resetMatchmakingState() {
  getPrematchOrchestrator().resetState();
  uiState.matchmaking.active = false;
  uiState.matchmaking.phase = "idle";
  uiState.matchmaking.queueRemaining = 0;
  uiState.matchmaking.queueSafetyRemaining = 0;
  uiState.matchmaking.buildRemaining = 0;
  uiState.matchmaking.lobbyRemaining = 0;
  uiState.matchmaking.loadingRemaining = 0;
  uiState.matchmaking.foundRemaining = 0;
  uiState.matchmaking.accepted = false;
  uiState.matchmaking.playerReady = false;
  uiState.matchmaking.mapKey = "electroGallery";
  uiState.matchmaking.roster = [];
}

function returnToModeSelectionFromQueueTimeout() {
  resetMatchmakingState();
  getPrematchOrchestrator().enterMode();
  dom.statusLine.textContent = "Matchmaking timeout. Returning to mode select.";
  _renderPrematch?.();
}

function startMatchmakingQueue(mode) {
  uiState.selectedMode = mode;
  uiState.selectedMap = mapChoices.randomMap.key;
  uiState.matchmaking.active = true;
  uiState.matchmaking.phase = "queue";
  uiState.matchmaking.queueRemaining = MATCHMAKING_QUEUE_SECONDS;
  uiState.matchmaking.queueSafetyRemaining = MATCHMAKING_QUEUE_HARD_TIMEOUT_SECONDS;
  uiState.matchmaking.buildRemaining = BUILD_PHASE_SECONDS;
  uiState.matchmaking.lobbyRemaining = LOBBY_COUNTDOWN_SECONDS;
  uiState.matchmaking.loadingRemaining = LOADING_SECONDS;
  uiState.matchmaking.foundRemaining = MATCH_FOUND_AUTO_ACCEPT_SECONDS;
  uiState.matchmaking.accepted = false;
  uiState.matchmaking.playerReady = false;
  uiState.matchmaking.mapKey = "";
  uiState.matchmaking.roster = createMockRoster(mode);
  getPrematchOrchestrator().enterQueue();
  dom.statusLine.textContent = mode === sandboxModes.teamDuel.key
    ? "2v2 queue started. Searching for squad lobby..."
    : "1v1 queue started. Searching for opponent...";
  _renderPrematch?.();
}

function acceptFoundMatch() {
  const resolvedMapKey = resolveMapKey(uiState.selectedMode, mapChoices.randomMap.key, true);
  uiState.matchmaking.accepted = true;
  uiState.matchmaking.phase = "build";
  uiState.matchmaking.buildRemaining = BUILD_PHASE_SECONDS;
  uiState.matchmaking.foundRemaining = 0;
  uiState.matchmaking.mapKey = resolvedMapKey;
  uiState.selectedMap = resolvedMapKey;
  trainingToolState.editingBuild = false;
  resetBuildWizard();
  getPrematchOrchestrator().enterBuild();
  dom.statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} assigned. Loadout + runes timer started.`;
  _renderPrematch?.();
}

function setWholeLobbyReady() {
  uiState.matchmaking.roster = uiState.matchmaking.roster.map((entry, index) => ({
    ...entry,
    ready: true,
  }));
}

function goToLobby(autoReady = false) {
  normalizeLoadoutSelections();
  if (!isBuildComplete()) {
    const missingSlot = getFirstIncompleteBuildSlot();
    if (missingSlot) {
      goToBuildWizardStep(missingSlot);
    }
  }

  uiState.matchmaking.playerReady = true;
  uiState.matchmaking.phase = "lobby";
  uiState.matchmaking.lobbyRemaining = LOBBY_COUNTDOWN_SECONDS;
  setWholeLobbyReady();
  getPrematchOrchestrator().enterLobby();
  dom.statusLine.textContent = autoReady
    ? "Component lock time expired. Auto-ready engaged, launching combat trial."
    : "Unit systems locked. Final diagnostics started.";
  _renderPrematch?.();
}

function startLoadingPhase() {
  uiState.matchmaking.phase = "loading";
  uiState.matchmaking.loadingRemaining = LOADING_SECONDS;
  getPrematchOrchestrator().enterLoading();
  const mapName = getMapLayout(uiState.selectedMode, uiState.matchmaking.mapKey).name;
  if (dom.loadingMapName) {
    dom.loadingMapName.textContent = `Loading ${mapName}`;
  }
  dom.statusLine.textContent = `${mapName} is loading. Reviewing every loadout...`;
  _renderPrematch?.();
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
        if (matchState.playerRounds > matchState.enemyRounds) {
          const progression = addXp(1, "duel-win");
          const levelText = progression.leveledUp
            ? ` Level ${progression.snapshot.level} reached.`
            : ` XP ${progression.snapshot.xp}.`;
          dom.statusLine.textContent = `Match won. +1 XP earned.${levelText}`;
        }
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
        if (matchState.playerRounds > matchState.enemyRounds) {
          const progression = addXp(1, "team-duel-win");
          const levelText = progression.leveledUp
            ? ` Level ${progression.snapshot.level} reached.`
            : ` XP ${progression.snapshot.xp}.`;
          dom.statusLine.textContent = `2v2 won. +1 XP earned.${levelText}`;
        }
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

export function updatePrematchFlow(dt) {
  const transition = getPrematchOrchestrator().update(dt);
  if (!transition) {
    return;
  }

  if (transition === "queue-timeout") {
    returnToModeSelectionFromQueueTimeout();
    return;
  }

  if (transition === "queue-found") {
    uiState.matchmaking.phase = "found";
    uiState.matchmaking.foundRemaining = MATCH_FOUND_AUTO_ACCEPT_SECONDS;
    getPrematchOrchestrator().enterFound();
    if (dom.gameFoundMapLabel) {
      dom.gameFoundMapLabel.textContent = "Random map will be assigned after ACCEPT.";
    }
    dom.statusLine.textContent = "GAME FOUND. Accept to continue or wait for auto-accept.";
    _renderPrematch?.();
    return;
  }

  if (transition === "found-auto-accept") {
    dom.statusLine.textContent = "Auto-accept engaged. Entering loadout phase.";
    acceptFoundMatch();
    return;
  }

  if (transition === "build-timeout") {
    goToLobby(true);
    return;
  }

  if (transition === "lobby-complete") {
    startLoadingPhase();
    return;
  }

  if (transition === "loading-complete") {
    const selectedMap = uiState.matchmaking.mapKey || resolveMapKey(uiState.selectedMode, mapChoices.randomMap.key, true);
    uiState.selectedMap = selectedMap;
    resetMatchmakingState();
    launchSelectedSession();
  }
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

export function handlePrematchAction(buttonId) {
  unlockAudio();

  if (buttonId === "mode-duel") {
    playUiCue("click");
    startMatchmakingQueue(sandboxModes.duel.key);
    return;
  }

  if (buttonId === "mode-survival") {
    playUiCue("click");
    resetMatchmakingState();
    uiState.selectedMode = sandboxModes.survival.key;
    uiState.selectedMap = normalizeSelectedMap(sandboxModes.survival.key, uiState.selectedMap);
    dom.statusLine.textContent = "Survival Mode selected.";
    _renderPrematch?.();
    return;
  }

  if (buttonId === "mode-team-duel") {
    playUiCue("click");
    startMatchmakingQueue(sandboxModes.teamDuel.key);
    return;
  }

  if (buttonId === "mode-training") {
    playUiCue("click");
    resetMatchmakingState();
    uiState.selectedMode = sandboxModes.training.key;
    uiState.selectedMap = mapChoices.trainingExpanse.key;
    dom.statusLine.textContent = "Training Lab selected.";
    _renderPrematch?.();
    return;
  }

  if (buttonId === "step-mode" || buttonId === "back-mode") {
    playUiCue("click");
    if (uiState.matchmaking.active) {
      resetMatchmakingState();
      _renderPrematch?.();
    }
    getPrematchOrchestrator().enterMode();
    dom.statusLine.textContent = "Mode select open.";
    return;
  }

  if (buttonId === "accept-match") {
    playUiCue("confirm");
    if (uiState.matchmaking.active && uiState.matchmaking.phase === "found") {
      acceptFoundMatch();
    }
    return;
  }

  if (buttonId === "step-map" || buttonId === "continue-map" || buttonId === "back-map") {
    playUiCue("click");
    if (isMatchmakingMode(uiState.selectedMode)) {
      if (buttonId === "back-map") {
        getPrematchOrchestrator().enterMode();
        dom.statusLine.textContent = "Mode select open.";
      } else {
        startMatchmakingQueue(uiState.selectedMode);
      }
      return;
    }
    getPrematchOrchestrator().enterMap();
    dom.statusLine.textContent = "Map select open.";
    return;
  }

  if (buttonId === "step-build" || buttonId === "continue-build") {
    playUiCue("click");
    trainingToolState.editingBuild = false;
    resetBuildWizard();
    if (isMatchmakingMode(uiState.selectedMode) && uiState.matchmaking.active && uiState.matchmaking.accepted) {
      uiState.matchmaking.phase = "build";
    }
    getPrematchOrchestrator().enterBuild();
    dom.statusLine.textContent = "Configuration phase open. Pick your modules, then engage deployment.";
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
      getPrematchOrchestrator().enterBuild();
      _renderPrematch?.();
      dom.statusLine.textContent = "Complete and lock every slot before opening runes.";
      return;
    }
    getPrematchOrchestrator().enterRunes();
    _renderPrematch?.();
    dom.statusLine.textContent = "Neural augmentation station. Allocate core points across the industrial tree.";
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
    if (result === "runes") {
      getPrematchOrchestrator().enterRunes();
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
    if (
      uiState.matchmaking.active &&
      uiState.matchmaking.accepted &&
      (uiState.prematchStep === "build" || uiState.prematchStep === "runes")
    ) {
      goToLobby(false);
      return;
    }
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
