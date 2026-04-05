const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const gameShell = document.querySelector(".game-shell");

if (!canvas || !ctx) {
  throw new Error("Canvas initialization failed.");
}

const weaponStatus = document.getElementById("weapon-status");
const weaponName = document.getElementById("weapon-name");
const weaponIcon = document.getElementById("weapon-icon");
const mapName = document.getElementById("map-name");
const mapStatus = document.getElementById("map-status");
const helpToggle = document.getElementById("help-toggle");
const helpPanel = document.getElementById("help-panel");
const roundLabel = document.getElementById("round-label");
const matchScore = document.getElementById("match-score");
const matchFormat = document.getElementById("match-format");
const roundBanner = document.getElementById("round-banner");
const roundBannerLabel = document.getElementById("round-banner-label");
const roundBannerTitle = document.getElementById("round-banner-title");
const overdriveState = document.getElementById("overdrive-state");
const overdriveStatus = document.getElementById("overdrive-status");
const statusLine = document.getElementById("status-line");
const weaponMeter = document.getElementById("weapon-meter");
const overdriveMeter = document.getElementById("overdrive-meter");
const playerHealthFill = document.getElementById("player-health-fill");
const enemyHealthFill = document.getElementById("enemy-health-fill");
const playerHealthText = document.getElementById("player-health-text");
const enemyHealthText = document.getElementById("enemy-health-text");
const moveJoystick = document.getElementById("move-joystick");
const moveStick = document.getElementById("move-stick");
const slotDash = document.getElementById("slot-dash");
const slotDashIcon = slotDash.querySelector(".ability-slot__icon");
const slotDashName = slotDash.querySelector(".ability-slot__name");
const slotDashOverlay = document.getElementById("slot-dash-overlay");
const slotDashTimer = document.getElementById("slot-dash-timer");
const slotJavelin = document.getElementById("slot-javelin");
const slotJavelinIcon = slotJavelin.querySelector(".ability-slot__icon");
const slotJavelinName = slotJavelin.querySelector(".ability-slot__name");
const slotJavelinOverlay = document.getElementById("slot-javelin-overlay");
const slotJavelinTimer = document.getElementById("slot-javelin-timer");
const slotField = document.getElementById("slot-field");
const slotFieldIcon = slotField.querySelector(".ability-slot__icon");
const slotFieldName = slotField.querySelector(".ability-slot__name");
const slotFieldOverlay = document.getElementById("slot-field-overlay");
const slotFieldTimer = document.getElementById("slot-field-timer");
const ultimateSlot = document.getElementById("slot-ultimate");
const ultimateSlotIcon = ultimateSlot.querySelector(".ability-slot__icon");
const ultimateSlotName = ultimateSlot.querySelector(".ability-slot__name");
const prematchOverlay = document.getElementById("prematch-overlay");
const modeScreen = document.getElementById("mode-screen");
const buildScreen = document.getElementById("build-screen");
const stepMode = document.getElementById("step-mode");
const stepBuild = document.getElementById("step-build");
const modeDuel = document.getElementById("mode-duel");
const modeTraining = document.getElementById("mode-training");
const continueBuild = document.getElementById("continue-build");
const backMode = document.getElementById("back-mode");
const startSession = document.getElementById("start-session");
const prematchDescription = document.getElementById("prematch-description");
const selectedModeLabel = document.getElementById("selected-mode-label");
const selectedWeaponLabel = document.getElementById("selected-weapon-label");
const runePointsLabel = document.getElementById("rune-points-label");
const runePointsInline = document.getElementById("rune-points-inline");
const runeUltimateInline = document.getElementById("rune-ultimate-inline");
const avatarOptions = document.getElementById("avatar-options");
const weaponSkinOptions = document.getElementById("weapon-skin-options");
const runeGrid = document.getElementById("rune-grid");
const buildLibraryGrid = document.getElementById("build-library-grid");
const detailIcon = document.getElementById("detail-icon");
const detailName = document.getElementById("detail-name");
const detailMeta = document.getElementById("detail-meta");
const detailDescription = document.getElementById("detail-description");
const detailFloat = document.getElementById("detail-float");
const powerOffense = document.getElementById("power-offense");
const powerDefense = document.getElementById("power-defense");
const powerUtility = document.getElementById("power-utility");
const powerControl = document.getElementById("power-control");
const cosmeticPreviewName = document.getElementById("cosmetic-preview-name");
const cosmeticAvatarPreview = document.getElementById("cosmetic-avatar-preview");
const cosmeticWeaponIcon = document.getElementById("cosmetic-weapon-icon");
const cosmeticWeaponName = document.getElementById("cosmetic-weapon-name");
const cosmeticWeaponCopy = document.getElementById("cosmetic-weapon-copy");
const labTabLoadout = document.getElementById("lab-tab-loadout");
const labTabStyle = document.getElementById("lab-tab-style");
const labLoadout = document.getElementById("lab-loadout");
const labStyle = document.getElementById("lab-style");
const runePanel = document.getElementById("rune-panel");
const libraryTabs = Array.from(document.querySelectorAll("[data-library]"));
const loadoutSlotButtons = {
  weapon: document.getElementById("loadout-slot-weapon"),
  ability0: document.getElementById("loadout-slot-ability-0"),
  ability1: document.getElementById("loadout-slot-ability-1"),
  ability2: document.getElementById("loadout-slot-ability-2"),
  perk0: document.getElementById("loadout-slot-perk-0"),
  perk1: document.getElementById("loadout-slot-perk-1"),
  ultimate: document.getElementById("loadout-slot-ultimate"),
};

const arena = { width: 1600, height: 900 };

const config = {
  playerSpeed: 420,
  playerAcceleration: 3800,
  playerFriction: 3200,
  playerRadius: 18,
  playerMaxHp: 100,
  dashSpeed: 1120,
  dashDuration: 0.18,
  dashInvulnerability: 0.24,
  dashCooldown: 1.8,
  fireRate: 0.082,
  bulletSpeed: 1320,
  bulletLife: 1,
  pulseDamage: 20,
  axeComboReset: 0.58,
  axeCommitSpeed: 940,
  axeCommitDuration: 0.12,
  javelinCooldown: 3.4,
  javelinChargeThreshold: 0.45,
  javelinTapSpeed: 1220,
  javelinTapDamage: 66,
  javelinTapRadius: 11,
  javelinTapSlow: 0.26,
  javelinTapSlowDuration: 0.7,
  javelinHoldSpeed: 980,
  javelinHoldDamage: 88,
  javelinHoldRadius: 16,
  javelinHoldStun: 0.5,
  fieldCooldown: 3.6,
  fieldChargeThreshold: 0.45,
  fieldTapDuration: 1.2,
  fieldTapRadius: 92,
  fieldTapSlow: 0.45,
  fieldTapDamageReduction: 0.45,
  fieldTapMoveBoost: 1.16,
  fieldTapMoveBoostDuration: 0.9,
  fieldHoldDuration: 2.2,
  fieldHoldRadius: 132,
  fieldHoldSlow: 0.62,
  grappleCooldown: 4.2,
  shieldCooldown: 5.2,
  boosterCooldown: 6.5,
  ultimateCooldown: 14,
  enemyRadius: 20,
  enemyMaxHp: 160,
  enemySpeed: 220,
  enemyDodgeSpeed: 720,
  enemyDodgeDuration: 0.16,
  enemyDodgeCooldown: 1.8,
  overdriveMaxEnergy: 100,
  overdriveDuration: 3,
  runePoints: 15,
};

const content = {
  avatars: {
    drifter: {
      key: "drifter",
      name: "Dust Drifter",
      description: "Rugged wasteland runner with patched plating and quick posture.",
      icon: "avatar-drifter",
      bodyColor: "#d9f3ff",
      accentColor: "#77d8ff",
      detailColor: "#593d23",
    },
    raider: {
      key: "raider",
      name: "Scrap Raider",
      description: "Aggressive pit-fighter silhouette with heavier rusted armor.",
      icon: "avatar-raider",
      bodyColor: "#ffe1ce",
      accentColor: "#ff8a77",
      detailColor: "#70422e",
    },
    voltborn: {
      key: "voltborn",
      name: "Voltborn",
      description: "Neon-charged arena killer wrapped in live cables and salvage tech.",
      icon: "avatar-voltborn",
      bodyColor: "#e6fff0",
      accentColor: "#8ff7da",
      detailColor: "#355643",
    },
    nomad: {
      key: "nomad",
      name: "Ash Nomad",
      description: "Lean desert scavenger with a stark silhouette and bone-white plating.",
      icon: "avatar-nomad",
      bodyColor: "#f4f0df",
      accentColor: "#ffd375",
      detailColor: "#65593c",
    },
  },
  weaponSkins: {
    stock: {
      key: "stock",
      name: "Stock Steel",
      description: "Factory-scrap baseline with clean cyan optics.",
      icon: "skin-stock",
      tint: "#77d8ff",
      glow: "#dff7ff",
    },
    rustfang: {
      key: "rustfang",
      name: "Rustfang",
      description: "Orange scorched metal and brutal junkyard accents.",
      icon: "skin-rustfang",
      tint: "#ff9a6a",
      glow: "#ffd0b1",
    },
    shockglass: {
      key: "shockglass",
      name: "Shockglass",
      description: "Electric teal edge with bright glass-core highlights.",
      icon: "skin-shockglass",
      tint: "#8ff7da",
      glow: "#d9fff5",
    },
    wastelux: {
      key: "wastelux",
      name: "Wastelux",
      description: "Gold-white prestige shell made from reclaimed arena parts.",
      icon: "skin-wastelux",
      tint: "#ffd375",
      glow: "#fff3cc",
    },
  },
  weapons: {
    pulse: {
      key: "pulse",
      name: "Pulse Rifle",
      cooldown: config.fireRate,
      slotLabel: "Ranged Pressure",
      description: "Reliable ranged control with steady pressure and fast rhythm.",
      rhythm: "Fast",
      rangeProfile: "Medium / long lane control",
      commitment: "Low",
      accent: "#77d8ff",
      icon: "weapon-pulse",
      category: "offense",
      state: "playable",
    },
    axe: {
      key: "axe",
      name: "Electro Axe",
      cooldown: 0.24,
      slotLabel: "Heavy Melee",
      description: "Committed 3-hit combo with reach, cleave, and a brutal electric finisher.",
      rhythm: "Slow / committed",
      rangeProfile: "Long opener, short cleave, dash finisher",
      commitment: "High",
      accent: "#8ff7da",
      icon: "weapon-axe",
      category: "offense",
      state: "playable",
    },
    shotgun: {
      key: "shotgun",
      name: "Scrap Shotgun",
      cooldown: 0.52,
      slotLabel: "Close Burst",
      description: "High-risk blast weapon with brutal close damage and weak long pressure.",
      rhythm: "Burst / reload feel",
      rangeProfile: "Close",
      commitment: "Medium",
      accent: "#ff9d62",
      icon: "weapon-shotgun",
      category: "offense",
      state: "playable",
    },
    sniper: {
      key: "sniper",
      name: "Rail Sniper",
      slotLabel: "Precision",
      description: "Charged long-range punishment weapon for mistake denial.",
      rhythm: "Charge / punish",
      rangeProfile: "Long",
      commitment: "High",
      accent: "#ffd375",
      icon: "weapon-sniper",
      category: "offense",
      state: "preview",
    },
    staff: {
      key: "staff",
      name: "Volt Staff",
      slotLabel: "Sustain Hybrid",
      description: "Hybrid beam staff that trades raw DPS for sustain and support value.",
      rhythm: "Measured / sustain",
      rangeProfile: "Medium",
      commitment: "Medium",
      accent: "#95ffb4",
      icon: "weapon-staff",
      category: "support",
      state: "preview",
    },
    injector: {
      key: "injector",
      name: "Bio-Injector Gun",
      slotLabel: "Mark Utility",
      description: "Strange salvage-tech gun that turns pressure into sustain through marks.",
      rhythm: "Stack / convert",
      rangeProfile: "Medium",
      commitment: "Low",
      accent: "#d88cff",
      icon: "weapon-injector",
      category: "utility",
      state: "preview",
    },
  },
  abilities: {
    vectorDash: {
      key: "vectorDash",
      name: "Vector Dash",
      input: "Shift",
      role: "Mobility / Outplay",
      description: "Tap for a quick reposition, hold for a longer invulnerable commit.",
      icon: "ability-dash",
      category: "mobility",
      state: "playable",
    },
    blinkStep: { key: "blinkStep", name: "Blink Step", role: "Mobility", description: "Short displacement burst.", icon: "ability-blink", category: "mobility", state: "locked" },
    magneticGrapple: {
      key: "magneticGrapple",
      name: "Magnetic Grapple",
      input: "Q",
      role: "Mobility / Engage",
      description: "Fire a magnetic pull toward your aim point for skill-based engages and escapes.",
      icon: "ability-grapple",
      category: "mobility",
      state: "playable",
    },
    phaseDash: { key: "phaseDash", name: "Phase Dash", role: "Mobility", description: "Untargetable phase burst.", icon: "ability-phase", category: "mobility", state: "locked" },
    slideBooster: { key: "slideBooster", name: "Slide Booster", role: "Mobility", description: "Ground slide for spacing.", icon: "ability-slide", category: "mobility", state: "locked" },
    backstepBurst: { key: "backstepBurst", name: "Backstep Burst", role: "Mobility", description: "Reactive retreat burst.", icon: "ability-backstep", category: "mobility", state: "locked" },
    jetLeap: { key: "jetLeap", name: "Jet Leap", role: "Mobility", description: "Short leap with air drift.", icon: "ability-jump", category: "mobility", state: "locked" },
    markReturn: { key: "markReturn", name: "Mark-and-Return Teleport", role: "Mobility", description: "Set a return point then snap back.", icon: "ability-return", category: "mobility", state: "locked" },
    shockJavelin: {
      key: "shockJavelin",
      name: "Shock Javelin",
      input: "Q",
      role: "Punish / Combo",
      description: "Fast punish on tap, charged control hit on hold.",
      icon: "ability-javelin",
      category: "offense",
      state: "playable",
    },
    pulseBurst: { key: "pulseBurst", name: "Pulse Burst", role: "Offense", description: "Short-range burst of pulse shots.", icon: "ability-burst", category: "offense", state: "locked" },
    railShot: { key: "railShot", name: "Rail Shot", role: "Offense", description: "Charged piercing line shot.", icon: "ability-rail", category: "offense", state: "locked" },
    chainLightning: { key: "chainLightning", name: "Chain Lightning", role: "Offense", description: "Arc lightning between targets.", icon: "ability-chain", category: "offense", state: "locked" },
    plasmaCone: { key: "plasmaCone", name: "Plasma Cone", role: "Offense", description: "Short cone blast for close pressure.", icon: "ability-cone", category: "offense", state: "locked" },
    returningBlade: { key: "returningBlade", name: "Returning Energy Blade", role: "Offense", description: "Boomerang pressure projectile.", icon: "ability-blade", category: "offense", state: "locked" },
    magneticMine: { key: "magneticMine", name: "Magnetic Mine", role: "Offense", description: "Trap mine with pull effect.", icon: "ability-mine", category: "offense", state: "locked" },
    delayedOrb: { key: "delayedOrb", name: "Delayed Pulse Orb", role: "Offense", description: "Orb that detonates on delay.", icon: "ability-orb", category: "offense", state: "locked" },
    shortLaser: { key: "shortLaser", name: "Short Laser Beam", role: "Offense", description: "Brief tracking beam.", icon: "ability-laser", category: "offense", state: "locked" },
    scatterBlast: { key: "scatterBlast", name: "Scatter Blast", role: "Offense", description: "Wide multi-fragment shot.", icon: "ability-scatter", category: "offense", state: "locked" },
    autoTurret: { key: "autoTurret", name: "Auto-Turret Drone", role: "Offense", description: "Deploy small pressure drone.", icon: "ability-turret", category: "offense", state: "locked" },
    fragmentGrenade: { key: "fragmentGrenade", name: "Fragment Grenade", role: "Offense", description: "Simple explosive zoning tool.", icon: "ability-grenade", category: "offense", state: "locked" },
    magneticField: {
      key: "magneticField",
      name: "Magnetic Field",
      input: "F",
      role: "Defense / Control",
      description: "Projectile denial and space control for reset or setup.",
      icon: "ability-field",
      category: "control",
      state: "playable",
    },
    gravityWell: { key: "gravityWell", name: "Gravity Well", role: "Control", description: "Pull field that punishes spacing.", icon: "ability-gravity", category: "control", state: "locked" },
    shockwavePush: { key: "shockwavePush", name: "Shockwave Push", role: "Control", description: "Knockback pulse for disengage.", icon: "ability-push", category: "control", state: "locked" },
    rootTrap: { key: "rootTrap", name: "Root Trap", role: "Control", description: "Ground trap that roots targets.", icon: "ability-root", category: "control", state: "locked" },
    silencePulse: { key: "silencePulse", name: "Silence Pulse", role: "Control", description: "Short anti-cast pulse.", icon: "ability-silence", category: "control", state: "locked" },
    empBurst: {
      key: "empBurst",
      name: "EMP Burst",
      input: "F",
      role: "Control / Utility",
      description: "Disrupt nearby projectiles and briefly weaken the enemy.",
      icon: "ability-emp",
      category: "control",
      state: "playable",
    },
    mobileSlowField: { key: "mobileSlowField", name: "Mobile Slow Field", role: "Control", description: "Field that follows the caster.", icon: "ability-mobilefield", category: "control", state: "locked" },
    tetherLink: { key: "tetherLink", name: "Tether Link", role: "Control", description: "Link target to movement tax.", icon: "ability-tether", category: "control", state: "locked" },
    energyShield: {
      key: "energyShield",
      name: "Energy Shield",
      input: "F",
      role: "Defense",
      description: "Deploy a compact shield buffer for short defensive windows.",
      icon: "ability-shield",
      category: "defense",
      state: "playable",
    },
    phaseShift: { key: "phaseShift", name: "Phase Shift", role: "Defense", description: "Brief intangibility window.", icon: "ability-phaseshift", category: "defense", state: "locked" },
    healPulse: { key: "healPulse", name: "Heal Pulse", role: "Defense", description: "Short combat heal burst.", icon: "ability-heal", category: "defense", state: "locked" },
    regenZone: { key: "regenZone", name: "Regen Zone", role: "Defense", description: "Zone that restores health over time.", icon: "ability-regen", category: "defense", state: "locked" },
    reflectBarrier: { key: "reflectBarrier", name: "Reflect Barrier", role: "Defense", description: "Reflects incoming fire briefly.", icon: "ability-reflect", category: "defense", state: "locked" },
    damageReductionAura: { key: "damageReductionAura", name: "Damage Reduction Aura", role: "Defense", description: "Short mitigation aura.", icon: "ability-aura", category: "defense", state: "locked" },
    overdriveBooster: {
      key: "overdriveBooster",
      name: "Overdrive Booster",
      input: "F",
      role: "Utility / Tempo",
      description: "Inject energy, haste, and momentum to accelerate your next play.",
      icon: "ability-booster",
      category: "utility",
      state: "playable",
    },
    cooldownReset: { key: "cooldownReset", name: "Partial Cooldown Reset", role: "Utility", description: "Shave time off active cooldowns.", icon: "ability-reset", category: "utility", state: "locked" },
    visionScan: { key: "visionScan", name: "Vision Scan", role: "Utility", description: "Read enemy position and intent.", icon: "ability-scan", category: "utility", state: "locked" },
    hologramDecoy: { key: "hologramDecoy", name: "Hologram Decoy", role: "Utility", description: "Spawn a false target to break focus.", icon: "ability-decoy", category: "utility", state: "locked" },
    speedSurge: { key: "speedSurge", name: "Speed Surge", role: "Utility", description: "Flat movement burst for tempo.", icon: "ability-speed", category: "utility", state: "locked" },
    resourceConverter: { key: "resourceConverter", name: "Resource Converter", role: "Utility", description: "Convert pressure into energy or sustain.", icon: "ability-convert", category: "utility", state: "locked" },
  },
  perks: {
    omnivampCore: { key: "omnivampCore", name: "Omnivamp Core", description: "Heal slightly from damage dealt.", icon: "perk-vamp", state: "playable" },
    executionRelay: { key: "executionRelay", name: "Execution Relay", description: "Deal bonus damage to slowed targets.", icon: "perk-execution", state: "playable" },
    adrenalSurge: { key: "adrenalSurge", name: "Adrenal Surge", description: "Gain attack speed after using mobility.", icon: "perk-adrenal", state: "playable" },
    predatorInstinct: { key: "predatorInstinct", name: "Predator Instinct", description: "Low-health targets take more damage.", icon: "perk-predator", state: "playable" },
    comboDriver: { key: "comboDriver", name: "Combo Driver", description: "Electro Axe finisher hits harder.", icon: "perk-combo", state: "playable" },
    scavengerPlates: { key: "scavengerPlates", name: "Scavenger Plates", description: "Increase max HP.", icon: "perk-plates", state: "playable" },
    reactiveArmor: { key: "reactiveArmor", name: "Reactive Armor", description: "Reduce incoming damage.", icon: "perk-armor", state: "playable" },
    combatRecovery: { key: "combatRecovery", name: "Combat Recovery", description: "Recover health when disengaged.", icon: "perk-recovery", state: "playable" },
    shockBuffer: { key: "shockBuffer", name: "Shock Buffer", description: "Reduce crowd-control duration.", icon: "perk-buffer", state: "playable" },
    lastStandBuffer: { key: "lastStandBuffer", name: "Last Stand Buffer", description: "Once per round survive fatal damage.", icon: "perk-laststand", state: "playable" },
    dashCooling: { key: "dashCooling", name: "Dash Cooling", description: "Reduce dash cooldown.", icon: "perk-cooling", state: "playable" },
    ghostCircuit: { key: "ghostCircuit", name: "Ghost Circuit", description: "Brief phasing after dash.", icon: "perk-ghost", state: "playable" },
    overdriveCapacitor: { key: "overdriveCapacitor", name: "Overdrive Capacitor", description: "Gain Overdrive faster.", icon: "perk-capacitor", state: "playable" },
    abilityLeech: { key: "abilityLeech", name: "Ability Leech", description: "Ability hits restore a little health.", icon: "perk-leech", state: "playable" },
    staticMomentum: { key: "staticMomentum", name: "Static Momentum", description: "Applying control grants speed.", icon: "perk-momentum", state: "playable" },
    tacticalHaste: { key: "tacticalHaste", name: "Tactical Haste", description: "Ability hits grant a short haste.", icon: "perk-haste", state: "playable" },
    cloneFailover: { key: "cloneFailover", name: "Clone Failover", description: "Emergency decoy at low HP.", icon: "perk-clone", state: "preview" },
    arcFeedback: { key: "arcFeedback", name: "Arc Feedback", description: "Burst damage grants a small shield.", icon: "perk-feedback", state: "playable" },
    overclockTrigger: { key: "overclockTrigger", name: "Overclock Trigger", description: "First hit after Overdrive activation is empowered.", icon: "perk-trigger", state: "playable" },
    utilityBattery: { key: "utilityBattery", name: "Utility Battery", description: "Defensive and support actions restore combat value.", icon: "perk-battery", state: "playable" },
  },
  ultimates: {
    overdriveOverload: {
      key: "overdriveOverload",
      name: "Overdrive Overload",
      description: "Trigger an immediate aggressive Overdrive spike with bonus mobility.",
      icon: "ultimate-overload",
      state: "playable",
    },
    arenaLockdown: {
      key: "arenaLockdown",
      name: "Arena Lockdown",
      description: "Future arena-control ultimate that narrows the duel space.",
      icon: "ultimate-lockdown",
      state: "preview",
    },
    phantomSplit: {
      key: "phantomSplit",
      name: "Phantom Split",
      description: "Spawn a phantom and blur your read for a clutch mindgame window.",
      icon: "ultimate-phantom",
      state: "playable",
    },
    empCataclysm: {
      key: "empCataclysm",
      name: "EMP Cataclysm",
      description: "Future anti-tech collapse burst.",
      icon: "ultimate-emp",
      state: "preview",
    },
    berserkCore: {
      key: "berserkCore",
      name: "Berserk Core",
      description: "Future aggression and sustain window.",
      icon: "ultimate-berserk",
      state: "preview",
    },
    revivalProtocol: {
      key: "revivalProtocol",
      name: "Revival Protocol",
      description: "Prime a failsafe that rescues you from lethal damage once.",
      icon: "ultimate-revival",
      state: "playable",
    },
  },
  runeTrees: {
    attack: {
      key: "attack",
      name: "Attack",
      description: "Higher damage, faster payoff, and better finisher scaling.",
      nodes: {
        secondary: {
          key: "secondary",
          name: "Sharpened Current",
          description: "+damage, +attack speed, and precision bonus.",
          max: 5,
        },
        primary: {
          key: "primary",
          name: "Predator Tempo",
          description: "Hitting enemies grants a short offensive buff and stronger combo finishers.",
          max: 3,
        },
        ultimate: {
          key: "ultimate",
          name: "Execution Surge",
          description: "Low-health targets trigger a brief combat surge or empower the first Overdrive hit.",
          max: 1,
        },
      },
    },
    defense: {
      key: "defense",
      name: "Defense",
      description: "Toughness, burst resistance, and recovery from pressure.",
      nodes: {
        secondary: {
          key: "secondary",
          name: "Composite Plating",
          description: "+max HP, +damage reduction, and reduced control duration.",
          max: 5,
        },
        primary: {
          key: "primary",
          name: "Recovery Loop",
          description: "Abilities restore a little health and burst damage can trigger a brief shield.",
          max: 3,
        },
        ultimate: {
          key: "ultimate",
          name: "Last Stand Capacitor",
          description: "Once per round, lethal damage leaves you alive or grants a strong low-HP shield.",
          max: 1,
        },
      },
    },
    spells: {
      key: "spells",
      name: "Spells",
      description: "Cooldown pressure, Overdrive feed, and stronger ability flow.",
      nodes: {
        secondary: {
          key: "secondary",
          name: "Quickcharge Weave",
          description: "Cooldown reduction, faster Overdrive generation, and slightly longer status effects.",
          max: 5,
        },
        primary: {
          key: "primary",
          name: "Chain Casting",
          description: "Ability hits grant short haste and one ability can empower the next.",
          max: 3,
        },
        ultimate: {
          key: "ultimate",
          name: "Arc Script",
          description: "The first post-Overdrive ability or a charged ability gains a unique enhancement.",
          max: 1,
        },
      },
    },
    support: {
      key: "support",
      name: "Support",
      description: "Utility, control value, and movement-oriented tempo.",
      nodes: {
        secondary: {
          key: "secondary",
          name: "Vector Utility",
          description: "+movement speed, faster recovery, and stronger utility durations.",
          max: 5,
        },
        primary: {
          key: "primary",
          name: "Momentum Relay",
          description: "Applying control grants a self-buff and dash usage creates utility windows.",
          max: 3,
        },
        ultimate: {
          key: "ultimate",
          name: "Command Uplink",
          description: "Overdrive can cleanse control and control actions build toward a utility surge.",
          max: 1,
        },
      },
    },
  },
};

