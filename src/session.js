import { sandboxModes } from "./config.js";
import { sandbox } from "./state.js";
import { loadout, uiState, botBuildState, trainingToolState, createInitialRuneAllocation } from "./state/app-state.js";
import { normalizeSelectedMap, resolveMapKey } from "./maps.js";
import { normalizeLoadoutSelections, ensureBotLoadoutFilled, createRandomBotLoadout } from "./build/loadout.js";

export const GAME_SESSION_STORAGE_KEY = "prototype0.game-session";
export const SHELL_VIEW_STORAGE_KEY = "prototype0.shell-view";

function canUseSessionStorage() {
  try {
    return typeof window !== "undefined" && !!window.sessionStorage;
  } catch {
    return false;
  }
}

function cloneRuneAllocation(source = null) {
  const next = createInitialRuneAllocation();
  if (!source || typeof source !== "object") {
    return next;
  }

  for (const [treeKey, values] of Object.entries(next)) {
    const sourceTree = source[treeKey] ?? {};
    values.secondary = Math.max(0, Number(sourceTree.secondary ?? 0));
    values.primary = Math.max(0, Number(sourceTree.primary ?? 0));
    values.ultimate = Math.max(0, Number(sourceTree.ultimate ?? 0));
  }

  return next;
}

function clonePlayerLoadout(source = loadout) {
  return {
    weapon: source.weapon ?? null,
    abilities: Array.isArray(source.abilities) ? [...source.abilities] : [],
    perks: Array.isArray(source.perks) ? [...source.perks] : [],
    ultimate: source.ultimate ?? null,
    avatar: source.avatar ?? "drifter",
    weaponSkin: source.weaponSkin ?? "stock",
    runes: cloneRuneAllocation(source.runes),
  };
}

function cloneBotLoadout(source = null) {
  const safeSource = source ?? {};
  return {
    weapon: safeSource.weapon ?? null,
    abilities: Array.isArray(safeSource.abilities) ? [...safeSource.abilities] : [],
    perk: safeSource.perk ?? null,
    ultimate: safeSource.ultimate ?? null,
    presetKey: safeSource.presetKey ?? null,
    name: safeSource.name ?? null,
    role: safeSource.role ?? null,
    description: safeSource.description ?? null,
    runes: cloneRuneAllocation(safeSource.runes),
  };
}

function applyPlayerLoadout(source) {
  if (!source || typeof source !== "object") {
    normalizeLoadoutSelections({ preserveEmptySlots: false });
    return;
  }

  loadout.weapon = source.weapon ?? loadout.weapon;
  loadout.abilities = Array.isArray(source.abilities) ? [...source.abilities] : [...loadout.abilities];
  loadout.perks = Array.isArray(source.perks) ? [...source.perks] : [...loadout.perks];
  loadout.ultimate = source.ultimate ?? loadout.ultimate;
  loadout.avatar = source.avatar ?? loadout.avatar;
  loadout.weaponSkin = source.weaponSkin ?? loadout.weaponSkin;
  loadout.runes = cloneRuneAllocation(source.runes);
  normalizeLoadoutSelections({ preserveEmptySlots: true });
}

function createSafeBotLoadout(source, fallback = null) {
  if (source && typeof source === "object") {
    return ensureBotLoadoutFilled(cloneBotLoadout(source));
  }
  if (fallback) {
    return ensureBotLoadoutFilled(cloneBotLoadout(fallback));
  }
  return createRandomBotLoadout();
}

export function clearGameSession() {
  if (!canUseSessionStorage()) {
    return;
  }
  try {
    window.sessionStorage.removeItem(GAME_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}

export function saveSessionSnapshot() {
  if (!canUseSessionStorage()) {
    return null;
  }

  const snapshot = {
    version: 1,
    savedAt: Date.now(),
    resumeGameplay: !uiState.prematchOpen,
    sandbox: {
      mode: sandbox.mode,
      mapKey: sandbox.mapKey,
    },
    ui: {
      prematchOpen: uiState.prematchOpen,
      prematchStep: uiState.prematchStep,
      selectedMode: uiState.selectedMode,
      selectedMap: uiState.selectedMap,
      buildCategory: uiState.buildCategory,
      buildWizardStep: uiState.buildWizardStep,
      selectedLoadoutSlot: uiState.selectedLoadoutSlot,
      selectedRuneDetail: uiState.selectedRuneDetail,
    },
    loadout: clonePlayerLoadout(loadout),
    botBuild: {
      mode: botBuildState.mode,
      custom: cloneBotLoadout(botBuildState.custom),
      current: cloneBotLoadout(botBuildState.current),
    },
    trainingTool: {
      botsFire: Boolean(trainingToolState.botsFire),
      editingBuild: Boolean(trainingToolState.editingBuild),
    },
  };

  try {
    window.sessionStorage.setItem(GAME_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    return null;
  }

  return snapshot;
}

export function readSessionSnapshot() {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(GAME_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function restoreSessionSnapshot() {
  const snapshot = readSessionSnapshot();
  if (!snapshot) {
    return null;
  }

  const selectedMode = sandboxModes[snapshot.ui?.selectedMode] ? snapshot.ui.selectedMode : sandboxModes.duel.key;
  const selectedMap = normalizeSelectedMap(selectedMode, snapshot.ui?.selectedMap);
  const activeMapKey = resolveMapKey(
    selectedMode,
    snapshot.sandbox?.mapKey ?? selectedMap,
    false,
  );

  applyPlayerLoadout(snapshot.loadout);

  uiState.selectedMode = selectedMode;
  uiState.selectedMap = snapshot.resumeGameplay ? activeMapKey : selectedMap;
  uiState.prematchOpen = Boolean(snapshot.ui?.prematchOpen);
  uiState.prematchStep = snapshot.ui?.prematchStep ?? "mode";
  uiState.buildCategory = snapshot.ui?.buildCategory ?? "weapon";
  uiState.buildWizardStep = Math.max(0, Number(snapshot.ui?.buildWizardStep ?? 0));
  uiState.selectedLoadoutSlot = snapshot.ui?.selectedLoadoutSlot ?? "weapon";
  uiState.selectedDetail = { type: "weapon", key: loadout.weapon };
  uiState.previewSelection = null;
  uiState.selectedRuneDetail = snapshot.ui?.selectedRuneDetail ?? { treeKey: "attack", nodeKey: "ultimate" };

  botBuildState.mode = snapshot.botBuild?.mode === "custom" ? "custom" : "random";
  botBuildState.custom = createSafeBotLoadout(snapshot.botBuild?.custom, botBuildState.custom);
  botBuildState.current = botBuildState.mode === "custom"
    ? createSafeBotLoadout(botBuildState.custom, botBuildState.custom)
    : createSafeBotLoadout(snapshot.botBuild?.current, botBuildState.custom);

  trainingToolState.botsFire = Boolean(snapshot.trainingTool?.botsFire);
  trainingToolState.editingBuild = Boolean(snapshot.trainingTool?.editingBuild);

  sandbox.mode = selectedMode;
  sandbox.mapKey = activeMapKey;

  return snapshot;
}

export function installSessionPersistence() {
  if (typeof window === "undefined") {
    return () => {};
  }

  const persist = () => {
    saveSessionSnapshot();
  };

  window.__prototype0SaveSession = persist;
  window.addEventListener("pagehide", persist);
  window.addEventListener("beforeunload", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      persist();
    }
  });

  return persist;
}
