// DOM element references
export const canvas = document.getElementById("game");
export const ctx = canvas.getContext("2d");
export const gameShell = document.querySelector(".game-shell");

if (!canvas || !ctx) {
  throw new Error("Canvas initialization failed.");
}


export const weaponStatus = document.getElementById("weapon-status");
export const weaponRole = document.getElementById("weapon-role");
export const weaponName = document.getElementById("weapon-name");
export const weaponIcon = document.getElementById("weapon-icon");
export const mapName = document.getElementById("map-name");
export const mapStatus = document.getElementById("map-status");
export const helpToggle = document.getElementById("help-toggle");
export const helpPanel = document.getElementById("help-panel");
export const roundLabel = document.getElementById("round-label");
export const matchScore = document.getElementById("match-score");
export const matchFormat = document.getElementById("match-format");
export const roundBanner = document.getElementById("round-banner");
export const roundBannerLabel = document.getElementById("round-banner-label");
export const roundBannerTitle = document.getElementById("round-banner-title");
export const statusLine = document.getElementById("status-line");
export const weaponMeter = document.getElementById("weapon-meter");
export const playerHealthFill = document.getElementById("player-health-fill");
export const enemyHealthFill = document.getElementById("enemy-health-fill");
export const playerHealthText = document.getElementById("player-health-text");
export const enemyHealthText = document.getElementById("enemy-health-text");
export const playerBuildTag = document.getElementById("player-build-tag");
export const menuButton = document.getElementById("menu-button");
export const rematchButton = document.getElementById("rematch-button");
export const audioPanel = document.getElementById("audio-panel");
export const audioMuteButton = document.getElementById("audio-mute-button");
export const audioMusicVolume = document.getElementById("audio-music-volume");
export const audioSfxVolume = document.getElementById("audio-sfx-volume");
export const audioAmbienceVolume = document.getElementById("audio-ambience-volume");
export const moveJoystick = document.getElementById("move-joystick");
export const moveStick = document.getElementById("move-stick");
export const aimJoystick = document.getElementById("aim-joystick");
export const aimStick = document.getElementById("aim-stick");
export const slotDash = document.getElementById("slot-dash");
export const slotDashIcon = slotDash.querySelector(".module-slot__icon");
export const slotDashName = slotDash.querySelector(".module-slot__name");
export const slotDashOverlay = document.getElementById("slot-dash-overlay");
export const slotDashTimer = document.getElementById("slot-dash-timer");
export const slotModule1 = document.getElementById("slot-module-1");
export const slotModule1Icon = slotModule1.querySelector(".module-slot__icon");
export const slotModule1Name = slotModule1.querySelector(".module-slot__name");
export const slotModule1Overlay = document.getElementById("slot-module-1-overlay");
export const slotModule1Timer = document.getElementById("slot-module-1-timer");
export const slotModule2 = document.getElementById("slot-module-2");
export const slotModule2Icon = slotModule2.querySelector(".module-slot__icon");
export const slotModule2Name = slotModule2.querySelector(".module-slot__name");
export const slotModule2Overlay = document.getElementById("slot-module-2-overlay");
export const slotModule2Timer = document.getElementById("slot-module-2-timer");
export const slotModule3 = document.getElementById("slot-module-3");
export const slotModule3Icon = slotModule3.querySelector(".module-slot__icon");
export const slotModule3Name = slotModule3.querySelector(".module-slot__name");
export const slotModule3Overlay = document.getElementById("slot-module-3-overlay");
export const slotModule3Timer = document.getElementById("slot-module-3-timer");
export const coreSlot = document.getElementById("slot-core");
export const coreSlotIcon = coreSlot.querySelector(".module-slot__icon");
export const coreSlotName = coreSlot.querySelector(".module-slot__name");
export const coreSlotOverlay = document.getElementById("slot-core-overlay");
export const coreSlotTimer = document.getElementById("slot-core-timer");
export const slotAbility1 = slotModule1;
export const slotAbility1Icon = slotModule1Icon;
export const slotAbility1Name = slotModule1Name;
export const slotAbility1Overlay = slotModule1Overlay;
export const slotAbility1Timer = slotModule1Timer;
export const slotAbility2 = slotModule2;
export const slotAbility2Icon = slotModule2Icon;
export const slotAbility2Name = slotModule2Name;
export const slotAbility2Overlay = slotModule2Overlay;
export const slotAbility2Timer = slotModule2Timer;
export const slotAbility3 = slotModule3;
export const slotAbility3Icon = slotModule3Icon;
export const slotAbility3Name = slotModule3Name;
export const slotAbility3Overlay = slotModule3Overlay;
export const slotAbility3Timer = slotModule3Timer;
export const ultimateSlot = coreSlot;
export const ultimateSlotIcon = coreSlotIcon;
export const ultimateSlotName = coreSlotName;
export const ultimateSlotOverlay = coreSlotOverlay;
export const ultimateSlotTimer = coreSlotTimer;
export const prematchOverlay = document.getElementById("prematch-overlay");
export const prematchShell = document.querySelector(".prematch-shell");
export const modeScreen = document.getElementById("mode-screen");
export const mapScreen = document.getElementById("map-screen");
export const buildScreen = document.getElementById("build-screen");
export const queueScreen = document.getElementById("queue-screen");
export const gameFoundScreen = document.getElementById("game-found-screen");
export const lobbyScreen = document.getElementById("lobby-screen");
export const loadingScreen = document.getElementById("loading-screen");
export const roomBrowserScreen = document.getElementById("room-browser-screen");
export const customLobbyScreen = document.getElementById("custom-lobby-screen");
export const stepMode = document.getElementById("step-mode");
export const stepMap = document.getElementById("step-map");
export const stepBuild = document.getElementById("step-build");
export const modeDuel = document.getElementById("mode-duel");
export const modeSurvival = document.getElementById("mode-survival");
export const modeTeamDuel = document.getElementById("mode-team-duel");
export const modeTraining = document.getElementById("mode-training");
export const modeCustom = document.getElementById("mode-custom");
export const mapGrid = document.getElementById("map-grid");
export const continueMap = document.getElementById("continue-map");
export const continueBuild = document.getElementById("continue-build");
export const backMode = document.getElementById("back-mode");
export const backMap = document.getElementById("back-map");
export const startSession = document.getElementById("start-session");
export const buildLibraryGrid = document.getElementById("build-library-grid");
export const trainingBuildButton = document.getElementById("training-build-button");
export const queueTimer = document.getElementById("queue-timer");
export const foundTimer = document.getElementById("found-timer");
export const gameFoundMapLabel = document.getElementById("game-found-map-label");
export const acceptMatchButton = document.getElementById("accept-match");
export const buildPhaseTimer = document.getElementById("build-phase-timer");
export const lobbyTimer = document.getElementById("lobby-timer");
export const loadingTimer = document.getElementById("loading-timer");
export const lobbyRoster = document.getElementById("lobby-roster");
export const loadingRoster = document.getElementById("loading-roster");
export const loadingMapName = document.getElementById("loading-map-name");
export const queueCard = document.getElementById("queue-card");
export const gameFoundCard = document.getElementById("game-found-card");
export const lobbyCard = document.getElementById("lobby-card");
export const loadingCard = document.getElementById("loading-card");
export const matchmakingDom = {
  queueScreen,
  gameFoundScreen,
  lobbyScreen,
  loadingScreen,
  queueTimer,
  foundTimer,
  gameFoundMapLabel,
  lobbyTimer,
  loadingTimer,
  lobbyRoster,
  loadingRoster,
  queueCard,
  gameFoundCard,
  lobbyCard,
  loadingCard,
};