const weapons = content.weapons;

const overdrive = {
  dashMultiplier: 0.3889,
  attackSpeedMultiplier: 0.52,
  moveSpeedMultiplier: 1.18,
  dashCharges: 2,
  hitGainPulse: 12,
  hitGainAxe: 16,
  perfectDashGain: 24,
};

const sandboxModes = {
  duel: {
    key: "duel",
    name: "Duel Map",
    subtitle: "One hunter bot with full combat behavior.",
  },
  training: {
    key: "training",
    name: "Training Map",
    subtitle: "Five static bots lined up for range, cleave, and status tests.",
  },
};

const loadout = {
  weapon: weapons.pulse.key,
  abilities: ["vectorDash", "shockJavelin", "magneticField"],
  perks: ["scavengerPlates", "overdriveCapacitor"],
  ultimate: "overdriveOverload",
  avatar: "drifter",
  weaponSkin: "stock",
  runes: createInitialRuneAllocation(),
};

const uiState = {
  prematchOpen: true,
  prematchStep: "mode",
  selectedMode: sandboxModes.duel.key,
  buildCategory: "weapon",
  selectedLoadoutSlot: "weapon",
  selectedDetail: { type: "weapon", key: weapons.pulse.key },
};

const abilityConfig = {
  dash: {
    tapDuration: config.dashDuration,
    tapInvulnerability: config.dashInvulnerability,
    tapSpeed: config.dashSpeed,
    holdThreshold: 0.16,
    holdDuration: 0.28,
    holdInvulnerability: 0.34,
    holdSpeed: 1320,
    trailColor: "#9df4b7",
    overdriveTrailColor: "#ffe6a6",
  },
  javelin: {
    cooldown: config.javelinCooldown,
    chargeThreshold: config.javelinChargeThreshold,
    maxCharge: 1,
    tap: {
      speed: config.javelinTapSpeed,
        damage: config.javelinTapDamage,
        radius: config.javelinTapRadius,
        slow: config.javelinTapSlow,
        slowDuration: config.javelinTapSlowDuration,
        color: "#8fe8ff",
        glow: "#c4f8ff",
        trail: "#6ad8ff",
      },
    hold: {
        speed: config.javelinHoldSpeed,
        damage: config.javelinHoldDamage,
        radius: config.javelinHoldRadius,
        stun: config.javelinHoldStun,
        color: "#ffd77e",
        glow: "#fff0b4",
        trail: "#ffc85a",
    },
  },
  field: {
    cooldown: config.fieldCooldown,
    chargeThreshold: config.fieldChargeThreshold,
    tap: {
      duration: config.fieldTapDuration,
      radius: config.fieldTapRadius,
      slow: config.fieldTapSlow,
      damageReduction: config.fieldTapDamageReduction,
      anchor: "player",
      color: "#89c8ff",
      glow: "#a8ddff",
    },
    hold: {
      duration: config.fieldHoldDuration,
      radius: config.fieldHoldRadius,
      slow: config.fieldHoldSlow,
      damageReduction: 0,
      anchor: "world",
      color: "#95b5ff",
      glow: "#bed1ff",
    },
  },
};

const input = {
  keys: new Set(),
  mouseX: arena.width * 0.5,
  mouseY: arena.height * 0.5,
  firing: false,
  moveTouchId: null,
  moveTouchX: 0,
  moveTouchY: 0,
};

const player = {
  x: arena.width * 0.5,
  y: arena.height * 0.5,
  hp: config.playerMaxHp,
  radius: config.playerRadius,
  facing: 0,
  velocityX: 0,
  velocityY: 0,
  fireCooldown: 0,
  flash: 0,
  recoil: 0,
  weapon: weapons.pulse.key,
  attackCommitTime: 0,
  attackCommitX: 0,
  attackCommitY: 0,
  attackCommitSpeed: 0,
  comboStep: 0,
  comboTimer: 0,
  slashFlash: 0,
  energy: 0,
  overdriveTime: 0,
  overdrivePulse: 0,
  statusEffects: [],
  activeAxeStrike: null,
  lastMissTime: 0,
  shield: 0,
  shieldTime: 0,
  hasteTime: 0,
  afterDashHasteTime: 0,
  overdriveTriggerReady: false,
  ghostTime: 0,
  failsafeReady: true,
  revivalPrimed: 0,
  decoyTime: 0,
};

const abilityState = {
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
  },
  javelin: {
    cooldown: 0,
    charging: false,
    chargeTime: 0,
    mode: "tap",
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
  ultimate: {
    cooldown: 0,
    active: false,
    phantomTime: 0,
  },
};

function createBot({
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
    statusEffects: [],
  };
}

