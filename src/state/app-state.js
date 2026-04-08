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
  abilities: ["shockJavelin", "magneticField", "energyShield"],
  perks: ["scavengerPlates"],
  ultimate: "phantomSplit",
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
};

export const botBuildState = {
  mode: "random",
  custom: {
    weapon: weapons.pulse.key,
    abilities: ["shockJavelin", "magneticField", "energyShield"],
    perk: "reactiveArmor",
    ultimate: "revivalProtocol",
    runes: createInitialRuneAllocation(),
    presetKey: null,
  },
  current: {
    weapon: weapons.pulse.key,
    abilities: ["shockJavelin", "magneticField", "energyShield"],
    perk: "reactiveArmor",
    ultimate: "revivalProtocol",
    runes: createInitialRuneAllocation(),
    presetKey: null,
  },
};

export const trainingToolState = {
  botsFire: false,
  editingBuild: false,
};