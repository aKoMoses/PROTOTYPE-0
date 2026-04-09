import { weapons } from "../content.js";
import { createInitialRuneAllocation } from "../state/app-state.js";

export function createPresetRunes(overrides = {}) {
  const runes = createInitialRuneAllocation();
  for (const [treeKey, values] of Object.entries(overrides)) {
    if (!runes[treeKey]) {
      continue;
    }
    runes[treeKey].secondary = values.secondary ?? 0;
    runes[treeKey].primary = values.primary ?? 0;
    runes[treeKey].ultimate = values.ultimate ?? 0;
  }
  return runes;
}

export const playerStarterPresets = [
  {
    key: "stalker-rig",
    name: "Stalker Rig",
    role: "Easy pressure / stable punish",
    description: "Pulse pressure with clean anti-burst tools and a forgiving clutch line.",
    loadout: {
      weapon: weapons.pulse.key,
      abilities: ["shockJavelin", "magneticField", "phaseShift"],
      perks: ["reactiveArmor"],
      ultimate: "phantomSplit",
      runes: createPresetRunes({
        attack: { secondary: 2, primary: 0, ultimate: 0 },
        defense: { secondary: 5, primary: 3, ultimate: 1 },
        spells: { secondary: 5, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "breach-kit",
    name: "Breach Kit",
    role: "Simple engage / close punish",
    description: "Shotgun plus catch tools for players who want obvious punish windows and strong confirms.",
    loadout: {
      weapon: weapons.shotgun.key,
      abilities: ["magneticGrapple", "shockJavelin", "energyShield"],
      perks: ["executionRelay"],
      ultimate: "phantomSplit",
      runes: createPresetRunes({
        attack: { secondary: 5, primary: 3, ultimate: 1 },
        defense: { secondary: 2, primary: 0, ultimate: 0 },
        support: { secondary: 5, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "long-sight",
    name: "Long Sight",
    role: "Spacing / charged punish",
    description: "Rail Sniper setup with clean self-peel and a strong lane-control identity.",
    loadout: {
      weapon: weapons.sniper.key,
      abilities: ["shockJavelin", "gravityWell", "phaseShift"],
      perks: ["dashCooling"],
      ultimate: "phantomSplit",
      runes: createPresetRunes({
        attack: { secondary: 5, primary: 0, ultimate: 0 },
        spells: { secondary: 5, primary: 3, ultimate: 1 },
        support: { secondary: 2, primary: 0, ultimate: 0 },
      }),
    },
  },
];

export function getStarterPresetTags(presetKey) {
  switch (presetKey) {
    case "stalker-rig":
      return ["aggro", "support"];
    case "breach-kit":
      return ["burst", "tank"];
    case "long-sight":
      return ["poke", "control"];
    default:
      return [];
  }
}