const enemy = createBot({
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

const trainingBots = Array.from({ length: 5 }, (_, index) =>
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

const bots = [enemy, ...trainingBots];
const sandbox = {
  mode: sandboxModes.duel.key,
  helpOpen: false,
};

const matchState = {
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

const statusVisuals = {
  slow: {
    label: "SLOW",
    fill: "rgba(111, 226, 255, 0.95)",
    stroke: "rgba(199, 245, 255, 0.9)",
    text: "#041b28",
    wave: "ring",
  },
  stun: {
    label: "STUN!",
    fill: "rgba(255, 86, 64, 0.98)",
    stroke: "rgba(255, 234, 214, 0.96)",
    text: "#fff7ef",
    wave: "spark",
  },
};

const bullets = [];
const enemyBullets = [];
const impacts = [];
const tracers = [];
const afterimages = [];
const slashEffects = [];
const shockJavelins = [];
const enemyShockJavelins = [];
const explosions = [];
const magneticFields = [];
const absorbBursts = [];
let screenShake = 0;
let lastTime = performance.now();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function length(x, y) {
  return Math.hypot(x, y);
}

function normalize(x, y) {
  const magnitude = length(x, y) || 1;
  return { x: x / magnitude, y: y / magnitude };
}

function pointToSegmentDistance(pointX, pointY, x1, y1, x2, y2) {
  const segmentX = x2 - x1;
  const segmentY = y2 - y1;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY || 1;
  const projection = clamp(
    ((pointX - x1) * segmentX + (pointY - y1) * segmentY) / segmentLengthSquared,
    0,
    1,
  );
  const nearestX = x1 + segmentX * projection;
  const nearestY = y1 + segmentY * projection;
  return length(pointX - nearestX, pointY - nearestY);
}

function applyStatusEffect(entity, type, duration, magnitude = 0) {
  if (!entity.statusEffects) {
    entity.statusEffects = [];
  }

  const existing = entity.statusEffects.find((effect) => effect.type === type);

  if (existing) {
    existing.time = Math.max(existing.time, duration);
    existing.magnitude = Math.max(existing.magnitude, magnitude);
    return existing;
  }

  const effect = { type, time: duration, magnitude };
  entity.statusEffects.push(effect);
  return effect;
}

function updateStatusEffects(entity, dt) {
  if (!entity.statusEffects) {
    entity.statusEffects = [];
    return;
  }

  for (let index = entity.statusEffects.length - 1; index >= 0; index -= 1) {
    entity.statusEffects[index].time -= dt;

    if (entity.statusEffects[index].time <= 0) {
      entity.statusEffects.splice(index, 1);
    }
  }
}

function clearStatusEffects(entity) {
  entity.statusEffects = [];
}

function clearCombatArtifacts() {
  bullets.length = 0;
  enemyBullets.length = 0;
  impacts.length = 0;
  tracers.length = 0;
  afterimages.length = 0;
  slashEffects.length = 0;
  shockJavelins.length = 0;
  enemyShockJavelins.length = 0;
  explosions.length = 0;
  magneticFields.length = 0;
  absorbBursts.length = 0;
}

function createInitialRuneAllocation() {
  const allocation = {};

  for (const tree of Object.values(content.runeTrees)) {
    allocation[tree.key] = {
      secondary: 0,
      primary: 0,
      ultimate: 0,
    };
  }

  return allocation;
}

function sanitizeIconClass(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

function getContentItem(group, key) {
  return content[group]?.[key] ?? null;
}

function getAbilityBySlot(slotIndex) {
  return getContentItem("abilities", loadout.abilities[slotIndex]) ?? null;
}

function hasPerk(key) {
  return loadout.perks.includes(key);
}

function getRuneValue(treeKey, nodeKey) {
  return loadout.runes[treeKey]?.[nodeKey] ?? 0;
}

function getStatusDuration(duration) {
  return duration * (1 + getRuneValue("spells", "secondary") * 0.03);
}

function getIconMarkup(item, type) {
  const iconKey = sanitizeIconClass(item.icon ?? `${type}-${item.key}`);
  const groupClass = item.category ? `content-icon--${item.category}` : "";
  return `<div class="content-icon ${groupClass} content-icon--${iconKey}"></div>`;
}

function getPerkDamageMultiplier(target = null) {
  let multiplier = 1 + getRuneValue("attack", "secondary") * 0.02;

  if (hasPerk("executionRelay") && target) {
    const targetStatus = getStatusState(target);
    if (targetStatus.slow > 0) {
      multiplier *= 1.18;
    }
    if ((targetStatus.slow > 0 || targetStatus.stunned) && getRuneValue("attack", "primary") > 0) {
      multiplier *= 1 + getRuneValue("attack", "primary") * 0.04;
    }
  }

  if (hasPerk("predatorInstinct") && target && target.hp / target.maxHp <= 0.35) {
    multiplier *= 1.14;
  }

  if (player.overdriveTriggerReady && hasPerk("overclockTrigger")) {
    multiplier *= 1.28;
  }

  return multiplier;
}

function getBuildStats() {
  return {
    maxHp: config.playerMaxHp + (hasPerk("scavengerPlates") ? 22 : 0) + getRuneValue("defense", "secondary") * 4,
    damageReduction: (hasPerk("reactiveArmor") ? 0.12 : 0) + getRuneValue("defense", "secondary") * 0.01,
    ccReduction: (hasPerk("shockBuffer") ? 0.28 : 0) + getRuneValue("defense", "secondary") * 0.02,
    dashCooldownMultiplier: hasPerk("dashCooling") ? 0.84 : 1,
    energyMultiplier: (hasPerk("overdriveCapacitor") ? 1.3 : 1) + getRuneValue("spells", "secondary") * 0.04,
    hasteMultiplier:
      1 +
      (player.hasteTime > 0 ? 0.12 : 0) +
      (player.afterDashHasteTime > 0 ? 0.2 : 0) +
      getRuneValue("support", "secondary") * 0.01,
    moveMultiplier:
      1 +
      (hasPerk("staticMomentum") && player.hasteTime > 0 ? 0.08 : 0) +
      getRuneValue("support", "secondary") * 0.015,
    omnivamp: hasPerk("omnivampCore") ? 0.08 : 0,
    abilityLeech: hasPerk("abilityLeech") ? 4 : 0,
    finisherBonus: (hasPerk("comboDriver") ? 0.22 : 0) + getRuneValue("attack", "primary") * 0.05,
    controlledBonus: getRuneValue("attack", "primary") * 0.04,
    outOfCombatRegen: hasPerk("combatRecovery") ? 4 : 0,
    shieldOnBurst: hasPerk("arcFeedback") ? 16 : 0,
  };
}

function getSpentRunePoints() {
  return Object.values(loadout.runes).reduce(
    (total, tree) => total + tree.secondary + tree.primary + tree.ultimate,
    0,
  );
}

function getRemainingRunePoints() {
  return Math.max(0, config.runePoints - getSpentRunePoints());
}

function getSelectedRuneUltimateTree() {
  return (
    Object.entries(loadout.runes).find(([, tree]) => tree.ultimate > 0)?.[0] ?? null
  );
}

function setPrematchStep(step) {
  uiState.prematchStep = step;
  modeScreen.classList.toggle("prematch-screen--active", step === "mode");
  buildScreen.classList.toggle("prematch-screen--active", step === "build");
  stepMode.classList.toggle("is-active", step === "mode");
  stepBuild.classList.toggle("is-active", step === "build");
}

function syncPrematchState() {
  gameShell.classList.toggle("prematch-open", uiState.prematchOpen);
}

function openPrematch(step = "mode") {
  uiState.prematchOpen = true;
  setPrematchStep(step);
  prematchOverlay.classList.remove("is-hidden");
  syncPrematchState();
  clearCombatArtifacts();
}

function closePrematch() {
  uiState.prematchOpen = false;
  prematchOverlay.classList.add("is-hidden");
  syncPrematchState();
}

function updatePrematchSummary() {
  const selectedMode = sandboxModes[uiState.selectedMode];
  const selectedWeapon = weapons[loadout.weapon];
  const remainingPoints = getRemainingRunePoints();
  const selectedUltimateTree = getSelectedRuneUltimateTree();
  const selectedAvatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;

  selectedModeLabel.textContent = selectedMode.name;
  selectedWeaponLabel.textContent = selectedWeapon.name;
  runePointsLabel.textContent = `${remainingPoints} remaining`;
  runePointsInline.textContent = `${remainingPoints} points remaining`;
  runeUltimateInline.textContent = selectedUltimateTree
    ? `${content.runeTrees[selectedUltimateTree].name} ultimate active`
    : "No ultimate selected";
  prematchDescription.textContent =
    uiState.selectedMode === sandboxModes.training.key
      ? "Training mode loads the line of static bots for hitbox, status, and timing tests."
      : "Duel mode launches a best-of-3 arena round flow against the hunter bot.";
  cosmeticPreviewName.textContent = selectedAvatar.name;
}

function renderSelectionGrid(container, items, selectedKeys, onSelect, options = {}) {
  container.textContent = "";

  items.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "item-row";
    if (item.locked) {
      row.classList.add("is-locked");
    }
    if (selectedKeys.includes(item.key)) {
      row.classList.add("is-selected");
    }
    if (options.activeKeys?.includes(item.key)) {
      row.classList.add("is-active");
    }

    const stateLabel = item.state === "playable" ? "" : item.state === "preview" ? "PREVIEW" : "LOCKED";
    const stateClass = item.state === "preview" ? " item-row__state--preview" : "";

    row.innerHTML = `
      ${getIconMarkup(item, options.iconType ?? "generic")}
      <span class="item-row__name">${item.name}</span>
      ${stateLabel ? `<span class="item-row__state${stateClass}">${stateLabel}</span>` : ""}
    `;

    if (!item.locked) {
      row.addEventListener("click", () => onSelect(item.key));
    } else {
      row.disabled = true;
    }

    container.appendChild(row);
  });
}

function getPrematchCategoryItems(category) {
  switch (category) {
    case "weapon":
      return Object.values(content.weapons);
    case "ability":
      return Object.values(content.abilities);
    case "perk":
      return Object.values(content.perks);
    case "ultimate":
      return Object.values(content.ultimates);
    default:
      return [];
  }
}

function getPrematchCategoryConfig(category) {
  const configs = {
    weapon: {
      title: "Weapons",
      hint: "Choose the weapon chassis that defines your round pacing and commitment level.",
      iconType: "weapon",
      selectedKeys: [loadout.weapon],
      compatibleSlots: ["weapon"],
    },
    ability: {
      title: "Active Abilities",
      hint: "Pick a tool, then snap it into Ability 1, 2, or 3. Replacing a slot is instant.",
      iconType: "ability",
      selectedKeys: loadout.abilities,
      compatibleSlots: ["ability-0", "ability-1", "ability-2"],
    },
    perk: {
      title: "Passive Perks",
      hint: "Layer two passives that sharpen your duel plan without overcomplicating the build.",
      iconType: "perk",
      selectedKeys: loadout.perks,
      compatibleSlots: ["perk-0", "perk-1"],
    },
    ultimate: {
      title: "Ultimates",
      hint: "Lock one round-defining spike to finish the kit. Non-playable ultimates stay visible as previews.",
      iconType: "ultimate",
      selectedKeys: [loadout.ultimate],
      compatibleSlots: ["ultimate"],
    },
  };

  return configs[category];
}

function getSlotCategory(slotKey) {
  if (slotKey === "weapon") return "weapon";
  if (slotKey === "ultimate") return "ultimate";
  if (slotKey.startsWith("ability")) return "ability";
  if (slotKey.startsWith("perk")) return "perk";
  return "weapon";
}

function getSlotDisplayName(slotKey) {
  const map = {
    weapon: "Weapon slot selected",
    "ability-0": "Ability 1 selected",
    "ability-1": "Ability 2 selected",
    "ability-2": "Ability 3 selected",
    "perk-0": "Perk 1 selected",
    "perk-1": "Perk 2 selected",
    ultimate: "Ultimate slot selected",
  };

  return map[slotKey] ?? "Loadout slot selected";
}

function getLoadoutItemForSlot(slotKey) {
  const category = getSlotCategory(slotKey);

  if (slotKey === "weapon") {
    return getContentItem("weapons", loadout.weapon);
  }
  if (slotKey === "ultimate") {
    return getContentItem("ultimates", loadout.ultimate);
  }
  if (slotKey === "ability-0" || slotKey === "ability-1" || slotKey === "ability-2") {
    const index = Number(slotKey.split("-")[1]);
    return getContentItem("abilities", loadout.abilities[index]) ?? null;
  }
  if (slotKey === "perk-0" || slotKey === "perk-1") {
    const index = Number(slotKey.split("-")[1]);
    return getContentItem("perks", loadout.perks[index]) ?? null;
  }

  return getContentItem(`${category}s`, loadout.weapon) ?? null;
}

function setPreviewAvatar(element, avatar) {
  if (!element || !avatar) {
    return;
  }

  element.style.background = `linear-gradient(180deg, ${avatar.bodyColor}, ${avatar.detailColor})`;
  element.style.boxShadow = `0 0 24px ${avatar.accentColor}22, inset 0 -10px 18px rgba(0,0,0,0.24)`;
}

function getItemMetaLabel(item, type) {
  return item.slotLabel ?? item.role ?? item.category ?? type;
}

function getItemStateLabel(item) {
  if (item.state === "playable") return "Playable now";
  if (item.state === "preview") return "Preview foundation";
  if (item.locked) return "Locked / future content";
  return "Selectable";
}

function updateDetailPanel() {
  const detail = uiState.selectedDetail ?? { type: "weapon", key: loadout.weapon };
  const collectionName =
    detail.type === "ability"
      ? "abilities"
      : detail.type === "perk"
        ? "perks"
        : detail.type === "ultimate"
          ? "ultimates"
          : detail.type === "avatar"
            ? "avatars"
            : detail.type === "skin"
              ? "weaponSkins"
              : "weapons";
  const item = getContentItem(collectionName, detail.key);

  if (!item) {
    if (detailFloat) detailFloat.classList.add("is-hidden");
    return;
  }

  if (detailFloat) detailFloat.classList.remove("is-hidden");
  detailIcon.className = `content-icon content-icon--${sanitizeIconClass(item.icon ?? `${detail.type}-${item.key}`)}`;
  if (item.category) {
    detailIcon.classList.add(`content-icon--${item.category}`);
  }
  detailName.textContent = item.name;
  detailMeta.textContent = `${getItemMetaLabel(item, detail.type)} · ${getItemStateLabel(item)}`;
  detailDescription.textContent = item.description;
}

function renderValidationChips(container, items, type) {
  container.textContent = "";

  items.forEach((item) => {
    if (!item) {
      return;
    }

    const chip = document.createElement("div");
    chip.className = "validation-chip";
    chip.innerHTML = `${getIconMarkup(item, type)}<span>${item.name}</span>`;
    container.appendChild(chip);
  });
}

function updateLoadoutSummaryPanels() {
  const selectedWeapon = getContentItem("weapons", loadout.weapon);
  const selectedAbilities = loadout.abilities.map((key) => getContentItem("abilities", key)).filter(Boolean);
  const selectedPerks = loadout.perks.map((key) => getContentItem("perks", key)).filter(Boolean);

  const offense = Math.min(100, 30 + (selectedWeapon?.category === "offense" ? 24 : 10) + selectedAbilities.filter((item) => item.category === "offense").length * 14 + getRuneValue("attack", "secondary") * 6);
  const defense = Math.min(100, 24 + selectedAbilities.filter((item) => item.category === "defense").length * 20 + selectedPerks.filter((item) => item.category === "defense").length * 18 + getRuneValue("defense", "secondary") * 8);
  const utility = Math.min(100, 20 + selectedAbilities.filter((item) => item.category === "utility" || item.category === "mobility").length * 18 + selectedPerks.filter((item) => item.category === "utility").length * 12 + getRuneValue("support", "secondary") * 8);
  const control = Math.min(100, 16 + selectedAbilities.filter((item) => item.category === "control").length * 22 + getRuneValue("spells", "primary") * 10);

  powerOffense.style.width = `${offense}%`;
  powerDefense.style.width = `${defense}%`;
  powerUtility.style.width = `${utility}%`;
  powerControl.style.width = `${control}%`;
}

function updateLoadoutSlots() {
  const slotDescriptors = [
    { key: "weapon", type: "weapon" },
    { key: "ability-0", type: "ability" },
    { key: "ability-1", type: "ability" },
    { key: "ability-2", type: "ability" },
    { key: "perk-0", type: "perk" },
    { key: "perk-1", type: "perk" },
    { key: "ultimate", type: "ultimate" },
  ];

  const compatibleSlots = getPrematchCategoryConfig(uiState.buildCategory)?.compatibleSlots ?? [];

  slotDescriptors.forEach(({ key, type }) => {
    const button = loadoutSlotButtons[key.replace("-", "")] ?? loadoutSlotButtons[key];
    const item = getLoadoutItemForSlot(key);
    const icon = document.getElementById(`loadout-slot-${key}-icon`);
    const name = document.getElementById(`loadout-slot-${key}-name`);
    const meta = document.getElementById(`loadout-slot-${key}-meta`);
    const buttonNode = document.getElementById(`loadout-slot-${key}`);

    if (!buttonNode || !icon || !name || !item) {
      return;
    }

    buttonNode.classList.toggle("is-active", uiState.selectedLoadoutSlot === key);
    buttonNode.classList.toggle("is-compatible", compatibleSlots.includes(key));
    icon.className = `content-icon content-icon--${sanitizeIconClass(item.icon ?? `${type}-${item.key}`)}`;
    if (item.category) {
      icon.classList.add(`content-icon--${item.category}`);
    }
    name.textContent = item.name;
    if (meta) {
      meta.textContent = item.role ?? item.description;
    }
  });
}

function getCategoryTargetSlot(category) {
  const compatibleSlots = getPrematchCategoryConfig(category)?.compatibleSlots ?? [];
  if (compatibleSlots.includes(uiState.selectedLoadoutSlot)) {
    return uiState.selectedLoadoutSlot;
  }

  if (category === "ability") {
    return compatibleSlots.find((slot) => !getLoadoutItemForSlot(slot)) ?? compatibleSlots[0];
  }
  if (category === "perk") {
    return compatibleSlots.find((slot) => !getLoadoutItemForSlot(slot)) ?? compatibleSlots[0];
  }

  return compatibleSlots[0] ?? "weapon";
}

function assignLoadoutItem(category, slotKey, itemKey) {
  const item = getContentItem(
    category === "ability"
      ? "abilities"
      : category === "perk"
        ? "perks"
        : category === "ultimate"
          ? "ultimates"
          : "weapons",
    itemKey,
  );

  if (!item || item.state !== "playable") {
    uiState.selectedDetail = { type: category, key: itemKey };
    renderPrematch();
    return;
  }

  if (category === "weapon") {
    loadout.weapon = itemKey;
    player.weapon = itemKey;
  } else if (category === "ultimate") {
    loadout.ultimate = itemKey;
  } else if (category === "ability") {
    const targetIndex = Number(slotKey.split("-")[1]);
    loadout.abilities = loadout.abilities.filter((key) => key !== itemKey);
    while (loadout.abilities.length < 3) {
      loadout.abilities.push(null);
    }
    loadout.abilities[targetIndex] = itemKey;
    loadout.abilities = loadout.abilities.filter(Boolean);
    while (loadout.abilities.length < 3) {
      loadout.abilities.push(["vectorDash", "shockJavelin", "magneticField"].find((fallback) => !loadout.abilities.includes(fallback)) ?? "vectorDash");
      loadout.abilities = [...new Set(loadout.abilities)];
    }
    loadout.abilities = loadout.abilities.slice(0, 3);
  } else if (category === "perk") {
    const targetIndex = Number(slotKey.split("-")[1]);
    loadout.perks = loadout.perks.filter((key) => key !== itemKey);
    while (loadout.perks.length < 2) {
      loadout.perks.push(null);
    }
    loadout.perks[targetIndex] = itemKey;
    loadout.perks = loadout.perks.filter(Boolean).slice(0, 2);
  }

  uiState.selectedLoadoutSlot = slotKey;
  uiState.selectedDetail = { type: category, key: itemKey };
  renderPrematch();
}

function renderBuildLibrary() {
  const isRunesTab = uiState.buildCategory === "runes";

  buildLibraryGrid.style.display = isRunesTab ? "none" : "";
  if (runePanel) {
    runePanel.classList.toggle("is-hidden", !isRunesTab);
  }

  libraryTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.library === uiState.buildCategory);
  });

  if (isRunesTab) {
    return;
  }

  const config = getPrematchCategoryConfig(uiState.buildCategory);
  const items = getPrematchCategoryItems(uiState.buildCategory);

  renderSelectionGrid(
    buildLibraryGrid,
    items,
    config.selectedKeys,
    (itemKey) => {
      const targetSlot = getCategoryTargetSlot(uiState.buildCategory);
      assignLoadoutItem(uiState.buildCategory, targetSlot, itemKey);
    },
    {
      activeKeys: config.selectedKeys,
      iconType: config.iconType,
    },
  );
}

function renderCosmetics() {
  renderSelectionGrid(
    avatarOptions,
    Object.values(content.avatars),
    [loadout.avatar],
    (avatarKey) => {
      loadout.avatar = avatarKey;
      uiState.selectedDetail = { type: "avatar", key: avatarKey };
      renderPrematch();
    },
    { iconType: "avatar" },
  );

  renderSelectionGrid(
    weaponSkinOptions,
    Object.values(content.weaponSkins),
    [loadout.weaponSkin],
    (skinKey) => {
      loadout.weaponSkin = skinKey;
      uiState.selectedDetail = { type: "skin", key: skinKey };
      renderPrematch();
    },
    { iconType: "skin" },
  );

  const avatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;
  const skin = content.weaponSkins[loadout.weaponSkin] ?? content.weaponSkins.stock;
  setPreviewAvatar(cosmeticAvatarPreview, avatar);
  cosmeticWeaponIcon.className = `content-icon content-icon--${sanitizeIconClass(skin.icon)}`;
  cosmeticWeaponName.textContent = skin.name;
  cosmeticWeaponCopy.textContent = skin.description;
}

function renderRuneTrees() {
  runeGrid.textContent = "";
  const selectedUltimateTree = getSelectedRuneUltimateTree();

  Object.values(content.runeTrees).forEach((tree) => {
    const treeState = loadout.runes[tree.key];
    const treeEl = document.createElement("div");
    treeEl.className = "rune-tree";
    const totalPts = treeState.secondary + treeState.primary + treeState.ultimate;
    const nodes = Object.values(tree.nodes);

    let nodesMarkup = "";
    nodes.forEach((node, i) => {
      const points = treeState[node.key];
      const isUltimate = node.key === "ultimate";
      const disabledAdd =
        points >= node.max ||
        (!isUltimate && getRemainingRunePoints() <= 0) ||
        (isUltimate && selectedUltimateTree && selectedUltimateTree !== tree.key) ||
        (isUltimate && getRemainingRunePoints() <= 0 && points === 0);

      if (i > 0) {
        const prevNode = nodes[i - 1];
        const prevHasPoints = treeState[prevNode.key] > 0;
        nodesMarkup += `<div class="rune-tree__connector ${prevHasPoints ? "is-lit" : ""}"></div>`;
      }

      nodesMarkup += `
        <div class="rune-node-v2 ${isUltimate ? "rune-node-v2--ultimate" : ""} ${isUltimate && points > 0 ? "is-selected" : ""}">
          <div class="rune-node-v2__dot ${points > 0 ? "has-points" : ""}">${points}</div>
          <div class="rune-node-v2__info">
            <span class="rune-node-v2__name">${node.name}</span>
            <span class="rune-node-v2__tier">${isUltimate ? "Capstone" : node.key === "primary" ? "Core" : "Minor"} · ${points}/${node.max}</span>
          </div>
          <div class="rune-node-v2__controls">
            <button type="button" data-rune-tree="${tree.key}" data-rune-node="${node.key}" data-rune-action="remove" ${points <= 0 ? "disabled" : ""}>−</button>
            <button type="button" data-rune-tree="${tree.key}" data-rune-node="${node.key}" data-rune-action="${isUltimate ? "toggle" : "add"}" ${disabledAdd ? "disabled" : ""}>${isUltimate ? (points > 0 ? "✓" : "◆") : "+"}</button>
          </div>
        </div>
      `;
    });

    treeEl.innerHTML = `
      <div class="rune-tree__header">
        <strong>${tree.name}</strong>
        <span class="rune-tree__pts">${totalPts}</span>
      </div>
      <div class="rune-tree__nodes">${nodesMarkup}</div>
    `;

    runeGrid.appendChild(treeEl);
  });

  runeGrid.querySelectorAll("[data-rune-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const treeKey = button.dataset.runeTree;
      const nodeKey = button.dataset.runeNode;
      const action = button.dataset.runeAction;

      if (action === "toggle") {
        toggleRuneUltimate(treeKey);
        return;
      }

      adjustRuneNode(treeKey, nodeKey, action === "add" ? 1 : -1);
    });
  });
}

function adjustRuneNode(treeKey, nodeKey, delta) {
  const tree = content.runeTrees[treeKey];
  if (!tree) {
    return;
  }

  const node = tree.nodes[nodeKey];
  const treeState = loadout.runes[treeKey];
  if (!node || !treeState || nodeKey === "ultimate") {
    return;
  }

  if (delta > 0) {
    if (getRemainingRunePoints() <= 0 || treeState[nodeKey] >= node.max) {
      return;
    }
    treeState[nodeKey] += 1;
  } else if (delta < 0) {
    if (treeState[nodeKey] <= 0) {
      return;
    }
    treeState[nodeKey] -= 1;
  }

  renderPrematch();
}

function toggleRuneUltimate(treeKey) {
  const tree = content.runeTrees[treeKey];
  const treeState = loadout.runes[treeKey];
  if (!tree || !treeState) {
    return;
  }

  const selectedUltimateTree = getSelectedRuneUltimateTree();

  if (treeState.ultimate > 0) {
    treeState.ultimate = 0;
    renderPrematch();
    return;
  }

  if (selectedUltimateTree && selectedUltimateTree !== treeKey) {
    return;
  }

  if (getRemainingRunePoints() <= 0) {
    return;
  }

  treeState.ultimate = 1;
  renderPrematch();
}

function renderPrematch() {
  modeDuel.classList.toggle("is-selected", uiState.selectedMode === sandboxModes.duel.key);
  modeTraining.classList.toggle("is-selected", uiState.selectedMode === sandboxModes.training.key);
  const avatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;

  setPreviewAvatar(cosmeticAvatarPreview, avatar);
  renderBuildLibrary();
  renderCosmetics();
  updateLoadoutSlots();
  updateLoadoutSummaryPanels();
  updateDetailPanel();
  renderRuneTrees();
  updatePrematchSummary();
}

function toggleHelpPanel(forceOpen) {
  sandbox.helpOpen = forceOpen ?? !sandbox.helpOpen;
  helpPanel.classList.toggle("is-hidden", !sandbox.helpOpen);
  helpToggle.textContent = sandbox.helpOpen ? "Hide" : "Help";
}

function getStatusState(entity) {
  let slow = 0;
  let stunned = false;
  let stunTime = 0;

  for (const effect of entity.statusEffects ?? []) {
    if (effect.type === "slow") {
      slow = Math.max(slow, effect.magnitude);
    } else if (effect.type === "stun") {
      stunned = true;
      stunTime = Math.max(stunTime, effect.time);
    }
  }

  return {
    slow,
    speedMultiplier: 1 - slow,
    stunned,
    stunTime,
  };
}

function resize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function getMoveVector() {
  let x = 0;
  let y = 0;

  if (input.keys.has("KeyW")) y -= 1;
  if (input.keys.has("KeyS")) y += 1;
  if (input.keys.has("KeyA")) x -= 1;
  if (input.keys.has("KeyD")) x += 1;

  x += input.moveTouchX;
  y += input.moveTouchY;

  if (x === 0 && y === 0) {
    return { x: 0, y: 0 };
  }

  return normalize(x, y);
}

