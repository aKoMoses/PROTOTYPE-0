import { sandboxModes } from "../config.js";
import { weapons } from "../content.js";

export const loadout = {
  weapon: weapons.pulse.key,
  modules: ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector"],
  implants: ["scavengerPlates"],
  core: "phantomCore",
  avatar: "drifter",
  weaponSkin: "stock",
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
  selectedLoadoutId: null,
};

export const botBuildState = {
  mode: "random",
  custom: {
    weapon: weapons.pulse.key,
    modules: ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector"],
    implants: "reactiveArmor",
    core: "rebootProtocol",
    presetKey: null,
  },
  current: {
    weapon: weapons.pulse.key,
    modules: ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector"],
    implants: "reactiveArmor",
    core: "rebootProtocol",
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
