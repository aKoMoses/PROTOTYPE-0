// Mutable game state (shared across all modules)
import { arena, config, sandboxModes } from "./config.js";
import { weapons, content } from "./content.js";
import { mapChoices } from "./maps.js";

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

export const input = {
  keys: new Set(),
  mouseX: arena.width * 0.5,
  mouseY: arena.height * 0.5,
  lookX: 0,
  lookY: 0,
  firing: false,
  altFiring: false,
  moveTouchId: null,
  moveTouchX: 0,
  moveTouchY: 0,
};


export const player = {
  x: arena.width * 0.5,
  y: arena.height * 0.5,
  hp: config.playerMaxHp,
  radius: config.playerRadius,
  facing: 0,
  velocityX: 0,
  velocityY: 0,
  fireCooldown: 0,
  flash: 0,
  alive: true,
  hitReactionTime: 0,
  hitReactionX: 0,
  hitReactionY: 0,
  recoil: 0,
  weapon: weapons.pulse.key,
  weaponCharge: 0,
  weaponChargeActive: false,
  weaponChargeFlash: 0,
  ammo: config.pulseMagazineSize,
  reloadTime: 0,
  attackStartupTime: 0,
  attackCommitTime: 0,
  attackCommitX: 0,
  attackCommitY: 0,
  attackCommitSpeed: 0,
  comboStep: 0,
  comboTimer: 0,
  slashFlash: 0,
  statusEffects: [],
  activeAxeStrike: null,
  pendingAxeStrike: null,
  lastMissTime: 0,
  shield: 0,
  shieldTime: 0,
  hasteTime: 0,
  afterDashHasteTime: 0,
  ghostTime: 0,
  failsafeReady: true,
  defenseFailsafeReady: true,
  lastStandTime: 0,
  lastStandDecayPerSecond: 0,
  precisionMomentumStacks: 0,
  precisionMomentumFlash: 0,
  revivalPrimed: 0,
  decoyTime: 0,
  injectorMarks: 0,
  injectorMarkTime: 0,
  mainRuneCooldown: 0,
  defenseRuneShieldCooldown: 0,
};

export const playerClone = {
  active: false,
  alive: false,
  team: "player",
  kind: "playerClone",
  x: arena.width * 0.5,
  y: arena.height * 0.5,
  hp: 0,
  maxHp: 0,
  radius: Math.max(12, config.playerRadius * 0.96),
  facing: 0,
  flash: 0,
  shield: 0,
  shieldTime: 0,
  ghostTime: 0,
  hasteTime: 0,
  weapon: weapons.pulse.key,
  avatar: "drifter",
  weaponSkin: "stock",
  loadout: {
    weapon: weapons.pulse.key,
    abilities: ["shockJavelin", "magneticField", "energyShield"],
  },
  damageScale: config.phantomDamageScale,
  shieldScale: config.phantomShieldScale,
  healScale: config.phantomHealScale,
  statusScale: config.phantomStatusScale,
  life: 0,
  maxLife: config.phantomDuration,
  trail: [],
  actionQueue: [],
  statusEffects: [],
  injectorMarks: 0,
  injectorMarkTime: 0,
  hitReactionTime: 0,
  hitReactionX: 0,
  hitReactionY: 0,
  recoil: 0,
  slashFlash: 0,
  actionFlash: 0,
};


export const abilityState = {
  dash: {
    inputHeld: false,
    holdTime: 0,
    activeTime: 0,
    invulnerabilityTime: 0,
    vectorX: 0,
    vectorY: 0,
    charges: 1,
    rechargeTimer: 0,
    mode: "tap",
    upgraded: false,
  },
  javelin: {
    cooldown: 0,
    activeTime: 0,
    recastReady: false,
    targetKind: null,
    aimX: 0,
    aimY: 0,
    lastDirectionX: 0,
    lastDirectionY: 0,
    pendingCooldown: false,
  },
  field: {
    cooldown: 0,
    charging: false,
    chargeTime: 0,
    mode: "tap",
    moveBoostTime: 0,
  },
  grapple: {
    cooldown: 0,
    phase: "idle",
    projectile: null,
    targetKind: null,
    pullStopRequested: false,
    tetherPulse: 0,
  },
  shield: {
    cooldown: 0,
  },
  booster: {
    cooldown: 0,
  },
  emp: {
    cooldown: 0,
  },
  backstep: {
    cooldown: 0,
  },
  chainLightning: {
    cooldown: 0,
  },
  blink: {
    cooldown: 0,
  },
  phaseDash: {
    cooldown: 0,
    time: 0,
  },
  pulseBurst: {
    cooldown: 0,
  },
  railShot: {
    cooldown: 0,
  },
  gravityWell: {
    cooldown: 0,
  },
  phaseShift: {
    cooldown: 0,
    time: 0,
  },
  hologramDecoy: {
    cooldown: 0,
  },
  speedSurge: {
    cooldown: 0,
  },
  ultimate: {
    cooldown: 0,
    active: false,
    phantomTime: 0,
  },
};