function spawnBullet(owner, targetX, targetY, collection, color, speed, damage) {
  const direction = normalize(targetX - owner.x, targetY - owner.y);
  const startX = owner.x + direction.x * (owner.radius + 8);
  const startY = owner.y + direction.y * (owner.radius + 8);
  collection.push({
    x: startX,
    y: startY,
    vx: direction.x * speed,
    vy: direction.y * speed,
    radius: 4,
    damage,
    life: config.bulletLife,
    color,
  });

  tracers.push({
    x0: startX - direction.x * 18,
    y0: startY - direction.y * 18,
    x1: startX + direction.x * 34,
    y1: startY + direction.y * 34,
    color,
    life: 0.05,
    maxLife: 0.05,
  });
}

function addImpact(x, y, color, size = 14) {
  impacts.push({
    x,
    y,
    color,
    size,
    life: 0.18,
    maxLife: 0.18,
  });
}

function addAfterimage(x, y, facing, radius, color) {
  afterimages.push({
    x,
    y,
    facing,
    radius,
    color,
    life: 0.12,
    maxLife: 0.12,
  });
}

function addSlashEffect(x, y, facing, comboStep) {
  slashEffects.push({
    x,
    y,
    facing,
    comboStep,
    life: comboStep === 3 ? 0.16 : comboStep === 2 ? 0.13 : 0.1,
    maxLife: comboStep === 3 ? 0.16 : comboStep === 2 ? 0.13 : 0.1,
  });
}

function addExplosion(x, y, radius, color) {
  explosions.push({
    x,
    y,
    radius,
    color,
    life: 0.18,
    maxLife: 0.18,
  });
}

function addAbsorbBurst(x, y, radius, color) {
  absorbBursts.push({
    x,
    y,
    radius,
    color,
    life: 0.16,
    maxLife: 0.16,
  });
}

function addShake(amount) {
  screenShake = Math.max(screenShake, amount);
}

function isOverdriveActive() {
  return player.overdriveTime > 0;
}

function getActiveDashCooldown() {
  return config.dashCooldown * getBuildStats().dashCooldownMultiplier * (isOverdriveActive() ? overdrive.dashMultiplier : 1);
}

function getActiveDashCharges() {
  return isOverdriveActive() ? overdrive.dashCharges : 1;
}

function getDashProfile(mode = abilityState.dash.mode) {
  if (mode === "hold") {
    return {
      duration: abilityConfig.dash.holdDuration,
      invulnerability: abilityConfig.dash.holdInvulnerability,
      speed: abilityConfig.dash.holdSpeed,
      trailColor: isOverdriveActive()
        ? abilityConfig.dash.overdriveTrailColor
        : "#c8ffe4",
    };
  }

  return {
    duration: abilityConfig.dash.tapDuration,
    invulnerability: abilityConfig.dash.tapInvulnerability,
    speed: abilityConfig.dash.tapSpeed,
    trailColor: isOverdriveActive()
      ? abilityConfig.dash.overdriveTrailColor
      : abilityConfig.dash.trailColor,
  };
}

function getWeaponCooldown(weaponKey) {
  const weapon = weapons[weaponKey] ?? weapons.pulse;
  return weapon.cooldown * (isOverdriveActive() ? overdrive.attackSpeedMultiplier : 1) / getBuildStats().hasteMultiplier;
}

function getActiveMoveSpeed() {
  const buildStats = getBuildStats();
  const overdriveSpeed = isOverdriveActive() ? overdrive.moveSpeedMultiplier : 1;
  const fieldBoost = abilityState.field.moveBoostTime > 0 ? config.fieldTapMoveBoost : 1;
  return config.playerSpeed * overdriveSpeed * fieldBoost * buildStats.moveMultiplier;
}

function addEnergy(amount) {
  if (isOverdriveActive()) {
    return;
  }

  player.energy = clamp(player.energy + amount * getBuildStats().energyMultiplier, 0, config.overdriveMaxEnergy);
}

function getAllBots() {
  return bots.filter((bot) => bot.modes.includes(sandbox.mode));
}

function getPrimaryBot() {
  const activeBots = getAllBots();

  if (sandbox.mode === sandboxModes.duel.key) {
    return activeBots.find((bot) => bot.role === "hunter") ?? null;
  }

  let bestBot = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const bot of activeBots) {
    if (!bot.alive) {
      continue;
    }

    const distance = length(bot.x - input.mouseX, bot.y - input.mouseY);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestBot = bot;
    }
  }

  return bestBot ?? activeBots.find((bot) => bot.alive) ?? activeBots[0] ?? null;
}

function getPlayerSpawn(mode = sandbox.mode) {
  if (mode === sandboxModes.training.key) {
    return { x: arena.width * 0.2, y: arena.height * 0.72 };
  }

  return { x: arena.width * 0.22, y: arena.height * 0.64 };
}

function isCombatLive() {
  return !uiState.prematchOpen && (sandbox.mode !== sandboxModes.duel.key || matchState.phase === "active");
}

function resetBotsForMode(mode = sandbox.mode) {
  for (const bot of bots) {
    bot.x = bot.spawnX;
    bot.y = bot.spawnY;
    bot.hp = bot.maxHp;
    bot.alive = bot.modes.includes(mode);
    bot.flash = 0;
    bot.facing = 0;
    bot.shootCooldown = bot.role === "hunter" ? 0.7 : 999;
    bot.cadence = 0.72;
    bot.strafeTimer = 0;
    bot.dodgeCooldown = 0.6;
    bot.dodgeTime = 0;
    bot.dodgeVectorX = 0;
    bot.dodgeVectorY = 0;
    bot.burstShots = 0;
    bot.shotSpread = 0;
    clearStatusEffects(bot);
  }
}

function showRoundBanner(label, title, visible = true) {
  matchState.bannerLabel = label;
  matchState.bannerTitle = title;
  matchState.bannerVisible = visible;
}

function getRoundIntroSequence(roundNumber) {
  return [
    { label: `ROUND ${roundNumber}`, title: "", duration: 0.8, style: "intro" },
    { label: "Get Ready", title: "3", duration: 0.55, style: "countdown" },
    { label: "Get Ready", title: "2", duration: 0.55, style: "countdown" },
    { label: "Get Ready", title: "1", duration: 0.55, style: "countdown" },
    { label: `ROUND ${roundNumber}`, title: "FIGHT!", duration: 0.7, style: "fight" },
  ];
}

function startDuelRound({ resetScore = false } = {}) {
  if (resetScore) {
    matchState.playerRounds = 0;
    matchState.enemyRounds = 0;
    matchState.roundNumber = 1;
  }

  clearCombatArtifacts();
  resetPlayer({ silent: true });
  resetBotsForMode(sandboxModes.duel.key);
  matchState.phase = "round_intro";
  matchState.introSequence = getRoundIntroSequence(matchState.roundNumber);
  matchState.introIndex = 0;
  matchState.timer = matchState.introSequence[0].duration;
  matchState.bannerStyle = matchState.introSequence[0].style;
  showRoundBanner(matchState.introSequence[0].label, matchState.introSequence[0].title, true);
  statusLine.textContent = `Round ${matchState.roundNumber} incoming. Hold center and be ready.`;
}

function finishDuelRound(winner) {
  if (sandbox.mode !== sandboxModes.duel.key || matchState.phase !== "active") {
    return;
  }

  if (winner === "player") {
    matchState.playerRounds += 1;
    matchState.phase = "round_end";
    matchState.timer = 1.45;
    showRoundBanner(`Round ${matchState.roundNumber}`, "Round Won");
    statusLine.textContent = "Round won. Stay sharp for the reset.";
  } else {
    matchState.enemyRounds += 1;
    matchState.phase = "round_end";
    matchState.timer = 1.45;
    showRoundBanner(`Round ${matchState.roundNumber}`, "Round Lost");
    statusLine.textContent = "Round lost. Reset and re-enter clean.";
  }
}

function updateDuelMatch(dt) {
  if (sandbox.mode !== sandboxModes.duel.key) {
    showRoundBanner("", "", false);
    return;
  }

  if (matchState.phase === "active") {
    showRoundBanner("", "", false);
    return;
  }

  matchState.timer = Math.max(0, matchState.timer - dt);

  if (matchState.phase === "round_intro") {
    if (matchState.timer <= 0) {
      matchState.introIndex += 1;

      if (matchState.introIndex >= matchState.introSequence.length) {
        matchState.phase = "active";
        matchState.bannerStyle = "intro";
        showRoundBanner("", "", false);
        statusLine.textContent = "Fight. Contest space and close the round.";
      } else {
        const step = matchState.introSequence[matchState.introIndex];
        matchState.timer = step.duration;
        matchState.bannerStyle = step.style;
        showRoundBanner(step.label, step.title, true);

        if (step.style === "fight") {
          player.overdrivePulse = 0.18;
        }
      }
    }
    return;
  }

  if (matchState.phase === "round_end") {
    if (matchState.timer <= 0) {
      if (
        matchState.playerRounds >= matchState.formatWins ||
        matchState.enemyRounds >= matchState.formatWins
      ) {
        matchState.phase = "match_end";
        matchState.timer = 2.2;
        showRoundBanner(
          "Match Point",
          matchState.playerRounds > matchState.enemyRounds ? "Victory" : "Defeat",
          true,
        );
        statusLine.textContent =
          matchState.playerRounds > matchState.enemyRounds
            ? "Match won. Duel sequence resetting."
            : "Match lost. Duel sequence resetting.";
      } else {
        matchState.roundNumber += 1;
        startDuelRound();
      }
    }
    return;
  }

  if (matchState.phase === "match_end" && matchState.timer <= 0) {
    startDuelRound({ resetScore: true });
  }
}

function switchSandboxMode(nextMode) {
  if (!sandboxModes[nextMode] || sandbox.mode === nextMode) {
    return;
  }

  sandbox.mode = nextMode;
  uiState.selectedMode = nextMode;
  clearCombatArtifacts();

  if (nextMode === sandboxModes.training.key) {
    resetPlayer({ silent: true });
    resetBotsForMode(nextMode);
    showRoundBanner("", "", false);
    statusLine.textContent = "Training Map active. Line up hits and read status application.";
    return;
  }

  startDuelRound({ resetScore: true });
  statusLine.textContent = "Duel Map active. Match flow initialized.";
}

function launchSelectedSession() {
  loadout.weapon = loadout.weapon in weapons ? loadout.weapon : weapons.pulse.key;
  while (loadout.abilities.length < 3) {
    for (const fallback of ["vectorDash", "shockJavelin", "magneticField", "energyShield"]) {
      if (!loadout.abilities.includes(fallback)) {
        loadout.abilities.push(fallback);
      }
      if (loadout.abilities.length >= 3) {
        break;
      }
    }
  }
  player.weapon = loadout.weapon;
  closePrematch();
  if (sandbox.mode !== uiState.selectedMode) {
    switchSandboxMode(uiState.selectedMode);
  } else if (uiState.selectedMode === sandboxModes.training.key) {
    resetPlayer({ silent: true });
    resetBotsForMode(sandboxModes.training.key);
    showRoundBanner("", "", false);
  } else {
    startDuelRound({ resetScore: true });
  }

  if (uiState.selectedMode === sandboxModes.training.key) {
    statusLine.textContent = "Training run started. Test ranges, hitboxes, and rune ideas.";
  } else {
    statusLine.textContent = "Duel started. Read the round and contest space cleanly.";
  }
}

function handlePrematchAction(buttonId) {
  if (buttonId === "mode-duel") {
    uiState.selectedMode = sandboxModes.duel.key;
    statusLine.textContent = "Duel Map selected.";
    renderPrematch();
    return;
  }

  if (buttonId === "mode-training") {
    uiState.selectedMode = sandboxModes.training.key;
    statusLine.textContent = "Training Map selected.";
    renderPrematch();
    return;
  }

  if (buttonId === "step-mode" || buttonId === "back-mode") {
    setPrematchStep("mode");
    statusLine.textContent = "Mode select open.";
    return;
  }

  if (buttonId === "step-build" || buttonId === "continue-build") {
    setPrematchStep("build");
    statusLine.textContent = "Build phase open. Lock the loadout, then press Ready.";
    return;
  }

  if (buttonId === "start-session") {
    launchSelectedSession();
  }
}

window.handlePrematchAction = handlePrematchAction;

function bindPrematchButton(button, actionId) {
  if (!button) {
    return;
  }

  const runAction = (event) => {
    event.preventDefault();
    event.stopPropagation();
    handlePrematchAction(actionId);
  };

  button.addEventListener("click", runAction);
  button.addEventListener("pointerup", runAction);
  button.addEventListener("keydown", (event) => {
    if (event.code === "Enter" || event.code === "Space") {
      runAction(event);
    }
  });
}

function getJavelinProfile(mode = abilityState.javelin.mode) {
  const profile = mode === "hold" ? abilityConfig.javelin.hold : abilityConfig.javelin.tap;

  return {
    ...profile,
    piercing: mode === "tap" && isOverdriveActive(),
    speed:
      mode === "tap" && isOverdriveActive()
        ? profile.speed * 1.15
        : profile.speed,
    stun:
      mode === "hold" && isOverdriveActive()
        ? (profile.stun ?? 0) + 0.2
        : profile.stun ?? 0,
  };
}

function getFieldProfile(mode = abilityState.field.mode) {
  const profile = mode === "hold" ? abilityConfig.field.hold : abilityConfig.field.tap;

  return {
    ...profile,
    radius:
      mode === "hold" && isOverdriveActive()
        ? profile.radius * 1.28
        : profile.radius,
    slow:
      mode === "hold" && isOverdriveActive()
        ? Math.min(0.82, profile.slow + 0.14)
        : profile.slow,
    disruption:
      mode === "hold" && isOverdriveActive()
        ? 0.85
        : 0,
    moveBoost:
      mode === "tap" && isOverdriveActive()
        ? config.fieldTapMoveBoost
        : 1,
    moveBoostDuration:
      mode === "tap" && isOverdriveActive()
        ? config.fieldTapMoveBoostDuration
        : 0,
  };
}

function startDashInput() {
  if (!isCombatLive()) {
    return;
  }

  if (abilityState.dash.inputHeld || abilityState.dash.charges <= 0 || abilityState.dash.activeTime > 0) {
    return;
  }

  abilityState.dash.inputHeld = true;
  abilityState.dash.holdTime = 0;
}

function releaseDashInput() {
  if (!abilityState.dash.inputHeld || abilityState.dash.charges <= 0 || abilityState.dash.activeTime > 0) {
    return;
  }

  const move = getMoveVector();
  const aim = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const dashDirection = move.x !== 0 || move.y !== 0 ? move : aim;
  const dashMode =
    abilityState.dash.holdTime >= abilityConfig.dash.holdThreshold ? "hold" : "tap";
  const dashProfile = getDashProfile(dashMode);

  abilityState.dash.inputHeld = false;
  abilityState.dash.holdTime = 0;
  abilityState.dash.mode = dashMode;
  abilityState.dash.vectorX = dashDirection.x;
  abilityState.dash.vectorY = dashDirection.y;
  abilityState.dash.activeTime = dashProfile.duration;
  abilityState.dash.invulnerabilityTime = dashProfile.invulnerability;
  abilityState.dash.charges -= 1;

  if (
    abilityState.dash.charges < getActiveDashCharges() &&
    abilityState.dash.rechargeTimer <= 0
  ) {
    abilityState.dash.rechargeTimer = getActiveDashCooldown();
  }

  player.flash = 0.12;
  if (hasPerk("adrenalSurge")) {
    player.afterDashHasteTime = 1.2;
  }
  if (hasPerk("ghostCircuit")) {
    player.ghostTime = 0.28;
  }
  addImpact(player.x, player.y, dashMode === "hold" ? "#c8ffe4" : "#9df4b7", dashMode === "hold" ? 34 : 26);
  addShake(dashMode === "hold" ? 7.5 : 6);
}

function updateDashAbility(dt) {
  const wasOverdriveActive = isOverdriveActive();
  const activeDashCharges = getActiveDashCharges();

  if (abilityState.dash.inputHeld) {
    abilityState.dash.holdTime = Math.min(0.4, abilityState.dash.holdTime + dt);
  }

  if (abilityState.dash.charges > activeDashCharges) {
    abilityState.dash.charges = activeDashCharges;
  }

  if (abilityState.dash.charges < activeDashCharges) {
    abilityState.dash.rechargeTimer = Math.max(0, abilityState.dash.rechargeTimer - dt);

    if (abilityState.dash.rechargeTimer === 0) {
      abilityState.dash.charges += 1;

      if (abilityState.dash.charges < activeDashCharges) {
        abilityState.dash.rechargeTimer = getActiveDashCooldown();
      }
    }
  } else {
    abilityState.dash.rechargeTimer = 0;
  }

  abilityState.dash.invulnerabilityTime = Math.max(0, abilityState.dash.invulnerabilityTime - dt);

  if (abilityState.dash.activeTime > 0) {
    const dashProfile = getDashProfile(abilityState.dash.mode);
    abilityState.dash.activeTime = Math.max(0, abilityState.dash.activeTime - dt);
    player.velocityX = abilityState.dash.vectorX * dashProfile.speed;
    player.velocityY = abilityState.dash.vectorY * dashProfile.speed;
    addAfterimage(
      player.x,
      player.y,
      player.facing,
      player.radius + (isOverdriveActive() ? 2 : 0),
      dashProfile.trailColor,
    );

    if (isOverdriveActive()) {
      addAfterimage(player.x, player.y, player.facing, player.radius + 5, "#fff4cf");
    }
  }

  if (wasOverdriveActive && !isOverdriveActive()) {
    abilityState.dash.charges = Math.min(abilityState.dash.charges, 1);
    if (abilityState.dash.charges < 1 && abilityState.dash.rechargeTimer <= 0) {
      abilityState.dash.rechargeTimer = getActiveDashCooldown();
    }
  }
}

function startJavelinCharge() {
  if (!isCombatLive()) {
    return;
  }

  if (abilityState.javelin.cooldown > 0 || abilityState.javelin.charging) {
    return;
  }

  abilityState.javelin.charging = true;
  abilityState.javelin.chargeTime = 0;
  abilityState.javelin.mode = "tap";
  statusLine.textContent = "Charging Shock Javelin.";
}

function releaseShockJavelin() {
  if (!abilityState.javelin.charging) {
    return;
  }

  const chargeTime = abilityState.javelin.chargeTime;
  const isCharged = chargeTime >= abilityConfig.javelin.chargeThreshold;
  abilityState.javelin.mode = isCharged ? "hold" : "tap";
  const javelinProfile = getJavelinProfile(abilityState.javelin.mode);
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);

  shockJavelins.push({
    x: player.x + direction.x * (player.radius + 12),
    y: player.y + direction.y * (player.radius + 12),
    vx: direction.x * javelinProfile.speed,
    vy: direction.y * javelinProfile.speed,
    radius: javelinProfile.radius,
    damage: javelinProfile.damage,
    charged: isCharged,
    life: 1.1,
    color: javelinProfile.color,
    glow: javelinProfile.glow,
    trail: javelinProfile.trail,
    piercing: javelinProfile.piercing,
    slow: javelinProfile.slow ?? 0,
    slowDuration: javelinProfile.slowDuration ?? 0,
    stun: javelinProfile.stun ?? 0,
    hitTargets: new Set(),
  });

  abilityState.javelin.charging = false;
  abilityState.javelin.chargeTime = 0;
  abilityState.javelin.cooldown = abilityConfig.javelin.cooldown;
  player.recoil = Math.max(player.recoil, 0.22);
  addImpact(
    player.x + direction.x * 22,
    player.y + direction.y * 22,
    javelinProfile.color,
    isCharged ? 28 : 22,
  );
  addImpact(
    player.x + direction.x * 28,
    player.y + direction.y * 28,
    isCharged ? "#fff0bb" : "#dff7ff",
    isCharged ? 18 : 14,
  );
  addShake(isCharged ? 8.2 : 6);
  statusLine.textContent = isCharged
    ? "Charged Shock Javelin launched."
    : "Shock Javelin launched.";
}

