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
    description: "Pulse tempo loadout for safe lane control and reliable confirms.",
    tags: ["starter-v2", "poke", "control"],
    build: {
      weapon: "pulse",
      abilities: ["shockJavelin", "magneticField", "phaseShift"],
      perks: ["reactiveArmor"],
      ultimate: "phantomSplit",
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
    description: "Shotgun engage kit with clear close-range punish windows.",
    tags: ["starter-v2", "burst", "engage"],
    build: {
      weapon: "shotgun",
      abilities: ["magneticGrapple", "shockJavelin", "energyShield"],
      perks: ["executionRelay"],
      ultimate: "phantomSplit",
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
    description: "Axe skirmish preset tuned for level 3 tempo fights and clean picks.",
    tags: ["starter-v2", "sniper", "spacing"],
    build: {
      weapon: "axe",
      abilities: ["phaseShift", "gravityWell", "shockJavelin"],
      perks: ["scavengerPlates"],
      ultimate: "phantomSplit",
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
    description: "Staff frontline preset that comes online when your collection broadens.",
    tags: ["starter-v2", "tank", "control"],
    build: {
      weapon: "staff",
      abilities: ["energyShield", "magneticField", "phaseShift"],
      perks: ["scavengerPlates"],
      ultimate: "revivalProtocol",
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
    description: "Injector sustain preset built for level 8 powerspikes and attrition rounds.",
    tags: ["starter-v2", "hybrid", "aggro"],
    build: {
      weapon: "injector",
      abilities: ["gravityWell", "phaseShift", "energyShield"],
      perks: ["omnivampCore"],
      ultimate: "empCataclysm",
      runes: createPresetRunes({
        attack: { secondary: 3, primary: 1, ultimate: 0 },
        spells: { secondary: 3, primary: 1, ultimate: 0 },
        support: { secondary: 4, primary: 0, ultimate: 0 },
      }),
    },
  },
  {
    key: "v2-colossus-breaker",
    unlockLevel: 12,
    name: "Colossus Breaker",
    role: "Late game / siege",
    description: "Cannon finisher preset unlocked deep in progression for endgame pressure.",
    tags: ["starter-v2", "burst", "control"],
    build: {
      weapon: "cannon",
      abilities: ["magneticField", "gravityWell", "phaseShift"],
      perks: ["precisionMomentum"],
      ultimate: "phantomSplit",
      runes: createPresetRunes({
        attack: { secondary: 5, primary: 2, ultimate: 0 },
        spells: { secondary: 2, primary: 1, ultimate: 0 },
        support: { secondary: 3, primary: 0, ultimate: 0 },
      }),
    },
  },
];

