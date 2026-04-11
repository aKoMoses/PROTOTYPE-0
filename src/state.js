// Mutable game state (shared across all modules)
import { arena, config, sandboxModes } from "./config.js";
import { weapons } from "./content.js";
import { mapChoices } from "./maps.js";

export {
  createInitialRuneAllocation,
  loadout,
  uiState,
  botBuildState,
  matchSettings,
  trainingToolState,
} from "./state/app-state.js";

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
  shieldGuardTime: 0,
  shieldBreakRefundReady: false,
  hasteTime: 0,
  afterDashHasteTime: 0,
  reflexAegisSpeedTime: 0,
  reflexAegisHitBonusTime: 0,
  reflexAegisHitBonusDamage: 0,
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
  castTime: 0,
  totalCastTime: 0,
  castingModule: null,
  castParams: null,
  visualCastTime: 0,
  totalVisualCastTime: 0,
  visualCastingModule: null,
  weaponChargeTime: 0,
  totalWeaponChargeTime: 0,
  weaponCasting: null,
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
  shieldGuardTime: 0,
  ghostTime: 0,
  hasteTime: 0,
  weapon: weapons.pulse.key,
  avatar: "drifter",
  weaponSkin: "stock",
  loadout: {
    weapon: weapons.pulse.key,
    modules: ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector"],
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


export const moduleState = {
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
  boltLinkJavelin: {
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
  orbitalDistorter: {
    cooldown: 0,
    charging: false,
    chargeTime: 0,
    mode: "tap",
    moveBoostTime: 0,
  },
  vGripHarpoon: {
    cooldown: 0,
    phase: "idle",
    projectile: null,
    targetKind: null,
    pullStopRequested: false,
    tetherPulse: 0,
  },
  hexPlateProjector: {
    cooldown: 0,
  },
  overdriveServos: {
    cooldown: 0,
  },
  emPulseEmitter: {
    cooldown: 0,
  },
  jetBackThruster: {
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
  swarmMissileRack: {
    cooldown: 0,
  },
  railShot: {
    cooldown: 0,
  },
  voidCoreSingularity: {
    cooldown: 0,
  },
  reflexAegis: {
    cooldown: 0,
    startupTime: 0,
    activeTime: 0,
    recoveryTime: 0,
    resolveLockTime: 0,
    successFlash: 0,
  },
  ghostDriftModule: {
    cooldown: 0,
    time: 0,
  },
  spectreProjector: {
    cooldown: 0,
  },
  core: {
    cooldown: 0,
    active: false,
    phantomTime: 0,
  },
};

export const abilityState = moduleState;


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
  team = "enemy",
}) {
  return {
    kind,
    role,
    team,
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
    shieldGuardTime: 0,
    shieldBreakRefundReady: false,
    hasteTime: 0,
    ghostTime: 0,
    phaseShiftTime: 0,
    weapon: weapons.pulse.key,
    ammo: config.pulseMagazineSize,
    reloadTime: 0,
    loadout: {
      weapon: weapons.pulse.key,
      modules: ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector"],
    },
    moduleCooldowns: {
      vGripHarpoon: 0,
      hexPlateProjector: 0,
      overdriveServos: 0,
      emPulseEmitter: 0,
      jetBackThruster: 0,
      chainLightning: 0,
      blink: 0,
      phaseDash: 0,
      swarmMissileRack: 0,
      railShot: 0,
      voidCoreSingularity: 0,
      ghostDriftModule: 0,
      spectreProjector: 0,
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
    combatTimer: 0,
    castTime: 0,
    totalCastTime: 0,
    castingModule: null,
    castParams: null,
    visualCastTime: 0,
    totalVisualCastTime: 0,
    visualCastingModule: null,
    weaponChargeTime: 0,
    totalWeaponChargeTime: 0,
    weaponCasting: null,
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
  team: "enemy",
});
enemy.dashCooldown = 0;
enemy.boltLinkJavelinCooldown = 1.2;
enemy.orbitalDistorterCooldown = 2.4;
enemy.postAttackMoveTime = 0;
enemy.lastSeenMissTime = 0;

export const trainingBots = Array.from({ length: 8 }, (_, index) =>
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
    team: "enemy",
  }),
);


export let allyBot = null;
export let teamEnemies = [];

export function createTeamDuelEntities(layout) {
  allyBot = createBot({
    kind: "ally",
    role: "hunter",
    x: layout.allySpawn?.x ?? layout.playerSpawn.x,
    y: layout.allySpawn?.y ?? (layout.playerSpawn.y + 120),
    hp: config.enemyMaxHp,
    radius: config.enemyRadius,
    color: "#77d8ff",
    accent: "#b8efff",
    modes: [sandboxModes.teamDuel.key],
    team: "player",
  });
  allyBot.dashCooldown = 0;
  allyBot.boltLinkJavelinCooldown = 1.4;
  allyBot.orbitalDistorterCooldown = 2.6;
  allyBot.postAttackMoveTime = 0;
  allyBot.lastSeenMissTime = 0;

  const e1 = createBot({
    kind: "hunter-t1",
    role: "hunter",
    x: layout.enemySpawn.x,
    y: layout.enemySpawn.y - 60,
    hp: config.enemyMaxHp,
    radius: config.enemyRadius,
    color: "#ff8a77",
    accent: "#ffa596",
    modes: [sandboxModes.teamDuel.key],
    team: "enemy",
  });
  e1.dashCooldown = 0;
  e1.boltLinkJavelinCooldown = 1.2;
  e1.orbitalDistorterCooldown = 2.4;
  e1.postAttackMoveTime = 0;
  e1.lastSeenMissTime = 0;

  const e2 = createBot({
    kind: "hunter-t2",
    role: "hunter",
    x: layout.enemy2Spawn?.x ?? layout.enemySpawn.x,
    y: layout.enemy2Spawn?.y ?? (layout.enemySpawn.y + 120),
    hp: config.enemyMaxHp,
    radius: config.enemyRadius,
    color: "#ff7766",
    accent: "#ff9988",
    modes: [sandboxModes.teamDuel.key],
    team: "enemy",
  });
  e2.dashCooldown = 0;
  e2.boltLinkJavelinCooldown = 1.6;
  e2.orbitalDistorterCooldown = 2.8;
  e2.postAttackMoveTime = 0;
  e2.lastSeenMissTime = 0;

  teamEnemies = [e1, e2];
}

export function setAllyBot(bot) { allyBot = bot; }
export function setTeamEnemies(arr) { teamEnemies = arr; }

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
export const boltLinkJavelins = [];
export const enemyBoltLinkJavelins = [];
export const explosions = [];
export const orbitalDistorterFields = [];
export const absorbBursts = [];
export const moduleProjectiles = [];
export const abilityProjectiles = moduleProjectiles;
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
  healPacks: [],
};

export const globals = {
  screenShake: 0,
  lastTime: performance.now(),
};