function spawnEnemyJavelin(charged = false) {
  const direction = normalize(player.x - enemy.x, player.y - enemy.y);
  const speed = charged ? 860 : 1020;
  const radius = charged ? 14 : 10;
  const damage = charged ? 22 : 16;

  enemyShockJavelins.push({
    x: enemy.x + direction.x * (enemy.radius + 12),
    y: enemy.y + direction.y * (enemy.radius + 12),
    vx: direction.x * speed,
    vy: direction.y * speed,
    radius,
    damage,
    charged,
    life: 1,
    color: charged ? "#ffb497" : "#ff8a77",
    glow: charged ? "#ffd6c8" : "#ffc1b2",
    trail: charged ? "#ffd8b5" : "#ff9c8a",
    stun: charged ? 0.34 : 0,
    slow: charged ? 0 : 0.2,
    slowDuration: charged ? 0 : 0.65,
  });

  enemy.javelinCooldown = charged ? 4.2 : 3.2;
  addImpact(enemy.x + direction.x * 24, enemy.y + direction.y * 24, charged ? "#ffd1bd" : "#ff8a77", charged ? 18 : 12);
}

function updateJavelinAbility(dt) {
  abilityState.javelin.cooldown = Math.max(0, abilityState.javelin.cooldown - dt);

  if (abilityState.javelin.charging) {
    abilityState.javelin.chargeTime = Math.min(abilityConfig.javelin.maxCharge, abilityState.javelin.chargeTime + dt);
    abilityState.javelin.mode =
      abilityState.javelin.chargeTime >= abilityConfig.javelin.chargeThreshold ? "hold" : "tap";
  }
}

function startFieldCharge() {
  if (!isCombatLive()) {
    return;
  }

  if (abilityState.field.cooldown > 0 || abilityState.field.charging) {
    return;
  }

  abilityState.field.charging = true;
  abilityState.field.chargeTime = 0;
  abilityState.field.mode = "tap";
  statusLine.textContent = "Charging Magnetic Field.";
}

function releaseMagneticField() {
  if (!abilityState.field.charging) {
    return;
  }

  const isHold = abilityState.field.chargeTime >= abilityConfig.field.chargeThreshold;
  abilityState.field.mode = isHold ? "hold" : "tap";
  const fieldProfile = getFieldProfile(abilityState.field.mode);
  const centerX = fieldProfile.anchor === "player" ? player.x : input.mouseX;
  const centerY = fieldProfile.anchor === "player" ? player.y : input.mouseY;

  magneticFields.push({
    x: centerX,
    y: centerY,
    radius: fieldProfile.radius,
    duration: fieldProfile.duration,
    life: fieldProfile.duration,
    slow: fieldProfile.slow,
    damageReduction: fieldProfile.damageReduction,
    anchor: fieldProfile.anchor,
    color: fieldProfile.color,
    glow: fieldProfile.glow,
    disruption: fieldProfile.disruption,
    overdrive: isOverdriveActive(),
    team: "player",
    touchedTargets: new Set(),
  });

  if (fieldProfile.moveBoost > 1) {
    abilityState.field.moveBoostTime = fieldProfile.moveBoostDuration;
  }

  abilityState.field.charging = false;
  abilityState.field.chargeTime = 0;
  abilityState.field.cooldown = abilityConfig.field.cooldown;
  addImpact(centerX, centerY, fieldProfile.color, isHold ? 28 : 22);
  addShake(isHold ? 6.5 : 4.2);
  statusLine.textContent = isHold
    ? "Magnetic Field deployed for zone control."
    : "Magnetic Field deployed around you.";
}

function updateFieldAbility(dt) {
  abilityState.field.cooldown = Math.max(0, abilityState.field.cooldown - dt);
  abilityState.field.moveBoostTime = Math.max(0, abilityState.field.moveBoostTime - dt);

  if (abilityState.field.charging) {
    abilityState.field.chargeTime = Math.min(1, abilityState.field.chargeTime + dt);
    abilityState.field.mode =
      abilityState.field.chargeTime >= abilityConfig.field.chargeThreshold ? "hold" : "tap";
  }

  for (let index = magneticFields.length - 1; index >= 0; index -= 1) {
    const field = magneticFields[index];
    field.life -= dt;

    if (field.anchor === "player") {
      field.x = player.x;
      field.y = player.y;
    }

    if (field.life <= 0) {
      magneticFields.splice(index, 1);
    }
  }
}

function castMagneticGrapple() {
  if (!isCombatLive() || abilityState.grapple.cooldown > 0) {
    return;
  }

  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  player.attackCommitX = direction.x;
  player.attackCommitY = direction.y;
  player.attackCommitSpeed = 1440;
  player.attackCommitTime = 0.16;
  abilityState.grapple.cooldown = config.grappleCooldown;
  player.flash = 0.08;
  addImpact(player.x, player.y, "#c5f6ff", 30);
  addAfterimage(player.x, player.y, player.facing, player.radius + 4, "#9ee9ff");
  addShake(6.4);
  statusLine.textContent = "Magnetic Grapple yanked you into a new line.";
}

function castEnergyShield() {
  if (!isCombatLive() || abilityState.shield.cooldown > 0) {
    return;
  }

  abilityState.shield.cooldown = config.shieldCooldown;
  player.shield = Math.max(player.shield, 26 + getRuneValue("defense", "primary") * 3);
  player.shieldTime = 2.4;
  addImpact(player.x, player.y, "#9cd5ff", 28);
  addShake(4);
  statusLine.textContent = "Energy Shield online. Absorb the next burst.";
}

function castOverdriveBooster() {
  if (!isCombatLive() || abilityState.booster.cooldown > 0) {
    return;
  }

  abilityState.booster.cooldown = config.boosterCooldown;
  addEnergy(28);
  player.hasteTime = Math.max(player.hasteTime, 1.8);
  addImpact(player.x, player.y, "#7cffef", 26);
  addShake(4.8);
  statusLine.textContent = "Overdrive Booster injected extra tempo.";
}

function castEmpBurst() {
  if (!isCombatLive() || abilityState.emp.cooldown > 0) {
    return;
  }

  abilityState.emp.cooldown = config.boosterCooldown;
  addImpact(player.x, player.y, "#be9dff", 34);
  addExplosion(player.x, player.y, 84, "#b99cff");
  addShake(5.4);

  for (const bot of getAllBots()) {
    if (!bot.alive) {
      continue;
    }

    if (length(bot.x - player.x, bot.y - player.y) <= 120 + bot.radius) {
      applyStatusEffect(bot, "slow", getStatusDuration(1), 0.38);
      bot.shootCooldown = Math.max(bot.shootCooldown, 0.8);
      addImpact(bot.x, bot.y, "#d7c4ff", 20);
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    if (length(enemyBullets[i].x - player.x, enemyBullets[i].y - player.y) <= 120) {
      addAbsorbBurst(enemyBullets[i].x, enemyBullets[i].y, 18, "#c5a9ff");
      enemyBullets.splice(i, 1);
    }
  }

  statusLine.textContent = "EMP Burst disrupted nearby tech pressure.";
}

function castUltimate() {
  if (!isCombatLive() || abilityState.ultimate.cooldown > 0) {
    return;
  }

  if (loadout.ultimate === "overdriveOverload") {
    player.energy = config.overdriveMaxEnergy;
    activateOverdrive();
    abilityState.ultimate.cooldown = config.ultimateCooldown;
    player.hasteTime = Math.max(player.hasteTime, 2.2);
    statusLine.textContent = "Overdrive Overload detonated. Force the duel now.";
    return;
  }

  if (loadout.ultimate === "phantomSplit") {
    abilityState.ultimate.cooldown = config.ultimateCooldown;
    abilityState.ultimate.phantomTime = 2.2;
    player.decoyTime = 2.2;
    player.ghostTime = 0.7;
    addAfterimage(player.x, player.y, player.facing, player.radius + 8, "#caa3ff");
    addImpact(player.x, player.y, "#d9bbff", 28);
    statusLine.textContent = "Phantom Split broke your read for a short window.";
    return;
  }

  if (loadout.ultimate === "revivalProtocol") {
    abilityState.ultimate.cooldown = config.ultimateCooldown;
    player.revivalPrimed = 5;
    addImpact(player.x, player.y, "#a3ffd1", 30);
    statusLine.textContent = "Revival Protocol primed. You have one failsafe window.";
  }
}

function updateExtraAbilities(dt) {
  abilityState.grapple.cooldown = Math.max(0, abilityState.grapple.cooldown - dt);
  abilityState.shield.cooldown = Math.max(0, abilityState.shield.cooldown - dt);
  abilityState.booster.cooldown = Math.max(0, abilityState.booster.cooldown - dt);
  abilityState.emp.cooldown = Math.max(0, abilityState.emp.cooldown - dt);
  abilityState.ultimate.cooldown = Math.max(0, abilityState.ultimate.cooldown - dt);
  abilityState.ultimate.phantomTime = Math.max(0, abilityState.ultimate.phantomTime - dt);
  player.shieldTime = Math.max(0, player.shieldTime - dt);
  player.hasteTime = Math.max(0, player.hasteTime - dt);
  player.afterDashHasteTime = Math.max(0, player.afterDashHasteTime - dt);
  player.ghostTime = Math.max(0, player.ghostTime - dt);
  player.revivalPrimed = Math.max(0, player.revivalPrimed - dt);
  player.decoyTime = Math.max(0, player.decoyTime - dt);

  if (player.shieldTime <= 0) {
    player.shield = 0;
  }
}

function startAbilityInput(slotIndex) {
  const ability = getAbilityBySlot(slotIndex);
  if (!ability) {
    return;
  }

  if (ability.key === "vectorDash") {
    startDashInput();
  } else if (ability.key === "shockJavelin") {
    startJavelinCharge();
  } else if (ability.key === "magneticField") {
    startFieldCharge();
  } else if (ability.key === "magneticGrapple") {
    castMagneticGrapple();
  } else if (ability.key === "energyShield") {
    castEnergyShield();
  } else if (ability.key === "overdriveBooster") {
    castOverdriveBooster();
  } else if (ability.key === "empBurst") {
    castEmpBurst();
  }
}

function releaseAbilityInput(slotIndex) {
  const ability = getAbilityBySlot(slotIndex);
  if (!ability) {
    return;
  }

  if (ability.key === "vectorDash") {
    releaseDashInput();
  } else if (ability.key === "shockJavelin") {
    releaseShockJavelin();
  } else if (ability.key === "magneticField") {
    releaseMagneticField();
  }
}

function getPlayerFieldModifier() {
  let damageReduction = 0;

  for (const field of magneticFields) {
    if (field.anchor !== "player" || field.team !== "player") {
      continue;
    }

    if (length(player.x - field.x, player.y - field.y) <= field.radius) {
      damageReduction = Math.max(damageReduction, field.damageReduction);
    }
  }

  return { damageReduction };
}

function getFieldInfluence(target) {
  let slowMultiplier = 1;
  let disrupted = false;
  const targetTeam = target.team ?? "enemy";

  for (const field of magneticFields) {
    if (!target.alive) {
      break;
    }

    if (field.team === targetTeam) {
      continue;
    }

    if (length(target.x - field.x, target.y - field.y) <= field.radius + target.radius) {
      slowMultiplier = Math.min(slowMultiplier, 1 - field.slow);

      if (field.disruption > 0 && !field.touchedTargets.has(target.kind)) {
        field.touchedTargets.add(target.kind);
        disrupted = true;
      }
    }
  }

  return { slowMultiplier, disrupted };
}

function spawnEnemyMagneticField() {
  magneticFields.push({
    x: enemy.x,
    y: enemy.y,
    radius: 88,
    duration: 1.4,
    life: 1.4,
    slow: 0,
    damageReduction: 0,
    anchor: "enemy",
    color: "#ffb0a2",
    glow: "#ffd1c8",
    disruption: 0,
    overdrive: false,
    team: "enemy",
    touchedTargets: new Set(),
  });
  enemy.fieldCooldown = 5.2;
  addImpact(enemy.x, enemy.y, "#ffd1c8", 24);
}

function respawnBot(bot) {
  bot.x = bot.spawnX;
  bot.y = bot.spawnY;
  bot.hp = bot.maxHp;
  bot.alive = bot.modes.includes(sandbox.mode);
  bot.flash = 0;
  bot.shootCooldown = bot.role === "hunter" ? 0.6 : 999;
  bot.dodgeCooldown = 0.8;
  bot.dodgeTime = 0;
  bot.dodgeVectorX = 0;
  bot.dodgeVectorY = 0;
  bot.burstShots = 0;
  bot.shotSpread = 0;
  clearStatusEffects(bot);
}

function damageBot(bot, damage, color, impactX, impactY, energyGain) {
  if (!bot.alive) {
    return false;
  }

  bot.hp = Math.max(0, bot.hp - damage);
  bot.flash = 0.18;
  addImpact(impactX, impactY, color, 24);

  if (energyGain > 0) {
    addEnergy(energyGain);
  }

  const buildStats = getBuildStats();
  if (buildStats.omnivamp > 0) {
    player.hp = clamp(player.hp + damage * buildStats.omnivamp, 0, buildStats.maxHp);
  }

  if (player.overdriveTriggerReady) {
    player.overdriveTriggerReady = false;
  }

  if (bot.hp <= 0) {
    bot.alive = false;
    addImpact(bot.x, bot.y, "#b6fff4", 42);
    statusLine.textContent = `${bot.role === "training" ? "Training bot" : "Enemy bot"} destroyed. Press R to reset bots.`;

    if (sandbox.mode === sandboxModes.duel.key && bot.role === "hunter") {
      finishDuelRound("player");
    }
  }

  return true;
}

function approach(current, target, maxDelta) {
  if (current < target) {
    return Math.min(target, current + maxDelta);
  }

  return Math.max(target, current - maxDelta);
}

function activateOverdrive() {
  if (!isCombatLive()) {
    return;
  }

  if (player.energy < config.overdriveMaxEnergy || isOverdriveActive()) {
    return;
  }

  player.energy = 0;
  player.overdriveTime = config.overdriveDuration;
  player.overdrivePulse = 0.45;
  player.overdriveTriggerReady = true;
  abilityState.dash.charges = overdrive.dashCharges;
  abilityState.dash.rechargeTimer = 0;
  player.flash = 0.18;
  addImpact(player.x, player.y, "#ffd375", 34);
  addImpact(player.x, player.y, "#fff1bd", 54);
  addShake(14);
  statusLine.textContent = "Overdrive active. Play hard for the next 3 seconds.";
}

function setWeapon(nextWeapon) {
  if (player.weapon === nextWeapon) {
    return;
  }

  loadout.weapon = nextWeapon;
  player.weapon = nextWeapon;
  player.fireCooldown = 0;
  player.comboStep = 0;
  player.comboTimer = 0;
  statusLine.textContent =
    nextWeapon === weapons.axe.key
      ? "Electric Axe equipped. Chain the combo and commit on the finisher."
      : nextWeapon === weapons.shotgun.key
        ? "Scrap Shotgun equipped. Play tight spacing and close for the burst."
      : "Pulse Rifle equipped. Keep the bot under ranged pressure.";
}

function attackPulseRifle() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.stock;
  player.fireCooldown = getWeaponCooldown(weapons.pulse.key);
  spawnBullet(player, input.mouseX, input.mouseY, bullets, activeSkin.tint, config.bulletSpeed, config.pulseDamage * getPerkDamageMultiplier());
  addImpact(player.x + Math.cos(player.facing) * 26, player.y + Math.sin(player.facing) * 26, "#77d8ff", 12);
  player.recoil = 1;
  addShake(2.8);
  statusLine.textContent = sandbox.mode === sandboxModes.duel.key && enemy.alive
    ? "Keep pressure with the pulse rifle."
    : "Pulse rifle online. Track the lane and confirm hits.";
}

function attackScrapShotgun() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.rustfang;
  player.fireCooldown = getWeaponCooldown(weapons.shotgun.key);
  const baseAngle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);

  for (let pellet = 0; pellet < 6; pellet += 1) {
    const spread = -0.18 + pellet * 0.072;
    const angle = baseAngle + spread;
    const targetX = player.x + Math.cos(angle) * 100;
    const targetY = player.y + Math.sin(angle) * 100;
    spawnBullet(player, targetX, targetY, bullets, activeSkin.tint, config.bulletSpeed * 0.85, 9 * getPerkDamageMultiplier());
  }

  addImpact(player.x + Math.cos(baseAngle) * 26, player.y + Math.sin(baseAngle) * 26, "#ffb078", 18);
  addShake(5.6);
  player.recoil = 1.4;
  statusLine.textContent = "Scrap Shotgun cracked out a close-range burst.";
}

function getAxeComboProfile(step) {
  if (step === 1) {
    return {
      hitMode: "line",
      cooldown: 0.34,
      range: 210,
      width: 14,
      arc: 0.2,
      damage: 48,
      cleave: false,
      commitSpeed: 0,
      commitDuration: 0,
      stun: 0,
      color: "#74f6ff",
      impactColor: "#ddffff",
      startup: 0.06,
      shake: 7.4,
      impactSize: 30,
      label: "Long electro edge cut through the lane.",
      miss: "Long opener missed. Trust the line and commit to the reach.",
    };
  }

  if (step === 2) {
    return {
      hitMode: "arc",
      cooldown: 0.42,
      range: 132,
      width: 40,
      arc: 1.18,
      damage: 42,
      cleave: true,
      commitSpeed: 0,
      commitDuration: 0,
      stun: 0,
      color: "#47cfff",
      impactColor: "#d4f6ff",
      startup: 0.08,
      shake: 9.6,
      impactSize: 36,
      label: "Heavy cleave cracked wide with electric force.",
      miss: "Cleave missed. Stay inside the broad mid-range sweep.",
    };
  }

  return {
    hitMode: "dashPath",
    cooldown: 0.62,
    range: 154,
    width: 30,
    arc: 0.44,
    damage: 70,
    cleave: false,
    commitSpeed: 1320,
    commitDuration: 0.22,
    stun: 0.5,
    color: "#ffd77e",
    impactColor: "#fff1bd",
    startup: 0.12,
    shake: 13.8,
    impactSize: 42,
    label: "Dash finisher crushed through the target and stunned it.",
    miss: "Finisher committed through empty space. Save it for the real punish.",
  };
}

function collectAxeTargets(profile) {
  const hits = [];

  for (const bot of getAllBots()) {
    if (!bot.alive) {
      continue;
    }

    const toBotX = bot.x - player.x;
    const toBotY = bot.y - player.y;
    const botDistance = length(toBotX, toBotY);
    const botAngle = Math.atan2(toBotY, toBotX);
    const deltaAngle = Math.atan2(
      Math.sin(botAngle - player.facing),
      Math.cos(botAngle - player.facing),
    );

    if (profile.hitMode === "arc") {
      if (botDistance > profile.range + bot.radius || Math.abs(deltaAngle) > profile.arc) {
        continue;
      }
    } else if (profile.hitMode === "line") {
      const lineStartX = player.x + Math.cos(player.facing) * 18;
      const lineStartY = player.y + Math.sin(player.facing) * 18;
      const lineEndX = player.x + Math.cos(player.facing) * (profile.range + 12);
      const lineEndY = player.y + Math.sin(player.facing) * (profile.range + 12);
      const lineDistance = pointToSegmentDistance(bot.x, bot.y, lineStartX, lineStartY, lineEndX, lineEndY);

      if (
        botDistance > profile.range + bot.radius + 10 ||
        Math.abs(deltaAngle) > profile.arc ||
        lineDistance > profile.width + bot.radius
      ) {
        continue;
      }
    } else {
      continue;
    }

    if (profile.hitMode !== "dashPath" && botDistance > profile.range + bot.radius + 10) {
      continue;
    }

    hits.push({ bot, distance: botDistance });
  }

  hits.sort((left, right) => left.distance - right.distance);
  return profile.hitMode === "arc" ? hits : hits.slice(0, 1);
}