export function createBot({
  kind,
  role,
  x,
  y,
  hp,
  radius,
  color,
  accent,
  modes,
}) {
  return {
    kind,
    role,
    x,
    y,
    spawnX: x,
    spawnY: y,
    hp,
    maxHp: hp,
    radius,
    color,
    accent,
    modes,
    flash: 0,
    alive: true,
    hitReactionTime: 0,
    hitReactionX: 0,
    hitReactionY: 0,
    facing: 0,
    shootCooldown: 0.7,
    cadence: 0.72,
    strafeTimer: 0,
    dodgeCooldown: 0.6,
    dodgeTime: 0,
    dodgeVectorX: 0,
    dodgeVectorY: 0,
    burstShots: 0,
    shotSpread: 0,
    focusTarget: "player",
    focusTime: 0,
    shield: 0,
    shieldTime: 0,
    hasteTime: 0,
    ghostTime: 0,
    phaseShiftTime: 0,
    weapon: weapons.pulse.key,
    ammo: config.pulseMagazineSize,
    reloadTime: 0,
    loadout: {
      weapon: weapons.pulse.key,
      abilities: ["shockJavelin", "magneticField", "energyShield"],
    },
    abilityCooldowns: {
      grapple: 0,
      shield: 0,
      booster: 0,
      emp: 0,
      backstep: 0,
      chainLightning: 0,
      blink: 0,
      phaseDash: 0,
      pulseBurst: 0,
      railShot: 0,
      gravityWell: 0,
      phaseShift: 0,
      hologramDecoy: 0,
      speedSurge: 0,
    },
    comboStep: 0,
    comboTimer: 0,
    meleeWindupTime: 0,
    pendingMeleeStrike: null,
    attackCommitTime: 0,
    attackCommitX: 0,
    attackCommitY: 0,
    attackCommitSpeed: 0,
    activeMeleeStrike: null,
    statusEffects: [],
    injectorMarks: 0,
    injectorMarkTime: 0,
  };
}


export const enemy = createBot({
  kind: "hunter",
  role: "hunter",
  x: arena.width * 0.78,
  y: arena.height * 0.34,
  hp: config.enemyMaxHp,
  radius: config.enemyRadius,
  color: "#ff8a77",
  accent: "#ffa596",
  modes: [sandboxModes.duel.key],
});
enemy.team = "enemy";
enemy.dashCooldown = 0;
enemy.javelinCooldown = 1.2;
enemy.fieldCooldown = 2.4;
enemy.postAttackMoveTime = 0;
enemy.lastSeenMissTime = 0;

export const trainingBots = Array.from({ length: 5 }, (_, index) =>
  createBot({
    kind: `training-${index + 1}`,
    role: "training",
    x: 520 + index * 140,
    y: arena.height * 0.5,
    hp: 140,
    radius: 18,
    color: "#74d6ff",
    accent: "#c9f2ff",
    modes: [sandboxModes.training.key],
  }),
);
for (const bot of trainingBots) {
  bot.team = "enemy";
}


export const bots = [enemy, ...trainingBots];

export const sandbox = {
  mode: sandboxModes.duel.key,
  mapKey: mapChoices.electroGallery.key,
  helpOpen: false,
};

export const matchState = {
  formatWins: 2,
  playerRounds: 0,
  enemyRounds: 0,
  roundNumber: 1,
  phase: "round_start",
  timer: 1.1,
  bannerVisible: true,
  bannerLabel: "Round 1",
  bannerTitle: "Prepare",
  bannerStyle: "intro",
  introIndex: 0,
};

export const survivalState = {
  wave: 1,
  totalKills: 0,
  waveKills: 0,
  phase: "idle",
  timer: 0,
  waveTargetKills: 2,
  spawnQueue: [],
  spawnCooldown: 0,
  maxConcurrent: 3,
  planLabel: "Scavenger Rush",
  completed: false,
};

export const bullets = [];
export const enemyBullets = [];
export const impacts = [];
export const tracers = [];
export const combatTexts = [];
export const afterimages = [];
export const slashEffects = [];
export const shockJavelins = [];
export const enemyShockJavelins = [];
export const explosions = [];
export const magneticFields = [];
export const absorbBursts = [];
export const abilityProjectiles = [];
export const deployableTraps = [];
export const deployableTurrets = [];
export const supportZones = [];
export const beamEffects = [];
export const mapEffects = [];
export const survivalEnemies = [];
export const mapState = {
  layoutKey: mapChoices.electroGallery.key,
  obstacles: [],
  bushes: [],
  portals: [],
  pylons: [],
  decor: [],
};

export const globals = {
  screenShake: 0,
  lastTime: performance.now(),
};
