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

export const newSystemStarterTemplates = [
  {
    key: "v2-arc-ranger",
    unlockLevel: 1,
    name: "Arc Ranger",
    role: "Poke / tempo",
    description: "High-frequency pulse module configuration for safe lane control and reliable confirms.",
    tags: ["starter-v2", "poke", "control"],
    build: {
      weapon: "pulse",
      modules: ["boltLinkJavelin", "orbitalDistorter", "ghostDriftModule"],
      implants: ["reactiveArmor"],
      core: "phantomCore",
      runes: createPresetRunes({
        attack: { secondary: 3, primary: 0, ultimate: 0 },
        defense: { secondary: 4, primary: 2, ultimate: 0 },
        support: { secondary: 3, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "v2-breach-hammer",
    unlockLevel: 1,
    name: "Breach Hammer",
    role: "Engage / punish",
    description: "Shotgun engage build with focused close-range punish modules.",
    tags: ["starter-v2", "burst", "engage"],
    build: {
      weapon: "shotgun",
      modules: ["vGripHarpoon", "boltLinkJavelin", "hexPlateProjector"],
      implants: ["critScanRelay"],
      core: "phantomCore",
      runes: createPresetRunes({
        attack: { secondary: 5, primary: 2, ultimate: 0 },
        defense: { secondary: 2, primary: 0, ultimate: 0 },
        support: { secondary: 3, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "v2-deadeye-circuit",
    unlockLevel: 3,
    name: "Deadeye Circuit",
    role: "Spacing / pick",
    description: "Axe skirmish preset tuned for tactical precision and module-driven picks.",
    tags: ["starter-v2", "sniper", "spacing"],
    build: {
      weapon: "axe",
      modules: ["ghostDriftModule", "voidCoreSingularity", "boltLinkJavelin"],
      implants: ["scavengerPlates"],
      core: "phantomCore",
      runes: createPresetRunes({
        attack: { secondary: 4, primary: 1, ultimate: 0 },
        defense: { secondary: 3, primary: 1, ultimate: 0 },
        support: { secondary: 3, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "v2-warden-siege",
    unlockLevel: 5,
    name: "Warden Siege",
    role: "Frontline / control",
    description: "Staff frontline preset utilizing heavy defensive modules.",
    tags: ["starter-v2", "tank", "control"],
    build: {
      weapon: "staff",
      modules: ["hexPlateProjector", "orbitalDistorter", "ghostDriftModule"],
      implants: ["scavengerPlates"],
      core: "rebootProtocol",
      runes: createPresetRunes({
        attack: { secondary: 2, primary: 0, ultimate: 0 },
        defense: { secondary: 5, primary: 2, ultimate: 0 },
        support: { secondary: 3, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "v2-toxic-surge",
    unlockLevel: 8,
    name: "Toxic Surge",
    role: "Duel / sustain",
    description: "Injector sustain preset built for high-tempo module cycles.",
    tags: ["starter-v2", "hybrid", "aggro"],
    build: {
      weapon: "injector",
      modules: ["voidCoreSingularity", "ghostDriftModule", "hexPlateProjector"],
      implants: ["bioDrainLink"],
      core: "empCataclysmCore",
      runes: createPresetRunes({
        attack: { secondary: 3, primary: 1, ultimate: 0 },
        systems: { secondary: 3, primary: 1, ultimate: 0 },
        support: { secondary: 4, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "v2-colossus-breaker",
    unlockLevel: 12,
    name: "Colossus Breaker",
    role: "Late game / siege",
    description: "Cannon finisher preset with peak reactor core pressure.",
    tags: ["starter-v2", "burst", "control"],
    build: {
      weapon: "cannon",
      modules: ["orbitalDistorter", "voidCoreSingularity", "ghostDriftModule"],
      implants: ["seqShotCalculator"],
      core: "phantomCore",
      runes: createPresetRunes({
        attack: { secondary: 5, primary: 2, ultimate: 0 },
        systems: { secondary: 2, primary: 1, ultimate: 0 },
        support: { secondary: 3, primary: 0, ultimate: 0 },
      }),
    },
  },
];