function tryDashStrikeHits(profile, startX, startY, endX, endY) {
  if (!player.activeAxeStrike) {
    return false;
  }

  let hitAny = false;

  for (const bot of getAllBots()) {
    if (!bot.alive || player.activeAxeStrike.hitTargets.has(bot.kind)) {
      continue;
    }

    const pathDistance = pointToSegmentDistance(bot.x, bot.y, startX, startY, endX, endY);
    const tipX = endX + player.attackCommitX * (profile.range - 38);
    const tipY = endY + player.attackCommitY * (profile.range - 38);
    const forwardDistance = pointToSegmentDistance(bot.x, bot.y, endX, endY, tipX, tipY);

    if (
      pathDistance > player.radius + 10 + bot.radius ||
      forwardDistance > profile.width + bot.radius ||
      length(bot.x - endX, bot.y - endY) > profile.range + bot.radius + 14
    ) {
      continue;
    }

    player.activeAxeStrike.hitTargets.add(bot.kind);
    hitAny = true;
    damageBot(
      bot,
      profile.damage,
      profile.color,
      bot.x - player.attackCommitX * 6,
      bot.y - player.attackCommitY * 6,
      overdrive.hitGainAxe,
    );
    applyStatusEffect(bot, "stun", getStatusDuration(profile.stun), 1);
    addImpact(bot.x, bot.y, profile.impactColor, 42);
    addImpact(bot.x, bot.y, "#fff7dc", 24);

    if (bot.kind === "hunter") {
      bot.dodgeCooldown = Math.max(bot.dodgeCooldown, 0.55);
    }
  }

  return hitAny;
}

function attackElectricAxe() {
  player.comboStep = player.comboTimer > 0 ? (player.comboStep % 3) + 1 : 1;
  player.comboTimer = config.axeComboReset;
  const profile = { ...getAxeComboProfile(player.comboStep) };
  if (player.comboStep === 3) {
    profile.damage *= 1 + getBuildStats().finisherBonus;
  } else {
    profile.damage *= getPerkDamageMultiplier();
  }
  player.fireCooldown = profile.cooldown * (isOverdriveActive() ? overdrive.attackSpeedMultiplier : 1);
  player.attackCommitTime = profile.commitDuration;
  player.attackCommitX = Math.cos(player.facing);
  player.attackCommitY = Math.sin(player.facing);
  player.attackCommitSpeed = profile.commitSpeed;
  player.activeAxeStrike =
    profile.hitMode === "dashPath"
      ? {
          comboStep: player.comboStep,
          hitTargets: new Set(),
          connected: false,
          profile,
        }
      : null;
  player.recoil = player.comboStep === 3 ? 0.84 : player.comboStep === 2 ? 0.52 : 0.44;
  player.flash = 0.06 + profile.startup * 0.4;
  player.slashFlash = player.comboStep === 3 ? 0.26 : player.comboStep === 2 ? 0.2 : 0.16;

  if (profile.commitDuration > 0) {
    addAfterimage(player.x, player.y, player.facing, player.radius + 4, "#ffe0a0");
    addAfterimage(player.x, player.y, player.facing, player.radius + 8, "rgba(255, 224, 160, 0.8)");
  }

  addSlashEffect(
    player.x + player.attackCommitX * 20,
    player.y + player.attackCommitY * 20,
    player.facing,
    player.comboStep,
  );
  addImpact(
    player.x + player.attackCommitX * 24,
    player.y + player.attackCommitY * 24,
    profile.color,
    profile.impactSize,
  );
  if (player.comboStep === 3) {
    addImpact(
      player.x + player.attackCommitX * 42,
      player.y + player.attackCommitY * 42,
      "#fff1bd",
      24,
    );
  }
  addShake(profile.shake * 0.6);

  const hits = profile.hitMode === "dashPath" ? [] : collectAxeTargets(profile);

  if (profile.hitMode !== "dashPath" && hits.length === 0) {
    player.lastMissTime = 0.7;
    statusLine.textContent = profile.miss;
    return;
  }

  for (const hit of hits) {
    damageBot(
      hit.bot,
      profile.damage,
      profile.color,
      hit.bot.x - player.attackCommitX * 8,
      hit.bot.y - player.attackCommitY * 8,
      overdrive.hitGainAxe,
    );

    if (profile.stun > 0) {
      applyStatusEffect(hit.bot, "stun", profile.stun, 1);
      addImpact(hit.bot.x, hit.bot.y, profile.impactColor, 40);
      addImpact(hit.bot.x, hit.bot.y, "#fff7dc", 22);
    } else {
      addImpact(hit.bot.x, hit.bot.y, profile.impactColor, profile.hitMode === "arc" ? 32 : 24);
    }

    if (hit.bot.kind === "hunter") {
      hit.bot.dodgeCooldown = Math.max(hit.bot.dodgeCooldown, 0.45);
    }
  }

  if (profile.hitMode !== "dashPath") {
    addShake(profile.shake);
    statusLine.textContent = profile.label;
  } else {
    statusLine.textContent = "Electro Axe finisher committed. Drive through the target.";
  }
}

function resetPlayer({ silent = false } = {}) {
  const spawn = getPlayerSpawn();
  const buildStats = getBuildStats();
  player.x = spawn.x;
  player.y = spawn.y;
  player.hp = buildStats.maxHp;
  player.weapon = loadout.weapon;
  player.fireCooldown = 0;
  player.velocityX = 0;
  player.velocityY = 0;
  player.attackCommitTime = 0;
  player.attackCommitX = 0;
  player.attackCommitY = 0;
  player.attackCommitSpeed = 0;
  player.activeAxeStrike = null;
  player.comboStep = 0;
  player.comboTimer = 0;
  player.energy = 0;
  player.overdriveTime = 0;
  player.overdrivePulse = 0;
  player.lastMissTime = 0;
  player.shield = 0;
  player.shieldTime = 0;
  player.hasteTime = 0;
  player.afterDashHasteTime = 0;
  player.overdriveTriggerReady = false;
  player.ghostTime = 0;
  player.failsafeReady = true;
  player.revivalPrimed = 0;
  player.decoyTime = 0;
  clearStatusEffects(player);
  abilityState.dash.inputHeld = false;
  abilityState.dash.holdTime = 0;
  abilityState.dash.activeTime = 0;
  abilityState.dash.invulnerabilityTime = 0;
  abilityState.dash.charges = 1;
  abilityState.dash.rechargeTimer = 0;
  abilityState.javelin.cooldown = 0;
  abilityState.javelin.charging = false;
  abilityState.javelin.chargeTime = 0;
  abilityState.javelin.mode = "tap";
  abilityState.field.cooldown = 0;
  abilityState.field.charging = false;
  abilityState.field.chargeTime = 0;
  abilityState.field.mode = "tap";
  abilityState.field.moveBoostTime = 0;
  abilityState.grapple.cooldown = 0;
  abilityState.shield.cooldown = 0;
  abilityState.booster.cooldown = 0;
  abilityState.emp.cooldown = 0;
  abilityState.ultimate.cooldown = 0;
  abilityState.ultimate.phantomTime = 0;
  magneticFields.length = 0;
  if (!silent) {
    statusLine.textContent = "Player reset. Re-engage.";
  }
}

function updatePlayer(dt) {
  const move = getMoveVector();
  const combatLive = isCombatLive();
  const previousX = player.x;
  const previousY = player.y;
  player.facing = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.flash = Math.max(0, player.flash - dt);
  player.recoil = Math.max(0, player.recoil - dt * 7.5);
  player.comboTimer = Math.max(0, player.comboTimer - dt);
  player.slashFlash = Math.max(0, player.slashFlash - dt);
  player.overdriveTime = Math.max(0, player.overdriveTime - dt);
  player.overdrivePulse = Math.max(0, player.overdrivePulse - dt);
  updateStatusEffects(player, dt);
  const playerStatus = getStatusState(player);
  const buildStats = getBuildStats();

  updateDashAbility(dt);
  updateJavelinAbility(dt);
  updateFieldAbility(dt);
  updateExtraAbilities(dt);

  if (
    buildStats.outOfCombatRegen > 0 &&
    !input.firing &&
    enemyBullets.length === 0 &&
    player.hp > 0
  ) {
    player.hp = clamp(player.hp + buildStats.outOfCombatRegen * dt, 0, buildStats.maxHp);
  }

  if (!combatLive) {
    player.velocityX = approach(player.velocityX, 0, config.playerFriction * dt);
    player.velocityY = approach(player.velocityY, 0, config.playerFriction * dt);
  } else if (abilityState.dash.activeTime > 0) {
    // Dash owns the movement profile while it is active.
  } else if (player.attackCommitTime > 0) {
    player.attackCommitTime = Math.max(0, player.attackCommitTime - dt);
    player.velocityX = player.attackCommitX * player.attackCommitSpeed;
    player.velocityY = player.attackCommitY * player.attackCommitSpeed;
    addAfterimage(player.x, player.y, player.facing, player.radius, isOverdriveActive() ? "#ffe7a8" : "#bfffd8");
  } else if (playerStatus.stunned) {
    player.velocityX = approach(player.velocityX, 0, config.playerFriction * dt);
    player.velocityY = approach(player.velocityY, 0, config.playerFriction * dt);
  } else {
    const activeMoveSpeed = getActiveMoveSpeed() * playerStatus.speedMultiplier;
    const targetVelocityX = move.x * activeMoveSpeed;
    const targetVelocityY = move.y * activeMoveSpeed;
    const acceleration = move.x !== 0 || move.y !== 0 ? config.playerAcceleration : config.playerFriction;
    player.velocityX = approach(player.velocityX, targetVelocityX, acceleration * dt);
    player.velocityY = approach(player.velocityY, targetVelocityY, acceleration * dt);
  }

  player.x = clamp(player.x + player.velocityX * dt, player.radius, arena.width - player.radius);
  player.y = clamp(player.y + player.velocityY * dt, player.radius, arena.height - player.radius);

  if (player.activeAxeStrike) {
    const profile = player.activeAxeStrike.profile;
    const hitConnected = tryDashStrikeHits(profile, previousX, previousY, player.x, player.y);

    if (hitConnected) {
      player.activeAxeStrike.connected = true;
      addShake(profile.shake);
      statusLine.textContent = profile.label;
    }

    if (player.attackCommitTime <= 0) {
      if (!player.activeAxeStrike.connected) {
        player.lastMissTime = 0.75;
        statusLine.textContent = profile.miss;
      }

      player.activeAxeStrike = null;
    }
  }

  if (combatLive && !playerStatus.stunned && input.firing && player.fireCooldown <= 0) {
    if (player.weapon === weapons.axe.key) {
      attackElectricAxe();
    } else if (player.weapon === weapons.shotgun.key) {
      attackScrapShotgun();
    } else {
      attackPulseRifle();
    }
  }
}

function updateShockJavelins(dt) {
  for (let i = shockJavelins.length - 1; i >= 0; i -= 1) {
    const javelin = shockJavelins[i];
    javelin.x += javelin.vx * dt;
    javelin.y += javelin.vy * dt;
    javelin.life -= dt;

    tracers.push({
      x0: javelin.x - javelin.vx * 0.01,
      y0: javelin.y - javelin.vy * 0.01,
      x1: javelin.x + javelin.vx * 0.02,
      y1: javelin.y + javelin.vy * 0.02,
      color: javelin.trail,
      life: 0.04,
      maxLife: 0.04,
    });

    const outOfBounds =
      javelin.x < 0 ||
      javelin.y < 0 ||
      javelin.x > arena.width ||
      javelin.y > arena.height;

    if (outOfBounds || javelin.life <= 0) {
      shockJavelins.splice(i, 1);
      continue;
    }

    let consumed = false;

    for (const bot of getAllBots()) {
      if (!bot.alive || javelin.hitTargets.has(bot.kind)) {
        continue;
      }

      if (length(javelin.x - bot.x, javelin.y - bot.y) > javelin.radius + bot.radius) {
        continue;
      }

      javelin.hitTargets.add(bot.kind);
      damageBot(
        bot,
        javelin.damage,
        javelin.color,
        javelin.x,
        javelin.y,
        overdrive.hitGainPulse + 6,
      );
      addImpact(bot.x, bot.y, javelin.charged ? "#fff0b4" : "#dff7ff", javelin.charged ? 26 : 18);
      addShake(javelin.charged ? 8.8 : 6.8);

      if (javelin.charged) {
        applyStatusEffect(bot, "stun", getStatusDuration(javelin.stun), 1);
        addImpact(bot.x, bot.y, "#fff7d0", 30);
        statusLine.textContent = bot.role === "training"
          ? "Charged javelin stunned the training bot."
          : "Charged javelin stunned the bot.";
      } else {
        applyStatusEffect(bot, "slow", getStatusDuration(javelin.slowDuration), javelin.slow);
        addImpact(bot.x, bot.y, "#bff6ff", 20);
        statusLine.textContent = javelin.piercing
          ? "Overdrive javelin pierced through the target."
          : "Shock Javelin slowed the target.";
      }

      if (!javelin.piercing) {
        consumed = true;
        break;
      }
    }

    if (consumed) {
      shockJavelins.splice(i, 1);
    }
  }
}

function updateEnemyShockJavelins(dt) {
  for (let i = enemyShockJavelins.length - 1; i >= 0; i -= 1) {
    const javelin = enemyShockJavelins[i];
    javelin.x += javelin.vx * dt;
    javelin.y += javelin.vy * dt;
    javelin.life -= dt;

    tracers.push({
      x0: javelin.x - javelin.vx * 0.01,
      y0: javelin.y - javelin.vy * 0.01,
      x1: javelin.x + javelin.vx * 0.02,
      y1: javelin.y + javelin.vy * 0.02,
      color: javelin.trail,
      life: 0.05,
      maxLife: 0.05,
    });

    if (
      javelin.life <= 0 ||
      javelin.x < -20 ||
      javelin.y < -20 ||
      javelin.x > arena.width + 20 ||
      javelin.y > arena.height + 20
    ) {
      enemyShockJavelins.splice(i, 1);
      continue;
    }

    if (length(javelin.x - player.x, javelin.y - player.y) > javelin.radius + player.radius) {
      continue;
    }

    enemyShockJavelins.splice(i, 1);
    addImpact(player.x, player.y, javelin.charged ? "#ffd7be" : "#ffb09a", javelin.charged ? 26 : 18);

    if (abilityState.dash.invulnerabilityTime > 0) {
      addEnergy(overdrive.perfectDashGain);
      statusLine.textContent = "Clean dash through enemy javelin.";
      continue;
    }

    const defeatedByJavelin = applyPlayerDamage(javelin.damage, "javelin");
    if (javelin.stun > 0) {
      applyStatusEffect(player, "stun", getStatusDuration(javelin.stun * (1 - getBuildStats().ccReduction)), 1);
      statusLine.textContent = "Enemy javelin stunned you.";
    } else {
      applyStatusEffect(player, "slow", getStatusDuration(javelin.slowDuration * (1 - getBuildStats().ccReduction)), javelin.slow);
      statusLine.textContent = "Enemy javelin slowed you.";
    }
    addShake(javelin.charged ? 8 : 5.8);

    if (defeatedByJavelin) {
      if (sandbox.mode === sandboxModes.duel.key) {
        finishDuelRound("enemy");
      } else {
        resetPlayer();
      }
    }
  }
}

function updateEnemy(dt) {
  enemy.flash = Math.max(0, enemy.flash - dt);
  updateStatusEffects(enemy, dt);

  if (sandbox.mode !== sandboxModes.duel.key || !enemy.alive || !isCombatLive()) {
    return;
  }

  const enemyStatus = getStatusState(enemy);
  enemy.javelinCooldown = Math.max(0, enemy.javelinCooldown - dt);
  enemy.fieldCooldown = Math.max(0, enemy.fieldCooldown - dt);
  enemy.dashCooldown = Math.max(0, enemy.dashCooldown - dt);
  enemy.postAttackMoveTime = Math.max(0, enemy.postAttackMoveTime - dt);
  player.lastMissTime = Math.max(0, (player.lastMissTime ?? 0) - dt);
  enemy.shootCooldown -= dt;
  enemy.strafeTimer += dt;
  enemy.dodgeCooldown = Math.max(0, enemy.dodgeCooldown - dt);

  const targetX = player.decoyTime > 0 ? player.x - 44 : player.x;
  const targetY = player.decoyTime > 0 ? player.y + 18 : player.y;
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const distance = length(dx, dy);
  const forward = normalize(dx, dy);
  const side = { x: -forward.y, y: forward.x };
  const enemyFieldModifier = getFieldInfluence(enemy);
  const playerLow = player.hp <= 38;
  const enemyLow = enemy.hp <= 56;
  const playerOnAxe = player.weapon === weapons.axe.key;
  const playerOnShotgun = player.weapon === weapons.shotgun.key;
  const targetRange = enemyLow ? 430 : playerOnAxe ? 320 : playerOnShotgun ? 360 : 400;
  const shouldPunish = (player.lastMissTime ?? 0) > 0 || playerLow;

  let moveX = 0;
  let moveY = 0;

  if (enemyStatus.stunned) {
    enemy.dodgeTime = 0;
  } else if (enemy.dodgeTime > 0) {
    enemy.dodgeTime = Math.max(0, enemy.dodgeTime - dt);
    moveX = enemy.dodgeVectorX;
    moveY = enemy.dodgeVectorY;
    addAfterimage(enemy.x, enemy.y, Math.atan2(moveY, moveX), enemy.radius, "#ffc3b8");
  } else {
    const strafeScale = enemy.postAttackMoveTime > 0 ? 1.25 : 1;
    moveX = side.x * Math.sin(enemy.strafeTimer * 1.8) * 1.05 * strafeScale;
    moveY = side.y * Math.sin(enemy.strafeTimer * 1.8) * 1.05 * strafeScale;

    if (distance > targetRange + 30 || shouldPunish) {
      moveX += forward.x * 1.18;
      moveY += forward.y * 1.18;
    } else if (distance < targetRange - 70 || enemyLow) {
      moveX -= forward.x * 1.12;
      moveY -= forward.y * 1.12;
    }
  }

  const desired = normalize(moveX, moveY);
  const speed =
      (enemy.dodgeTime > 0 ? config.enemyDodgeSpeed : config.enemySpeed) *
      (enemyStatus.stunned ? 0 : 1) *
      enemyStatus.speedMultiplier *
      enemyFieldModifier.slowMultiplier;
  enemy.x = clamp(enemy.x + desired.x * speed * dt, enemy.radius, arena.width - enemy.radius);
  enemy.y = clamp(enemy.y + desired.y * speed * dt, enemy.radius, arena.height - enemy.radius);

  if (enemyFieldModifier.disrupted) {
    applyStatusEffect(enemy, "stun", 0.28, 1);
    enemy.shootCooldown = Math.max(enemy.shootCooldown, 0.8);
    enemy.dodgeCooldown = Math.max(enemy.dodgeCooldown, 0.7);
    addImpact(enemy.x, enemy.y, "#c9d5ff", 20);
    statusLine.textContent = "Magnetic disruption threw the bot off-balance.";
  }

  const incomingProjectile = bullets.find((bullet) => {
    const nextX = bullet.x + bullet.vx * 0.12;
    const nextY = bullet.y + bullet.vy * 0.12;
    return length(nextX - enemy.x, nextY - enemy.y) < 66;
  });

  if (!enemyStatus.stunned && enemy.fieldCooldown <= 0 && incomingProjectile) {
    spawnEnemyMagneticField();
  }

  if (!enemyStatus.stunned && enemy.javelinCooldown <= 0 && distance > 180 && distance < 620) {
    const chargedJavelin = enemyLow || (distance > 340 && Math.random() < 0.45);
    if (Math.random() < (chargedJavelin ? 0.32 : 0.4)) {
      spawnEnemyJavelin(chargedJavelin);
      enemy.postAttackMoveTime = 0.55;
    }
  }

  if (!enemyStatus.stunned && enemy.burstShots > 0 && enemy.shootCooldown <= 0) {
    enemy.burstShots -= 1;
    enemy.shootCooldown = enemy.burstShots > 0 ? 0.16 : 0.9;
    const leadX = targetX + player.velocityX * 0.18;
    const leadY = targetY + player.velocityY * 0.18;
    const spreadX = (Math.random() - 0.5) * enemy.shotSpread;
    const spreadY = (Math.random() - 0.5) * enemy.shotSpread;
    spawnBullet(enemy, leadX + spreadX, leadY + spreadY, enemyBullets, "#ff8a77", 640, 11);
    addImpact(enemy.x + forward.x * 24, enemy.y + forward.y * 24, "#ff8a77", 10);
  } else if (!enemyStatus.stunned && enemy.shootCooldown <= 0 && distance < 660) {
    enemy.burstShots = 2;
    enemy.shotSpread = 42;
    enemy.shootCooldown = 0.12;
    enemy.postAttackMoveTime = 0.4;
  }

  if (!enemyStatus.stunned && enemy.dodgeCooldown <= 0) {
    if (incomingProjectile && Math.random() < 0.92) {
      const dodgeSide = Math.random() < 0.5 ? -1 : 1;
      enemy.dodgeVectorX = side.x * dodgeSide;
      enemy.dodgeVectorY = side.y * dodgeSide;
      enemy.dodgeTime = config.enemyDodgeDuration + 0.05;
      enemy.dodgeCooldown = config.enemyDodgeCooldown;
      enemy.dashCooldown = 1.6;
      addImpact(enemy.x, enemy.y, "#ffc3b8", 18);
      statusLine.textContent = "The bot is dodging your fire. Track it.";
    } else if (shouldPunish && distance > 160 && distance < 320 && enemy.dashCooldown <= 0) {
      enemy.dodgeVectorX = forward.x;
      enemy.dodgeVectorY = forward.y;
      enemy.dodgeTime = config.enemyDodgeDuration + 0.06;
      enemy.dodgeCooldown = config.enemyDodgeCooldown;
      enemy.dashCooldown = 1.9;
      addImpact(enemy.x, enemy.y, "#ffd0a8", 20);
    }
  }
}

