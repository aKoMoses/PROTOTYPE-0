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
export const hudMenuButton = document.getElementById("hud-menu-button");
export const hudRematchButton = document.getElementById("hud-rematch-button");
export const moveJoystick = document.getElementById("move-joystick");
export const moveStick = document.getElementById("move-stick");
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
export const prematchOverlay = document.getElementById("prematch-overlay");
export const prematchShell = document.querySelector(".prematch-shell");
export const modeScreen = document.getElementById("mode-screen");
export const mapScreen = document.getElementById("map-screen");
export const buildScreen = document.getElementById("build-screen");
export const queueScreen = document.getElementById("queue-screen");
export const gameFoundScreen = document.getElementById("game-found-screen");
export const lobbyScreen = document.getElementById("lobby-screen");
export const loadingScreen = document.getElementById("loading-screen");
export const stepMode = document.getElementById("step-mode");
export const stepMap = document.getElementById("step-map");
export const stepBuild = document.getElementById("step-build");
export const modeDuel = document.getElementById("mode-duel");
export const modeSurvival = document.getElementById("mode-survival");
export const modeTeamDuel = document.getElementById("mode-team-duel");
export const modeTraining = document.getElementById("mode-training");
export const mapGrid = document.getElementById("map-grid");
export const continueMap = document.getElementById("continue-map");
export const continueBuild = document.getElementById("continue-build");
export const backMode = document.getElementById("back-mode");
export const backMap = document.getElementById("back-map");
export const startSession = document.getElementById("start-session");
export const prematchDescription = document.getElementById("prematch-description");
export const selectedModeLabel = document.getElementById("selected-mode-label");
export const selectedMapLabel = document.getElementById("selected-map-label");
export const selectedWeaponLabel = document.getElementById("selected-weapon-label");
export const runePointsLabel = document.getElementById("rune-points-label");
export const runePointsInline = document.getElementById("rune-points-inline");
export const runeUltimateInline = document.getElementById("rune-ultimate-inline");
export const avatarOptions = document.getElementById("avatar-options");
export const weaponSkinOptions = document.getElementById("weapon-skin-options");
export const runeGrid = document.getElementById("rune-grid");
export const buildLibraryGrid = document.getElementById("build-library-grid");
export const detailIcon = document.getElementById("detail-icon");
export const detailName = document.getElementById("detail-name");
export const detailMeta = document.getElementById("detail-meta");
export const detailDescription = document.getElementById("detail-description");
export const detailValues = document.getElementById("detail-values");
export const detailFloat = document.getElementById("detail-float");
export const detailActions = document.getElementById("detail-actions");
export const detailSecondaryButton = document.getElementById("detail-secondary-button");
export const detailLockButton = document.getElementById("detail-lock-button");
export const powerOffense = document.getElementById("power-offense");
export const powerDefense = document.getElementById("power-defense");
export const powerUtility = document.getElementById("power-utility");
export const powerControl = document.getElementById("power-control");
export const cosmeticPreviewName = document.getElementById("cosmetic-preview-name");
export const cosmeticAvatarPreview = document.getElementById("cosmetic-avatar-preview");
export const cosmeticWeaponIcon = document.getElementById("cosmetic-weapon-icon");
export const cosmeticWeaponName = document.getElementById("cosmetic-weapon-name");
export const cosmeticWeaponCopy = document.getElementById("cosmetic-weapon-copy");
export const botConfigCard = document.getElementById("bot-config-card");
export const botConfigLabel = document.getElementById("bot-config-label");
export const botConfigTitle = document.getElementById("bot-config-title");
export const botConfigCopy = document.getElementById("bot-config-copy");
export const botConfigDuel = document.getElementById("bot-config-duel");
export const botConfigTraining = document.getElementById("bot-config-training");
export const botModeRandom = document.getElementById("bot-mode-random");
export const botModeCustom = document.getElementById("bot-mode-custom");
export const botDifficultyEasy = document.getElementById("bot-difficulty-easy");
export const botDifficultyNormal = document.getElementById("bot-difficulty-normal");
export const botDifficultyHard = document.getElementById("bot-difficulty-hard");
export const botDifficultyNightmare = document.getElementById("bot-difficulty-nightmare");
export const matchRulesCard = document.getElementById("match-rules-card");
export const ruleFormatBo3 = document.getElementById("rule-format-bo3");
export const ruleFormatBo5 = document.getElementById("rule-format-bo5");
export const ruleTimerOff = document.getElementById("rule-timer-off");
export const ruleTimer60 = document.getElementById("rule-timer-60");
export const ruleTimer75 = document.getElementById("rule-timer-75");
export const ruleSuddendeathOff = document.getElementById("rule-suddendeath-off");
export const ruleSuddendeathOn = document.getElementById("rule-suddendeath-on");
export const ruleMirrorOff = document.getElementById("rule-mirror-off");
export const ruleMirrorOn = document.getElementById("rule-mirror-on");
export const botWeaponGrid = document.getElementById("bot-weapon-grid");
export const botModuleGrid = document.getElementById("bot-module-grid");
export const botAbilityGrid = botModuleGrid;
export const botBuildSummary = document.getElementById("bot-build-summary");
export const botPresetGrid = document.getElementById("bot-preset-grid");
export const playerPresetGrid = document.getElementById("player-preset-grid");
export const trainingFireOff = document.getElementById("training-fire-off");
export const trainingFireOn = document.getElementById("training-fire-on");
export const trainingBuildSummary = document.getElementById("training-build-summary");
export const runeScreen = document.getElementById("rune-screen");
export const continueRunes = document.getElementById("continue-runes");
export const backBuild = document.getElementById("back-build");
export const runeResetButton = document.getElementById("rune-reset-btn");
export const runeNodeDetail = document.getElementById("rune-node-detail");
export const trainingBuildButton = document.getElementById("training-build-button");
export const queueTimer = document.getElementById("queue-timer");
export const foundTimer = document.getElementById("found-timer");
export const gameFoundMapLabel = document.getElementById("game-found-map-label");
export const acceptMatchButton = document.getElementById("accept-match");
export const buildPhaseTimer = document.getElementById("build-phase-timer");
export const runePhaseTimer = document.getElementById("rune-phase-timer");
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

