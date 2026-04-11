import { sandboxModes } from "../config.js";
import { weapons, content } from "../content.js";

export function createInitialRuneAllocation() {
  const allocation = {};
  for (const tree of Object.values(content.runeTrees)) {
    allocation[tree.key] = { secondary: 0, primary: 0, ultimate: 0 };
  }
  return allocation;
}

export const loadout = {
  weapon: weapons.pulse.key,
  modules: ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector"],
  implants: ["scavengerPlates"],
  core: "phantomCore",
  avatar: "drifter",
  weaponSkin: "stock",
  runes: createInitialRuneAllocation(),
};

export const uiState = {
  prematchOpen: true,
  prematchStep: "mode",
  selectedMode: sandboxModes.duel.key,
  selectedMap: "electroGallery",
  buildCategory: "weapon",
  buildWizardStep: 0,
  selectedLoadoutSlot: "weapon",
  selectedDetail: { type: "weapon", key: weapons.pulse.key },
  previewSelection: null,
  selectedRuneDetail: { treeKey: "attack", nodeKey: "ultimate" },
  matchmaking: {
    active: false,
    phase: "idle",
    queueRemaining: 0,
    queueSafetyRemaining: 0,
    buildRemaining: 0,
    lobbyRemaining: 0,
    loadingRemaining: 0,
    foundRemaining: 0,
    accepted: false,
    playerReady: false,
    mapKey: "electroGallery",
    roster: [],
  },
};

export const botBuildState = {
  mode: "random",
  custom: {
    weapon: weapons.pulse.key,
    modules: ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector"],
    implants: "reactiveArmor",
    core: "rebootProtocol",
    runes: createInitialRuneAllocation(),
    presetKey: null,
  },
  current: {
    weapon: weapons.pulse.key,
    modules: ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector"],
    implants: "reactiveArmor",
    core: "rebootProtocol",
    runes: createInitialRuneAllocation(),
    presetKey: null,
  },
};

export const matchSettings = {
  format: "bo3",
  timer: 60,
  suddenDeath: true,
  mirror: false,
};

export const trainingToolState = {
  botsFire: false,
  editingBuild: false,
  botOverrides: {},
  trainingConfig: {
    selectedBotId: null,
    isSelecting: false,
  },
};