function updateTrainingBots(dt) {
  for (const bot of trainingBots) {
    bot.flash = Math.max(0, bot.flash - dt);
    updateStatusEffects(bot, dt);

    if (!bot.alive) {
      continue;
    }

    const dx = player.x - bot.x;
    const dy = player.y - bot.y;
    bot.facing = Math.atan2(dy, dx);
  }
}

function absorbEnemyProjectiles() {
  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = enemyBullets[i];
    let absorbed = false;

    for (const field of magneticFields) {
      if (field.team === "player" && length(bullet.x - field.x, bullet.y - field.y) <= field.radius) {
        absorbed = true;
        addAbsorbBurst(bullet.x, bullet.y, 24, field.overdrive ? "#dde7ff" : field.color);
        addImpact(bullet.x, bullet.y, field.overdrive ? "#dde7ff" : field.color, 18);
        addShake(3.2);
        break;
      }
    }

    if (absorbed) {
      enemyBullets.splice(i, 1);
    }
  }
}

function absorbPlayerProjectiles() {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    let absorbed = false;

    for (const field of magneticFields) {
      if (field.team === "enemy" && length(bullet.x - field.x, bullet.y - field.y) <= field.radius) {
        absorbed = true;
        addAbsorbBurst(bullet.x, bullet.y, 20, field.color);
        addImpact(bullet.x, bullet.y, field.color, 16);
        break;
      }
    }

    if (absorbed) {
      bullets.splice(i, 1);
    }
  }
}

function updateBullets(collection, dt) {
  for (let i = collection.length - 1; i >= 0; i -= 1) {
    const bullet = collection[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    const out =
      bullet.x < -20 ||
      bullet.y < -20 ||
      bullet.x > arena.width + 20 ||
      bullet.y > arena.height + 20;

    if (bullet.life <= 0 || out) {
      collection.splice(i, 1);
    }
  }
}

function applyPlayerDamage(amount, source = "hit") {
  const buildStats = getBuildStats();
  let finalDamage = amount * (1 - buildStats.damageReduction);

  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, finalDamage);
    player.shield -= absorbed;
    finalDamage -= absorbed;
    addImpact(player.x, player.y, "#a3dcff", 18);
  }

  if (finalDamage <= 0) {
    return false;
  }

  const previousHp = player.hp;
  player.hp = Math.max(0, player.hp - finalDamage);
  player.flash = 0.12;

  if (hasPerk("arcFeedback") && previousHp - player.hp >= 18) {
    player.shield = Math.max(player.shield, getBuildStats().shieldOnBurst);
    player.shieldTime = Math.max(player.shieldTime, 1.8);
  }

  if (player.hp <= 0) {
    if (hasPerk("lastStandBuffer") && player.failsafeReady) {
      player.failsafeReady = false;
      player.hp = Math.max(1, getBuildStats().maxHp * 0.2);
      player.shield = Math.max(player.shield, 18);
      player.shieldTime = 2;
      statusLine.textContent = "Last Stand Buffer kept you alive.";
      return true;
    }

    if (player.revivalPrimed > 0) {
      player.revivalPrimed = 0;
      player.hp = Math.max(1, getBuildStats().maxHp * 0.34);
      player.shield = Math.max(player.shield, 24);
      player.shieldTime = 2.4;
      statusLine.textContent = "Revival Protocol rescued you from lethal damage.";
      return true;
    }
  }

  if (source !== "silent") {
    addShake(7);
  }

  return player.hp <= 0;
}

function resolveCombat() {
  if (!isCombatLive()) {
    return;
  }

  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    for (const bot of getAllBots()) {
      if (!bot.alive) {
        continue;
      }

      if (length(bullet.x - bot.x, bullet.y - bot.y) <= bullet.radius + bot.radius) {
        bullets.splice(i, 1);
        damageBot(bot, bullet.damage, "#77d8ff", bullet.x, bullet.y, overdrive.hitGainPulse);
        addShake(3.8);
        break;
      }
    }
  }

  if (!isCombatLive()) {
    return;
  }

  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = enemyBullets[i];
    if (length(bullet.x - player.x, bullet.y - player.y) <= bullet.radius + player.radius) {
      enemyBullets.splice(i, 1);
      addImpact(bullet.x, bullet.y, "#ff8a77", 18);
      const playerFieldModifier = getPlayerFieldModifier();

      if (abilityState.dash.invulnerabilityTime <= 0) {
        const defeatedByBullet = applyPlayerDamage(
          bullet.damage * (1 - playerFieldModifier.damageReduction),
          "bullet",
        );
        statusLine.textContent = playerFieldModifier.damageReduction > 0
          ? "Magnetic Field softened the incoming shot."
          : "You were hit. Use dash to break pressure.";
        if (defeatedByBullet) {
          if (sandbox.mode === sandboxModes.duel.key) {
            finishDuelRound("enemy");
          } else {
            resetPlayer();
          }
        }
      } else {
        addEnergy(overdrive.perfectDashGain);
        addImpact(player.x, player.y, "#ffd375", 22);
        statusLine.textContent = "Clean dash through enemy fire.";
      }
    }
  }
}

function updateImpacts(dt) {
  for (let i = impacts.length - 1; i >= 0; i -= 1) {
    impacts[i].life -= dt;
    if (impacts[i].life <= 0) {
      impacts.splice(i, 1);
    }
  }

  for (let i = tracers.length - 1; i >= 0; i -= 1) {
    tracers[i].life -= dt;
    if (tracers[i].life <= 0) {
      tracers.splice(i, 1);
    }
  }

  for (let i = afterimages.length - 1; i >= 0; i -= 1) {
    afterimages[i].life -= dt;
    if (afterimages[i].life <= 0) {
      afterimages.splice(i, 1);
    }
  }

  for (let i = slashEffects.length - 1; i >= 0; i -= 1) {
    slashEffects[i].life -= dt;
    if (slashEffects[i].life <= 0) {
      slashEffects.splice(i, 1);
    }
  }

    for (let i = explosions.length - 1; i >= 0; i -= 1) {
      explosions[i].life -= dt;
      if (explosions[i].life <= 0) {
        explosions.splice(i, 1);
      }
    }

    for (let i = absorbBursts.length - 1; i >= 0; i -= 1) {
      absorbBursts[i].life -= dt;
      if (absorbBursts[i].life <= 0) {
        absorbBursts.splice(i, 1);
      }
    }

  screenShake = Math.max(0, screenShake - dt * 22);
}

function drawStatusReadout(target) {
  const effects = (target.statusEffects ?? []).filter((effect) => statusVisuals[effect.type]);

  if (effects.length === 0) {
    return;
  }

  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.font = "bold 11px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  effects.forEach((effect, index) => {
    const visual = statusVisuals[effect.type];
    const pulse = 1 + Math.sin(performance.now() * 0.02 + index * 0.8) * 0.08;
    const y = -target.radius - 18 - index * 17;
    const width = Math.max(effect.type === "stun" ? 48 : 40, ctx.measureText(visual.label).width + 14);

    ctx.fillStyle = "rgba(5, 10, 16, 0.78)";
    ctx.fillRect(-width * 0.5, y - 7, width, 14);
    ctx.strokeStyle = visual.stroke;
    ctx.lineWidth = effect.type === "stun" ? 2 : 1.5;
    ctx.strokeRect(-width * 0.5, y - 7, width, 14);
    ctx.fillStyle = visual.fill;
    ctx.globalAlpha = effect.type === "stun" ? 0.18 * pulse : 0.12 * pulse;
    ctx.fillRect(-width * 0.5, y - 7, width, 14);
    ctx.globalAlpha = 1;
    ctx.fillStyle = visual.text;
    ctx.fillText(visual.label, 0, y);

    if (visual.wave === "spark") {
      for (let spark = 0; spark < 3; spark += 1) {
        const angle = performance.now() * 0.01 + spark * ((Math.PI * 2) / 3);
        const sparkX = Math.cos(angle) * (target.radius + 13);
        const sparkY = -target.radius - 14 + Math.sin(angle) * 5;
        ctx.fillStyle = visual.stroke;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 2.6 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (visual.wave === "ring") {
      ctx.strokeStyle = visual.stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, (target.radius + 8) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  ctx.restore();
}

function drawBot(bot) {
  if (!bot.alive) {
    return;
  }

  ctx.save();
  ctx.translate(bot.x, bot.y);
  ctx.rotate(bot.role === "training" ? bot.facing : 0);
  ctx.fillStyle = bot.flash > 0 ? "#f7fbff" : bot.color;
  ctx.beginPath();
  ctx.arc(0, 0, bot.radius, 0, Math.PI * 2);
  ctx.fill();

  if (bot.role === "training") {
    ctx.fillStyle = "#eaf8ff";
    ctx.fillRect(-6, -3, 22, 6);
  }

  ctx.restore();

  if (bot.role === "training") {
    ctx.strokeStyle = "rgba(116, 214, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bot.x, bot.y, bot.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(12, 17, 22, 0.88)";
  ctx.fillRect(bot.x - 24, bot.y - 34, 48, 6);
  ctx.fillStyle = bot.accent;
  ctx.fillRect(bot.x - 24, bot.y - 34, 48 * (Math.max(0, bot.hp) / bot.maxHp), 6);
  drawStatusReadout(bot);
}

function drawWorld() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  const scale = Math.min(viewportWidth / arena.width, viewportHeight / arena.height);
  const offsetX = (viewportWidth - arena.width * scale) * 0.5;
  const offsetY = (viewportHeight - arena.height * scale) * 0.5;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);

  const gradient = ctx.createLinearGradient(0, 0, arena.width, arena.height);
  gradient.addColorStop(0, "#0e1821");
  gradient.addColorStop(1, "#081016");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);

  if (isOverdriveActive()) {
    const overdriveAlpha = 0.07 + Math.sin(performance.now() * 0.018) * 0.025;
    const overdriveGradient = ctx.createRadialGradient(
      player.x,
      player.y,
      40,
      player.x,
      player.y,
      380,
    );
    overdriveGradient.addColorStop(0, `rgba(255, 230, 150, ${overdriveAlpha + 0.08})`);
    overdriveGradient.addColorStop(1, "rgba(255, 230, 150, 0)");
    ctx.fillStyle = overdriveGradient;
    ctx.fillRect(0, 0, arena.width, arena.height);
  }

  ctx.strokeStyle = "rgba(124, 183, 223, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 40; x < arena.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  for (let y = 40; y < arena.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(119, 216, 255, 0.18)";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, arena.width - 12, arena.height - 12);

  for (const impact of impacts) {
    const t = impact.life / impact.maxLife;
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, impact.size * (1.6 - t), 0, Math.PI * 2);
    ctx.strokeStyle = `${impact.color}${Math.floor(t * 255).toString(16).padStart(2, "0")}`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  for (const tracer of tracers) {
    const t = tracer.life / tracer.maxLife;
    ctx.strokeStyle = `${tracer.color}${Math.floor(t * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.lineWidth = 4 * t + 1;
    ctx.beginPath();
    ctx.moveTo(tracer.x0, tracer.y0);
    ctx.lineTo(tracer.x1, tracer.y1);
    ctx.stroke();
  }

  for (const burst of absorbBursts) {
    const t = burst.life / burst.maxLife;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.radius * (1.5 - t * 0.4), 0, Math.PI * 2);
    ctx.strokeStyle = `${burst.color}${Math.floor(t * 255).toString(16).padStart(2, "0")}`;
    ctx.lineWidth = 5 * t + 1;
    ctx.stroke();
  }

  for (const ghost of afterimages) {
    const t = ghost.life / ghost.maxLife;
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate(ghost.facing);
    ctx.globalAlpha = t * 0.35;
    ctx.fillStyle = ghost.color;
    ctx.beginPath();
    ctx.arc(0, 0, ghost.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const slash of slashEffects) {
    const t = slash.life / slash.maxLife;
    const radius = slash.comboStep === 1 ? 188 : slash.comboStep === 2 ? 126 : 142;
    const arcWidth = slash.comboStep === 1 ? 0.08 : slash.comboStep === 2 ? 1.06 : 0.24;
    ctx.save();
    ctx.translate(slash.x, slash.y);
    ctx.rotate(
      slash.comboStep === 1
        ? slash.facing
        : slash.comboStep === 2
          ? slash.facing + 0.28
          : slash.facing,
    );
    ctx.globalAlpha = t * 0.7;
    ctx.strokeStyle =
      slash.comboStep === 1 ? "#98fbff" : slash.comboStep === 2 ? "#57d9ff" : "#ffd985";
    ctx.lineWidth = slash.comboStep === 3 ? 18 - t * 4 : slash.comboStep === 2 ? 16 - t * 4 : 10 - t * 2;
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      radius,
      slash.comboStep === 2 ? -arcWidth * 0.88 : -arcWidth,
      arcWidth,
    );
    ctx.stroke();

    ctx.strokeStyle =
      slash.comboStep === 1 ? "rgba(224, 255, 255, 0.75)" : slash.comboStep === 2 ? "rgba(179, 246, 255, 0.62)" : "rgba(255, 225, 162, 0.58)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (slash.comboStep === 1) {
      ctx.moveTo(18, 0);
      ctx.lineTo(radius * 0.84, -5);
      ctx.lineTo(radius * 1.08, -2);
      ctx.lineTo(radius * 1.18, 6);
    } else if (slash.comboStep === 2) {
      ctx.arc(0, 0, radius * 0.92, -arcWidth * 0.76, arcWidth * 0.82);
    } else {
      ctx.moveTo(0, -6);
      ctx.lineTo(radius * 0.85, 0);
      ctx.lineTo(radius * 1.08, 8);
    }
    ctx.stroke();

    if (slash.comboStep === 1) {
      for (let bolt = 0; bolt < 3; bolt += 1) {
        const boltOffset = bolt * 26 + 26;
        ctx.strokeStyle = "rgba(137, 246, 255, 0.58)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boltOffset, -6 + bolt * 2);
        ctx.lineTo(boltOffset + 18, -12 + bolt * 3);
        ctx.lineTo(boltOffset + 30, -4 + bolt * 2);
        ctx.stroke();
      }
    }

    if (slash.comboStep === 2) {
      ctx.strokeStyle = "rgba(170, 245, 255, 0.44)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.74, -arcWidth * 0.72, arcWidth * 0.7);
      ctx.stroke();
    } else if (slash.comboStep === 3) {
      ctx.strokeStyle = "rgba(255, 241, 189, 0.58)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(radius * 0.92, 0);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 214, 120, 0.42)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(radius * 0.76, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const javelin of shockJavelins) {
    ctx.save();
    ctx.translate(javelin.x, javelin.y);
    ctx.rotate(Math.atan2(javelin.vy, javelin.vx));
    ctx.shadowBlur = javelin.charged ? 30 : 20;
    ctx.shadowColor = javelin.glow;
    ctx.fillStyle = javelin.color;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = javelin.charged ? "rgba(255, 245, 214, 0.95)" : "rgba(206, 242, 255, 0.9)";
    ctx.lineWidth = javelin.charged ? 4 : 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = javelin.charged ? "rgba(255, 245, 214, 0.45)" : "rgba(206, 242, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.moveTo(-20, 0);
    ctx.lineTo(-36, 0);
    ctx.stroke();
    ctx.restore();
  }

  for (const javelin of enemyShockJavelins) {
    ctx.save();
    ctx.translate(javelin.x, javelin.y);
    ctx.rotate(Math.atan2(javelin.vy, javelin.vx));
    ctx.shadowBlur = javelin.charged ? 28 : 18;
    ctx.shadowColor = javelin.glow;
    ctx.fillStyle = javelin.color;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-12, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = javelin.charged ? "rgba(255, 244, 224, 0.88)" : "rgba(255, 210, 198, 0.82)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  for (const blast of explosions) {
    const t = blast.life / blast.maxLife;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, blast.radius * (1.2 - t * 0.35), 0, Math.PI * 2);
    ctx.strokeStyle = `${blast.color}${Math.floor(t * 255).toString(16).padStart(2, "0")}`;
    ctx.lineWidth = 8 * t + 2;
    ctx.stroke();
  }

  for (const field of magneticFields) {
    const t = field.life / field.duration;
    const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.04;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.shadowBlur = field.overdrive ? 24 : 18;
    ctx.shadowColor = field.glow;
    ctx.fillStyle = field.overdrive ? "rgba(200, 210, 255, 0.16)" : "rgba(137, 200, 255, 0.12)";
    ctx.beginPath();
    ctx.arc(field.x, field.y, field.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = field.overdrive ? "rgba(223, 230, 255, 0.88)" : "rgba(137, 200, 255, 0.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(field.x, field.y, field.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = field.overdrive ? "rgba(170, 178, 255, 0.45)" : "rgba(137, 200, 255, 0.3)";
    ctx.lineWidth = 1.5;
    for (let ring = 0.35; ring < 1; ring += 0.22) {
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius * ring * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let arc = 0; arc < 4; arc += 1) {
      const start = performance.now() * 0.002 + arc * 1.3;
      ctx.beginPath();
      ctx.strokeStyle = field.overdrive ? "rgba(236, 240, 255, 0.55)" : "rgba(180, 228, 255, 0.4)";
      ctx.lineWidth = 3;
      ctx.arc(field.x, field.y, field.radius * (0.7 + arc * 0.07), start, start + 0.75);
      ctx.stroke();
    }
    ctx.globalAlpha = t * 0.9;
    ctx.restore();
  }

  for (const bullet of bullets) {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(190, 244, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const bullet of enemyBullets) {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 214, 205, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const bot of getAllBots()) {
    drawBot(bot);
  }

  const avatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;
  const weaponSkin = content.weaponSkins[loadout.weaponSkin] ?? content.weaponSkins.stock;
  ctx.save();
  const recoilOffset = player.recoil * 8;
  ctx.translate(
    player.x - Math.cos(player.facing) * recoilOffset,
    player.y - Math.sin(player.facing) * recoilOffset,
  );
  ctx.rotate(player.facing);
  if (player.ghostTime > 0) {
    ctx.globalAlpha = 0.5;
  }
  ctx.fillStyle =
    isOverdriveActive()
      ? "#fff1bd"
      : player.flash > 0 || abilityState.dash.invulnerabilityTime > 0
      ? "#f6fdff"
      : avatar.bodyColor;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isOverdriveActive()
    ? "#ffd375"
    : avatar.accentColor;
  ctx.beginPath();
  ctx.arc(-4, -4, player.radius * 0.34, 0, Math.PI * 2);
  ctx.fill();
  if (player.weapon === weapons.axe.key) {
    ctx.fillStyle = avatar.detailColor;
    ctx.fillRect(-4, -4, 34, 8);
    ctx.shadowBlur = 28;
    ctx.shadowColor = player.slashFlash > 0 ? weaponSkin.glow : weaponSkin.tint;
    ctx.fillStyle = weaponSkin.tint;
    ctx.beginPath();
    ctx.moveTo(20, -26);
    ctx.lineTo(42, -18);
    ctx.lineTo(38, -4);
    ctx.lineTo(22, -9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, 26);
    ctx.lineTo(42, 18);
    ctx.lineTo(38, 4);
    ctx.lineTo(22, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `${weaponSkin.glow}88`;
    ctx.fillRect(18, -3, 18, 6);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(212, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, -22);
    ctx.lineTo(38, -15);
    ctx.moveTo(20, 22);
    ctx.lineTo(38, 15);
    ctx.moveTo(28, -4);
    ctx.lineTo(43, -1);
    ctx.moveTo(28, 4);
    ctx.lineTo(43, 1);
    ctx.stroke();
  } else if (player.weapon === weapons.shotgun.key) {
    ctx.fillStyle = avatar.detailColor;
    ctx.fillRect(-4, -5, 24, 10);
    ctx.fillStyle = weaponSkin.tint;
    ctx.fillRect(20, -4, 18, 8);
    ctx.fillStyle = weaponSkin.glow;
    ctx.fillRect(34, -2, 6, 4);
  } else {
    ctx.fillRect(-3, -5, 28, 10);
  }

  if (isOverdriveActive()) {
    const pulse = 1 + Math.sin(performance.now() * 0.028) * 0.14;
    ctx.strokeStyle = "rgba(255, 211, 117, 0.9)";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, 0, (player.radius + 9) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 244, 205, 0.6)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, (player.radius + 15) * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (player.shield > 0) {
    ctx.strokeStyle = "rgba(160, 220, 255, 0.92)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  if (abilityState.ultimate.phantomTime > 0 || player.decoyTime > 0) {
    const ghostAlpha = Math.max(abilityState.ultimate.phantomTime, player.decoyTime) / 2.2;
    ctx.save();
    ctx.globalAlpha = ghostAlpha * 0.35;
    ctx.translate(player.x - 44, player.y + 18);
    ctx.fillStyle = "#d8b6ff";
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawStatusReadout(player);

  ctx.strokeStyle = "rgba(119, 216, 255, 0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(input.mouseX, input.mouseY);
  ctx.stroke();

  if (player.overdrivePulse > 0) {
    const pulseT = player.overdrivePulse / 0.45;
    ctx.fillStyle = `rgba(255, 227, 154, ${pulseT * 0.16})`;
    ctx.fillRect(0, 0, arena.width, arena.height);
  }

  if (sandbox.mode === sandboxModes.duel.key && !enemy.alive) {
    ctx.textAlign = "center";
    ctx.font = "24px Trebuchet MS";
    ctx.fillText("Press R to respawn the enemy bot", arena.width * 0.5, arena.height * 0.5);
    ctx.textAlign = "start";
  }

  ctx.restore();
}

function updateHud() {
  const weaponReady = player.fireCooldown <= 0;
  const activeWeapon = weapons[player.weapon] ?? weapons.pulse;
  const activeMode = sandboxModes[sandbox.mode];
  const primaryBot = getPrimaryBot();
  const buildStats = getBuildStats();
  const slotAbilities = [getAbilityBySlot(0), getAbilityBySlot(1), getAbilityBySlot(2)];
  const selectedUltimate = content.ultimates[loadout.ultimate] ?? content.ultimates.overdriveOverload;
  mapName.textContent = activeMode.name;
  mapStatus.textContent = activeMode.subtitle;
  roundLabel.textContent =
    sandbox.mode === sandboxModes.duel.key ? `Round ${matchState.roundNumber}` : "Practice";
  matchScore.textContent =
    sandbox.mode === sandboxModes.duel.key
      ? `${matchState.playerRounds} - ${matchState.enemyRounds}`
      : `${getAllBots().filter((bot) => bot.alive).length} targets`;
  matchFormat.textContent =
    sandbox.mode === sandboxModes.duel.key ? "BO3" : "Training";
  roundBannerLabel.textContent = matchState.bannerLabel;
  roundBannerTitle.textContent = matchState.bannerTitle;
  roundBanner.classList.toggle("visible", matchState.bannerVisible);
  roundBanner.classList.toggle("countdown", matchState.bannerStyle === "countdown");
  roundBanner.classList.toggle("fight", matchState.bannerStyle === "fight");
  weaponName.textContent = activeWeapon.name;
  weaponIcon.className = `content-icon content-icon--${sanitizeIconClass(activeWeapon.icon)}`;
  weaponStatus.textContent =
    player.weapon === weapons.axe.key && player.comboTimer > 0
      ? `Combo ${player.comboStep}/3`
      : weaponReady
        ? "Ready"
        : `Cooling ${player.fireCooldown.toFixed(2)}s`;
  weaponMeter.style.width = `${Math.max(0, Math.min(100, (1 - player.fireCooldown / activeWeapon.cooldown) * 100))}%`;
  weaponMeter.style.background =
    player.weapon === weapons.axe.key
      ? "linear-gradient(90deg, rgba(158, 247, 199, 0.45), rgba(158, 247, 199, 0.98))"
      : player.weapon === weapons.shotgun.key
        ? "linear-gradient(90deg, rgba(255, 157, 98, 0.45), rgba(255, 157, 98, 0.98))"
      : "linear-gradient(90deg, rgba(119, 216, 255, 0.4), rgba(119, 216, 255, 0.95))";
  weaponMeter.style.boxShadow =
    player.weapon === weapons.axe.key
      ? "0 0 14px rgba(158, 247, 199, 0.24)"
      : player.weapon === weapons.shotgun.key
        ? "0 0 14px rgba(255, 157, 98, 0.24)"
      : "0 0 14px rgba(119, 216, 255, 0.25)";
  overdriveMeter.style.width = `${(player.energy / config.overdriveMaxEnergy) * 100}%`;
  overdriveState.textContent = isOverdriveActive()
    ? `Active ${player.overdriveTime.toFixed(1)}s`
    : player.energy >= config.overdriveMaxEnergy
      ? "Ready"
      : "Charging";
  overdriveStatus.textContent = isOverdriveActive()
    ? "Dash is hyper-fast, weapons surge, and movement is boosted."
    : player.energy >= config.overdriveMaxEnergy
      ? "Press E to trigger Overdrive."
      : `${Math.ceil(player.energy)} / ${config.overdriveMaxEnergy} energy`;
  overdriveState.style.color = isOverdriveActive() || player.energy >= config.overdriveMaxEnergy ? "var(--ok)" : "var(--text)";
  playerHealthFill.style.width = `${(player.hp / buildStats.maxHp) * 100}%`;
  enemyHealthFill.style.width = primaryBot
    ? `${(Math.max(0, primaryBot.hp) / primaryBot.maxHp) * 100}%`
    : "0%";
  playerHealthText.textContent = `${Math.ceil(player.hp)} / ${Math.ceil(buildStats.maxHp)}${player.shield > 0 ? ` +${Math.ceil(player.shield)}` : ""}`;
  enemyHealthText.textContent = primaryBot
    ? primaryBot.alive
      ? `${Math.ceil(primaryBot.hp)} / ${primaryBot.maxHp}`
      : "Down"
    : "--";

  setHudSlotPresentation(slotDashIcon, slotDashName, slotAbilities[0] ?? content.abilities.vectorDash);
  setHudSlotPresentation(slotJavelinIcon, slotJavelinName, slotAbilities[1] ?? content.abilities.shockJavelin);
  setHudSlotPresentation(slotFieldIcon, slotFieldName, slotAbilities[2] ?? content.abilities.magneticField);
  setHudSlotPresentation(ultimateSlotIcon, ultimateSlotName, selectedUltimate);

  updateAbilitySlot(slotDash, slotDashOverlay, slotDashTimer, getAbilityHudState(slotAbilities[0]?.key));
  updateAbilitySlot(slotJavelin, slotJavelinOverlay, slotJavelinTimer, getAbilityHudState(slotAbilities[1]?.key));
  updateAbilitySlot(slotField, slotFieldOverlay, slotFieldTimer, getAbilityHudState(slotAbilities[2]?.key));
  updateAbilitySlot(ultimateSlot, ultimateSlot.querySelector(".ability-slot__cooldown"), ultimateSlot.querySelector(".ability-slot__timer"), {
    ready: abilityState.ultimate.cooldown <= 0,
    charging: false,
    cooldownRatio: abilityState.ultimate.cooldown <= 0 ? 0 : abilityState.ultimate.cooldown / config.ultimateCooldown,
    timer: abilityState.ultimate.cooldown <= 0 ? "" : abilityState.ultimate.cooldown.toFixed(1),
  });
}

function updateAbilitySlot(slot, overlay, timerLabel, state) {
  slot.classList.toggle("ready", state.ready);
  slot.classList.toggle("charging", state.charging);
  overlay.style.transform = `scaleY(${state.cooldownRatio})`;
  overlay.style.opacity = state.ready && !state.charging ? "0" : "1";
  timerLabel.textContent = state.timer;
}

function getAbilityHudState(abilityKey) {
  switch (abilityKey) {
    case "vectorDash": {
      const ready = abilityState.dash.charges > 0;
      return {
        ready,
        charging: false,
        cooldownRatio: ready ? 0 : Math.max(0, Math.min(1, abilityState.dash.rechargeTimer / getActiveDashCooldown())),
        timer: abilityState.dash.activeTime > 0 ? (abilityState.dash.mode === "hold" ? "H" : "D") : ready ? "" : abilityState.dash.rechargeTimer.toFixed(1),
      };
    }
    case "shockJavelin":
      return {
        ready: abilityState.javelin.cooldown <= 0,
        charging: abilityState.javelin.charging,
        cooldownRatio:
          abilityState.javelin.cooldown <= 0
            ? 0
            : Math.max(0, Math.min(1, abilityState.javelin.cooldown / abilityConfig.javelin.cooldown)),
        timer: abilityState.javelin.charging
          ? abilityState.javelin.chargeTime >= abilityConfig.javelin.chargeThreshold
            ? "MAX"
            : "..."
          : abilityState.javelin.cooldown <= 0
            ? ""
            : abilityState.javelin.cooldown.toFixed(1),
      };
    case "magneticField":
      return {
        ready: abilityState.field.cooldown <= 0,
        charging: abilityState.field.charging,
        cooldownRatio:
          abilityState.field.cooldown <= 0
            ? 0
            : Math.max(0, Math.min(1, abilityState.field.cooldown / abilityConfig.field.cooldown)),
        timer: abilityState.field.charging
          ? abilityState.field.chargeTime >= abilityConfig.field.chargeThreshold
            ? "MAX"
            : "..."
          : abilityState.field.cooldown <= 0
            ? ""
            : abilityState.field.cooldown.toFixed(1),
      };
    case "magneticGrapple":
      return {
        ready: abilityState.grapple.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.grapple.cooldown <= 0 ? 0 : abilityState.grapple.cooldown / config.grappleCooldown,
        timer: abilityState.grapple.cooldown <= 0 ? "" : abilityState.grapple.cooldown.toFixed(1),
      };
    case "energyShield":
      return {
        ready: abilityState.shield.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.shield.cooldown <= 0 ? 0 : abilityState.shield.cooldown / config.shieldCooldown,
        timer: abilityState.shield.cooldown <= 0 ? "" : abilityState.shield.cooldown.toFixed(1),
      };
    case "overdriveBooster":
      return {
        ready: abilityState.booster.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.booster.cooldown <= 0 ? 0 : abilityState.booster.cooldown / config.boosterCooldown,
        timer: abilityState.booster.cooldown <= 0 ? "" : abilityState.booster.cooldown.toFixed(1),
      };
    case "empBurst":
      return {
        ready: abilityState.emp.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.emp.cooldown <= 0 ? 0 : abilityState.emp.cooldown / config.boosterCooldown,
        timer: abilityState.emp.cooldown <= 0 ? "" : abilityState.emp.cooldown.toFixed(1),
      };
    default:
      return { ready: false, charging: false, cooldownRatio: 1, timer: "NA" };
  }
}

function setHudSlotPresentation(slotIcon, slotName, ability) {
  slotIcon.className = `ability-slot__icon content-icon content-icon--${sanitizeIconClass(ability.icon)}`;
  slotName.textContent = ability.name;
}

function screenToArena(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / arena.width, rect.height / arena.height);
  const offsetX = (rect.width - arena.width * scale) * 0.5;
  const offsetY = (rect.height - arena.height * scale) * 0.5;

  return {
    x: clamp((clientX - rect.left - offsetX) / scale, 0, arena.width),
    y: clamp((clientY - rect.top - offsetY) / scale, 0, arena.height),
  };
}

function updatePointer(clientX, clientY) {
  const point = screenToArena(clientX, clientY);
  input.mouseX = point.x;
  input.mouseY = point.y;
}

function updateJoystick(clientX, clientY) {
  const rect = moveJoystick.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const rawX = clientX - centerX;
  const rawY = clientY - centerY;
  const maxDistance = rect.width * 0.32;
  const magnitude = Math.min(maxDistance, length(rawX, rawY));
  const direction = normalize(rawX, rawY);
  const offsetX = direction.x * magnitude;
  const offsetY = direction.y * magnitude;

  input.moveTouchX = offsetX / maxDistance;
  input.moveTouchY = offsetY / maxDistance;
  moveStick.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
}

function clearJoystick() {
  input.moveTouchId = null;
  input.moveTouchX = 0;
  input.moveTouchY = 0;
  moveStick.style.transform = "translate(0px, 0px)";
  moveJoystick.classList.remove("active");
}

function frame(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000);
  lastTime = time;

  updatePlayer(dt);
  updateEnemy(dt);
  updateTrainingBots(dt);
  updateBullets(bullets, dt);
  updateBullets(enemyBullets, dt);
  updateShockJavelins(dt);
  updateEnemyShockJavelins(dt);
  absorbPlayerProjectiles();
  absorbEnemyProjectiles();
  resolveCombat();
  updateDuelMatch(dt);
  updateImpacts(dt);
  updateHud();
  drawWorld();

  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
resize();

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyH" && !event.repeat) {
    toggleHelpPanel();
    return;
  }

  if (uiState.prematchOpen) {
    return;
  }

  input.keys.add(event.code);

  if (
    (event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") &&
    !event.repeat
  ) {
    event.preventDefault();
    startAbilityInput(0);
  }

    if (event.code === "Backspace") {
      clearCombatArtifacts();
      if (sandbox.mode === sandboxModes.duel.key) {
        startDuelRound({ resetScore: true });
        statusLine.textContent = "Duel match reset.";
        return;
      }

      for (const bot of getAllBots()) {
        respawnBot(bot);
      }
      statusLine.textContent = "Combat bots reset.";
    }

  if (event.code === "KeyE") {
    activateOverdrive();
  }

  if (event.code === "KeyR" && !event.repeat) {
    castUltimate();
  }

  if (event.code === "KeyT" && !event.repeat) {
    switchSandboxMode(
      sandbox.mode === sandboxModes.duel.key ? sandboxModes.training.key : sandboxModes.duel.key,
    );
  }

    if (event.code === "KeyQ" && !event.repeat) {
      startAbilityInput(1);
    }

  if (event.code === "KeyF" && !event.repeat) {
    startAbilityInput(2);
  }

  if (event.code === "Digit1") {
    setWeapon(weapons.pulse.key);
  }

  if (event.code === "Digit2") {
    setWeapon(weapons.axe.key);
  }

  if (event.code === "Digit3") {
    setWeapon(weapons.shotgun.key);
  }
});

helpToggle.addEventListener("click", () => {
  toggleHelpPanel();
});

bindPrematchButton(modeDuel, "mode-duel");
bindPrematchButton(modeTraining, "mode-training");
bindPrematchButton(stepMode, "step-mode");
bindPrematchButton(stepBuild, "step-build");
bindPrematchButton(continueBuild, "continue-build");
bindPrematchButton(backMode, "back-mode");
bindPrematchButton(startSession, "start-session");

/* Lab tab switching (LOADOUT / STYLE) */
if (labTabLoadout && labTabStyle && labLoadout && labStyle) {
  [labTabLoadout, labTabStyle].forEach((tab) => {
    tab.addEventListener("click", () => {
      const panel = tab.dataset.lab;
      labTabLoadout.classList.toggle("is-active", panel === "loadout");
      labTabStyle.classList.toggle("is-active", panel === "style");
      labLoadout.classList.toggle("lab-panel--active", panel === "loadout");
      labStyle.classList.toggle("lab-panel--active", panel === "style");
    });
  });
}

libraryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    uiState.buildCategory = tab.dataset.library;
    if (uiState.buildCategory !== "runes") {
      uiState.selectedDetail = {
        type: uiState.buildCategory,
        key:
          uiState.buildCategory === "weapon"
            ? loadout.weapon
            : uiState.buildCategory === "ultimate"
              ? loadout.ultimate
              : uiState.buildCategory === "perk"
                ? loadout.perks[0]
                : loadout.abilities[0],
      };
    }
    renderPrematch();
  });
});

Object.entries(loadoutSlotButtons).forEach(([slotKey, button]) => {
  if (!button) {
    return;
  }

  const normalizedSlot =
    slotKey === "ability0"
      ? "ability-0"
      : slotKey === "ability1"
        ? "ability-1"
        : slotKey === "ability2"
          ? "ability-2"
          : slotKey === "perk0"
            ? "perk-0"
            : slotKey === "perk1"
              ? "perk-1"
              : slotKey;

  button.addEventListener("click", () => {
    uiState.selectedLoadoutSlot = normalizedSlot;
    uiState.buildCategory = getSlotCategory(normalizedSlot);
    const item = getLoadoutItemForSlot(normalizedSlot);
    if (item) {
      uiState.selectedDetail = { type: uiState.buildCategory, key: item.key };
    }
    renderPrematch();
  });
});

window.addEventListener("keyup", (event) => {
  if (uiState.prematchOpen) {
    return;
  }

  input.keys.delete(event.code);

  if (event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
    releaseAbilityInput(0);
  }

  if (event.code === "KeyQ") {
      releaseAbilityInput(1);
  }

  if (event.code === "KeyF") {
    releaseAbilityInput(2);
  }
});

canvas.addEventListener("mousemove", (event) => {
  updatePointer(event.clientX, event.clientY);
});

canvas.addEventListener("mousedown", (event) => {
  if (uiState.prematchOpen) {
    return;
  }
  updatePointer(event.clientX, event.clientY);
  input.firing = true;
});

window.addEventListener("mouseup", () => {
  input.firing = false;
});

canvas.addEventListener("mouseleave", () => {
  input.firing = false;
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    if (uiState.prematchOpen) {
      return;
    }
    for (const touch of event.changedTouches) {
      if (touch.clientX < window.innerWidth * 0.5 && input.moveTouchId === null) {
        input.moveTouchId = touch.identifier;
        moveJoystick.classList.add("active");
        updateJoystick(touch.clientX, touch.clientY);
      } else {
        input.firing = true;
        updatePointer(touch.clientX, touch.clientY);
      }
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    if (uiState.prematchOpen) {
      return;
    }
    for (const touch of event.changedTouches) {
      if (touch.identifier === input.moveTouchId) {
        updateJoystick(touch.clientX, touch.clientY);
      } else {
        updatePointer(touch.clientX, touch.clientY);
      }
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "touchend",
  (event) => {
    for (const touch of event.changedTouches) {
      if (touch.identifier === input.moveTouchId) {
        clearJoystick();
      } else {
        input.firing = false;
      }
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "touchcancel",
  () => {
    input.firing = false;
    clearJoystick();
  },
  { passive: true },
);

resetPlayer({ silent: true });
resetBotsForMode(sandbox.mode);
showRoundBanner("", "", false);
toggleHelpPanel(false);
openPrematch("mode");
renderPrematch();
statusLine.textContent = "Prototype 0 online. Set the mode, build, and drop into the arena.";
requestAnimationFrame(frame);
