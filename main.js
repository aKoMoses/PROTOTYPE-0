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
const statusLine = document.getElementById("status-line");
const weaponMeter = document.getElementById("weapon-meter");
const playerHealthFill = document.getElementById("player-health-fill");
const enemyHealthFill = document.getElementById("enemy-health-fill");
const playerHealthText = document.getElementById("player-health-text");
const enemyHealthText = document.getElementById("enemy-health-text");
const menuButton = document.getElementById("menu-button");
const rematchButton = document.getElementById("rematch-button");
const hudMenuButton = document.getElementById("hud-menu-button");
const hudRematchButton = document.getElementById("hud-rematch-button");
const moveJoystick = document.getElementById("move-joystick");
const moveStick = document.getElementById("move-stick");
const slotDash = document.getElementById("slot-dash");
const slotDashIcon = slotDash.querySelector(".ability-slot__icon");
const slotDashName = slotDash.querySelector(".ability-slot__name");
const slotDashOverlay = document.getElementById("slot-dash-overlay");
const slotDashTimer = document.getElementById("slot-dash-timer");
const slotAbility1 = document.getElementById("slot-ability-1");
const slotAbility1Icon = slotAbility1.querySelector(".ability-slot__icon");
const slotAbility1Name = slotAbility1.querySelector(".ability-slot__name");
const slotAbility1Overlay = document.getElementById("slot-ability-1-overlay");
const slotAbility1Timer = document.getElementById("slot-ability-1-timer");
const slotAbility2 = document.getElementById("slot-ability-2");
const slotAbility2Icon = slotAbility2.querySelector(".ability-slot__icon");
const slotAbility2Name = slotAbility2.querySelector(".ability-slot__name");
const slotAbility2Overlay = document.getElementById("slot-ability-2-overlay");
const slotAbility2Timer = document.getElementById("slot-ability-2-timer");
const slotAbility3 = document.getElementById("slot-ability-3");
const slotAbility3Icon = slotAbility3.querySelector(".ability-slot__icon");
const slotAbility3Name = slotAbility3.querySelector(".ability-slot__name");
const slotAbility3Overlay = document.getElementById("slot-ability-3-overlay");
const slotAbility3Timer = document.getElementById("slot-ability-3-timer");
const ultimateSlot = document.getElementById("slot-ultimate");
const ultimateSlotIcon = ultimateSlot.querySelector(".ability-slot__icon");
const ultimateSlotName = ultimateSlot.querySelector(".ability-slot__name");
const ultimateSlotOverlay = document.getElementById("slot-ultimate-overlay");
const ultimateSlotTimer = document.getElementById("slot-ultimate-timer");
const prematchOverlay = document.getElementById("prematch-overlay");
const modeScreen = document.getElementById("mode-screen");
const mapScreen = document.getElementById("map-screen");
const buildScreen = document.getElementById("build-screen");
const stepMode = document.getElementById("step-mode");
const stepMap = document.getElementById("step-map");
const stepBuild = document.getElementById("step-build");
const modeDuel = document.getElementById("mode-duel");
const modeTraining = document.getElementById("mode-training");
const mapGrid = document.getElementById("map-grid");
const continueMap = document.getElementById("continue-map");
const continueBuild = document.getElementById("continue-build");
const backMode = document.getElementById("back-mode");
const backMap = document.getElementById("back-map");
const startSession = document.getElementById("start-session");
const prematchDescription = document.getElementById("prematch-description");
const selectedModeLabel = document.getElementById("selected-mode-label");
const selectedMapLabel = document.getElementById("selected-map-label");
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
const botConfigCard = document.getElementById("bot-config-card");
const botConfigLabel = document.getElementById("bot-config-label");
const botConfigTitle = document.getElementById("bot-config-title");
const botConfigCopy = document.getElementById("bot-config-copy");
const botConfigDuel = document.getElementById("bot-config-duel");
const botConfigTraining = document.getElementById("bot-config-training");
const botModeRandom = document.getElementById("bot-mode-random");
const botModeCustom = document.getElementById("bot-mode-custom");
const botWeaponGrid = document.getElementById("bot-weapon-grid");
const botAbilityGrid = document.getElementById("bot-ability-grid");
const botBuildSummary = document.getElementById("bot-build-summary");
const trainingFireOff = document.getElementById("training-fire-off");
const trainingFireOn = document.getElementById("training-fire-on");
const trainingBuildSummary = document.getElementById("training-build-summary");
const libraryTabs = Array.from(document.querySelectorAll("[data-library]"));
const loadoutSlotButtons = {
  weapon: document.getElementById("loadout-slot-weapon"),
  ability0: document.getElementById("loadout-slot-ability-0"),
  ability1: document.getElementById("loadout-slot-ability-1"),
  ability2: document.getElementById("loadout-slot-ability-2"),
  perk0: document.getElementById("loadout-slot-perk-0"),
  ultimate: document.getElementById("loadout-slot-ultimate"),
};

const arena = { width: 1600, height: 900 };

const config = {
  playerSpeed: 420,
  playerAcceleration: 4400,
  playerFriction: 3600,
  playerRadius: 18,
  playerMaxHp: 280,
  dashSpeed: 1200,
  dashDuration: 0.17,
  dashInvulnerability: 0.24,
  dashCooldown: 1.8,
  fireRate: 0.084,
  bulletSpeed: 1320,
  bulletLife: 1,
  pulseDamage: 10,
  pulseMagazineSize: 12,
  pulseReloadTime: 1.18,
  axeComboReset: 0.72,
  axeCommitSpeed: 940,
  axeCommitDuration: 0.12,
  javelinCooldown: 3.4,
  javelinChargeThreshold: 0.45,
  javelinTapSpeed: 1220,
  javelinTapDamage: 40,
  javelinTapRadius: 11,
  javelinTapSlow: 0.26,
  javelinTapSlowDuration: 0.7,
  javelinHoldSpeed: 980,
  javelinHoldDamage: 58,
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
  portalReuseCooldown: 10,
  grappleCooldown: 4.2,
  shieldCooldown: 5.2,
  boosterCooldown: 6.5,
  ultimateCooldown: 14,
  enemyRadius: 20,
  enemyMaxHp: 380,
  enemySpeed: 246,
  enemyDodgeSpeed: 780,
  enemyDodgeDuration: 0.17,
  enemyDodgeCooldown: 1.6,
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
    warhound: {
      key: "warhound",
      name: "Warhound",
      description: "Pit veteran wrapped in bolted plate, cable scars, and a mean heavy stance.",
      icon: "avatar-warhound",
      bodyColor: "#d6d2cf",
      accentColor: "#ff9a6a",
      detailColor: "#473a33",
    },
    ghostwire: {
      key: "ghostwire",
      name: "Ghostwire",
      description: "Lean neon tracker with a surgical visor and high-voltage spine rig.",
      icon: "avatar-ghostwire",
      bodyColor: "#e1fbff",
      accentColor: "#5cf7ff",
      detailColor: "#314750",
    },
    ironmaw: {
      key: "ironmaw",
      name: "Ironmaw",
      description: "Scrap juggernaut silhouette with asymmetrical armor and brutal edge plating.",
      icon: "avatar-ironmaw",
      bodyColor: "#f0dccf",
      accentColor: "#ff7b54",
      detailColor: "#5a342c",
    },
    dunepriest: {
      key: "dunepriest",
      name: "Dune Priest",
      description: "Dust-robed tech mystic carrying jury-rigged coils and ritual glow strips.",
      icon: "avatar-dunepriest",
      bodyColor: "#ede8d7",
      accentColor: "#a8f7c0",
      detailColor: "#5f5642",
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
    bloodwire: {
      key: "bloodwire",
      name: "Bloodwire",
      description: "Red-hot copper weave wrapped around savage scrapyard housings.",
      icon: "skin-bloodwire",
      tint: "#ff6f63",
      glow: "#ffd2c8",
    },
    toxicash: {
      key: "toxicash",
      name: "Toxic Ash",
      description: "Acid-green salvage finish built from refinery waste and irradiated dust.",
      icon: "skin-toxicash",
      tint: "#b0ff77",
      glow: "#e7ffd3",
    },
    voidchrome: {
      key: "voidchrome",
      name: "Voidchrome",
      description: "Matte black frame with violent magenta edge lights and dead-cold chrome.",
      icon: "skin-voidchrome",
      tint: "#dd8cff",
      glow: "#f2d2ff",
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
      cooldown: 0.98,
      slotLabel: "Precision",
      description: "Charged long-range punishment weapon for mistake denial.",
      rhythm: "Charge / punish",
      rangeProfile: "Long",
      commitment: "High",
      accent: "#ffd375",
      icon: "weapon-sniper",
      category: "offense",
      state: "playable",
    },
    staff: {
      key: "staff",
      name: "Volt Staff",
      cooldown: 0.42,
      slotLabel: "Sustain Hybrid",
      description: "Hybrid beam staff that trades raw DPS for sustain and support value.",
      rhythm: "Measured / sustain",
      rangeProfile: "Medium",
      commitment: "Medium",
      accent: "#95ffb4",
      icon: "weapon-staff",
      category: "support",
      state: "playable",
    },
    injector: {
      key: "injector",
      name: "Bio-Injector Gun",
      cooldown: 0.26,
      slotLabel: "Mark Utility",
      description: "Strange salvage-tech gun that turns pressure into sustain through marks.",
      rhythm: "Stack / convert",
      rangeProfile: "Medium",
      commitment: "Low",
      accent: "#d88cff",
      icon: "weapon-injector",
      category: "utility",
      state: "playable",
    },
  },
  abilities: {
    vectorDash: {
      key: "vectorDash",
      name: "Vector Dash",
      input: "Shift",
      role: "Mobility / Outplay",
      description: "Legacy build entry. Dash is now a universal core mechanic for every build.",
      icon: "ability-dash",
      category: "mobility",
      state: "locked",
    },
    blinkStep: { key: "blinkStep", name: "Blink Step", role: "Mobility", description: "Short displacement burst.", icon: "ability-blink", category: "mobility", state: "playable" },
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
    phaseDash: { key: "phaseDash", name: "Phase Dash", role: "Mobility", description: "Untargetable phase burst.", icon: "ability-phase", category: "mobility", state: "playable" },
    slideBooster: { key: "slideBooster", name: "Slide Booster", role: "Mobility", description: "Ground slide for spacing.", icon: "ability-slide", category: "mobility", state: "locked" },
    backstepBurst: { key: "backstepBurst", name: "Backstep Burst", role: "Mobility", description: "Fast reverse burst that creates breathing room without killing tempo.", icon: "ability-backstep", category: "mobility", state: "playable" },
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
    pulseBurst: { key: "pulseBurst", name: "Pulse Burst", role: "Offense", description: "Short-range burst of pulse shots.", icon: "ability-burst", category: "offense", state: "playable" },
    railShot: { key: "railShot", name: "Rail Shot", role: "Offense", description: "Charged piercing line shot.", icon: "ability-rail", category: "offense", state: "playable" },
    chainLightning: { key: "chainLightning", name: "Chain Lightning", role: "Offense", description: "Snap a primary target, then arc into nearby bodies for tempo pressure.", icon: "ability-chain", category: "offense", state: "playable" },
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
    gravityWell: { key: "gravityWell", name: "Gravity Well", role: "Control", description: "Pull field that punishes spacing.", icon: "ability-gravity", category: "control", state: "playable" },
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
    phaseShift: { key: "phaseShift", name: "Phase Shift", role: "Defense", description: "Brief intangibility window.", icon: "ability-phaseshift", category: "defense", state: "playable" },
    healPulse: { key: "healPulse", name: "Heal Pulse", role: "Defense", description: "Short combat heal burst.", icon: "ability-heal", category: "defense", state: "locked" },
    regenZone: { key: "regenZone", name: "Regen Zone", role: "Defense", description: "Zone that restores health over time.", icon: "ability-regen", category: "defense", state: "locked" },
    reflectBarrier: { key: "reflectBarrier", name: "Reflect Barrier", role: "Defense", description: "Reflects incoming fire briefly.", icon: "ability-reflect", category: "defense", state: "locked" },
    damageReductionAura: { key: "damageReductionAura", name: "Damage Reduction Aura", role: "Defense", description: "Short mitigation aura.", icon: "ability-aura", category: "defense", state: "locked" },
    overdriveBooster: {
      key: "overdriveBooster",
      name: "Overdrive Booster",
      input: "F",
      role: "Utility / Tempo",
      description: "Legacy ability retired from the competitive ruleset.",
      icon: "ability-booster",
      category: "utility",
      state: "locked",
    },
    cooldownReset: { key: "cooldownReset", name: "Partial Cooldown Reset", role: "Utility", description: "Shave time off active cooldowns.", icon: "ability-reset", category: "utility", state: "locked" },
    visionScan: { key: "visionScan", name: "Vision Scan", role: "Utility", description: "Read enemy position and intent.", icon: "ability-scan", category: "utility", state: "locked" },
    hologramDecoy: { key: "hologramDecoy", name: "Hologram Decoy", role: "Utility", description: "Spawn a false target to break focus.", icon: "ability-decoy", category: "utility", state: "playable" },
    speedSurge: { key: "speedSurge", name: "Speed Surge", role: "Utility", description: "Flat movement burst for tempo.", icon: "ability-speed", category: "utility", state: "playable" },
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
    overdriveCapacitor: { key: "overdriveCapacitor", name: "Overdrive Capacitor", description: "Legacy perk retired from the competitive ruleset.", icon: "perk-capacitor", state: "locked" },
    abilityLeech: { key: "abilityLeech", name: "Ability Leech", description: "Ability hits restore a little health.", icon: "perk-leech", state: "playable" },
    staticMomentum: { key: "staticMomentum", name: "Static Momentum", description: "Applying control grants speed.", icon: "perk-momentum", state: "playable" },
    tacticalHaste: { key: "tacticalHaste", name: "Tactical Haste", description: "Ability hits grant a short haste.", icon: "perk-haste", state: "playable" },
    cloneFailover: { key: "cloneFailover", name: "Clone Failover", description: "Emergency decoy at low HP.", icon: "perk-clone", state: "playable" },
    arcFeedback: { key: "arcFeedback", name: "Arc Feedback", description: "Burst damage grants a small shield.", icon: "perk-feedback", state: "playable" },
    overclockTrigger: { key: "overclockTrigger", name: "Overclock Trigger", description: "Legacy perk retired from the competitive ruleset.", icon: "perk-trigger", state: "locked" },
    utilityBattery: { key: "utilityBattery", name: "Utility Battery", description: "Defensive and support actions restore combat value.", icon: "perk-battery", state: "playable" },
  },
  ultimates: {
    overdriveOverload: {
      key: "overdriveOverload",
      name: "Overdrive Overload",
      description: "Legacy ultimate retired from the competitive ruleset.",
      icon: "ultimate-overload",
      state: "locked",
    },
    arenaLockdown: {
      key: "arenaLockdown",
      name: "Arena Lockdown",
      description: "Future arena-control ultimate that narrows the duel space.",
      icon: "ultimate-lockdown",
      state: "playable",
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
      state: "playable",
    },
    berserkCore: {
      key: "berserkCore",
      name: "Berserk Core",
      description: "Future aggression and sustain window.",
      icon: "ultimate-berserk",
      state: "playable",
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
          description: "Low-health targets trigger a brief combat surge and a stronger finishing window.",
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
      description: "Cooldown pressure, stronger ability flow, and cleaner status timing.",
      nodes: {
        secondary: {
          key: "secondary",
          name: "Quickcharge Weave",
          description: "Cooldown reduction and slightly longer status effects.",
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
          description: "Charged abilities gain a stronger competitive payoff.",
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
          description: "Control actions build toward a utility surge and stronger clutch mobility.",
          max: 1,
        },
      },
    },
  },
};

const weapons = content.weapons;

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

const duelMapRegistry = {
  electroGallery: {
    key: "electroGallery",
    name: "Electro Gallery",
    subtitle: "Neon conduit arena with linked portals and high-speed repositioning.",
    theme: {
      backgroundStart: "#13253a",
      backgroundEnd: "#071019",
      floorGlow: "#6ae9ff",
      laneGlow: "#7ee9ff",
      warmGlow: "#ffb06b",
      border: "#8cefff",
    },
  },
  bricABroc: {
    key: "bricABroc",
    name: "Bric-a-Broc",
    subtitle: "Scrapyard duel ground with collapsing pillars and shifting cover.",
    theme: {
      backgroundStart: "#261d18",
      backgroundEnd: "#100d0b",
      floorGlow: "#ffb77e",
      laneGlow: "#ff995b",
      warmGlow: "#ffd8a6",
      border: "#ffc78c",
    },
  },
};

const mapChoices = {
  electroGallery: duelMapRegistry.electroGallery,
  bricABroc: duelMapRegistry.bricABroc,
  randomMap: {
    key: "randomMap",
    name: "Random Map",
    subtitle: "Draw a live duel arena from the registered map pool.",
    theme: duelMapRegistry.electroGallery.theme,
  },
  trainingGround: {
    key: "trainingGround",
    name: "Training Range",
    subtitle: "Open firing lane with static bots for clean build testing.",
    theme: {
      backgroundStart: "#1a2229",
      backgroundEnd: "#0b1115",
      floorGlow: "#8fb4ca",
      laneGlow: "#89d6ff",
      warmGlow: "#d0dee8",
      border: "#b7d9ee",
    },
  },
};

const mapLayouts = {
  electroGallery: {
    key: "electroGallery",
    name: duelMapRegistry.electroGallery.name,
    subtitle: duelMapRegistry.electroGallery.subtitle,
    theme: duelMapRegistry.electroGallery.theme,
    playerSpawn: { x: 262, y: 690 },
    enemySpawn: { x: 1342, y: 206 },
    trainingSpawn: { x: 262, y: 690 },
    arenaDecor: [
      { type: "lane", x: 112, y: 116, w: 1376, h: 118, color: "rgba(86, 116, 150, 0.12)", stroke: "rgba(135, 235, 255, 0.18)" },
      { type: "lane", x: 112, y: 666, w: 1376, h: 118, color: "rgba(86, 116, 150, 0.1)", stroke: "rgba(255, 174, 109, 0.12)" },
      { type: "bridge", x: 640, y: 202, w: 320, h: 92, color: "rgba(73, 102, 130, 0.2)", stroke: "rgba(165, 241, 255, 0.22)" },
      { type: "bridge", x: 640, y: 606, w: 320, h: 92, color: "rgba(73, 102, 130, 0.2)", stroke: "rgba(165, 241, 255, 0.22)" },
      { type: "pit", x: 692, y: 364, w: 216, h: 172, color: "rgba(8, 12, 20, 0.52)", stroke: "rgba(124, 214, 255, 0.22)" },
    ],
    obstacles: [
      { key: "gallery-wall-1", x: 430, y: 278, w: 168, h: 62, style: "gallery-wall" },
      { key: "gallery-wall-2", x: 1002, y: 560, w: 168, h: 62, style: "gallery-wall" },
      { key: "gallery-core-1", x: 660, y: 286, w: 100, h: 156, style: "gallery-block" },
      { key: "gallery-core-2", x: 840, y: 456, w: 100, h: 156, style: "gallery-block" },
      { key: "gallery-column-1", x: 566, y: 370, w: 52, h: 120, style: "gallery-panel" },
      { key: "gallery-column-2", x: 982, y: 410, w: 52, h: 120, style: "gallery-panel" },
    ],
    bushes: [],
    portals: [
      { key: "gallery-portal-a-in", x: 236, y: 186, radius: 34, targetKey: "gallery-portal-a-out", color: "#6ef4ff" },
      { key: "gallery-portal-a-out", x: 1368, y: 710, radius: 34, targetKey: "gallery-portal-a-in", color: "#6ef4ff" },
      { key: "gallery-portal-b-in", x: 1368, y: 186, radius: 34, targetKey: "gallery-portal-b-out", color: "#ff9a6a" },
      { key: "gallery-portal-b-out", x: 236, y: 710, radius: 34, targetKey: "gallery-portal-b-in", color: "#ff9a6a" },
    ],
    pylons: [],
    trainingBots: [],
  },
  bricABroc: {
    key: "bricABroc",
    name: duelMapRegistry.bricABroc.name,
    subtitle: duelMapRegistry.bricABroc.subtitle,
    theme: duelMapRegistry.bricABroc.theme,
    playerSpawn: { x: 248, y: 694 },
    enemySpawn: { x: 1332, y: 214 },
    trainingSpawn: { x: 248, y: 694 },
    arenaDecor: [
      { type: "lane", x: 108, y: 132, w: 1384, h: 134, color: "rgba(124, 92, 66, 0.14)", stroke: "rgba(255, 194, 135, 0.14)" },
      { type: "lane", x: 108, y: 634, w: 1384, h: 142, color: "rgba(112, 84, 60, 0.13)", stroke: "rgba(255, 194, 135, 0.12)" },
      { type: "bridge", x: 590, y: 342, w: 420, h: 120, color: "rgba(116, 82, 56, 0.16)", stroke: "rgba(255, 214, 174, 0.16)" },
    ],
    obstacles: [
      { key: "bric-wall-1", x: 362, y: 274, w: 154, h: 68, style: "scrap-wall" },
      { key: "bric-wall-2", x: 1092, y: 536, w: 168, h: 72, style: "scrap-wall" },
      { key: "bric-crate-1", x: 560, y: 578, w: 92, h: 58, style: "crate" },
      { key: "bric-crate-2", x: 952, y: 272, w: 92, h: 58, style: "crate" },
    ],
    bushes: [],
    portals: [],
    pylons: [
      { key: "bric-pillar-1", x: 506, y: 456, radius: 24, hp: 72, height: 178, fallLength: 196, color: "#ffbf80" },
      { key: "bric-pillar-2", x: 812, y: 330, radius: 24, hp: 72, height: 184, fallLength: 208, color: "#ffd39f" },
      { key: "bric-pillar-3", x: 1096, y: 534, radius: 24, hp: 72, height: 178, fallLength: 196, color: "#ff9d63" },
    ],
    trainingBots: [],
  },
  trainingGround: {
    key: "trainingGround",
    name: mapChoices.trainingGround.name,
    subtitle: mapChoices.trainingGround.subtitle,
    theme: mapChoices.trainingGround.theme,
    playerSpawn: { x: 186, y: 450 },
    enemySpawn: { x: 1336, y: 236 },
    trainingSpawn: { x: 186, y: 450 },
    arenaDecor: [
      { type: "lane", x: 120, y: 362, w: 1360, h: 176, color: "rgba(111, 142, 164, 0.08)", stroke: "rgba(173, 223, 252, 0.14)" },
      { type: "bridge", x: 344, y: 422, w: 920, h: 56, color: "rgba(84, 104, 122, 0.08)", stroke: "rgba(173, 223, 252, 0.12)" },
    ],
    obstacles: [],
    bushes: [],
    portals: [],
    pylons: [],
    trainingBots: [
      { x: 656, y: 450 },
      { x: 818, y: 450 },
      { x: 980, y: 450 },
      { x: 1142, y: 450 },
      { x: 1304, y: 450 },
    ],
  },
};

const buildLabVisiblePools = {
  weapons: ["pulse", "axe", "shotgun", "sniper", "staff", "injector"],
  abilities: [
    "shockJavelin",
    "magneticField",
    "magneticGrapple",
    "energyShield",
    "empBurst",
    "chainLightning",
    "blinkStep",
    "phaseDash",
    "pulseBurst",
    "railShot",
    "gravityWell",
    "phaseShift",
  ],
  perks: [
    "scavengerPlates",
    "reactiveArmor",
    "dashCooling",
    "executionRelay",
    "comboDriver",
    "shockBuffer",
  ],
  ultimates: ["phantomSplit", "revivalProtocol", "empCataclysm"],
};

const loadout = {
  weapon: weapons.pulse.key,
  abilities: ["shockJavelin", "magneticField", "energyShield"],
  perks: ["scavengerPlates"],
  ultimate: "phantomSplit",
  avatar: "drifter",
  weaponSkin: "stock",
  runes: createInitialRuneAllocation(),
};

const uiState = {
  prematchOpen: true,
  prematchStep: "mode",
  selectedMode: sandboxModes.duel.key,
  selectedMap: "electroGallery",
  buildCategory: "weapon",
  selectedLoadoutSlot: "weapon",
  selectedDetail: { type: "weapon", key: weapons.pulse.key },
};

const botBuildState = {
  mode: "random",
  custom: {
    weapon: weapons.pulse.key,
    abilities: ["shockJavelin", "magneticField", "energyShield"],
  },
  current: {
    weapon: weapons.pulse.key,
    abilities: ["shockJavelin", "magneticField", "energyShield"],
  },
};

const trainingToolState = {
  botsFire: false,
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
  alive: true,
  hitReactionTime: 0,
  hitReactionX: 0,
  hitReactionY: 0,
  recoil: 0,
  weapon: weapons.pulse.key,
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
  revivalPrimed: 0,
  decoyTime: 0,
  injectorMarks: 0,
  injectorMarkTime: 0,
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
    upgraded: false,
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
    shield: 0,
    shieldTime: 0,
    hasteTime: 0,
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
  mapKey: mapChoices.electroGallery.key,
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
    text: "#97efff",
    wave: "ring",
  },
  stun: {
    label: "STUN!",
    fill: "rgba(255, 86, 64, 0.98)",
    stroke: "rgba(255, 234, 214, 0.96)",
    text: "#ffd8b8",
    wave: "spark",
  },
};

const bullets = [];
const enemyBullets = [];
const impacts = [];
const tracers = [];
const combatTexts = [];
const afterimages = [];
const slashEffects = [];
const shockJavelins = [];
const enemyShockJavelins = [];
const explosions = [];
const magneticFields = [];
const absorbBursts = [];
const abilityProjectiles = [];
const deployableTraps = [];
const deployableTurrets = [];
const supportZones = [];
const beamEffects = [];
const mapEffects = [];
const mapState = {
  layoutKey: mapChoices.electroGallery.key,
  obstacles: [],
  bushes: [],
  portals: [],
  pylons: [],
  decor: [],
};
resetMapState(sandbox.mode, sandbox.mapKey);
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

function cloneRect(rect) {
  return { ...rect };
}

function circleIntersectsRect(x, y, radius, rect) {
  const nearestX = clamp(x, rect.x, rect.x + rect.w);
  const nearestY = clamp(y, rect.y, rect.y + rect.h);
  return length(x - nearestX, y - nearestY) <= radius;
}

function circleIntersectsCircle(x1, y1, r1, x2, y2, r2) {
  return length(x1 - x2, y1 - y2) <= r1 + r2;
}

function isInsideRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function getVisibleContentItems(group) {
  const pool = buildLabVisiblePools[group] ?? [];
  return pool
    .map((key) => getContentItem(group, key))
    .filter((item) => item && item.state === "playable");
}

function normalizeLoadoutSelections() {
  if (!buildLabVisiblePools.weapons.includes(loadout.weapon)) {
    loadout.weapon = buildLabVisiblePools.weapons[0];
  }

  loadout.abilities = [...new Set(loadout.abilities.filter((key) => buildLabVisiblePools.abilities.includes(key)))];
  for (const fallback of ["shockJavelin", "magneticField", "energyShield", "magneticGrapple", "empBurst"]) {
    if (!loadout.abilities.includes(fallback) && buildLabVisiblePools.abilities.includes(fallback)) {
      loadout.abilities.push(fallback);
    }
    if (loadout.abilities.length >= 3) {
      break;
    }
  }
  loadout.abilities = loadout.abilities.slice(0, 3);

  if (!buildLabVisiblePools.perks.includes(loadout.perks[0])) {
    loadout.perks = [buildLabVisiblePools.perks[0]];
  } else {
    loadout.perks = [loadout.perks[0]];
  }

  if (!buildLabVisiblePools.ultimates.includes(loadout.ultimate)) {
    loadout.ultimate = buildLabVisiblePools.ultimates[0];
  }
}

function getSelectableMapsForMode(mode = uiState.selectedMode) {
  if (mode === sandboxModes.training.key) {
    return [mapChoices.trainingGround];
  }
  return [mapChoices.electroGallery, mapChoices.bricABroc, mapChoices.randomMap];
}

function normalizeSelectedMap(mode, mapKey) {
  if (mode === sandboxModes.training.key) {
    return mapChoices.trainingGround.key;
  }
  if (mapKey === mapChoices.randomMap.key || duelMapRegistry[mapKey]) {
    return mapKey;
  }
  return mapChoices.electroGallery.key;
}

function resolveMapKey(mode, mapKey, resolveRandom = false) {
  const normalized = normalizeSelectedMap(mode, mapKey);
  if (mode === sandboxModes.training.key) {
    return mapChoices.trainingGround.key;
  }
  if (normalized === mapChoices.randomMap.key) {
    if (!resolveRandom && duelMapRegistry[sandbox.mapKey]) {
      return sandbox.mapKey;
    }
    const duelPool = Object.keys(duelMapRegistry);
    return duelPool[Math.floor(Math.random() * duelPool.length)] ?? mapChoices.electroGallery.key;
  }
  return normalized;
}

function getSelectedMapMeta(mode = uiState.selectedMode, mapKey = uiState.selectedMap) {
  const normalized = normalizeSelectedMap(mode, mapKey);
  return getSelectableMapsForMode(mode).find((item) => item.key === normalized) ?? mapChoices.trainingGround;
}

function getMapLayout(mode = sandbox.mode, mapKey = sandbox.mapKey) {
  const resolvedKey = resolveMapKey(mode, mapKey);
  return mapLayouts[resolvedKey] ?? mapLayouts.electroGallery;
}

function buildMapState(mode = sandbox.mode, mapKey = sandbox.mapKey) {
  const layout = getMapLayout(mode, mapKey);
  mapState.layoutKey = layout.key;
  mapState.decor = layout.arenaDecor.map((item) => ({ ...item }));
  mapState.obstacles = layout.obstacles.map((item) => ({ ...cloneRect(item), solid: true }));
  mapState.bushes = layout.bushes.map((item) => ({ ...cloneRect(item) }));
  mapState.portals = layout.portals.map((item) => ({ ...item, cooldowns: new Map() }));
  mapState.pylons = layout.pylons.map((item) => ({
    ...item,
    maxHp: item.hp,
    alive: true,
    falling: false,
    fallen: false,
    fallAngle: -Math.PI * 0.5,
    fallenRect: null,
    damageFlash: 0,
    wobbleTime: 0,
  }));
}

function resetMapState(mode = sandbox.mode, mapKey = sandbox.mapKey) {
  buildMapState(mode, mapKey);
}

function getPortalTarget(portal) {
  return mapState.portals.find((item) => item.key === portal.targetKey) ?? null;
}

function getEntityPortalKey(entity) {
  return entity.role ?? entity.kind ?? "player";
}

function updatePortalCooldowns(dt) {
  for (const portal of mapState.portals) {
    for (const [key, value] of portal.cooldowns.entries()) {
      const nextValue = value - dt;
      if (nextValue <= 0) {
        portal.cooldowns.delete(key);
      } else {
        portal.cooldowns.set(key, nextValue);
      }
    }
  }

  for (const pylon of mapState.pylons) {
    pylon.damageFlash = Math.max(0, (pylon.damageFlash ?? 0) - dt);
    pylon.wobbleTime = Math.max(0, (pylon.wobbleTime ?? 0) - dt);
  }
}

function maybeTeleportEntity(entity) {
  const entityKey = getEntityPortalKey(entity);
  for (const portal of mapState.portals) {
    if (portal.cooldowns.get(entityKey) > 0) {
      continue;
    }
    if (!circleIntersectsCircle(entity.x, entity.y, entity.radius, portal.x, portal.y, portal.radius)) {
      continue;
    }
    const target = getPortalTarget(portal);
    if (!target) {
      continue;
    }
    entity.x = clamp(target.x, entity.radius, arena.width - entity.radius);
    entity.y = clamp(target.y, entity.radius, arena.height - entity.radius);
    for (const portalNode of mapState.portals) {
      portalNode.cooldowns.set(entityKey, config.portalReuseCooldown);
    }
    addImpact(portal.x, portal.y, portal.color, 24);
    addImpact(target.x, target.y, target.color, 28);
    addAfterimage(entity.x, entity.y, entity.facing ?? 0, entity.radius + 4, target.color);
    addShake(3.6);
    break;
  }
}

function resolveRectCollision(entity, rect) {
  const nearestX = clamp(entity.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(entity.y, rect.y, rect.y + rect.h);
  let dx = entity.x - nearestX;
  let dy = entity.y - nearestY;
  let distanceToRect = length(dx, dy);

  if (distanceToRect > entity.radius) {
    return;
  }

  if (distanceToRect === 0) {
    const left = Math.abs(entity.x - rect.x);
    const right = Math.abs(rect.x + rect.w - entity.x);
    const top = Math.abs(entity.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - entity.y);
    const minSide = Math.min(left, right, top, bottom);

    if (minSide === left) {
      dx = -1;
      dy = 0;
      distanceToRect = left;
    } else if (minSide === right) {
      dx = 1;
      dy = 0;
      distanceToRect = right;
    } else if (minSide === top) {
      dx = 0;
      dy = -1;
      distanceToRect = top;
    } else {
      dx = 0;
      dy = 1;
      distanceToRect = bottom;
    }
  }

  const push = entity.radius - distanceToRect + 0.5;
  const normal = normalize(dx, dy);
  entity.x += normal.x * push;
  entity.y += normal.y * push;
}

function resolvePylonCollision(entity, pylon) {
  if (!pylon.alive || pylon.fallen) {
    return;
  }
  const dx = entity.x - pylon.x;
  const dy = entity.y - pylon.y;
  const distanceToPylon = length(dx, dy);
  const pushRadius = entity.radius + pylon.radius;
  if (distanceToPylon >= pushRadius) {
    return;
  }
  const normal = normalize(dx || 1, dy);
  const push = pushRadius - distanceToPylon + 0.5;
  entity.x += normal.x * push;
  entity.y += normal.y * push;
}

function resolveMapCollision(entity) {
  for (const obstacle of mapState.obstacles) {
    if (obstacle.solid) {
      resolveRectCollision(entity, obstacle);
    }
  }

  for (const pylon of mapState.pylons) {
    resolvePylonCollision(entity, pylon);
    if (pylon.fallenRect) {
      resolveRectCollision(entity, pylon.fallenRect);
    }
  }

  entity.x = clamp(entity.x, entity.radius, arena.width - entity.radius);
  entity.y = clamp(entity.y, entity.radius, arena.height - entity.radius);
}

function resolveCharacterBodyBlocking() {
  if (!player.alive) {
    return;
  }

  const playerIntangible = abilityState.phaseShift.time > 0 || abilityState.phaseDash.time > 0 || player.ghostTime > 0;
  if (playerIntangible) {
    return;
  }

  for (const bot of getAllBots()) {
    if (!bot.alive) {
      continue;
    }

    const distanceBetween = length(bot.x - player.x, bot.y - player.y);
    const minimumDistance = player.radius + bot.radius;
    if (distanceBetween >= minimumDistance) {
      continue;
    }

    const normal = normalize(player.x - bot.x || 1, player.y - bot.y || 0);
    const overlap = minimumDistance - distanceBetween + 0.4;
    const playerPushFactor = bot.role === "training" ? 1 : 0.55;
    const botPushFactor = bot.role === "training" ? 0 : 0.45;

    player.x += normal.x * overlap * playerPushFactor;
    player.y += normal.y * overlap * playerPushFactor;
    bot.x -= normal.x * overlap * botPushFactor;
    bot.y -= normal.y * overlap * botPushFactor;

    resolveMapCollision(player);
    resolveMapCollision(bot);
  }
}

function isEntityInBush(entity) {
  return mapState.bushes.some((bush) => circleIntersectsRect(entity.x, entity.y, entity.radius, bush));
}

function canSeeTarget(viewer, target) {
  if (!target || !target.alive) {
    return false;
  }
  const viewerInBush = isEntityInBush(viewer);
  const targetInBush = isEntityInBush(target);
  if (!targetInBush) {
    return true;
  }
  if (viewerInBush) {
    return true;
  }
  return length(viewer.x - target.x, viewer.y - target.y) < 144;
}

function getPylonFallRect(pylon) {
  const width = Math.max(26, pylon.radius * 1.35);
  const endX = pylon.x + Math.cos(pylon.fallAngle) * pylon.fallLength;
  const endY = pylon.y + Math.sin(pylon.fallAngle) * pylon.fallLength;
  if (Math.abs(Math.cos(pylon.fallAngle)) >= Math.abs(Math.sin(pylon.fallAngle))) {
    return {
      x: Math.min(pylon.x, endX),
      y: Math.min(pylon.y, endY) - width * 0.5,
      w: Math.abs(endX - pylon.x) || width,
      h: width,
      style: "fallen-pylon",
      solid: true,
    };
  }
  return {
    x: Math.min(pylon.x, endX) - width * 0.5,
    y: Math.min(pylon.y, endY),
    w: width,
    h: Math.abs(endY - pylon.y) || width,
    style: "fallen-pylon",
    solid: true,
  };
}

function collapsePylon(pylon, sourceX, sourceY, team = "player") {
  if (!pylon.alive) {
    return;
  }
  pylon.alive = false;
  pylon.falling = false;
  const fallDirection = normalize(pylon.x - sourceX, pylon.y - sourceY);
  pylon.fallAngle = Math.atan2(fallDirection.y, fallDirection.x);
  pylon.fallen = true;
  pylon.fallenRect = getPylonFallRect(pylon);
  addExplosion(pylon.x, pylon.y, 96, pylon.color);
  addImpact(pylon.x, pylon.y, "#fff0d2", 32);
  addShake(10.4);

  const endX = pylon.x + Math.cos(pylon.fallAngle) * pylon.fallLength;
  const endY = pylon.y + Math.sin(pylon.fallAngle) * pylon.fallLength;
  const fallVector = normalize(Math.cos(pylon.fallAngle), Math.sin(pylon.fallAngle));
  const targets = team === "player" ? getAllBots() : [player];
  for (const target of targets) {
    if (!target.alive) {
      continue;
    }
    const distanceToPath = pointToSegmentDistance(target.x, target.y, pylon.x, pylon.y, endX, endY);
    if (distanceToPath > target.radius + 22) {
      continue;
    }
    if (target.team === "enemy") {
      damageBot(target, 34, pylon.color, target.x, target.y, 0);
      applyStatusEffect(target, "stun", getStatusDuration(0.8), 1);
    } else {
      const defeatedByPylon = applyPlayerDamage(22, "pylon");
      applyStatusEffect(target, "stun", getStatusDuration(0.55), 1);
      if (defeatedByPylon) {
        if (sandbox.mode === sandboxModes.duel.key) {
          finishDuelRound("enemy");
        } else {
          resetPlayer();
        }
      }
    }
    target.x += fallVector.x * 42;
    target.y += fallVector.y * 42;
    resolveMapCollision(target);
    addImpact(target.x, target.y, "#fff0d2", 28);
  }
}

function damagePylon(pylon, amount, sourceX, sourceY, team = "player") {
  if (!pylon.alive) {
    return false;
  }
  pylon.hp = Math.max(0, pylon.hp - amount);
  pylon.damageFlash = 0.24;
  pylon.wobbleTime = 0.42;
  addImpact(pylon.x, pylon.y, pylon.color, 18);
  if (pylon.hp <= 0) {
    collapsePylon(pylon, sourceX, sourceY, team);
  }
  return true;
}

function hitMapWithProjectile(projectile, team = "player") {
  for (const obstacle of mapState.obstacles) {
    if (circleIntersectsRect(projectile.x, projectile.y, projectile.radius, obstacle)) {
      addImpact(projectile.x, projectile.y, team === "player" ? "#9ce8ff" : "#ffb294", 16);
      return true;
    }
  }

  for (const pylon of mapState.pylons) {
    if (pylon.alive && circleIntersectsCircle(projectile.x, projectile.y, projectile.radius, pylon.x, pylon.y, pylon.radius)) {
      damagePylon(pylon, projectile.damage * 0.6, projectile.x, projectile.y, team);
      return true;
    }
    if (pylon.fallenRect && circleIntersectsRect(projectile.x, projectile.y, projectile.radius, pylon.fallenRect)) {
      addImpact(projectile.x, projectile.y, pylon.color, 14);
      return true;
    }
  }

  return false;
}

function damagePylonsAlongLine(startX, startY, endX, endY, damage, team = "player") {
  for (const pylon of mapState.pylons) {
    if (!pylon.alive) {
      continue;
    }
    const distanceToPath = pointToSegmentDistance(pylon.x, pylon.y, startX, startY, endX, endY);
    if (distanceToPath <= pylon.radius + 12) {
      damagePylon(pylon, damage, startX, startY, team);
    }
  }
}

function applyStatusEffect(entity, type, duration, magnitude = 0) {
  if (!entity.statusEffects) {
    entity.statusEffects = [];
  }

  const existing = entity.statusEffects.find((effect) => effect.type === type);

  if (existing) {
    existing.time = Math.max(existing.time, duration);
    existing.magnitude = Math.max(existing.magnitude, magnitude);
    if (entity.x !== undefined && entity.y !== undefined) {
      addImpact(entity.x, entity.y, type === "stun" ? "#ffd37c" : "#8fd6ff", type === "stun" ? 20 : 16);
    }
    return existing;
  }

  const effect = { type, time: duration, magnitude };
  entity.statusEffects.push(effect);
  if (entity.x !== undefined && entity.y !== undefined) {
    addImpact(entity.x, entity.y, type === "stun" ? "#ffd37c" : "#8fd6ff", type === "stun" ? 24 : 18);
  }
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
  combatTexts.length = 0;
  afterimages.length = 0;
  slashEffects.length = 0;
  shockJavelins.length = 0;
  enemyShockJavelins.length = 0;
  explosions.length = 0;
  magneticFields.length = 0;
  absorbBursts.length = 0;
  abilityProjectiles.length = 0;
  deployableTraps.length = 0;
  deployableTurrets.length = 0;
  supportZones.length = 0;
  beamEffects.length = 0;
  mapEffects.length = 0;
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

function getPlayableWeaponItems() {
  return Object.values(content.weapons).filter((weapon) => weapon.state === "playable");
}

function getPlayableAbilityItems() {
  return Object.values(content.abilities).filter((ability) => ability.state === "playable");
}

function ensureBotLoadoutFilled(loadoutConfig) {
  const weaponKey = getContentItem("weapons", loadoutConfig.weapon)?.state === "playable"
    ? loadoutConfig.weapon
    : weapons.pulse.key;
  const playableAbilityKeys = getPlayableAbilityItems().map((ability) => ability.key);
  const uniqueAbilities = [...new Set((loadoutConfig.abilities ?? []).filter((abilityKey) => playableAbilityKeys.includes(abilityKey)))];

  for (const fallback of ["shockJavelin", "magneticField", "energyShield", "magneticGrapple", "empBurst", "phaseShift"]) {
    if (!uniqueAbilities.includes(fallback) && playableAbilityKeys.includes(fallback)) {
      uniqueAbilities.push(fallback);
    }
    if (uniqueAbilities.length >= 3) {
      break;
    }
  }

  return {
    weapon: weaponKey,
    abilities: uniqueAbilities.slice(0, 3),
  };
}

function pickRandomItems(source, count) {
  const pool = [...source];
  const picks = [];

  while (pool.length > 0 && picks.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }

  return picks;
}

function createRandomBotLoadout() {
  const archetypes = [
    {
      weapon: weapons.pulse.key,
      abilities: ["shockJavelin", "magneticField", "energyShield"],
    },
    {
      weapon: weapons.pulse.key,
      abilities: ["shockJavelin", "empBurst", "phaseShift"],
    },
    {
      weapon: weapons.shotgun.key,
      abilities: ["magneticGrapple", "empBurst", "blinkStep"],
    },
    {
      weapon: weapons.shotgun.key,
      abilities: ["shockJavelin", "magneticGrapple", "energyShield"],
    },
    {
      weapon: weapons.axe.key,
      abilities: ["magneticGrapple", "energyShield", "phaseDash"],
    },
    {
      weapon: weapons.axe.key,
      abilities: ["magneticField", "magneticGrapple", "shockJavelin"],
    },
    {
      weapon: weapons.sniper.key,
      abilities: ["shockJavelin", "energyShield", "magneticField"],
    },
    {
      weapon: weapons.staff.key,
      abilities: ["magneticField", "energyShield", "chainLightning"],
    },
    {
      weapon: weapons.injector.key,
      abilities: ["shockJavelin", "empBurst", "magneticGrapple"],
    },
  ];

  const selectedArchetype = archetypes[Math.floor(Math.random() * archetypes.length)];
  return ensureBotLoadoutFilled(selectedArchetype);
}

function getBotConfiguredLoadout() {
  return botBuildState.mode === "custom"
    ? ensureBotLoadoutFilled(botBuildState.custom)
    : createRandomBotLoadout();
}

function enemyHasAbility(abilityKey) {
  return enemy.loadout?.abilities?.includes(abilityKey);
}

function setBotBuildMode(mode) {
  botBuildState.mode = mode === "custom" ? "custom" : "random";
  if (botBuildState.mode === "random") {
    botBuildState.current = createRandomBotLoadout();
  } else {
    botBuildState.current = ensureBotLoadoutFilled(botBuildState.custom);
  }
  renderPrematch();
}

function applyBotCustomWeapon(weaponKey) {
  botBuildState.custom.weapon = weaponKey;
  if (botBuildState.mode === "custom") {
    botBuildState.current = ensureBotLoadoutFilled(botBuildState.custom);
  }
  renderPrematch();
}

function toggleBotCustomAbility(abilityKey) {
  const selected = [...(botBuildState.custom.abilities ?? [])];
  const existingIndex = selected.indexOf(abilityKey);

  if (existingIndex >= 0) {
    if (selected.length <= 1) {
      return;
    }
    selected.splice(existingIndex, 1);
  } else if (selected.length >= 3) {
    selected.shift();
    selected.push(abilityKey);
  } else {
    selected.push(abilityKey);
  }

  botBuildState.custom.abilities = ensureBotLoadoutFilled({
    weapon: botBuildState.custom.weapon,
    abilities: selected,
  }).abilities;
  if (botBuildState.mode === "custom") {
    botBuildState.current = ensureBotLoadoutFilled(botBuildState.custom);
  }
  renderPrematch();
}

function getCurrentBotBuildPreview() {
  return botBuildState.mode === "custom"
    ? ensureBotLoadoutFilled(botBuildState.custom)
    : ensureBotLoadoutFilled(botBuildState.current);
}

function hasPerk(key) {
  return loadout.perks.slice(0, 1).includes(key);
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

  return multiplier;
}

function getBuildStats() {
  return {
    maxHp: config.playerMaxHp + (hasPerk("scavengerPlates") ? 30 : 0) + getRuneValue("defense", "secondary") * 5,
    damageReduction: (hasPerk("reactiveArmor") ? 0.12 : 0) + getRuneValue("defense", "secondary") * 0.01,
    ccReduction: (hasPerk("shockBuffer") ? 0.28 : 0) + getRuneValue("defense", "secondary") * 0.02,
    dashCooldownMultiplier: hasPerk("dashCooling") ? 0.84 : 1,
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
  mapScreen.classList.toggle("prematch-screen--active", step === "map");
  buildScreen.classList.toggle("prematch-screen--active", step === "build");
  stepMode.classList.toggle("is-active", step === "mode");
  stepMap.classList.toggle("is-active", step === "map");
  stepBuild.classList.toggle("is-active", step === "build");
}

function syncPrematchState() {
  gameShell.classList.toggle("prematch-open", uiState.prematchOpen);
}

function openPrematch(step = "mode") {
  uiState.prematchOpen = true;
  input.keys.clear();
  input.firing = false;
  releaseDashInput();
  abilityState.javelin.charging = false;
  abilityState.field.charging = false;
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

function relaunchCurrentSession() {
  clearCombatArtifacts();
  if (sandbox.mode === sandboxModes.duel.key) {
    startDuelRound({ resetScore: true });
    statusLine.textContent = `${getMapLayout(sandbox.mode, sandbox.mapKey).name} rematch primed. Clean reset, same stakes.`;
    return;
  }

  resetPlayer({ silent: true });
  resetBotsForMode(sandboxModes.training.key);
  showRoundBanner("", "", false);
  statusLine.textContent = `${getMapLayout(sandbox.mode, sandbox.mapKey).name} reset. Keep labbing the build.`;
}

function updatePrematchSummary() {
  const selectedMode = sandboxModes[uiState.selectedMode];
  const selectedMap = getSelectedMapMeta(uiState.selectedMode, uiState.selectedMap);
  const selectedWeapon = weapons[loadout.weapon];
  const remainingPoints = getRemainingRunePoints();
  const selectedUltimateTree = getSelectedRuneUltimateTree();
  const selectedAvatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;

  selectedModeLabel.textContent = selectedMode.name;
  selectedMapLabel.textContent = selectedMap.name;
  selectedWeaponLabel.textContent = selectedWeapon.name;
  runePointsLabel.textContent = `${remainingPoints} remaining`;
  runePointsInline.textContent = `${remainingPoints} points remaining`;
  runeUltimateInline.textContent = selectedUltimateTree
    ? `${content.runeTrees[selectedUltimateTree].name} ultimate active`
    : "No ultimate selected";
  prematchDescription.textContent =
    uiState.selectedMode === sandboxModes.training.key
      ? "Training mode loads a clean firing lane with static bots so you can lab timing, spacing, and projectile denial."
      : `${selectedMap.name}: ${selectedMap.subtitle}`;
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

function renderMapSelection() {
  if (!mapGrid) {
    return;
  }

  mapGrid.textContent = "";
  const maps = getSelectableMapsForMode(uiState.selectedMode);
  const selectedMapKey = normalizeSelectedMap(uiState.selectedMode, uiState.selectedMap);

  maps.forEach((mapChoice) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "mode-card";
    if (mapChoice.key === selectedMapKey) {
      card.classList.add("is-selected");
    }
    card.innerHTML = `
      <span class="mode-card__tag">${uiState.selectedMode === sandboxModes.training.key ? "Training" : mapChoice.key === "randomMap" ? "Random" : "Duel Map"}</span>
      <strong>${mapChoice.name}</strong>
      <span>${mapChoice.subtitle}</span>
    `;
    card.addEventListener("click", () => {
      uiState.selectedMap = mapChoice.key;
      statusLine.textContent = `${mapChoice.name} selected.`;
      renderPrematch();
    });
    mapGrid.appendChild(card);
  });
}

function getPrematchCategoryItems(category) {
  switch (category) {
    case "weapon":
      return getVisibleContentItems("weapons");
    case "ability":
      return getVisibleContentItems("abilities");
    case "perk":
      return getVisibleContentItems("perks");
    case "ultimate":
      return getVisibleContentItems("ultimates");
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
      hint: "Lock one balancing perk for this test pass so its effect is easy to read in combat.",
      iconType: "perk",
      selectedKeys: loadout.perks.slice(0, 1),
      compatibleSlots: ["perk-0"],
    },
    ultimate: {
      title: "Ultimates",
      hint: "Lock one round-defining spike from the current balancing set.",
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
  if (slotKey === "perk-0") {
    return getContentItem("perks", loadout.perks[0]) ?? null;
  }

  return getContentItem(`${category}s`, loadout.weapon) ?? null;
}

function setPreviewAvatar(element, avatar) {
  if (!element || !avatar) {
    return;
  }

  element.style.setProperty("--avatar-body", avatar.bodyColor);
  element.style.setProperty("--avatar-accent", avatar.accentColor);
  element.style.setProperty("--avatar-detail", avatar.detailColor);
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
  if (!container) {
    return;
  }
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
  const selectedPerks = loadout.perks.slice(0, 1).map((key) => getContentItem("perks", key)).filter(Boolean);

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
    return "perk-0";
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
      loadout.abilities.push(["shockJavelin", "magneticField", "energyShield"].find((fallback) => !loadout.abilities.includes(fallback)) ?? "shockJavelin");
      loadout.abilities = [...new Set(loadout.abilities)];
    }
    loadout.abilities = loadout.abilities.slice(0, 3);
  } else if (category === "perk") {
    loadout.perks = [itemKey];
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

function renderTrainingBotPanel() {
  if (!botConfigCard || !botConfigCopy) {
    return;
  }

  if (uiState.selectedMode === sandboxModes.training.key) {
    botConfigCard.classList.remove("is-randomized");
    botConfigLabel.textContent = "Training Tool";
    botConfigTitle.textContent = "Static Dummy Controls";
    botConfigCopy.textContent = trainingToolState.botsFire
      ? "Training bots stay fixed in lane and fire steady pulse shots so you can test dodge timing, field denial, and real build pressure."
      : "Training bots stay static and silent so you can test range, cleave, hitboxes, and combo timing with no pressure.";
    botConfigDuel?.classList.add("is-hidden");
    botConfigTraining?.classList.remove("is-hidden");
    trainingFireOff?.classList.toggle("is-active", !trainingToolState.botsFire);
    trainingFireOn?.classList.toggle("is-active", trainingToolState.botsFire);
    renderValidationChips(
      trainingBuildSummary,
      [
        {
          key: "training-range",
          name: "5 Static Bots",
          icon: "ability-decoy",
          category: "utility",
        },
        {
          key: trainingToolState.botsFire ? "live-fire" : "silent-line",
          name: trainingToolState.botsFire ? "Live Fire" : "Silent Range",
          icon: trainingToolState.botsFire ? "weapon-pulse" : "ability-shield",
          category: trainingToolState.botsFire ? "offense" : "defense",
        },
      ],
      "ability",
    );
    return;
  }

  const previewBuild = getCurrentBotBuildPreview();
  const previewWeapon = getContentItem("weapons", previewBuild.weapon) ?? weapons.pulse;
  const previewAbilities = previewBuild.abilities
    .map((abilityKey) => getContentItem("abilities", abilityKey))
    .filter(Boolean);

  botConfigLabel.textContent = "Duel Tool";
  botConfigTitle.textContent = "Hunter Bot Loadout";
  botConfigDuel?.classList.remove("is-hidden");
  botConfigTraining?.classList.add("is-hidden");
  botConfigCard.classList.toggle("is-randomized", botBuildState.mode === "random");
  botModeRandom.classList.toggle("is-active", botBuildState.mode === "random");
  botModeCustom.classList.toggle("is-active", botBuildState.mode === "custom");
  botConfigCopy.textContent =
    botBuildState.mode === "random"
      ? "Hunter bot randomizes a full playable loadout on each duel reset so every spar feels different."
      : "Custom mode locks the hunter build. Use it to lab exact matchup pressure before entering the arena.";

  renderSelectionGrid(
    botWeaponGrid,
    getVisibleContentItems("weapons"),
    [botBuildState.custom.weapon],
    (weaponKey) => applyBotCustomWeapon(weaponKey),
    {
      iconType: "weapon",
      activeKeys: [previewBuild.weapon],
    },
  );

  renderSelectionGrid(
    botAbilityGrid,
    getVisibleContentItems("abilities"),
    botBuildState.custom.abilities,
    (abilityKey) => toggleBotCustomAbility(abilityKey),
    {
      iconType: "ability",
      activeKeys: previewBuild.abilities,
    },
  );

  renderValidationChips(
    botBuildSummary,
    [previewWeapon, ...previewAbilities],
    "ability",
  );
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
  normalizeLoadoutSelections();
  if (
    uiState.selectedDetail &&
    ["weapon", "ability", "perk", "ultimate"].includes(uiState.selectedDetail.type) &&
    !getPrematchCategoryItems(uiState.selectedDetail.type).some((item) => item.key === uiState.selectedDetail.key)
  ) {
    uiState.selectedDetail = {
      type: uiState.selectedDetail.type,
      key:
        uiState.selectedDetail.type === "weapon"
          ? loadout.weapon
          : uiState.selectedDetail.type === "ultimate"
            ? loadout.ultimate
            : uiState.selectedDetail.type === "perk"
              ? loadout.perks[0]
              : loadout.abilities[0],
    };
  }
  modeDuel.classList.toggle("is-selected", uiState.selectedMode === sandboxModes.duel.key);
  modeTraining.classList.toggle("is-selected", uiState.selectedMode === sandboxModes.training.key);
  const avatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;

  setPreviewAvatar(cosmeticAvatarPreview, avatar);
  renderMapSelection();
  renderBuildLibrary();
  renderCosmetics();
  updateLoadoutSlots();
  updateLoadoutSummaryPanels();
  updateDetailPanel();
  renderTrainingBotPanel();
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
  const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  canvas.width = width;
  canvas.height = height;
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

function spawnBullet(owner, targetX, targetY, collection, color, speed, damage, options = {}) {
  const direction = normalize(targetX - owner.x, targetY - owner.y);
  const startX = owner.x + direction.x * (owner.radius + 8);
  const startY = owner.y + direction.y * (owner.radius + 8);
  collection.push({
    x: startX,
    y: startY,
    vx: direction.x * speed,
    vy: direction.y * speed,
    radius: options.radius ?? 4,
    damage,
    life: options.life ?? config.bulletLife,
    color,
    trailColor: options.trailColor ?? color,
    piercing: options.piercing ?? false,
    hitTargets: new Set(),
    effect: options.effect ?? null,
    source: options.source ?? "weapon",
    ownerTeam: owner.team ?? "player",
  });

  tracers.push({
    x0: startX - direction.x * 18,
    y0: startY - direction.y * 18,
    x1: startX + direction.x * 34,
    y1: startY + direction.y * 34,
    color: options.trailColor ?? color,
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

function addCombatText(x, y, text, color, options = {}) {
  combatTexts.push({
    x,
    y,
    text: String(text),
    color,
    life: options.life ?? 0.56,
    maxLife: options.life ?? 0.56,
    rise: options.rise ?? 32,
    driftX: options.driftX ?? (Math.random() - 0.5) * 16,
    size: options.size ?? 18,
    weight: options.weight ?? 700,
  });
}

function addDamageText(x, y, amount, options = {}) {
  addCombatText(x, y, `${Math.max(1, Math.round(amount))}`, options.color ?? "#ff7f73", {
    life: options.life ?? (options.heavy ? 0.62 : 0.54),
    rise: options.rise ?? (options.heavy ? 40 : 30),
    size: options.size ?? (options.heavy ? 22 : 18),
    weight: options.weight ?? (options.heavy ? 800 : 700),
  });
}

function addHealingText(x, y, amount) {
  addCombatText(x, y, `+${Math.max(1, Math.round(amount))}`, "#7dff9e", {
    life: 0.58,
    rise: 28,
    size: 18,
    weight: 700,
  });
}

function applyHitReaction(entity, sourceX, sourceY, intensity = 1) {
  const direction = normalize(entity.x - sourceX || 1, entity.y - sourceY || 0);
  entity.hitReactionTime = Math.max(entity.hitReactionTime ?? 0, 0.12 + intensity * 0.05);
  entity.hitReactionX = direction.x * (5 + intensity * 4);
  entity.hitReactionY = direction.y * (5 + intensity * 4);
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

function addBeamEffect(x0, y0, x1, y1, color, width = 4, life = 0.12) {
  beamEffects.push({
    x0,
    y0,
    x1,
    y1,
    color,
    width,
    life,
    maxLife: life,
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

function getActiveDashCooldown() {
  return config.dashCooldown * getBuildStats().dashCooldownMultiplier;
}

function getActiveDashCharges() {
  return 1;
}

function getDashProfile(mode = abilityState.dash.mode) {
  if (mode === "hold") {
    return {
      duration: abilityConfig.dash.holdDuration,
      invulnerability: abilityConfig.dash.holdInvulnerability,
      speed: abilityConfig.dash.holdSpeed,
      trailColor: "#c8ffe4",
    };
  }

  return {
    duration: abilityConfig.dash.tapDuration,
    invulnerability: abilityConfig.dash.tapInvulnerability,
    speed: abilityConfig.dash.tapSpeed,
    trailColor: abilityConfig.dash.trailColor,
  };
}

function getWeaponCooldown(weaponKey) {
  const weapon = weapons[weaponKey] ?? weapons.pulse;
  return weapon.cooldown / getBuildStats().hasteMultiplier;
}

function getActiveMoveSpeed() {
  const buildStats = getBuildStats();
  const fieldBoost = abilityState.field.moveBoostTime > 0 ? config.fieldTapMoveBoost : 1;
  return config.playerSpeed * fieldBoost * buildStats.moveMultiplier;
}

function addEnergy(amount) {
  return amount;
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
  const layout = getMapLayout(mode);
  return mode === sandboxModes.training.key
    ? { ...layout.trainingSpawn }
    : { ...layout.playerSpawn };
}

function isCombatLive() {
  return !uiState.prematchOpen && (sandbox.mode !== sandboxModes.duel.key || matchState.phase === "active");
}

function getPulseMagazineSize() {
  return config.pulseMagazineSize;
}

function getActiveBotLoadout() {
  botBuildState.current = getBotConfiguredLoadout();
  return botBuildState.current;
}

function applyBotLoadout(bot, loadoutConfig) {
  const normalized = ensureBotLoadoutFilled(loadoutConfig);
  bot.loadout = normalized;
  bot.weapon = normalized.weapon;
  bot.ammo = getPulseMagazineSize();
  bot.reloadTime = 0;
  bot.shield = 0;
  bot.shieldTime = 0;
  bot.hasteTime = 0;
  bot.comboStep = 0;
  bot.comboTimer = 0;
  bot.meleeWindupTime = 0;
  bot.pendingMeleeStrike = null;
  bot.attackCommitTime = 0;
  bot.attackCommitX = 0;
  bot.attackCommitY = 0;
  bot.attackCommitSpeed = 0;
  bot.activeMeleeStrike = null;
  bot.abilityCooldowns.grapple = 0;
  bot.abilityCooldowns.shield = 0;
  bot.abilityCooldowns.booster = 0;
  bot.abilityCooldowns.emp = 0;
  bot.abilityCooldowns.backstep = 0;
  bot.abilityCooldowns.chainLightning = 0;
  bot.abilityCooldowns.blink = 0;
  bot.abilityCooldowns.phaseDash = 0;
  bot.abilityCooldowns.pulseBurst = 0;
  bot.abilityCooldowns.railShot = 0;
  bot.abilityCooldowns.gravityWell = 0;
  bot.abilityCooldowns.phaseShift = 0;
  bot.abilityCooldowns.hologramDecoy = 0;
  bot.abilityCooldowns.speedSurge = 0;
  bot.javelinCooldown = 0.8;
  bot.fieldCooldown = 1.8;
}

function refreshHunterLoadout() {
  applyBotLoadout(enemy, getActiveBotLoadout());
}

function resetBotsForMode(mode = sandbox.mode) {
  resetMapState(mode, sandbox.mapKey);

  if (mode === sandboxModes.duel.key) {
    refreshHunterLoadout();
  }

  const layout = getMapLayout(mode, sandbox.mapKey);
  enemy.spawnX = layout.enemySpawn.x;
  enemy.spawnY = layout.enemySpawn.y;

  layout.trainingBots.forEach((spawn, index) => {
    if (trainingBots[index]) {
      trainingBots[index].spawnX = spawn.x;
      trainingBots[index].spawnY = spawn.y;
    }
  });

  for (const bot of bots) {
    bot.x = bot.spawnX;
    bot.y = bot.spawnY;
    bot.hp = bot.maxHp;
    bot.alive = bot.modes.includes(mode);
    bot.flash = 0;
    bot.facing = 0;
    bot.shootCooldown =
      bot.role === "hunter"
        ? 0.7
        : trainingToolState.botsFire
          ? 0.35 + trainingBots.indexOf(bot) * 0.08
          : 999;
    bot.cadence = bot.role === "hunter" ? 0.72 : 1.15 + trainingBots.indexOf(bot) * 0.02;
    bot.strafeTimer = 0;
    bot.dodgeCooldown = 0.6;
    bot.dodgeTime = 0;
    bot.dodgeVectorX = 0;
    bot.dodgeVectorY = 0;
    bot.burstShots = 0;
    bot.shotSpread = 0;
    bot.reloadTime = 0;
    bot.ammo = getPulseMagazineSize();
    bot.shield = 0;
    bot.shieldTime = 0;
    bot.hasteTime = 0;
    bot.comboStep = 0;
    bot.comboTimer = 0;
    bot.meleeWindupTime = 0;
    bot.pendingMeleeStrike = null;
    bot.attackCommitTime = 0;
    bot.attackCommitX = 0;
    bot.attackCommitY = 0;
    bot.attackCommitSpeed = 0;
    bot.activeMeleeStrike = null;
    bot.injectorMarks = 0;
    bot.injectorMarkTime = 0;
    if (bot.role === "hunter") {
      bot.abilityCooldowns.grapple = 0;
      bot.abilityCooldowns.shield = 0;
      bot.abilityCooldowns.booster = 0;
      bot.abilityCooldowns.emp = 0;
      bot.abilityCooldowns.backstep = 0;
      bot.abilityCooldowns.chainLightning = 0;
      bot.abilityCooldowns.blink = 0;
      bot.abilityCooldowns.phaseDash = 0;
      bot.abilityCooldowns.pulseBurst = 0;
      bot.abilityCooldowns.railShot = 0;
      bot.abilityCooldowns.gravityWell = 0;
      bot.abilityCooldowns.phaseShift = 0;
      bot.abilityCooldowns.hologramDecoy = 0;
      bot.abilityCooldowns.speedSurge = 0;
      bot.javelinCooldown = 0.8;
      bot.fieldCooldown = 1.8;
    }
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
  statusLine.textContent = `${getMapLayout(sandboxModes.duel.key, sandbox.mapKey).name} - round ${matchState.roundNumber} incoming. Hold center and be ready.`;
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

function switchSandboxMode(nextMode, nextMapKey = sandbox.mapKey) {
  if (!sandboxModes[nextMode]) {
    return;
  }

  sandbox.mode = nextMode;
  uiState.selectedMode = nextMode;
  sandbox.mapKey = resolveMapKey(nextMode, nextMapKey);
  clearCombatArtifacts();

  if (nextMode === sandboxModes.training.key) {
    resetPlayer({ silent: true });
    resetBotsForMode(nextMode);
    showRoundBanner("", "", false);
    statusLine.textContent = `${getMapLayout(nextMode, sandbox.mapKey).name} active. Static targets are ready for build testing.`;
    return;
  }

  startDuelRound({ resetScore: true });
  statusLine.textContent = `${getMapLayout(nextMode, sandbox.mapKey).name} active. Match flow initialized.`;
}

function launchSelectedSession() {
  normalizeLoadoutSelections();
  loadout.weapon = loadout.weapon in weapons ? loadout.weapon : weapons.pulse.key;
  loadout.perks = loadout.perks.filter(Boolean).slice(0, 1);
  if (loadout.perks.length === 0) {
    loadout.perks = [buildLabVisiblePools.perks[0]];
  }
  while (loadout.abilities.length < 3) {
    for (const fallback of ["shockJavelin", "magneticField", "energyShield", "magneticGrapple"]) {
      if (!loadout.abilities.includes(fallback)) {
        loadout.abilities.push(fallback);
      }
      if (loadout.abilities.length >= 3) {
        break;
      }
    }
  }
  botBuildState.current = botBuildState.mode === "custom"
    ? ensureBotLoadoutFilled(botBuildState.custom)
    : createRandomBotLoadout();
  player.weapon = loadout.weapon;
  const previousMode = sandbox.mode;
  const previousMapKey = sandbox.mapKey;
  const resolvedMapKey = resolveMapKey(uiState.selectedMode, uiState.selectedMap, true);
  closePrematch();
  if (previousMode !== uiState.selectedMode || previousMapKey !== resolvedMapKey) {
    switchSandboxMode(uiState.selectedMode, resolvedMapKey);
  } else if (uiState.selectedMode === sandboxModes.training.key) {
    resetPlayer({ silent: true });
    resetBotsForMode(sandboxModes.training.key);
    showRoundBanner("", "", false);
  } else {
    startDuelRound({ resetScore: true });
  }

  if (uiState.selectedMode === sandboxModes.training.key) {
    statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} started. Test ranges, hitboxes, and defensive timings.`;
  } else {
    statusLine.textContent = `${getMapLayout(uiState.selectedMode, resolvedMapKey).name} loaded. Read the round and contest space cleanly.`;
  }
}

function handlePrematchAction(buttonId) {
  if (buttonId === "mode-duel") {
    uiState.selectedMode = sandboxModes.duel.key;
    uiState.selectedMap = normalizeSelectedMap(sandboxModes.duel.key, uiState.selectedMap);
    statusLine.textContent = "Duel Map selected.";
    renderPrematch();
    return;
  }

  if (buttonId === "mode-training") {
    uiState.selectedMode = sandboxModes.training.key;
    uiState.selectedMap = mapChoices.trainingGround.key;
    statusLine.textContent = "Training Map selected.";
    renderPrematch();
    return;
  }

  if (buttonId === "step-mode" || buttonId === "back-mode") {
    setPrematchStep("mode");
    statusLine.textContent = "Mode select open.";
    return;
  }

  if (buttonId === "step-map" || buttonId === "continue-map" || buttonId === "back-map") {
    setPrematchStep("map");
    statusLine.textContent = "Map select open.";
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
    piercing: false,
    speed: profile.speed,
    stun: profile.stun ?? 0,
  };
}

function getFieldProfile(mode = abilityState.field.mode) {
  const profile = mode === "hold" ? abilityConfig.field.hold : abilityConfig.field.tap;

  return {
    ...profile,
    radius: profile.radius,
    slow: profile.slow,
    disruption: 0,
    moveBoost: 1,
    moveBoostDuration: 0,
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
  abilityState.dash.upgraded = false;
  executeDash("tap");
}

function executeDash(dashMode) {
  if (dashMode === "tap" && abilityState.dash.charges <= 0) {
    return;
  }

  const move = getMoveVector();
  const aim = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const dashDirection = move.x !== 0 || move.y !== 0 ? move : aim;
  const dashProfile = getDashProfile(dashMode);

  abilityState.dash.mode = dashMode;
  abilityState.dash.vectorX = dashDirection.x;
  abilityState.dash.vectorY = dashDirection.y;
  abilityState.dash.activeTime = Math.max(abilityState.dash.activeTime, dashProfile.duration);
  abilityState.dash.invulnerabilityTime = Math.max(
    abilityState.dash.invulnerabilityTime,
    dashProfile.invulnerability,
  );

  if (dashMode === "tap") {
    abilityState.dash.charges -= 1;
  }

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

function upgradeDashToHold() {
  if (abilityState.dash.mode === "hold") {
    return;
  }

  const holdProfile = getDashProfile("hold");
  abilityState.dash.mode = "hold";
  abilityState.dash.activeTime = Math.max(abilityState.dash.activeTime, holdProfile.duration * 0.82);
  abilityState.dash.invulnerabilityTime = Math.max(
    abilityState.dash.invulnerabilityTime,
    holdProfile.invulnerability,
  );
  addAfterimage(player.x, player.y, player.facing, player.radius + 3, holdProfile.trailColor);
}

function releaseDashInput() {
  if (!abilityState.dash.inputHeld) {
    return;
  }

  abilityState.dash.inputHeld = false;
  abilityState.dash.holdTime = 0;
}

function updateDashAbility(dt) {
  const activeDashCharges = getActiveDashCharges();

  if (abilityState.dash.inputHeld) {
    abilityState.dash.holdTime = Math.min(0.4, abilityState.dash.holdTime + dt);
  }

  if (
    abilityState.dash.inputHeld &&
    abilityState.dash.activeTime > 0 &&
    !abilityState.dash.upgraded &&
    abilityState.dash.holdTime >= abilityConfig.dash.holdThreshold
  ) {
    abilityState.dash.upgraded = true;
    upgradeDashToHold();
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
      player.radius,
      dashProfile.trailColor,
    );
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
  const damage = charged ? 14 : 10;

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

function castBackstepBurst() {
  if (!isCombatLive() || abilityState.backstep.cooldown > 0) {
    return;
  }

  const look = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const retreat = { x: -look.x, y: -look.y };
  player.x += retreat.x * 158;
  player.y += retreat.y * 158;
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  abilityState.backstep.cooldown = 3.6;
  player.shield = Math.max(player.shield, 10);
  player.shieldTime = Math.max(player.shieldTime, 0.7);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 0.85);
  addAfterimage(player.x, player.y, player.facing, player.radius + 6, "#fff0a8");
  addImpact(player.x, player.y, "#fff0a8", 22);
  addShake(4.6);
  statusLine.textContent = "Backstep Burst snapped you out of close pressure.";
}

function castChainLightning() {
  if (!isCombatLive() || abilityState.chainLightning.cooldown > 0) {
    return;
  }

  const aliveBots = getAllBots().filter((bot) => bot.alive);
  if (aliveBots.length === 0) {
    return;
  }

  const rankedTargets = [...aliveBots].sort((a, b) => {
    const aScore = length(a.x - input.mouseX, a.y - input.mouseY) + length(a.x - player.x, a.y - player.y) * 0.35;
    const bScore = length(b.x - input.mouseX, b.y - input.mouseY) + length(b.x - player.x, b.y - player.y) * 0.35;
    return aScore - bScore;
  });
  const firstTarget = rankedTargets[0];
  if (!firstTarget || length(firstTarget.x - player.x, firstTarget.y - player.y) > 520) {
    return;
  }

  abilityState.chainLightning.cooldown = 5.4;
  let sourceX = player.x;
  let sourceY = player.y;
  let currentTarget = firstTarget;
  let currentDamage = 28 * getPerkDamageMultiplier(firstTarget);
  const struck = new Set();

  for (let hop = 0; hop < 3 && currentTarget; hop += 1) {
    struck.add(currentTarget.kind);
    addBeamEffect(sourceX, sourceY, currentTarget.x, currentTarget.y, hop === 0 ? "#9feaff" : "#d6bbff", hop === 0 ? 5 : 3.5, 0.14);
    damageBot(
      currentTarget,
      currentDamage,
      hop === 0 ? "#9feaff" : "#d6bbff",
      currentTarget.x,
      currentTarget.y,
      0,
    );
    applyStatusEffect(currentTarget, "slow", getStatusDuration(0.55), 0.18 + hop * 0.04);
    addImpact(currentTarget.x, currentTarget.y, hop === 0 ? "#9feaff" : "#d6bbff", 22 - hop * 4);

    sourceX = currentTarget.x;
    sourceY = currentTarget.y;
    currentDamage *= 0.72;
    currentTarget = aliveBots
      .filter((bot) => bot.alive && !struck.has(bot.kind) && length(bot.x - sourceX, bot.y - sourceY) <= 220)
      .sort((a, b) => length(a.x - sourceX, a.y - sourceY) - length(b.x - sourceX, b.y - sourceY))[0] ?? null;
  }

  addImpact(player.x + Math.cos(player.facing) * 18, player.y + Math.sin(player.facing) * 18, "#9feaff", 18);
  addShake(6.2);
  statusLine.textContent = "Chain Lightning punished the lane with cascading arcs.";
}

function castBlinkStep() {
  if (!isCombatLive() || abilityState.blink.cooldown > 0) {
    return;
  }
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  player.x += direction.x * 148;
  player.y += direction.y * 148;
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  abilityState.blink.cooldown = 3.4;
  player.flash = 0.1;
  addAfterimage(player.x, player.y, player.facing, player.radius + 4, "#7df0ff");
  addImpact(player.x, player.y, "#b3f6ff", 24);
  addShake(4.2);
  statusLine.textContent = "Blink Step snapped you through the lane.";
}

function castPhaseDash() {
  if (!isCombatLive() || abilityState.phaseDash.cooldown > 0) {
    return;
  }
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  player.attackCommitX = direction.x;
  player.attackCommitY = direction.y;
  player.attackCommitSpeed = 1580;
  player.attackCommitTime = 0.18;
  abilityState.phaseDash.cooldown = 4.6;
  abilityState.phaseDash.time = 0.42;
  player.ghostTime = Math.max(player.ghostTime, 0.42);
  addImpact(player.x, player.y, "#b0e7ff", 30);
  addShake(5.8);
  statusLine.textContent = "Phase Dash cut you through danger.";
}

function castPulseBurst() {
  if (!isCombatLive() || abilityState.pulseBurst.cooldown > 0) {
    return;
  }
  abilityState.pulseBurst.cooldown = 3.2;
  const baseAngle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
  for (let pellet = 0; pellet < 5; pellet += 1) {
    const spread = -0.16 + pellet * 0.08;
    const angle = baseAngle + spread;
    spawnBullet(player, player.x + Math.cos(angle) * 120, player.y + Math.sin(angle) * 120, bullets, "#84dcff", 1320, 12 * getPerkDamageMultiplier(getPrimaryBot()), {
      radius: 4,
      life: 0.66,
      trailColor: "#c9f3ff",
      source: "pulse-burst",
    });
  }
  addImpact(player.x + Math.cos(baseAngle) * 24, player.y + Math.sin(baseAngle) * 24, "#84dcff", 18);
  addShake(5.2);
  statusLine.textContent = "Pulse Burst flooded the lane.";
}

function castRailShotAbility() {
  if (!isCombatLive() || abilityState.railShot.cooldown > 0) {
    return;
  }
  abilityState.railShot.cooldown = 5.1;
  spawnBullet(player, input.mouseX, input.mouseY, bullets, "#ffd279", 1820, 46 * getPerkDamageMultiplier(getPrimaryBot()), {
    radius: 7,
    life: 0.72,
    piercing: true,
    trailColor: "#ffeab2",
    source: "rail-shot",
    effect: { kind: "rail", bonusSlow: 0.22, bonusSlowDuration: 0.8 },
  });
  addImpact(player.x + Math.cos(player.facing) * 28, player.y + Math.sin(player.facing) * 28, "#ffd279", 22);
  addShake(7.6);
  statusLine.textContent = "Rail Shot tore a high-voltage line through the arena.";
}

function castGravityWell() {
  if (!isCombatLive() || abilityState.gravityWell.cooldown > 0) {
    return;
  }
  abilityState.gravityWell.cooldown = 5.8;
  supportZones.push({
    type: "gravity",
    team: "player",
    x: input.mouseX,
    y: input.mouseY,
    radius: 118,
    life: 2.1,
    maxLife: 2.1,
    color: "#b999ff",
    slow: 0.44,
  });
  addExplosion(input.mouseX, input.mouseY, 124, "#b999ff");
  addShake(5.8);
  statusLine.textContent = "Gravity Well turned the space into a trap.";
}

function castPhaseShift() {
  if (!isCombatLive() || abilityState.phaseShift.cooldown > 0) {
    return;
  }
  abilityState.phaseShift.cooldown = 5.6;
  abilityState.phaseShift.time = 0.55;
  player.ghostTime = Math.max(player.ghostTime, 0.55);
  addImpact(player.x, player.y, "#d2f1ff", 24);
  statusLine.textContent = "Phase Shift made you intangible for a blink.";
}

function castHologramDecoy() {
  if (!isCombatLive() || abilityState.hologramDecoy.cooldown > 0) {
    return;
  }
  abilityState.hologramDecoy.cooldown = 6.2;
  player.decoyTime = Math.max(player.decoyTime, 2.8);
  addAfterimage(player.x - 46, player.y + 20, player.facing, player.radius + 8, "#caa9ff");
  addImpact(player.x, player.y, "#d8b8ff", 24);
  statusLine.textContent = "Hologram Decoy split your read.";
}

function castSpeedSurge() {
  if (!isCombatLive() || abilityState.speedSurge.cooldown > 0) {
    return;
  }
  abilityState.speedSurge.cooldown = 4.2;
  player.hasteTime = Math.max(player.hasteTime, 2.2);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 1.2);
  addImpact(player.x, player.y, "#8dfcc7", 20);
  statusLine.textContent = "Speed Surge pushed your tempo forward.";
}

function castUltimate() {
  if (!isCombatLive() || abilityState.ultimate.cooldown > 0) {
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
    return;
  }

  if (loadout.ultimate === "arenaLockdown") {
    abilityState.ultimate.cooldown = config.ultimateCooldown;
    supportZones.push({
      type: "lockdown",
      team: "player",
      x: arena.width * 0.5,
      y: arena.height * 0.5,
      radius: 278,
      life: 4.2,
      maxLife: 4.2,
      color: "#ff8c67",
      slow: 0.18,
    });
    addExplosion(arena.width * 0.5, arena.height * 0.5, 292, "#ff9b70");
    addShake(9);
    statusLine.textContent = "Arena Lockdown collapsed the duel space.";
    return;
  }

  if (loadout.ultimate === "empCataclysm") {
    abilityState.ultimate.cooldown = config.ultimateCooldown;
    castEmpBurst();
    abilityState.emp.cooldown = Math.max(abilityState.emp.cooldown, 0.1);
    applyStatusEffect(enemy, "stun", getStatusDuration(0.45), 1);
    enemy.dashCooldown = Math.max(enemy.dashCooldown, 1.6);
    addExplosion(player.x, player.y, 148, "#d2b0ff");
    addShake(11.4);
    statusLine.textContent = "EMP Cataclysm blanked the arena's tech for a moment.";
    return;
  }

  if (loadout.ultimate === "berserkCore") {
    abilityState.ultimate.cooldown = config.ultimateCooldown;
    player.hasteTime = Math.max(player.hasteTime, 4.2);
    player.shield = Math.max(player.shield, 28);
    player.shieldTime = Math.max(player.shieldTime, 4.2);
    player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 4.2);
    addImpact(player.x, player.y, "#ff875d", 34);
    addImpact(player.x, player.y, "#ffd7bc", 52);
    addShake(10.2);
    statusLine.textContent = "Berserk Core online. Press relentlessly.";
  }
}

function updateExtraAbilities(dt) {
  abilityState.grapple.cooldown = Math.max(0, abilityState.grapple.cooldown - dt);
  abilityState.shield.cooldown = Math.max(0, abilityState.shield.cooldown - dt);
  abilityState.booster.cooldown = Math.max(0, abilityState.booster.cooldown - dt);
  abilityState.emp.cooldown = Math.max(0, abilityState.emp.cooldown - dt);
  abilityState.backstep.cooldown = Math.max(0, abilityState.backstep.cooldown - dt);
  abilityState.chainLightning.cooldown = Math.max(0, abilityState.chainLightning.cooldown - dt);
  abilityState.blink.cooldown = Math.max(0, abilityState.blink.cooldown - dt);
  abilityState.phaseDash.cooldown = Math.max(0, abilityState.phaseDash.cooldown - dt);
  abilityState.phaseDash.time = Math.max(0, abilityState.phaseDash.time - dt);
  abilityState.pulseBurst.cooldown = Math.max(0, abilityState.pulseBurst.cooldown - dt);
  abilityState.railShot.cooldown = Math.max(0, abilityState.railShot.cooldown - dt);
  abilityState.gravityWell.cooldown = Math.max(0, abilityState.gravityWell.cooldown - dt);
  abilityState.phaseShift.cooldown = Math.max(0, abilityState.phaseShift.cooldown - dt);
  abilityState.phaseShift.time = Math.max(0, abilityState.phaseShift.time - dt);
  abilityState.hologramDecoy.cooldown = Math.max(0, abilityState.hologramDecoy.cooldown - dt);
  abilityState.speedSurge.cooldown = Math.max(0, abilityState.speedSurge.cooldown - dt);
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

  if (ability.key === "shockJavelin") {
    startJavelinCharge();
  } else if (ability.key === "magneticField") {
    startFieldCharge();
  } else if (ability.key === "magneticGrapple") {
    castMagneticGrapple();
  } else if (ability.key === "energyShield") {
    castEnergyShield();
  } else if (ability.key === "empBurst") {
    castEmpBurst();
  } else if (ability.key === "backstepBurst") {
    castBackstepBurst();
  } else if (ability.key === "chainLightning") {
    castChainLightning();
  } else if (ability.key === "blinkStep") {
    castBlinkStep();
  } else if (ability.key === "phaseDash") {
    castPhaseDash();
  } else if (ability.key === "pulseBurst") {
    castPulseBurst();
  } else if (ability.key === "railShot") {
    castRailShotAbility();
  } else if (ability.key === "gravityWell") {
    castGravityWell();
  } else if (ability.key === "phaseShift") {
    castPhaseShift();
  } else if (ability.key === "hologramDecoy") {
    castHologramDecoy();
  } else if (ability.key === "speedSurge") {
    castSpeedSurge();
  }
}

function releaseAbilityInput(slotIndex) {
  const ability = getAbilityBySlot(slotIndex);
  if (!ability) {
    return;
  }

  if (ability.key === "shockJavelin") {
    releaseShockJavelin();
  } else if (ability.key === "magneticField") {
    releaseMagneticField();
  }
}

function getPlayerFieldModifier() {
  let damageReduction = getZoneEffectsForEntity(player).damageReduction;

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

function updateSupportZones(dt) {
  for (let index = supportZones.length - 1; index >= 0; index -= 1) {
    const zone = supportZones[index];
    zone.life -= dt;
    if (zone.life <= 0) {
      supportZones.splice(index, 1);
    }
  }
}

function getZoneEffectsForEntity(entity) {
  let slowMultiplier = 1;
  let damageReduction = 0;

  for (const zone of supportZones) {
    const inside = length(entity.x - zone.x, entity.y - zone.y) <= zone.radius + entity.radius;
    if (zone.type === "lockdown" && !inside) {
      slowMultiplier = Math.min(slowMultiplier, 0.76);
    }
    if (zone.type === "gravity" && inside && zone.team !== (entity.team ?? "player")) {
      slowMultiplier = Math.min(slowMultiplier, 1 - (zone.slow ?? 0.34));
    }
    if (zone.type === "mitigation" && inside && zone.team === (entity.team ?? "player")) {
      damageReduction = Math.max(damageReduction, zone.damageReduction ?? 0);
    }
    if (zone.type === "regen" && inside && zone.team === (entity.team ?? "player")) {
      healEntity(entity, (zone.healPerSecond ?? 0) * dt);
    }
  }

  return { slowMultiplier, damageReduction };
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
    team: "enemy",
    touchedTargets: new Set(),
  });
  enemy.fieldCooldown = 5.2;
  addImpact(enemy.x, enemy.y, "#ffd1c8", 24);
}

function respawnBot(bot) {
  if (bot.role === "hunter") {
    applyBotLoadout(bot, getActiveBotLoadout());
  }
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
  bot.reloadTime = 0;
  bot.ammo = getPulseMagazineSize();
  bot.shield = 0;
  bot.shieldTime = 0;
  bot.hasteTime = 0;
  bot.comboStep = 0;
  bot.comboTimer = 0;
  bot.meleeWindupTime = 0;
  bot.pendingMeleeStrike = null;
  bot.attackCommitTime = 0;
  bot.attackCommitX = 0;
  bot.attackCommitY = 0;
  bot.attackCommitSpeed = 0;
  bot.activeMeleeStrike = null;
  bot.injectorMarks = 0;
  bot.injectorMarkTime = 0;
  bot.abilityCooldowns.grapple = 0;
  bot.abilityCooldowns.shield = 0;
  bot.abilityCooldowns.booster = 0;
  bot.abilityCooldowns.emp = 0;
  bot.abilityCooldowns.backstep = 0;
  bot.abilityCooldowns.chainLightning = 0;
  bot.abilityCooldowns.blink = 0;
  bot.abilityCooldowns.phaseDash = 0;
  bot.abilityCooldowns.pulseBurst = 0;
  bot.abilityCooldowns.railShot = 0;
  bot.abilityCooldowns.gravityWell = 0;
  bot.abilityCooldowns.phaseShift = 0;
  bot.abilityCooldowns.hologramDecoy = 0;
  bot.abilityCooldowns.speedSurge = 0;
  clearStatusEffects(bot);
}

function damageBot(bot, damage, color, impactX, impactY, energyGain) {
  if (!bot.alive) {
    return false;
  }

  if (bot.shield > 0) {
    const absorbed = Math.min(bot.shield, damage);
    bot.shield -= absorbed;
    damage -= absorbed;
    addImpact(bot.x, bot.y, "#a6d9ff", 18);
  }

  if (damage <= 0) {
    return false;
  }

  bot.hp = Math.max(0, bot.hp - damage);
  bot.flash = 0.18;
  const heavyHit = damage >= 60;
  applyHitReaction(bot, impactX ?? bot.x, impactY ?? bot.y, heavyHit ? 1.2 : 0.7);
  addImpact(impactX, impactY, color, heavyHit ? 30 : 24);
  addImpact(bot.x, bot.y, heavyHit ? "#fff4d3" : "#e9fbff", heavyHit ? 22 : 12);
  addShake(heavyHit ? 5.8 : 2.8);
  addDamageText(bot.x, bot.y - bot.radius - 8, damage, { heavy: heavyHit, color: heavyHit ? "#ff9b73" : "#ff7269" });

  if (energyGain > 0) {
    addEnergy(energyGain);
  }

  const buildStats = getBuildStats();
  if (buildStats.omnivamp > 0) {
    const healAmount = damage * buildStats.omnivamp;
    player.hp = clamp(player.hp + healAmount, 0, buildStats.maxHp);
    if (healAmount > 0.5) {
      addHealingText(player.x, player.y - player.radius - 10, healAmount);
    }
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

function setWeapon(nextWeapon) {
  if (player.weapon === nextWeapon) {
    return;
  }

  loadout.weapon = nextWeapon;
  player.weapon = nextWeapon;
  player.fireCooldown = 0;
  player.reloadTime = 0;
  if (nextWeapon === weapons.pulse.key) {
    player.ammo = getPulseMagazineSize();
  }
  player.comboStep = 0;
  player.comboTimer = 0;
  statusLine.textContent =
    nextWeapon === weapons.axe.key
      ? "Electric Axe equipped. Chain the combo and commit on the finisher."
      : nextWeapon === weapons.shotgun.key
        ? "Scrap Shotgun equipped. Play tight spacing and close for the burst."
      : nextWeapon === weapons.sniper.key
        ? "Rail Sniper equipped. Punish space and mistakes with long confirmed shots."
      : nextWeapon === weapons.staff.key
        ? "Volt Staff equipped. Trade raw burst for sustain and field control."
      : nextWeapon === weapons.injector.key
        ? "Bio-Injector equipped. Mark targets and convert pressure into sustain."
      : "Pulse Rifle equipped. Keep the bot under ranged pressure.";
}

function startPulseReload(actor = player, silent = false) {
  if (actor.reloadTime > 0 || actor.weapon !== weapons.pulse.key) {
    return false;
  }

  actor.reloadTime = config.pulseReloadTime;
  actor.fireCooldown = Math.max(actor.fireCooldown, config.pulseReloadTime);
  if (!silent && actor === player) {
    statusLine.textContent = "Pulse Rifle reloading. Reposition before the next lane.";
  }
  return true;
}

function finalizePulseReload(actor = player) {
  actor.reloadTime = 0;
  actor.ammo = getPulseMagazineSize();
}

function attackPulseRifle() {
  if (player.reloadTime > 0) {
    return;
  }

  if (player.ammo <= 0) {
    startPulseReload(player);
    return;
  }

  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.stock;
  player.fireCooldown = getWeaponCooldown(weapons.pulse.key);
  spawnBullet(player, input.mouseX, input.mouseY, bullets, activeSkin.tint, config.bulletSpeed, config.pulseDamage * getPerkDamageMultiplier(), {
    radius: 4,
    source: "pulse-rifle",
    trailColor: "#c6f5ff",
  });
  player.ammo = Math.max(0, player.ammo - 1);
  addImpact(player.x + Math.cos(player.facing) * 26, player.y + Math.sin(player.facing) * 26, "#77d8ff", 12);
  player.recoil = 1;
  addShake(2.8);
  if (player.ammo <= 0) {
    startPulseReload(player, true);
    statusLine.textContent = "Pulse Rifle mag emptied. Reloading now.";
  } else {
    statusLine.textContent = sandbox.mode === sandboxModes.duel.key && enemy.alive
      ? "Keep pressure with the pulse rifle."
      : "Pulse rifle online. Track the lane and confirm hits.";
  }
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
    spawnBullet(player, targetX, targetY, bullets, activeSkin.tint, config.bulletSpeed * 0.85, 9 * getPerkDamageMultiplier(), {
      radius: 4,
      source: "shotgun-pellet",
      trailColor: "#ffd0aa",
    });
  }

  addImpact(player.x + Math.cos(baseAngle) * 26, player.y + Math.sin(baseAngle) * 26, "#ffb078", 18);
  addShake(5.6);
  player.recoil = 1.4;
  statusLine.textContent = "Scrap Shotgun cracked out a close-range burst.";
}

function attackRailSniper() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.wastelux;
  player.fireCooldown = getWeaponCooldown(weapons.sniper.key);
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  spawnBullet(
    player,
    input.mouseX,
    input.mouseY,
    bullets,
    activeSkin.tint,
    1940,
    34 * getPerkDamageMultiplier(getPrimaryBot()),
    {
      radius: 6,
      life: 0.72,
      piercing: true,
      trailColor: "#ffe7a8",
      source: "rail-sniper",
      effect: { kind: "rail", bonusSlow: 0.12, bonusSlowDuration: 0.45 },
    },
  );
  addImpact(player.x + direction.x * 30, player.y + direction.y * 30, "#ffe4a4", 20);
  addShake(7.6);
  player.recoil = 1.42;
  statusLine.textContent = "Rail Sniper cracked a long precision shot.";
}

function attackVoltStaff() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.shockglass;
  player.fireCooldown = getWeaponCooldown(weapons.staff.key);
  spawnBullet(
    player,
    input.mouseX,
    input.mouseY,
    bullets,
    activeSkin.tint,
    980,
    12 * getPerkDamageMultiplier(getPrimaryBot()),
    {
      radius: 5,
      life: 0.9,
      trailColor: "#b6ffd4",
      source: "volt-staff",
      effect: { kind: "staff", heal: 8 },
    },
  );
  player.shield = Math.max(player.shield, 6);
  player.shieldTime = Math.max(player.shieldTime, 0.8);
  addImpact(player.x + Math.cos(player.facing) * 24, player.y + Math.sin(player.facing) * 24, "#9cffc4", 16);
  statusLine.textContent = "Volt Staff arc fired. Sustain the exchange.";
}

function attackBioInjector() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.voidchrome;
  player.fireCooldown = getWeaponCooldown(weapons.injector.key);
  spawnBullet(
    player,
    input.mouseX,
    input.mouseY,
    bullets,
    activeSkin.tint,
    1260,
    9 * getPerkDamageMultiplier(getPrimaryBot()),
    {
      radius: 4,
      life: 0.84,
      trailColor: "#f0b2ff",
      source: "injector",
      effect: { kind: "injector", markDuration: 4.2, markMax: 3, healOnConsume: 12 },
    },
  );
  addImpact(player.x + Math.cos(player.facing) * 22, player.y + Math.sin(player.facing) * 22, "#da90ff", 14);
  statusLine.textContent = "Bio-Injector tagged the lane with corrosive pressure.";
}

function getAxeComboProfile(step) {
  if (step === 1) {
    return {
      hitMode: "line",
      cooldown: 0.56,
      range: 286,
      width: 16,
      arc: 0.16,
      damage: 68,
      cleave: false,
      commitSpeed: 0,
      commitDuration: 0,
      stun: 0,
      color: "#74f6ff",
      impactColor: "#ddffff",
      startup: 0.14,
      shake: 11.2,
      impactSize: 42,
      label: "Long electro edge bit hard through the lane.",
      miss: "Long opener whiffed. The axe is punishable if you miss the line.",
    };
  }

  if (step === 2) {
    return {
      hitMode: "arc",
      cooldown: 0.68,
      range: 154,
      width: 56,
      arc: 1.34,
      damage: 80,
      cleave: true,
      commitSpeed: 0,
      commitDuration: 0,
      stun: 0,
      color: "#47cfff",
      impactColor: "#d4f6ff",
      startup: 0.2,
      shake: 15.8,
      impactSize: 50,
      label: "Heavy cleave cracked wide with brutal electric force.",
      miss: "Heavy cleave missed. The recovery is real, so swing with intent.",
    };
  }

  return {
    hitMode: "dashPath",
    cooldown: 0.94,
    range: 166,
    width: 34,
    arc: 0.44,
    damage: 104,
    cleave: false,
    commitSpeed: 1340,
    commitDuration: 0.24,
    stun: 0.72,
    color: "#ffd77e",
    impactColor: "#fff1bd",
    startup: 0.28,
    shake: 20.4,
    impactSize: 58,
    label: "Dash finisher crushed through the target and stunned it.",
    miss: "Finisher committed through empty space. The axe is deadly, but missing gets you kited.",
  };
}

function collectAxeTargets(profile, facing = player.facing) {
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
      Math.sin(botAngle - facing),
      Math.cos(botAngle - facing),
    );

    if (profile.hitMode === "arc") {
      if (botDistance > profile.range + bot.radius || Math.abs(deltaAngle) > profile.arc) {
        continue;
      }
    } else if (profile.hitMode === "line") {
      const lineStartX = player.x + Math.cos(facing) * 18;
      const lineStartY = player.y + Math.sin(facing) * 18;
      const lineEndX = player.x + Math.cos(facing) * (profile.range + 12);
      const lineEndY = player.y + Math.sin(facing) * (profile.range + 12);
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
  damagePylonsAlongLine(startX, startY, endX, endY, profile.damage * 0.35, "player");

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
      0,
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

function resolveQueuedAxeStrike(queuedStrike) {
  if (!queuedStrike) {
    return;
  }

  const { profile } = queuedStrike;

  if (profile.hitMode === "dashPath") {
    player.attackCommitTime = profile.commitDuration;
    player.attackCommitX = Math.cos(queuedStrike.facing);
    player.attackCommitY = Math.sin(queuedStrike.facing);
    player.attackCommitSpeed = profile.commitSpeed;
    player.activeAxeStrike = {
      comboStep: queuedStrike.comboStep,
      hitTargets: new Set(),
      connected: false,
      profile,
    };
    addAfterimage(player.x, player.y, player.facing, player.radius + 4, "#ffe0a0");
    addAfterimage(player.x, player.y, player.facing, player.radius + 8, "rgba(255, 224, 160, 0.8)");
    statusLine.textContent = "Electro Axe finisher committed. Drive through the target.";
    return;
  }

  const strikeStartX = player.x + Math.cos(queuedStrike.facing) * 12;
  const strikeStartY = player.y + Math.sin(queuedStrike.facing) * 12;
  const strikeEndX = player.x + Math.cos(queuedStrike.facing) * (profile.range + 12);
  const strikeEndY = player.y + Math.sin(queuedStrike.facing) * (profile.range + 12);
  damagePylonsAlongLine(strikeStartX, strikeStartY, strikeEndX, strikeEndY, profile.damage * 0.45, "player");

  const hits = collectAxeTargets(profile, queuedStrike.facing);

  if (hits.length === 0) {
    player.lastMissTime = 0.78;
    addShake(profile.hitMode === "arc" ? 3.2 : 2.4);
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
      0,
    );

    addImpact(hit.bot.x, hit.bot.y, profile.impactColor, profile.hitMode === "arc" ? 36 : 28);
    addImpact(hit.bot.x, hit.bot.y, "#fff7dc", profile.hitMode === "arc" ? 20 : 16);

    if (hit.bot.kind === "hunter") {
      hit.bot.dodgeCooldown = Math.max(hit.bot.dodgeCooldown, 0.45);
      hit.bot.postAttackMoveTime = Math.max(hit.bot.postAttackMoveTime, 0.18);
    }
  }

  addShake(profile.shake);
  statusLine.textContent = profile.label;
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
  player.fireCooldown = profile.cooldown;
  player.attackStartupTime = profile.startup;
  player.attackCommitTime = 0;
  player.attackCommitX = Math.cos(player.facing);
  player.attackCommitY = Math.sin(player.facing);
  player.attackCommitSpeed = 0;
  player.activeAxeStrike = null;
  player.pendingAxeStrike = {
    comboStep: player.comboStep,
    profile,
    facing: player.facing,
  };
  player.recoil = player.comboStep === 3 ? 0.84 : player.comboStep === 2 ? 0.52 : 0.44;
  player.flash = 0.07 + profile.startup * 0.45;
  player.slashFlash = player.comboStep === 3 ? 0.32 : player.comboStep === 2 ? 0.24 : 0.18;

  addSlashEffect(
    player.x + player.attackCommitX * 20,
    player.y + player.attackCommitY * 20,
    player.facing,
    player.comboStep,
  );
  addImpact(
    player.x + player.attackCommitX * (player.comboStep === 1 ? 56 : player.comboStep === 2 ? 32 : 42),
    player.y + player.attackCommitY * (player.comboStep === 1 ? 56 : player.comboStep === 2 ? 32 : 42),
    profile.color,
    profile.hitMode === "dashPath" ? 20 : profile.impactSize * 0.78,
  );
  if (player.comboStep === 3) {
    addImpact(
      player.x + player.attackCommitX * 42,
      player.y + player.attackCommitY * 42,
      "#fff1bd",
      24,
    );
  }
  addShake(profile.shake * 0.42);
  statusLine.textContent =
    profile.hitMode === "line"
      ? "Electro Axe opener lined up. Confirm the lane."
      : profile.hitMode === "arc"
        ? "Electro Axe cleave winding up."
        : "Electro Axe finisher charging. Commit to the path.";
}

function resetPlayer({ silent = false } = {}) {
  const spawn = getPlayerSpawn();
  const buildStats = getBuildStats();
  player.x = spawn.x;
  player.y = spawn.y;
  player.hp = buildStats.maxHp;
  player.alive = true;
  player.weapon = loadout.weapon;
  player.ammo = getPulseMagazineSize();
  player.reloadTime = 0;
  player.fireCooldown = 0;
  player.velocityX = 0;
  player.velocityY = 0;
  player.attackStartupTime = 0;
  player.attackCommitTime = 0;
  player.attackCommitX = 0;
  player.attackCommitY = 0;
  player.attackCommitSpeed = 0;
  player.activeAxeStrike = null;
  player.pendingAxeStrike = null;
  player.comboStep = 0;
  player.comboTimer = 0;
  player.lastMissTime = 0;
  player.shield = 0;
  player.shieldTime = 0;
  player.hasteTime = 0;
  player.afterDashHasteTime = 0;
  player.hitReactionTime = 0;
  player.hitReactionX = 0;
  player.hitReactionY = 0;
  player.ghostTime = 0;
  player.failsafeReady = true;
  player.revivalPrimed = 0;
  player.decoyTime = 0;
  player.injectorMarks = 0;
  player.injectorMarkTime = 0;
  clearStatusEffects(player);
  abilityState.dash.inputHeld = false;
  abilityState.dash.holdTime = 0;
  abilityState.dash.activeTime = 0;
  abilityState.dash.invulnerabilityTime = 0;
  abilityState.dash.charges = 1;
  abilityState.dash.rechargeTimer = 0;
  abilityState.dash.upgraded = false;
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
  abilityState.backstep.cooldown = 0;
  abilityState.chainLightning.cooldown = 0;
  abilityState.blink.cooldown = 0;
  abilityState.phaseDash.cooldown = 0;
  abilityState.phaseDash.time = 0;
  abilityState.pulseBurst.cooldown = 0;
  abilityState.railShot.cooldown = 0;
  abilityState.gravityWell.cooldown = 0;
  abilityState.phaseShift.cooldown = 0;
  abilityState.phaseShift.time = 0;
  abilityState.hologramDecoy.cooldown = 0;
  abilityState.speedSurge.cooldown = 0;
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
  player.reloadTime = Math.max(0, player.reloadTime - dt);
  player.flash = Math.max(0, player.flash - dt);
  player.recoil = Math.max(0, player.recoil - dt * 7.5);
  player.comboTimer = Math.max(0, player.comboTimer - dt);
  player.slashFlash = Math.max(0, player.slashFlash - dt);
  player.attackStartupTime = Math.max(0, player.attackStartupTime - dt);
  player.hitReactionTime = Math.max(0, player.hitReactionTime - dt);
  updateStatusEffects(player, dt);
  tickEntityMarks(player, dt);
  const playerStatus = getStatusState(player);
  const playerZoneEffects = getZoneEffectsForEntity(player);
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
  } else if (player.attackStartupTime > 0) {
    const startupMoveScale = player.weapon === weapons.axe.key ? 0.34 : 0.55;
    const startupMoveSpeed = getActiveMoveSpeed() * playerStatus.speedMultiplier * playerZoneEffects.slowMultiplier * startupMoveScale;
    const targetVelocityX = move.x * startupMoveSpeed;
    const targetVelocityY = move.y * startupMoveSpeed;
    player.velocityX = approach(player.velocityX, targetVelocityX, config.playerAcceleration * 0.78 * dt);
    player.velocityY = approach(player.velocityY, targetVelocityY, config.playerAcceleration * 0.78 * dt);
  } else if (player.attackCommitTime > 0) {
    player.attackCommitTime = Math.max(0, player.attackCommitTime - dt);
    player.velocityX = player.attackCommitX * player.attackCommitSpeed;
    player.velocityY = player.attackCommitY * player.attackCommitSpeed;
    addAfterimage(player.x, player.y, player.facing, player.radius, "#bfffd8");
  } else if (playerStatus.stunned) {
    player.velocityX = approach(player.velocityX, 0, config.playerFriction * dt);
    player.velocityY = approach(player.velocityY, 0, config.playerFriction * dt);
  } else {
    const activeMoveSpeed = getActiveMoveSpeed() * playerStatus.speedMultiplier * playerZoneEffects.slowMultiplier;
    const targetVelocityX = move.x * activeMoveSpeed;
    const targetVelocityY = move.y * activeMoveSpeed;
    const acceleration = move.x !== 0 || move.y !== 0 ? config.playerAcceleration : config.playerFriction;
    player.velocityX = approach(player.velocityX, targetVelocityX, acceleration * dt);
    player.velocityY = approach(player.velocityY, targetVelocityY, acceleration * dt);
  }

  player.x = clamp(player.x + player.velocityX * dt, player.radius, arena.width - player.radius);
  player.y = clamp(player.y + player.velocityY * dt, player.radius, arena.height - player.radius);
  resolveMapCollision(player);
  maybeTeleportEntity(player);

  if (player.pendingAxeStrike && player.attackStartupTime <= 0) {
    resolveQueuedAxeStrike(player.pendingAxeStrike);
    player.pendingAxeStrike = null;
  }

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

  if (player.reloadTime <= 0 && player.weapon === weapons.pulse.key && player.ammo <= 0) {
    finalizePulseReload(player);
  }

  if (combatLive && !playerStatus.stunned && input.firing && player.fireCooldown <= 0) {
    if (player.weapon === weapons.axe.key) {
      attackElectricAxe();
    } else if (player.weapon === weapons.shotgun.key) {
      attackScrapShotgun();
    } else if (player.weapon === weapons.sniper.key) {
      attackRailSniper();
    } else if (player.weapon === weapons.staff.key) {
      attackVoltStaff();
    } else if (player.weapon === weapons.injector.key) {
      attackBioInjector();
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

    if (hitMapWithProjectile(javelin, "player")) {
      shockJavelins.splice(i, 1);
      continue;
    }

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
        0,
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
        statusLine.textContent = "Shock Javelin slowed the target.";
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

function getEnemyWeaponKey() {
  return enemy.weapon ?? enemy.loadout?.weapon ?? weapons.pulse.key;
}

function getEnemyTargetRange() {
  const weaponKey = getEnemyWeaponKey();
  const hasGrapple = enemyHasAbility("magneticGrapple");
  const hasShield = enemyHasAbility("energyShield");
  if (weaponKey === weapons.axe.key) {
    return enemy.hp <= 72 ? 272 : hasGrapple ? 196 : 218;
  }
  if (weaponKey === weapons.shotgun.key) {
    return enemy.hp <= 72 ? 344 : hasGrapple ? 238 : 276;
  }
  if (weaponKey === weapons.sniper.key) {
    return enemy.hp <= 72 ? 720 : 612;
  }
  if (weaponKey === weapons.staff.key) {
    return enemy.hp <= 72 ? 408 : 336;
  }
  if (weaponKey === weapons.injector.key) {
    return enemy.hp <= 72 ? 474 : 392;
  }
  return enemy.hp <= 72 ? 548 : hasShield ? 430 : 404;
}

function getEnemyBehaviorProfile(distance, shouldPunish) {
  const weaponKey = getEnemyWeaponKey();
  const hasGrapple = enemyHasAbility("magneticGrapple");
  const hasShield = enemyHasAbility("energyShield");
  const hasEmp = enemyHasAbility("empBurst");

  if (weaponKey === weapons.axe.key) {
    return {
      strafeScale: shouldPunish ? 1.08 : 0.92,
      engageBias: hasGrapple ? 1.34 : 1.22,
      retreatBias: enemy.hp <= 72 ? 0.92 : 0.48,
      abilityPressureDistance: hasGrapple ? 430 : 300,
      fieldResponseDistance: 212,
      punishWindowDistance: distance < 318,
      dodgeAggression: 0.96,
      shootBurstSize: 0,
    };
  }

  if (weaponKey === weapons.shotgun.key) {
    return {
      strafeScale: shouldPunish ? 1.24 : 1.14,
      engageBias: hasGrapple ? 1.28 : 1.18,
      retreatBias: enemy.hp <= 72 ? 1.04 : 0.66,
      abilityPressureDistance: hasEmp ? 240 : 320,
      fieldResponseDistance: 230,
      punishWindowDistance: distance < 360,
      dodgeAggression: 0.9,
      shootBurstSize: 1,
    };
  }

  if (weaponKey === weapons.sniper.key) {
    return {
      strafeScale: shouldPunish ? 1.06 : 0.88,
      engageBias: 0.76,
      retreatBias: enemy.hp <= 72 ? 1.22 : 1.08,
      abilityPressureDistance: 520,
      fieldResponseDistance: 260,
      punishWindowDistance: distance > 420 && distance < 760,
      dodgeAggression: 1,
      shootBurstSize: 0,
    };
  }

  if (weaponKey === weapons.staff.key) {
    return {
      strafeScale: shouldPunish ? 1.08 : 1.02,
      engageBias: 1.02,
      retreatBias: enemy.hp <= 72 ? 0.94 : 0.72,
      abilityPressureDistance: 320,
      fieldResponseDistance: 220,
      punishWindowDistance: distance < 420,
      dodgeAggression: 0.9,
      shootBurstSize: 0,
    };
  }

  if (weaponKey === weapons.injector.key) {
    return {
      strafeScale: shouldPunish ? 1.16 : 1.04,
      engageBias: 1.04,
      retreatBias: enemy.hp <= 72 ? 1.06 : 0.78,
      abilityPressureDistance: 380,
      fieldResponseDistance: 240,
      punishWindowDistance: distance < 520,
      dodgeAggression: 0.94,
      shootBurstSize: 0,
    };
  }

  return {
    strafeScale: shouldPunish ? 1.18 : 1,
    engageBias: 1.08,
    retreatBias: enemy.hp <= 72 ? 1.18 : 0.88,
    abilityPressureDistance: hasShield ? 280 : 340,
    fieldResponseDistance: 250,
    punishWindowDistance: distance < 446,
    dodgeAggression: 0.92,
    shootBurstSize: shouldPunish ? 3 : 2,
  };
}

function startEnemyReload(bot = enemy) {
  if (bot.weapon !== weapons.pulse.key || bot.reloadTime > 0) {
    return false;
  }
  bot.reloadTime = config.pulseReloadTime;
  bot.shootCooldown = Math.max(bot.shootCooldown, config.pulseReloadTime);
  return true;
}

function fireEnemyPulse(targetX, targetY, punishShot = false) {
  if (enemy.reloadTime > 0) {
    return false;
  }
  if (enemy.ammo <= 0) {
    startEnemyReload(enemy);
    return false;
  }

  enemy.ammo = Math.max(0, enemy.ammo - 1);
  const spread = punishShot ? 18 : 30;
  const spreadX = (Math.random() - 0.5) * spread;
  const spreadY = (Math.random() - 0.5) * spread;
  spawnBullet(enemy, targetX + spreadX, targetY + spreadY, enemyBullets, "#ff8a77", 660, 6, {
    radius: 4,
    source: "enemy-pulse",
    trailColor: "#ffc0b4",
  });
  addImpact(enemy.x + Math.cos(enemy.facing) * 24, enemy.y + Math.sin(enemy.facing) * 24, "#ff8a77", 12);

  if (enemy.ammo <= 0) {
    startEnemyReload(enemy);
  }
  return true;
}

function fireEnemyShotgun(targetX, targetY) {
  const baseAngle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
  for (let pellet = 0; pellet < 5; pellet += 1) {
    const spread = -0.2 + pellet * 0.1;
    const angle = baseAngle + spread;
    spawnBullet(
      enemy,
      enemy.x + Math.cos(angle) * 100,
      enemy.y + Math.sin(angle) * 100,
      enemyBullets,
      "#ff9d62",
      config.bulletSpeed * 0.82,
      5,
      {
        radius: 4,
        source: "enemy-shotgun",
        trailColor: "#ffc49a",
      },
    );
  }
  addImpact(enemy.x + Math.cos(baseAngle) * 22, enemy.y + Math.sin(baseAngle) * 22, "#ffb078", 16);
  return true;
}

function applyInjectorMark(target, duration, maxStacks = 3) {
  target.injectorMarkTime = Math.max(target.injectorMarkTime ?? 0, duration);
  target.injectorMarks = clamp((target.injectorMarks ?? 0) + 1, 1, maxStacks);
}

function tickEntityMarks(entity, dt) {
  entity.injectorMarkTime = Math.max(0, entity.injectorMarkTime ?? 0 - dt);
  if ((entity.injectorMarkTime ?? 0) <= 0) {
    entity.injectorMarks = 0;
  }
}

function healEntity(entity, amount) {
  if (amount <= 0) {
    return;
  }
  if (entity === player) {
    player.hp = clamp(player.hp + amount, 0, getBuildStats().maxHp);
    addHealingText(player.x, player.y - player.radius - 10, amount);
    return;
  }
  entity.hp = clamp(entity.hp + amount, 0, entity.maxHp);
  addHealingText(entity.x, entity.y - entity.radius - 10, amount);
}

function applyProjectileEffectToBot(bot, projectile) {
  const effect = projectile.effect;
  if (!effect) {
    return;
  }

  if (effect.kind === "staff") {
    healEntity(player, effect.heal ?? 0);
    addImpact(player.x, player.y, "#b8ffd8", 16);
  } else if (effect.kind === "injector") {
    applyInjectorMark(bot, effect.markDuration ?? 4, effect.markMax ?? 3);
    if ((bot.injectorMarks ?? 0) >= 3) {
      bot.injectorMarks = 0;
      bot.injectorMarkTime = 0;
      healEntity(player, effect.healOnConsume ?? 10);
      addEnergy(10);
      addImpact(bot.x, bot.y, "#f0b8ff", 24);
    }
  } else if (effect.kind === "rail") {
    applyStatusEffect(bot, "slow", getStatusDuration(effect.bonusSlowDuration ?? 0.4), effect.bonusSlow ?? 0.12);
  }
}

function applyProjectileEffectToPlayer(projectile) {
  const effect = projectile.effect;
  if (!effect) {
    return;
  }

  if (effect.kind === "staff") {
    healEntity(enemy, effect.heal ?? 0);
    addImpact(enemy.x, enemy.y, "#b8ffd8", 16);
  } else if (effect.kind === "injector") {
    applyInjectorMark(player, effect.markDuration ?? 4, effect.markMax ?? 3);
    if ((player.injectorMarks ?? 0) >= 3) {
      player.injectorMarks = 0;
      player.injectorMarkTime = 0;
      healEntity(enemy, effect.healOnConsume ?? 10);
      addImpact(player.x, player.y, "#f0b8ff", 20);
    }
  } else if (effect.kind === "rail") {
    applyStatusEffect(player, "slow", getStatusDuration(effect.bonusSlowDuration ?? 0.4), effect.bonusSlow ?? 0.12);
  }
}

function fireEnemySniper(targetX, targetY) {
  spawnBullet(enemy, targetX, targetY, enemyBullets, "#ffd27a", 1760, 18, {
    radius: 6,
    life: 0.78,
    piercing: true,
    trailColor: "#ffeab3",
    source: "enemy-sniper",
    effect: { kind: "rail", bonusSlow: 0.16, bonusSlowDuration: 0.6 },
  });
  addImpact(enemy.x + Math.cos(enemy.facing) * 26, enemy.y + Math.sin(enemy.facing) * 26, "#ffd27a", 18);
  return true;
}

function fireEnemyStaff(targetX, targetY) {
  spawnBullet(enemy, targetX, targetY, enemyBullets, "#9cffc4", 920, 7, {
    radius: 5,
    life: 0.92,
    trailColor: "#d2ffe3",
    source: "enemy-staff",
    effect: { kind: "staff", heal: 6 },
  });
  addImpact(enemy.x + Math.cos(enemy.facing) * 24, enemy.y + Math.sin(enemy.facing) * 24, "#9cffc4", 14);
  return true;
}

function fireEnemyInjector(targetX, targetY) {
  spawnBullet(enemy, targetX, targetY, enemyBullets, "#d894ff", 1180, 6, {
    radius: 4,
    life: 0.86,
    trailColor: "#f0beff",
    source: "enemy-injector",
    effect: { kind: "injector", markDuration: 4, markMax: 3, healOnConsume: 10 },
  });
  addImpact(enemy.x + Math.cos(enemy.facing) * 22, enemy.y + Math.sin(enemy.facing) * 22, "#d894ff", 12);
  return true;
}

function fireTrainingPulse(bot, targetX, targetY) {
  const spread = 16;
  spawnBullet(
    bot,
    targetX + (Math.random() - 0.5) * spread,
    targetY + (Math.random() - 0.5) * spread,
    enemyBullets,
    "#8bdcff",
    760,
    8,
    {
      radius: 4.5,
      life: 1,
      trailColor: "#d4f6ff",
      source: "training-pulse",
    },
  );
  addImpact(bot.x + Math.cos(bot.facing) * 20, bot.y + Math.sin(bot.facing) * 20, "#9de8ff", 10);
}

function queueEnemyAxeStrike() {
  enemy.comboStep = enemy.comboTimer > 0 ? (enemy.comboStep % 3) + 1 : 1;
  enemy.comboTimer = 0.92;
  const profile = { ...getAxeComboProfile(enemy.comboStep) };
  profile.damage *= 0.74;
  profile.stun *= 0.78;
  enemy.meleeWindupTime = profile.startup;
  enemy.pendingMeleeStrike = {
    profile,
    facing: enemy.facing,
    comboStep: enemy.comboStep,
  };
  enemy.shootCooldown = profile.cooldown;
  addImpact(enemy.x + Math.cos(enemy.facing) * 28, enemy.y + Math.sin(enemy.facing) * 28, profile.color, 18);
}

function resolveEnemyAxeStrike() {
  if (!enemy.pendingMeleeStrike) {
    return;
  }

  const { profile, facing } = enemy.pendingMeleeStrike;
  enemy.pendingMeleeStrike = null;

  if (profile.hitMode === "dashPath") {
    enemy.attackCommitTime = profile.commitDuration;
    enemy.attackCommitX = Math.cos(facing);
    enemy.attackCommitY = Math.sin(facing);
    enemy.attackCommitSpeed = profile.commitSpeed * 0.9;
    enemy.activeMeleeStrike = { profile, connected: false };
    return;
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = length(dx, dy);
  const angle = Math.atan2(dy, dx);
  const deltaAngle = Math.atan2(Math.sin(angle - facing), Math.cos(angle - facing));
  let hit = false;

  if (profile.hitMode === "line") {
    const lineStartX = enemy.x + Math.cos(facing) * 18;
    const lineStartY = enemy.y + Math.sin(facing) * 18;
    const lineEndX = enemy.x + Math.cos(facing) * (profile.range + 12);
    const lineEndY = enemy.y + Math.sin(facing) * (profile.range + 12);
    const lineDistance = pointToSegmentDistance(player.x, player.y, lineStartX, lineStartY, lineEndX, lineEndY);
    hit =
      distance <= profile.range + player.radius + 10 &&
      Math.abs(deltaAngle) <= profile.arc &&
      lineDistance <= profile.width + player.radius;
  } else if (profile.hitMode === "arc") {
    hit = distance <= profile.range + player.radius && Math.abs(deltaAngle) <= profile.arc;
  }

  if (hit) {
    applyPlayerDamage(profile.damage, "axe");
    addImpact(player.x, player.y, profile.impactColor, profile.impactSize * 0.7);
    addShake(profile.shake * 0.55);
  }
}

function updateEnemyAxeCommit(dt, previousX, previousY) {
  if (enemy.attackCommitTime <= 0 || !enemy.activeMeleeStrike) {
    return;
  }

  enemy.attackCommitTime = Math.max(0, enemy.attackCommitTime - dt);
  const nextX = clamp(enemy.x + enemy.attackCommitX * enemy.attackCommitSpeed * dt, enemy.radius, arena.width - enemy.radius);
  const nextY = clamp(enemy.y + enemy.attackCommitY * enemy.attackCommitSpeed * dt, enemy.radius, arena.height - enemy.radius);
  enemy.x = nextX;
  enemy.y = nextY;
  addAfterimage(enemy.x, enemy.y, enemy.facing, enemy.radius + 1, "#ffd1a8");

  const dashDistance = pointToSegmentDistance(player.x, player.y, previousX, previousY, enemy.x, enemy.y);
  if (!enemy.activeMeleeStrike.connected && dashDistance <= enemy.radius + player.radius + 6) {
    enemy.activeMeleeStrike.connected = true;
    applyPlayerDamage(enemy.activeMeleeStrike.profile.damage, "axe-finisher");
    applyStatusEffect(player, "stun", getStatusDuration(enemy.activeMeleeStrike.profile.stun), 1);
    addImpact(player.x, player.y, "#fff1bd", 34);
    addShake(8.4);
  }

  if (enemy.attackCommitTime <= 0) {
    enemy.activeMeleeStrike = null;
  }
}

function castEnemyGrapple(forward) {
  enemy.abilityCooldowns.grapple = config.grappleCooldown + 0.6;
  enemy.dodgeVectorX = forward.x;
  enemy.dodgeVectorY = forward.y;
  enemy.dodgeTime = 0.16;
  addImpact(enemy.x, enemy.y, "#bfeeff", 18);
}

function castEnemyShield() {
  enemy.abilityCooldowns.shield = config.shieldCooldown + 0.4;
  enemy.shield = Math.max(enemy.shield, 24);
  enemy.shieldTime = 2.2;
  addImpact(enemy.x, enemy.y, "#a8d9ff", 22);
}

function castEnemyBooster() {
  enemy.abilityCooldowns.booster = config.boosterCooldown + 0.8;
  enemy.hasteTime = Math.max(enemy.hasteTime, 1.8);
  enemy.dashCooldown = Math.max(0, enemy.dashCooldown - 0.7);
  addImpact(enemy.x, enemy.y, "#85ffe3", 20);
}

function castEnemyEmp() {
  enemy.abilityCooldowns.emp = config.boosterCooldown + 0.8;
  addExplosion(enemy.x, enemy.y, 72, "#cbb0ff");
  addImpact(enemy.x, enemy.y, "#b99cff", 24);
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    if (length(bullets[i].x - enemy.x, bullets[i].y - enemy.y) <= 96) {
      addAbsorbBurst(bullets[i].x, bullets[i].y, 16, "#cbb0ff");
      bullets.splice(i, 1);
    }
  }
  if (length(player.x - enemy.x, player.y - enemy.y) <= 118 + player.radius) {
    applyStatusEffect(player, "slow", getStatusDuration(0.9), 0.34);
  }
}

function castEnemyBackstep() {
  enemy.abilityCooldowns.backstep = 4.1;
  const retreat = normalize(enemy.x - player.x, enemy.y - player.y);
  enemy.x = clamp(enemy.x + retreat.x * 150, enemy.radius, arena.width - enemy.radius);
  enemy.y = clamp(enemy.y + retreat.y * 150, enemy.radius, arena.height - enemy.radius);
  resolveMapCollision(enemy);
  maybeTeleportEntity(enemy);
  enemy.shield = Math.max(enemy.shield, 8);
  enemy.shieldTime = Math.max(enemy.shieldTime, 0.6);
  addAfterimage(enemy.x, enemy.y, enemy.facing, enemy.radius + 5, "#fff0a8");
  addImpact(enemy.x, enemy.y, "#fff0a8", 18);
}

function castEnemyChainLightning() {
  enemy.abilityCooldowns.chainLightning = 5.8;
  addBeamEffect(enemy.x, enemy.y, player.x, player.y, "#d7bfff", 4.5, 0.14);
  applyPlayerDamage(24, "#d7bfff", player.x, player.y, true, "enemy-chain-lightning");
  applyStatusEffect(player, "slow", getStatusDuration(0.5), 0.2);
  addImpact(player.x, player.y, "#d7bfff", 18);
}

function castEnemyBlink(forward) {
  enemy.abilityCooldowns.blink = 3.6;
  enemy.x = clamp(enemy.x + forward.x * 132, enemy.radius, arena.width - enemy.radius);
  enemy.y = clamp(enemy.y + forward.y * 132, enemy.radius, arena.height - enemy.radius);
  resolveMapCollision(enemy);
  maybeTeleportEntity(enemy);
  addImpact(enemy.x, enemy.y, "#b3f6ff", 18);
}

function castEnemyPhaseDash(forward) {
  enemy.abilityCooldowns.phaseDash = 4.8;
  enemy.dodgeVectorX = forward.x;
  enemy.dodgeVectorY = forward.y;
  enemy.dodgeTime = 0.22;
  enemy.shield = Math.max(enemy.shield, 10);
  enemy.shieldTime = Math.max(enemy.shieldTime, 0.5);
  addImpact(enemy.x, enemy.y, "#d2f1ff", 20);
}

function castEnemyPulseBurst() {
  enemy.abilityCooldowns.pulseBurst = 3.4;
  const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  for (let pellet = 0; pellet < 5; pellet += 1) {
    const spread = -0.16 + pellet * 0.08;
    const angle = baseAngle + spread;
    spawnBullet(enemy, enemy.x + Math.cos(angle) * 100, enemy.y + Math.sin(angle) * 100, enemyBullets, "#84dcff", 1180, 8, {
      radius: 4,
      life: 0.64,
      trailColor: "#c9f3ff",
      source: "enemy-pulse-burst",
    });
  }
  addImpact(enemy.x + Math.cos(baseAngle) * 22, enemy.y + Math.sin(baseAngle) * 22, "#84dcff", 14);
}

function castEnemyRailShot() {
  enemy.abilityCooldowns.railShot = 5.3;
  fireEnemySniper(player.x + player.velocityX * 0.24, player.y + player.velocityY * 0.24);
}

function castEnemyGravityWell() {
  enemy.abilityCooldowns.gravityWell = 6.1;
  supportZones.push({
    type: "gravity",
    team: "enemy",
    x: player.x,
    y: player.y,
    radius: 112,
    life: 1.9,
    maxLife: 1.9,
    color: "#d1a2ff",
    slow: 0.4,
  });
  addExplosion(player.x, player.y, 118, "#d1a2ff");
}

function castEnemyPhaseShift() {
  enemy.abilityCooldowns.phaseShift = 5.8;
  enemy.shield = Math.max(enemy.shield, 14);
  enemy.shieldTime = Math.max(enemy.shieldTime, 0.7);
  addImpact(enemy.x, enemy.y, "#d2f1ff", 18);
}

function castEnemyHologram() {
  enemy.abilityCooldowns.hologramDecoy = 6.4;
  enemy.postAttackMoveTime = Math.max(enemy.postAttackMoveTime, 0.5);
  addAfterimage(enemy.x - 32, enemy.y + 16, enemy.facing, enemy.radius + 5, "#d8b8ff");
}

function castEnemySpeedSurge() {
  enemy.abilityCooldowns.speedSurge = 4.4;
  enemy.hasteTime = Math.max(enemy.hasteTime, 1.8);
  addImpact(enemy.x, enemy.y, "#8dfcc7", 18);
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

    if (hitMapWithProjectile(javelin, "enemy")) {
      enemyShockJavelins.splice(i, 1);
      continue;
    }

    if (length(javelin.x - player.x, javelin.y - player.y) > javelin.radius + player.radius) {
      continue;
    }

    enemyShockJavelins.splice(i, 1);
    addImpact(player.x, player.y, javelin.charged ? "#ffd7be" : "#ffb09a", javelin.charged ? 26 : 18);

    if (abilityState.dash.invulnerabilityTime > 0) {
      addImpact(player.x, player.y, "#b8f9c9", 20);
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
  tickEntityMarks(enemy, dt);

  if (sandbox.mode !== sandboxModes.duel.key || !enemy.alive || !isCombatLive()) {
    return;
  }

  const enemyStatus = getStatusState(enemy);
  const previousX = enemy.x;
  const previousY = enemy.y;
  enemy.reloadTime = Math.max(0, enemy.reloadTime - dt);
  enemy.javelinCooldown = Math.max(0, enemy.javelinCooldown - dt);
  enemy.fieldCooldown = Math.max(0, enemy.fieldCooldown - dt);
  enemy.dashCooldown = Math.max(0, enemy.dashCooldown - dt);
  enemy.postAttackMoveTime = Math.max(0, enemy.postAttackMoveTime - dt);
  enemy.shieldTime = Math.max(0, enemy.shieldTime - dt);
  enemy.hasteTime = Math.max(0, enemy.hasteTime - dt);
  enemy.comboTimer = Math.max(0, enemy.comboTimer - dt);
  enemy.meleeWindupTime = Math.max(0, enemy.meleeWindupTime - dt);
  enemy.abilityCooldowns.grapple = Math.max(0, enemy.abilityCooldowns.grapple - dt);
  enemy.abilityCooldowns.shield = Math.max(0, enemy.abilityCooldowns.shield - dt);
  enemy.abilityCooldowns.booster = Math.max(0, enemy.abilityCooldowns.booster - dt);
  enemy.abilityCooldowns.emp = Math.max(0, enemy.abilityCooldowns.emp - dt);
  enemy.abilityCooldowns.backstep = Math.max(0, enemy.abilityCooldowns.backstep - dt);
  enemy.abilityCooldowns.chainLightning = Math.max(0, enemy.abilityCooldowns.chainLightning - dt);
  enemy.abilityCooldowns.blink = Math.max(0, enemy.abilityCooldowns.blink - dt);
  enemy.abilityCooldowns.phaseDash = Math.max(0, enemy.abilityCooldowns.phaseDash - dt);
  enemy.abilityCooldowns.pulseBurst = Math.max(0, enemy.abilityCooldowns.pulseBurst - dt);
  enemy.abilityCooldowns.railShot = Math.max(0, enemy.abilityCooldowns.railShot - dt);
  enemy.abilityCooldowns.gravityWell = Math.max(0, enemy.abilityCooldowns.gravityWell - dt);
  enemy.abilityCooldowns.phaseShift = Math.max(0, enemy.abilityCooldowns.phaseShift - dt);
  enemy.abilityCooldowns.hologramDecoy = Math.max(0, enemy.abilityCooldowns.hologramDecoy - dt);
  enemy.abilityCooldowns.speedSurge = Math.max(0, enemy.abilityCooldowns.speedSurge - dt);
  player.lastMissTime = Math.max(0, (player.lastMissTime ?? 0) - dt);
  enemy.shootCooldown -= dt;
  enemy.strafeTimer += dt;
  enemy.dodgeCooldown = Math.max(0, enemy.dodgeCooldown - dt);

  if (enemy.shieldTime <= 0) {
    enemy.shield = 0;
  }
  if (enemy.reloadTime <= 0 && enemy.weapon === weapons.pulse.key && enemy.ammo <= 0) {
    finalizePulseReload(enemy);
  }

  const targetX = player.decoyTime > 0 ? player.x - 44 : player.x;
  const targetY = player.decoyTime > 0 ? player.y + 18 : player.y;
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const distance = length(dx, dy);
  const forward = normalize(dx, dy);
  const side = { x: -forward.y, y: forward.x };
  const enemyFieldModifier = getFieldInfluence(enemy);
  const enemyZoneEffects = getZoneEffectsForEntity(enemy);
  const playerLow = player.hp <= 38;
  const enemyLow = enemy.hp <= 72;
  const playerOnAxe = player.weapon === weapons.axe.key;
  const playerOnShotgun = player.weapon === weapons.shotgun.key;
  const enemyOnAxe = enemy.weapon === weapons.axe.key;
  const enemyOnShotgun = enemy.weapon === weapons.shotgun.key;
  const enemyOnPulse = enemy.weapon === weapons.pulse.key;
  const enemyOnSniper = enemy.weapon === weapons.sniper.key;
  const enemyOnStaff = enemy.weapon === weapons.staff.key;
  const enemyOnInjector = enemy.weapon === weapons.injector.key;
  const playerExposed =
    (player.lastMissTime ?? 0) > 0 ||
    player.fireCooldown > 0.16 ||
    player.attackStartupTime > 0 ||
    player.attackCommitTime > 0 ||
    player.activeAxeStrike !== null ||
    player.pendingAxeStrike !== null;
  const targetRange = getEnemyTargetRange();
  const shouldPunish = playerExposed || playerLow;
  const behaviorProfile = getEnemyBehaviorProfile(distance, shouldPunish);
  const shouldKite = enemyLow || (playerOnAxe && distance < 332) || (enemyOnPulse && distance < 210);
  const shouldPressure = shouldPunish && distance < 420;

  let moveX = 0;
  let moveY = 0;

  if (enemyStatus.stunned) {
    enemy.dodgeTime = 0;
    enemy.attackCommitTime = 0;
  } else if (enemy.dodgeTime > 0) {
    enemy.dodgeTime = Math.max(0, enemy.dodgeTime - dt);
    moveX = enemy.dodgeVectorX;
    moveY = enemy.dodgeVectorY;
    addAfterimage(enemy.x, enemy.y, Math.atan2(moveY, moveX), enemy.radius, "#ffc3b8");
  } else if (enemy.attackCommitTime > 0 && enemy.activeMeleeStrike) {
    updateEnemyAxeCommit(dt, previousX, previousY);
  } else {
    const strafeScale = (enemy.postAttackMoveTime > 0 ? 1.38 : 1) * behaviorProfile.strafeScale;
    const strafeDirection = Math.sin(enemy.strafeTimer * 1.9) >= 0 ? 1 : -1;
    moveX = side.x * strafeDirection * 1.12 * strafeScale;
    moveY = side.y * strafeDirection * 1.12 * strafeScale;

    if (distance > targetRange + 28 || shouldPressure) {
      moveX += forward.x * behaviorProfile.engageBias;
      moveY += forward.y * behaviorProfile.engageBias;
    } else if (distance < targetRange - 74 || shouldKite) {
      moveX -= forward.x * behaviorProfile.retreatBias;
      moveY -= forward.y * behaviorProfile.retreatBias;
    }

    if (enemy.meleeWindupTime > 0) {
      moveX *= 0.28;
      moveY *= 0.28;
    }
  }

  const desired = normalize(moveX, moveY);
  const speed =
      (enemy.dodgeTime > 0 ? config.enemyDodgeSpeed : config.enemySpeed) *
      (enemyStatus.stunned ? 0 : 1) *
      (enemy.hasteTime > 0 ? 1.12 : 1) *
      enemyStatus.speedMultiplier *
      enemyFieldModifier.slowMultiplier *
      enemyZoneEffects.slowMultiplier;
  if (!(enemy.attackCommitTime > 0 && enemy.activeMeleeStrike)) {
    enemy.x = clamp(enemy.x + desired.x * speed * dt, enemy.radius, arena.width - enemy.radius);
    enemy.y = clamp(enemy.y + desired.y * speed * dt, enemy.radius, arena.height - enemy.radius);
  }
  resolveMapCollision(enemy);
  maybeTeleportEntity(enemy);
  enemy.facing = Math.atan2(targetY - enemy.y, targetX - enemy.x);

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

  if (
    !enemyStatus.stunned &&
    enemyHasAbility("magneticField") &&
    enemy.fieldCooldown <= 0 &&
    (incomingProjectile || (playerOnAxe && distance < behaviorProfile.fieldResponseDistance))
  ) {
    spawnEnemyMagneticField();
  }

  if (!enemyStatus.stunned && enemyHasAbility("shockJavelin") && enemy.javelinCooldown <= 0 && distance > 180 && distance < 620) {
    const chargedJavelin = enemyLow || shouldPunish || distance > 360;
    if (shouldPunish || Math.random() < (chargedJavelin ? 0.48 : 0.34)) {
      spawnEnemyJavelin(chargedJavelin);
      enemy.postAttackMoveTime = 0.62;
      enemy.shootCooldown = Math.max(enemy.shootCooldown, 0.18);
    }
  }

  if (
    !enemyStatus.stunned &&
    enemyHasAbility("magneticGrapple") &&
    enemy.abilityCooldowns.grapple <= 0 &&
    distance > targetRange + 120 &&
    (shouldPunish || distance > behaviorProfile.abilityPressureDistance)
  ) {
    castEnemyGrapple(forward);
  }

  if (
    !enemyStatus.stunned &&
    enemyHasAbility("energyShield") &&
    enemy.abilityCooldowns.shield <= 0 &&
    (enemyLow || incomingProjectile)
  ) {
    castEnemyShield();
  }

  if (
    !enemyStatus.stunned &&
    enemyHasAbility("empBurst") &&
    enemy.abilityCooldowns.emp <= 0 &&
    (incomingProjectile || distance < 126)
  ) {
    castEnemyEmp();
  }

  if (!enemyStatus.stunned && enemyHasAbility("backstepBurst") && enemy.abilityCooldowns.backstep <= 0 && (enemyLow || (playerOnAxe && distance < 170))) {
    castEnemyBackstep();
  }

  if (!enemyStatus.stunned && enemyHasAbility("blinkStep") && enemy.abilityCooldowns.blink <= 0 && distance > targetRange + 140) {
    castEnemyBlink(forward);
  }

  if (!enemyStatus.stunned && enemyHasAbility("phaseDash") && enemy.abilityCooldowns.phaseDash <= 0 && (incomingProjectile || (shouldPunish && distance > 170 && distance < 360))) {
    castEnemyPhaseDash(shouldPunish ? forward : { x: side.x, y: side.y });
  }

  if (!enemyStatus.stunned && enemyHasAbility("gravityWell") && enemy.abilityCooldowns.gravityWell <= 0 && distance > 180 && distance < 420 && (playerExposed || playerOnAxe)) {
    castEnemyGravityWell();
  }

  if (!enemyStatus.stunned && enemyHasAbility("phaseShift") && enemy.abilityCooldowns.phaseShift <= 0 && (enemyLow || incomingProjectile)) {
    castEnemyPhaseShift();
  }

  if (!enemyStatus.stunned && enemyHasAbility("hologramDecoy") && enemy.abilityCooldowns.hologramDecoy <= 0 && enemyLow) {
    castEnemyHologram();
  }

  if (!enemyStatus.stunned && enemyHasAbility("speedSurge") && enemy.abilityCooldowns.speedSurge <= 0 && (shouldPunish || distance > targetRange + 90)) {
    castEnemySpeedSurge();
  }

  if (!enemyStatus.stunned && enemy.weapon === weapons.axe.key && enemy.meleeWindupTime <= 0 && enemy.pendingMeleeStrike) {
    resolveEnemyAxeStrike();
  }

  if (!enemyStatus.stunned && enemyOnPulse && enemy.burstShots > 0 && enemy.shootCooldown <= 0) {
    enemy.burstShots -= 1;
    enemy.shootCooldown = enemy.burstShots > 0 ? 0.16 : 0.84;
    const leadX = targetX + player.velocityX * (playerExposed ? 0.22 : 0.16);
    const leadY = targetY + player.velocityY * (playerExposed ? 0.22 : 0.16);
    fireEnemyPulse(leadX, leadY, shouldPunish);
  } else if (!enemyStatus.stunned && enemyOnPulse && enemy.shootCooldown <= 0 && distance < 660) {
    enemy.burstShots = behaviorProfile.shootBurstSize;
    enemy.shootCooldown = 0.08;
    enemy.postAttackMoveTime = 0.46;
  } else if (!enemyStatus.stunned && enemyOnShotgun && enemy.shootCooldown <= 0 && distance < 340) {
    if (fireEnemyShotgun(targetX, targetY)) {
      enemy.shootCooldown = shouldPunish ? 0.78 : 0.96;
      enemy.postAttackMoveTime = 0.4;
    }
  } else if (!enemyStatus.stunned && enemyHasAbility("pulseBurst") && enemy.abilityCooldowns.pulseBurst <= 0 && distance < 320 && shouldPunish) {
    castEnemyPulseBurst();
    enemy.shootCooldown = 0.42;
  } else if (!enemyStatus.stunned && enemyHasAbility("chainLightning") && enemy.abilityCooldowns.chainLightning <= 0 && distance < 380 && (shouldPunish || playerExposed)) {
    castEnemyChainLightning();
    enemy.shootCooldown = 0.46;
  } else if (!enemyStatus.stunned && enemyOnSniper && enemy.shootCooldown <= 0 && distance > 280 && distance < 920) {
    if (fireEnemySniper(targetX + player.velocityX * 0.2, targetY + player.velocityY * 0.2)) {
      enemy.shootCooldown = shouldPunish ? 1.08 : 1.26;
      enemy.postAttackMoveTime = 0.54;
    }
  } else if (!enemyStatus.stunned && enemyHasAbility("railShot") && enemy.abilityCooldowns.railShot <= 0 && distance > 340 && shouldPunish) {
    castEnemyRailShot();
    enemy.shootCooldown = 0.62;
  } else if (!enemyStatus.stunned && enemyOnStaff && enemy.shootCooldown <= 0 && distance < 480) {
    if (fireEnemyStaff(targetX, targetY)) {
      enemy.shootCooldown = 0.52;
      enemy.postAttackMoveTime = 0.32;
    }
  } else if (!enemyStatus.stunned && enemyOnInjector && enemy.shootCooldown <= 0 && distance < 560) {
    if (fireEnemyInjector(targetX + player.velocityX * 0.12, targetY + player.velocityY * 0.12)) {
      enemy.shootCooldown = shouldPunish ? 0.34 : 0.42;
      enemy.postAttackMoveTime = 0.28;
    }
  } else if (!enemyStatus.stunned && enemyOnAxe && enemy.shootCooldown <= 0 && enemy.meleeWindupTime <= 0 && enemy.attackCommitTime <= 0) {
    if ((distance < 296 && shouldPunish) || distance < 188) {
      queueEnemyAxeStrike();
      enemy.postAttackMoveTime = 0.18;
    }
  }

  if (!enemyStatus.stunned && enemy.dodgeCooldown <= 0) {
    if (incomingProjectile && Math.random() < behaviorProfile.dodgeAggression) {
      const dodgeSide = Math.random() < 0.5 ? -1 : 1;
      enemy.dodgeVectorX = side.x * dodgeSide;
      enemy.dodgeVectorY = side.y * dodgeSide;
      enemy.dodgeTime = config.enemyDodgeDuration + 0.05;
      enemy.dodgeCooldown = config.enemyDodgeCooldown;
      enemy.dashCooldown = 1.6;
      addImpact(enemy.x, enemy.y, "#ffc3b8", 18);
      statusLine.textContent = "The bot is dodging your fire. Track it.";
    } else if ((shouldPunish || player.attackStartupTime > 0) && distance > 150 && distance < 330 && enemy.dashCooldown <= 0) {
      enemy.dodgeVectorX = forward.x;
      enemy.dodgeVectorY = forward.y;
      enemy.dodgeTime = config.enemyDodgeDuration + 0.06;
      enemy.dodgeCooldown = config.enemyDodgeCooldown;
      enemy.dashCooldown = 1.65;
      addImpact(enemy.x, enemy.y, "#ffd0a8", 20);
      enemy.postAttackMoveTime = 0.28;
    }
  }
}

function updateTrainingBots(dt) {
  for (const bot of trainingBots) {
    bot.flash = Math.max(0, bot.flash - dt);
    updateStatusEffects(bot, dt);
    tickEntityMarks(bot, dt);

    if (!bot.alive) {
      continue;
    }

    const dx = player.x - bot.x;
    const dy = player.y - bot.y;
    bot.facing = Math.atan2(dy, dx);
    if (trainingToolState.botsFire && isCombatLive()) {
      bot.shootCooldown = Math.max(0, bot.shootCooldown - dt);
      if (bot.shootCooldown <= 0 && !getStatusState(bot).stunned) {
        fireTrainingPulse(bot, player.x, player.y);
        bot.shootCooldown = bot.cadence;
      }
    } else {
      bot.shootCooldown = 999;
    }
    resolveMapCollision(bot);
    maybeTeleportEntity(bot);
  }
}

function absorbEnemyProjectiles() {
  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = enemyBullets[i];
    let absorbed = false;

    for (const field of magneticFields) {
      if (field.team === "player" && length(bullet.x - field.x, bullet.y - field.y) <= field.radius) {
        absorbed = true;
        addAbsorbBurst(bullet.x, bullet.y, 24, field.color);
        addImpact(bullet.x, bullet.y, field.color, 18);
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

    if (hitMapWithProjectile(bullet, collection === bullets ? "player" : "enemy")) {
      collection.splice(i, 1);
      continue;
    }

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
  if (!player.alive) {
    return true;
  }

  if (abilityState.phaseShift.time > 0 || abilityState.phaseDash.time > 0) {
    addImpact(player.x, player.y, "#d3f6ff", 18);
    return false;
  }

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
  const heavyHit = finalDamage >= 18;
  applyHitReaction(player, player.x - Math.cos(player.facing) * 18, player.y - Math.sin(player.facing) * 18, heavyHit ? 1.05 : 0.65);
  addImpact(player.x, player.y, source === "javelin" ? "#ffd4a6" : source === "axe-finisher" ? "#ffe6ac" : "#ff9c86", heavyHit ? 24 : 16);
  addDamageText(player.x, player.y - player.radius - 8, finalDamage, { heavy: heavyHit, color: source === "axe-finisher" ? "#ffb066" : "#ff7469" });

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

    if (hasPerk("cloneFailover") && player.decoyTime <= 0) {
      player.hp = Math.max(1, getBuildStats().maxHp * 0.18);
      player.decoyTime = 2.4;
      player.ghostTime = 0.55;
      player.shield = Math.max(player.shield, 22);
      player.shieldTime = 2;
      addAfterimage(player.x - 38, player.y + 12, player.facing, player.radius + 6, "#d8b2ff");
      addImpact(player.x, player.y, "#d8b2ff", 28);
      statusLine.textContent = "Clone Failover dumped a decoy and saved the round.";
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
    addShake(finalDamage >= 18 ? 8.2 : 6.2);
  }

  if (player.hp <= 0) {
    player.alive = false;
    if (sandbox.mode === sandboxModes.duel.key && matchState.phase === "active") {
      finishDuelRound("enemy");
    } else if (sandbox.mode === sandboxModes.training.key) {
      statusLine.textContent = "Training knockout. Resetting your build test position.";
      resetPlayer({ silent: true });
    }
    return true;
  }

  return false;
}

function resolveCombat() {
  if (!isCombatLive()) {
    return;
  }

  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    for (const bot of getAllBots()) {
      if (!bot.alive || bullet.hitTargets.has(bot.kind)) {
        continue;
      }

      if (length(bullet.x - bot.x, bullet.y - bot.y) <= bullet.radius + bot.radius) {
        bullet.hitTargets.add(bot.kind);
        damageBot(bot, bullet.damage, bullet.color ?? "#77d8ff", bullet.x, bullet.y, 0);
        applyProjectileEffectToBot(bot, bullet);
        if (!bullet.piercing) {
          bullets.splice(i, 1);
          break;
        }
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
        applyProjectileEffectToPlayer(bullet);
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
        addImpact(player.x, player.y, "#b8f9c9", 22);
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

  for (let i = beamEffects.length - 1; i >= 0; i -= 1) {
    beamEffects[i].life -= dt;
    if (beamEffects[i].life <= 0) {
      beamEffects.splice(i, 1);
    }
  }

  for (let i = combatTexts.length - 1; i >= 0; i -= 1) {
    combatTexts[i].life -= dt;
    if (combatTexts[i].life <= 0) {
      combatTexts.splice(i, 1);
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
  const markCount = target.injectorMarks ?? 0;

  if (effects.length === 0 && markCount <= 0) {
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
    const y = -target.radius - 26 - index * 16;
    ctx.lineWidth = effect.type === "stun" ? 4 : 3;
    ctx.strokeStyle = "rgba(6, 12, 18, 0.8)";
    ctx.fillStyle = visual.text;
    ctx.strokeText(visual.label, 0, y);
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

  if (markCount > 0) {
    const y = -target.radius - 26 - effects.length * 16;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(7, 12, 18, 0.8)";
    ctx.fillStyle = "#f9d8ff";
    ctx.strokeText(`MARK ${markCount}`, 0, y);
    ctx.fillText(`MARK ${markCount}`, 0, y);
  }

  ctx.restore();
}

function getHitReactionOffset(entity) {
  const ratio = clamp((entity.hitReactionTime ?? 0) / 0.18, 0, 1);
  return {
    x: (entity.hitReactionX ?? 0) * ratio,
    y: (entity.hitReactionY ?? 0) * ratio,
  };
}

function drawOverheadHealthBar(target, accent = "#77d8ff") {
  if (!target?.alive) {
    return;
  }

  const maxHp = target === player ? getBuildStats().maxHp : target.maxHp;
  const shield = target.shield ?? 0;
  const width = target === player ? 58 : 52;
  const x = target.x - width * 0.5;
  const y = target.y - target.radius - 22;
  const hpRatio = clamp(Math.max(0, target.hp) / Math.max(1, maxHp), 0, 1);
  const shieldRatio = clamp(shield / Math.max(1, maxHp), 0, 1);

  ctx.save();
  ctx.fillStyle = "rgba(6, 12, 18, 0.82)";
  ctx.fillRect(x, y, width, 6);
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, width * hpRatio, 6);
  if (shieldRatio > 0) {
    ctx.fillStyle = "rgba(189, 231, 255, 0.92)";
    ctx.fillRect(x + width * hpRatio, y, Math.min(width * shieldRatio, width - width * hpRatio), 6);
  }
  ctx.strokeStyle = "rgba(245, 251, 255, 0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, 6);
  ctx.restore();
}

function drawProjectileSprite(projectile, hostile = false) {
  const angle = Math.atan2(projectile.vy, projectile.vx);
  const source = projectile.source ?? "weapon";
  const color = projectile.color ?? (hostile ? "#ff8a77" : "#77d8ff");

  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(angle);
  ctx.shadowBlur = 16;
  ctx.shadowColor = projectile.trailColor ?? color;

  if (source.includes("rail")) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -3.5);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hostile ? "rgba(255, 241, 198, 0.88)" : "rgba(255, 248, 212, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (source.includes("injector")) {
    ctx.fillStyle = color;
    ctx.fillRect(-12, -2.5, 22, 5);
    ctx.fillStyle = hostile ? "#ffd4f4" : "#ffe9ff";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(18, -3.5);
    ctx.lineTo(18, 3.5);
    ctx.closePath();
    ctx.fill();
  } else if (source.includes("staff")) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hostile ? "rgba(224, 255, 235, 0.7)" : "rgba(236, 255, 242, 0.86)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (source.includes("shotgun")) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hostile ? "rgba(255, 223, 213, 0.5)" : "rgba(190, 244, 255, 0.55)";
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  ctx.restore();
}

function traceRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawActorFrame(actor, palette, options = {}) {
  const speed = length(actor.velocityX ?? 0, actor.velocityY ?? 0);
  const gait = Math.sin(performance.now() * 0.018 + actor.x * 0.01 + actor.y * 0.01) * Math.min(4.5, speed * 0.015);
  const bodyColor = options.bodyColor ?? palette.body;
  const accentColor = options.accentColor ?? palette.accent;
  const detailColor = options.detailColor ?? palette.detail;
  const scale = options.scale ?? 1;
  const headRadius = 9.5 * scale;
  const torsoWidth = 28 * scale;
  const torsoHeight = 34 * scale;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 17 * scale, 16 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = detailColor;
  ctx.lineWidth = 6 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6 * scale, 10 * scale);
  ctx.lineTo(-8 * scale, 24 * scale + gait);
  ctx.moveTo(6 * scale, 10 * scale);
  ctx.lineTo(8 * scale, 24 * scale - gait);
  ctx.stroke();

  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(-11 * scale, -2 * scale);
  ctx.lineTo(-20 * scale, 10 * scale - gait * 0.5);
  ctx.moveTo(11 * scale, -2 * scale);
  ctx.lineTo(20 * scale, 10 * scale + gait * 0.5);
  ctx.stroke();

  ctx.fillStyle = bodyColor;
  traceRoundedRect(-torsoWidth * 0.5, -8 * scale, torsoWidth, torsoHeight, 10 * scale);
  ctx.fill();
  ctx.fillStyle = detailColor;
  traceRoundedRect(-torsoWidth * 0.34, -2 * scale, torsoWidth * 0.68, torsoHeight * 0.64, 8 * scale);
  ctx.fill();
  ctx.fillStyle = accentColor;
  traceRoundedRect(-torsoWidth * 0.14, -5 * scale, torsoWidth * 0.28, torsoHeight * 0.82, 5 * scale);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, -14 * scale, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = detailColor;
  traceRoundedRect(-11 * scale, -20 * scale, 22 * scale, 10 * scale, 5 * scale);
  ctx.fill();
  ctx.fillStyle = accentColor;
  traceRoundedRect(-9 * scale, -18 * scale, 18 * scale, 4 * scale, 2 * scale);
  ctx.fill();

  if (palette.variant === "warhound" || palette.variant === "ironmaw") {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15 * scale, -10 * scale);
    ctx.lineTo(-20 * scale, -18 * scale);
    ctx.moveTo(15 * scale, -10 * scale);
    ctx.lineTo(20 * scale, -18 * scale);
    ctx.stroke();
  } else if (palette.variant === "ghostwire") {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16 * scale, -6 * scale);
    ctx.lineTo(-26 * scale, -16 * scale);
    ctx.moveTo(-10 * scale, 2 * scale);
    ctx.lineTo(-24 * scale, 8 * scale);
    ctx.stroke();
  } else if (palette.variant === "dunepriest") {
    ctx.fillStyle = `${accentColor}66`;
    ctx.beginPath();
    ctx.moveTo(0, -28 * scale);
    ctx.lineTo(-10 * scale, -14 * scale);
    ctx.lineTo(10 * scale, -14 * scale);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPendingAxeTelegraph() {
  if (!player.pendingAxeStrike || player.attackStartupTime <= 0) {
    return;
  }

  const profile = player.pendingAxeStrike.profile;
  const facing = player.pendingAxeStrike.facing;
  const progress = 1 - player.attackStartupTime / Math.max(profile.startup, 0.001);
  const alpha = 0.12 + progress * 0.28;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(facing);
  ctx.globalAlpha = alpha;

  if (profile.hitMode === "line") {
    ctx.strokeStyle = "rgba(139, 246, 255, 0.9)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(profile.range, 0);
    ctx.stroke();

    ctx.strokeStyle = "rgba(222, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, -profile.width);
    ctx.lineTo(profile.range, -profile.width * 0.5);
    ctx.lineTo(profile.range + 20, 0);
    ctx.lineTo(profile.range, profile.width * 0.5);
    ctx.lineTo(20, profile.width);
    ctx.stroke();
  } else if (profile.hitMode === "arc") {
    ctx.strokeStyle = "rgba(126, 222, 255, 0.82)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, profile.range, -profile.arc, profile.arc);
    ctx.stroke();
  } else if (profile.hitMode === "dashPath") {
    ctx.strokeStyle = "rgba(255, 221, 138, 0.9)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(player.radius + 4, 0);
    ctx.lineTo(profile.range + 12, 0);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 244, 200, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(profile.range - 12, -10);
    ctx.lineTo(profile.range + 10, 0);
    ctx.lineTo(profile.range - 12, 10);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBot(bot) {
  if (!bot.alive) {
    return;
  }

  const visibleToPlayer = canSeeTarget(player, bot);
  const hiddenAlpha = bot.role === "training" ? 0.42 : 0.18;
  const hitOffset = getHitReactionOffset(bot);

  ctx.save();
  ctx.globalAlpha = visibleToPlayer ? 1 : hiddenAlpha;
  ctx.translate(bot.x + hitOffset.x, bot.y + hitOffset.y);
  ctx.rotate(bot.facing);
  drawActorFrame(
    bot,
    {
      body: bot.flash > 0 ? "#f7fbff" : bot.color,
      accent: bot.accent,
      detail: bot.role === "training" ? "#355868" : "#4f2f2f",
      variant: bot.role === "training" ? "ghostwire" : "warhound",
    },
    { scale: bot.role === "training" ? 0.84 : 0.9 },
  );

  ctx.fillStyle = bot.role === "training" ? "#eaf8ff" : bot.accent;
  if (bot.weapon === weapons.axe.key) {
    ctx.fillRect(10, -3, 20, 6);
    ctx.fillRect(24, -14, 8, 28);
  } else if (bot.weapon === weapons.shotgun.key) {
    ctx.fillRect(10, -4, 24, 8);
  } else {
    ctx.fillRect(10, -3, 22, 6);
  }

  ctx.restore();

  if (bot.role === "training" && visibleToPlayer) {
    ctx.strokeStyle = "rgba(116, 214, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bot.x, bot.y, bot.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (visibleToPlayer) {
    drawOverheadHealthBar(bot, bot.accent);
    drawStatusReadout(bot);
  }
}

function drawArenaDecor() {
  const activeLayout = getMapLayout();
  for (const decor of mapState.decor) {
    if (decor.type === "pit") {
      const pitGradient = ctx.createLinearGradient(decor.x, decor.y, decor.x + decor.w, decor.y + decor.h);
      pitGradient.addColorStop(0, decor.color ?? "rgba(13, 20, 27, 0.38)");
      pitGradient.addColorStop(1, "rgba(4, 7, 10, 0.82)");
      ctx.fillStyle = pitGradient;
      ctx.fillRect(decor.x, decor.y, decor.w, decor.h);
      ctx.strokeStyle = decor.stroke ?? "rgba(164, 214, 242, 0.3)";
      ctx.lineWidth = 3;
      ctx.strokeRect(decor.x + 6, decor.y + 6, decor.w - 12, decor.h - 12);
      ctx.strokeStyle = activeLayout.theme?.border ? `${activeLayout.theme.border}2a` : "rgba(96, 152, 188, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(decor.x + 15, decor.y + 15, decor.w - 30, decor.h - 30);
      continue;
    }

    const laneGradient = ctx.createLinearGradient(decor.x, decor.y, decor.x + decor.w, decor.y + decor.h);
    laneGradient.addColorStop(0, decor.color ?? (decor.type === "bridge" ? "rgba(102, 126, 146, 0.3)" : "rgba(76, 108, 132, 0.22)"));
    laneGradient.addColorStop(1, decor.type === "bridge" ? "rgba(28, 42, 58, 0.32)" : "rgba(24, 34, 44, 0.2)");
    ctx.fillStyle = laneGradient;
    ctx.fillRect(decor.x, decor.y, decor.w, decor.h);
    ctx.strokeStyle = decor.stroke ?? (decor.type === "bridge" ? "rgba(196, 235, 255, 0.28)" : "rgba(159, 213, 248, 0.18)");
    ctx.lineWidth = decor.type === "bridge" ? 4 : 2.5;
    ctx.strokeRect(decor.x, decor.y, decor.w, decor.h);

    if (decor.type === "bridge") {
      ctx.strokeStyle = activeLayout.key === "bricABroc" ? "rgba(255, 216, 186, 0.12)" : "rgba(217, 242, 255, 0.14)";
      ctx.lineWidth = 1.2;
      for (let x = decor.x + 18; x < decor.x + decor.w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, decor.y + 12);
        ctx.lineTo(x, decor.y + decor.h - 12);
        ctx.stroke();
      }
    } else if (decor.type === "lane") {
      ctx.strokeStyle = `${activeLayout.theme?.laneGlow ?? "#6deaff"}26`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(decor.x + 16, decor.y + decor.h * 0.5);
      ctx.lineTo(decor.x + decor.w - 16, decor.y + decor.h * 0.5);
      ctx.stroke();
      ctx.strokeStyle = `${activeLayout.theme?.warmGlow ?? "#ffbc7e"}18`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(decor.x + 18, decor.y + 10);
      ctx.lineTo(decor.x + decor.w - 18, decor.y + 10);
      ctx.moveTo(decor.x + 18, decor.y + decor.h - 10);
      ctx.lineTo(decor.x + decor.w - 18, decor.y + decor.h - 10);
      ctx.stroke();
    }
  }
}

function drawMapObstacles() {
  for (const obstacle of mapState.obstacles) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
    if (obstacle.style === "gallery-block") {
      ctx.fillStyle = "rgba(24, 38, 52, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(122, 231, 255, 0.38)";
      ctx.lineWidth = 3;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(132, 235, 255, 0.08)";
      ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, obstacle.h - 16);
      ctx.strokeStyle = "rgba(255, 188, 126, 0.12)";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 12, obstacle.y + obstacle.h * 0.5);
      ctx.lineTo(obstacle.x + obstacle.w - 12, obstacle.y + obstacle.h * 0.5);
      ctx.stroke();
    } else if (obstacle.style === "gallery-wall") {
      ctx.fillStyle = "rgba(17, 28, 38, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(108, 226, 255, 0.34)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, 10);
    } else if (obstacle.style === "gallery-panel") {
      ctx.fillStyle = "rgba(20, 32, 46, 0.92)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 201, 132, 0.24)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(126, 236, 255, 0.12)";
      ctx.fillRect(obstacle.x + 6, obstacle.y + 10, obstacle.w - 12, obstacle.h - 20);
    } else if (obstacle.style === "scrap-wall") {
      ctx.fillStyle = "rgba(88, 64, 48, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 196, 143, 0.26)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 148, 92, 0.22)";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 12, obstacle.y + 10);
      ctx.lineTo(obstacle.x + obstacle.w - 10, obstacle.y + obstacle.h - 10);
      ctx.moveTo(obstacle.x + obstacle.w - 18, obstacle.y + 12);
      ctx.lineTo(obstacle.x + 16, obstacle.y + obstacle.h - 14);
      ctx.stroke();
    } else if (obstacle.style === "core-block") {
      ctx.fillStyle = "rgba(39, 50, 60, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(145, 232, 255, 0.34)";
      ctx.lineWidth = 3;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(169, 230, 255, 0.08)";
      ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, 12);
      ctx.strokeStyle = "rgba(255, 161, 104, 0.18)";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 10, obstacle.y + 16);
      ctx.lineTo(obstacle.x + obstacle.w - 10, obstacle.y + 16);
      ctx.moveTo(obstacle.x + 10, obstacle.y + obstacle.h - 16);
      ctx.lineTo(obstacle.x + obstacle.w - 10, obstacle.y + obstacle.h - 16);
      ctx.stroke();
    } else if (obstacle.style === "bridge-pillar") {
      ctx.fillStyle = "rgba(62, 72, 84, 0.94)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(255, 181, 109, 0.2)";
      ctx.fillRect(obstacle.x + obstacle.w * 0.4, obstacle.y, obstacle.w * 0.2, obstacle.h);
      ctx.strokeStyle = "rgba(206, 239, 255, 0.24)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    } else if (obstacle.style === "crate") {
      ctx.fillStyle = "rgba(96, 76, 62, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 203, 160, 0.32)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 214, 178, 0.2)";
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + obstacle.h);
      ctx.moveTo(obstacle.x + obstacle.w, obstacle.y);
      ctx.lineTo(obstacle.x, obstacle.y + obstacle.h);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(72, 78, 86, 0.94)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 175, 122, 0.24)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(136, 228, 255, 0.14)";
      ctx.fillRect(obstacle.x + 6, obstacle.y + 6, obstacle.w - 12, obstacle.h - 12);
    }
    ctx.restore();
  }
}

function drawBushes() {
  for (const bush of mapState.bushes) {
    const gradient = ctx.createLinearGradient(bush.x, bush.y, bush.x + bush.w, bush.y + bush.h);
    gradient.addColorStop(0, "rgba(64, 138, 98, 0.05)");
    gradient.addColorStop(1, "rgba(118, 226, 160, 0.12)");
    ctx.fillStyle = gradient;
    ctx.fillRect(bush.x, bush.y, bush.w, bush.h);
    ctx.strokeStyle = "rgba(194, 255, 224, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bush.x, bush.y, bush.w, bush.h);
    for (let x = bush.x + 8; x < bush.x + bush.w; x += 18) {
      ctx.strokeStyle = "rgba(203, 255, 229, 0.07)";
      ctx.beginPath();
      ctx.moveTo(x, bush.y + bush.h);
      ctx.lineTo(x + 6, bush.y + 8);
      ctx.stroke();
    }
  }
}

function drawArenaFloorLighting() {
  const activeLayout = getMapLayout();
  const theme = activeLayout.theme ?? mapChoices.electroGallery.theme;
  const centerGlow = ctx.createRadialGradient(
    arena.width * 0.5,
    arena.height * 0.5,
    90,
    arena.width * 0.5,
    arena.height * 0.5,
    760,
  );
  centerGlow.addColorStop(0, `${theme.floorGlow}2c`);
  centerGlow.addColorStop(0.55, `${theme.floorGlow}10`);
  centerGlow.addColorStop(1, "rgba(8, 14, 20, 0)");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, arena.width, arena.height);

  const verticalLane = ctx.createLinearGradient(arena.width * 0.5 - 180, 0, arena.width * 0.5 + 180, 0);
  verticalLane.addColorStop(0, "rgba(0, 0, 0, 0)");
  verticalLane.addColorStop(0.5, `${theme.laneGlow}12`);
  verticalLane.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = verticalLane;
  ctx.fillRect(arena.width * 0.5 - 180, 0, 360, arena.height);

  const horizontalLane = ctx.createLinearGradient(0, arena.height * 0.5 - 120, 0, arena.height * 0.5 + 120);
  horizontalLane.addColorStop(0, "rgba(0, 0, 0, 0)");
  horizontalLane.addColorStop(0.5, `${theme.warmGlow}0e`);
  horizontalLane.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = horizontalLane;
  ctx.fillRect(0, arena.height * 0.5 - 120, arena.width, 240);
}

function drawPortals() {
  for (const portal of mapState.portals) {
    const pulse = 1 + Math.sin(performance.now() * 0.008 + portal.x * 0.001) * 0.08;
    const cooldownRatio = portal.cooldowns.size
      ? Math.max(...Array.from(portal.cooldowns.values())) / config.portalReuseCooldown
      : 0;
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = portal.color;
    ctx.strokeStyle = portal.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, portal.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(235, 248, 255, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, portal.radius * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    if (cooldownRatio > 0) {
      ctx.fillStyle = `rgba(4, 8, 12, ${0.22 + cooldownRatio * 0.35})`;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, portal.radius * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 244, 225, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        portal.x,
        portal.y,
        portal.radius * 0.72,
        -Math.PI * 0.5,
        -Math.PI * 0.5 + Math.PI * 2 * (1 - cooldownRatio),
      );
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPylons() {
  for (const pylon of mapState.pylons) {
    if (pylon.alive) {
      const damageRatio = 1 - pylon.hp / pylon.maxHp;
      const wobble = (pylon.wobbleTime ?? 0) > 0
        ? Math.sin(performance.now() * 0.03 + pylon.x * 0.01) * (4 + damageRatio * 5) * Math.min(1, pylon.wobbleTime * 3)
        : 0;
      ctx.save();
      ctx.translate(wobble, 0);
      ctx.strokeStyle = damageRatio > 0.55 ? "rgba(255, 210, 164, 0.32)" : "rgba(255, 224, 184, 0.16)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(pylon.x, pylon.y);
      ctx.lineTo(pylon.x, pylon.y - pylon.height);
      ctx.stroke();
      ctx.shadowBlur = 18 + damageRatio * 10;
      ctx.shadowColor = pylon.color;
      ctx.fillStyle = pylon.color;
      ctx.beginPath();
      ctx.arc(pylon.x, pylon.y - pylon.height, 10 + damageRatio * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = damageRatio > 0.5 ? "rgba(76, 48, 34, 0.96)" : "rgba(44, 38, 34, 0.96)";
      ctx.beginPath();
      ctx.arc(pylon.x, pylon.y, pylon.radius + damageRatio * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = damageRatio > 0.55 ? "rgba(255, 145, 90, 0.52)" : "rgba(255, 180, 110, 0.22)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 232, 205, 0.26)";
      ctx.beginPath();
      ctx.moveTo(pylon.x - 8, pylon.y - 6);
      ctx.lineTo(pylon.x + 10, pylon.y + 4);
      if (damageRatio > 0.34) {
        ctx.moveTo(pylon.x - 2, pylon.y - 14);
        ctx.lineTo(pylon.x + 12, pylon.y - 1);
      }
      if (damageRatio > 0.66) {
        ctx.moveTo(pylon.x - 12, pylon.y + 2);
        ctx.lineTo(pylon.x + 6, pylon.y + 14);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(12, 18, 24, 0.88)";
      ctx.fillRect(pylon.x - 22, pylon.y + 26, 44, 6);
      ctx.fillStyle = pylon.color;
      ctx.fillRect(pylon.x - 22, pylon.y + 26, 44 * (pylon.hp / pylon.maxHp), 6);
      if ((pylon.damageFlash ?? 0) > 0) {
        ctx.fillStyle = `rgba(255, 244, 226, ${pylon.damageFlash * 0.55})`;
        ctx.beginPath();
        ctx.arc(pylon.x, pylon.y - pylon.height, 22 + damageRatio * 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      continue;
    }

    if (pylon.fallenRect) {
      ctx.save();
      ctx.translate(pylon.x, pylon.y);
      ctx.rotate(pylon.fallAngle);
      ctx.fillStyle = "rgba(72, 52, 38, 0.96)";
      ctx.fillRect(0, -11, pylon.fallLength, 22);
      ctx.strokeStyle = `${pylon.color}aa`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(pylon.fallLength, -8);
      ctx.stroke();
      for (let offset = 18; offset < pylon.fallLength; offset += 24) {
        ctx.fillStyle = offset % 48 === 0 ? "rgba(112, 84, 56, 0.92)" : "rgba(82, 60, 44, 0.96)";
        ctx.fillRect(offset, -16, 18, 32);
      }
      ctx.restore();
    }
  }
}

function drawWorld() {
  const viewportWidth = canvas.clientWidth || window.innerWidth;
  const viewportHeight = canvas.clientHeight || window.innerHeight;
  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  const scale = Math.min(viewportWidth / arena.width, viewportHeight / arena.height);
  const offsetX = (viewportWidth - arena.width * scale) * 0.5;
  const offsetY = (viewportHeight - arena.height * scale) * 0.5;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);

  const activeLayout = getMapLayout();
  const theme = activeLayout.theme ?? mapChoices.electroGallery.theme;
  const gradient = ctx.createLinearGradient(0, 0, arena.width, arena.height);
  gradient.addColorStop(0, theme.backgroundStart);
  gradient.addColorStop(1, theme.backgroundEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);
  drawArenaFloorLighting();

  drawArenaDecor();

  ctx.strokeStyle = "rgba(124, 183, 223, 0.045)";
  ctx.lineWidth = 1;
  for (let x = 80; x < arena.width; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  for (let y = 80; y < arena.height; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.setLineDash([18, 16]);
  ctx.strokeStyle = "rgba(155, 220, 255, 0.1)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(arena.width * 0.5, 24);
  ctx.lineTo(arena.width * 0.5, arena.height - 24);
  ctx.moveTo(24, arena.height * 0.5);
  ctx.lineTo(arena.width - 24, arena.height * 0.5);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(119, 216, 255, 0.18)";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, arena.width - 12, arena.height - 12);

  drawBushes();
  drawPortals();
  drawMapObstacles();
  drawPylons();

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

  for (const beam of beamEffects) {
    const t = beam.life / beam.maxLife;
    ctx.save();
    ctx.strokeStyle = `${beam.color}${Math.floor(t * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.lineWidth = beam.width * (0.75 + t * 0.45);
    ctx.shadowBlur = 18 * t;
    ctx.shadowColor = beam.color;
    ctx.beginPath();
    ctx.moveTo(beam.x0, beam.y0);
    ctx.lineTo(beam.x1, beam.y1);
    ctx.stroke();
    ctx.restore();
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
    const radius = slash.comboStep === 1 ? 226 : slash.comboStep === 2 ? 148 : 178;
    const arcWidth = slash.comboStep === 1 ? 0.06 : slash.comboStep === 2 ? 1.18 : 0.18;
    ctx.save();
    ctx.translate(slash.x, slash.y);
    ctx.rotate(
      slash.comboStep === 1
        ? slash.facing
        : slash.comboStep === 2
          ? slash.facing + 0.28
          : slash.facing,
    );
    ctx.globalAlpha = t * 0.82;
    ctx.strokeStyle =
      slash.comboStep === 1 ? "#98fbff" : slash.comboStep === 2 ? "#57d9ff" : "#ffd985";
    ctx.lineWidth = slash.comboStep === 3 ? 22 - t * 5 : slash.comboStep === 2 ? 18 - t * 4 : 12 - t * 2;
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
      ctx.lineTo(radius * 0.92, -5);
      ctx.lineTo(radius * 1.1, -2);
      ctx.lineTo(radius * 1.22, 6);
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
      ctx.moveTo(-6, -8);
      ctx.lineTo(radius * 1.04, 0);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 214, 120, 0.42)";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(radius * 0.86, 0);
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

  for (const zone of supportZones) {
    const pulse = 1 + Math.sin(performance.now() * 0.01 + zone.radius * 0.01) * 0.04;
    ctx.save();
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = zone.type === "lockdown" ? 5 : 3;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = zone.type === "lockdown" ? "rgba(255, 126, 88, 0.08)" : "rgba(120, 222, 255, 0.06)";
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const field of magneticFields) {
    const t = field.life / field.duration;
    const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.04;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.shadowBlur = 18;
    ctx.shadowColor = field.glow;
    ctx.fillStyle = "rgba(137, 200, 255, 0.12)";
    ctx.beginPath();
    ctx.arc(field.x, field.y, field.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(137, 200, 255, 0.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(field.x, field.y, field.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(137, 200, 255, 0.3)";
    ctx.lineWidth = 1.5;
    for (let ring = 0.35; ring < 1; ring += 0.22) {
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius * ring * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let arc = 0; arc < 4; arc += 1) {
      const start = performance.now() * 0.002 + arc * 1.3;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(180, 228, 255, 0.4)";
      ctx.lineWidth = 3;
      ctx.arc(field.x, field.y, field.radius * (0.7 + arc * 0.07), start, start + 0.75);
      ctx.stroke();
    }
    ctx.globalAlpha = t * 0.9;
    ctx.restore();
  }

  for (const bullet of bullets) {
    drawProjectileSprite(bullet, false);
  }

  for (const bullet of enemyBullets) {
    drawProjectileSprite(bullet, true);
  }

  for (const bot of getAllBots()) {
    drawBot(bot);
  }

  drawPendingAxeTelegraph();

  const avatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;
  const weaponSkin = content.weaponSkins[loadout.weaponSkin] ?? content.weaponSkins.stock;
  const playerHitOffset = getHitReactionOffset(player);
  ctx.save();
  const recoilOffset = player.recoil * 8;
  ctx.translate(
    player.x + playerHitOffset.x - Math.cos(player.facing) * recoilOffset,
    player.y + playerHitOffset.y - Math.sin(player.facing) * recoilOffset,
  );
  ctx.rotate(player.facing);
  if (player.ghostTime > 0) {
    ctx.globalAlpha = 0.5;
  }
  drawActorFrame(
    player,
    {
      body: player.flash > 0 || abilityState.dash.invulnerabilityTime > 0 ? "#f6fdff" : avatar.bodyColor,
      accent: avatar.accentColor,
      detail: avatar.detailColor,
      variant: avatar.key,
    },
    { scale: 1 },
  );
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
  } else if (player.weapon === weapons.sniper.key) {
    ctx.fillStyle = avatar.detailColor;
    ctx.fillRect(-4, -4, 36, 8);
    ctx.fillStyle = weaponSkin.tint;
    ctx.fillRect(18, -5, 34, 10);
    ctx.fillStyle = weaponSkin.glow;
    ctx.fillRect(48, -2, 12, 4);
    ctx.fillRect(14, -9, 12, 4);
    ctx.strokeStyle = "rgba(255, 245, 210, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(60, 0);
    ctx.stroke();
  } else if (player.weapon === weapons.staff.key) {
    ctx.fillStyle = avatar.detailColor;
    ctx.fillRect(-3, -4, 44, 8);
    ctx.strokeStyle = weaponSkin.tint;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(54, 0);
    ctx.stroke();
    ctx.fillStyle = weaponSkin.glow;
    ctx.beginPath();
    ctx.arc(54, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(214, 255, 232, 0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(54, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
  } else if (player.weapon === weapons.injector.key) {
    ctx.fillStyle = avatar.detailColor;
    ctx.fillRect(-4, -4, 30, 8);
    ctx.fillStyle = weaponSkin.tint;
    ctx.fillRect(18, -7, 20, 14);
    ctx.fillStyle = weaponSkin.glow;
    ctx.fillRect(34, -3, 18, 6);
    ctx.fillRect(12, -10, 8, 20);
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

  drawOverheadHealthBar(player, "#6fe5ff");
  drawStatusReadout(player);

  for (const text of combatTexts) {
    const t = text.life / text.maxLife;
    const progress = 1 - t;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.3);
    ctx.font = `${text.weight} ${text.size}px Trebuchet MS`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(4, 10, 16, 0.86)";
    ctx.fillStyle = text.color;
    const drawX = text.x + text.driftX * progress;
    const drawY = text.y - text.rise * progress;
    ctx.strokeText(text.text, drawX, drawY);
    ctx.fillText(text.text, drawX, drawY);
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(119, 216, 255, 0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(input.mouseX, input.mouseY);
  ctx.stroke();

  ctx.restore();
}

function updateHud() {
  const weaponReady = player.fireCooldown <= 0 && player.reloadTime <= 0;
  const activeWeapon = weapons[player.weapon] ?? weapons.pulse;
  const activeMode = sandboxModes[sandbox.mode];
  const activeLayout = getMapLayout(sandbox.mode);
  const primaryBot = getPrimaryBot();
  const buildStats = getBuildStats();
  const slotAbilities = [getAbilityBySlot(0), getAbilityBySlot(1), getAbilityBySlot(2)];
  const selectedUltimate = content.ultimates[loadout.ultimate] ?? content.ultimates.phantomSplit;
  mapName.textContent = activeLayout.name ?? activeMode.name;
  mapStatus.textContent = activeLayout.subtitle ?? activeMode.subtitle;
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
    player.weapon === weapons.pulse.key && player.reloadTime > 0
      ? `Reload ${player.reloadTime.toFixed(1)}s`
      : player.weapon === weapons.pulse.key
        ? `Ammo ${player.ammo}/${getPulseMagazineSize()}`
      : player.weapon === weapons.axe.key && player.comboTimer > 0
      ? `Combo ${player.comboStep}/3`
      : player.weapon === weapons.sniper.key
        ? weaponReady
          ? "Rail primed"
          : `Rechamber ${player.fireCooldown.toFixed(2)}s`
      : player.weapon === weapons.staff.key
        ? weaponReady
          ? "Sustain beam ready"
          : `Cycling ${player.fireCooldown.toFixed(2)}s`
      : player.weapon === weapons.injector.key
        ? weaponReady
          ? "Marks armed"
          : `Injecting ${player.fireCooldown.toFixed(2)}s`
      : weaponReady
        ? "Ready"
        : `Cooling ${player.fireCooldown.toFixed(2)}s`;
  const pulseMeterRatio = player.reloadTime > 0
    ? 1 - player.reloadTime / config.pulseReloadTime
    : player.ammo / getPulseMagazineSize();
  weaponMeter.style.width = `${
    Math.max(
      0,
      Math.min(
        100,
        (
          player.weapon === weapons.pulse.key
            ? pulseMeterRatio
            : 1 - player.fireCooldown / activeWeapon.cooldown
        ) * 100,
      ),
    )
  }%`;
  weaponMeter.style.background =
    player.weapon === weapons.axe.key
      ? "linear-gradient(90deg, rgba(158, 247, 199, 0.45), rgba(158, 247, 199, 0.98))"
      : player.weapon === weapons.shotgun.key
        ? "linear-gradient(90deg, rgba(255, 157, 98, 0.45), rgba(255, 157, 98, 0.98))"
      : player.weapon === weapons.sniper.key
        ? "linear-gradient(90deg, rgba(255, 211, 117, 0.45), rgba(255, 211, 117, 0.98))"
      : player.weapon === weapons.staff.key
        ? "linear-gradient(90deg, rgba(149, 255, 180, 0.45), rgba(149, 255, 180, 0.98))"
      : player.weapon === weapons.injector.key
        ? "linear-gradient(90deg, rgba(216, 140, 255, 0.45), rgba(216, 140, 255, 0.98))"
      : "linear-gradient(90deg, rgba(119, 216, 255, 0.4), rgba(119, 216, 255, 0.95))";
  weaponMeter.style.boxShadow =
    player.weapon === weapons.axe.key
      ? "0 0 14px rgba(158, 247, 199, 0.24)"
      : player.weapon === weapons.shotgun.key
        ? "0 0 14px rgba(255, 157, 98, 0.24)"
      : player.weapon === weapons.sniper.key
        ? "0 0 14px rgba(255, 211, 117, 0.24)"
      : player.weapon === weapons.staff.key
        ? "0 0 14px rgba(149, 255, 180, 0.24)"
      : player.weapon === weapons.injector.key
        ? "0 0 14px rgba(216, 140, 255, 0.24)"
      : "0 0 14px rgba(119, 216, 255, 0.25)";
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

  setHudSlotPresentation(slotDashIcon, slotDashName, { icon: "ability-dash", name: "Dash" });
  setHudSlotPresentation(slotAbility1Icon, slotAbility1Name, slotAbilities[0] ?? content.abilities.shockJavelin);
  setHudSlotPresentation(slotAbility2Icon, slotAbility2Name, slotAbilities[1] ?? content.abilities.magneticField);
  setHudSlotPresentation(slotAbility3Icon, slotAbility3Name, slotAbilities[2] ?? content.abilities.energyShield);
  setHudSlotPresentation(ultimateSlotIcon, ultimateSlotName, selectedUltimate);

  updateAbilitySlot(slotDash, slotDashOverlay, slotDashTimer, getAbilityHudState("dash"));
  updateAbilitySlot(slotAbility1, slotAbility1Overlay, slotAbility1Timer, getAbilityHudState(slotAbilities[0]?.key));
  updateAbilitySlot(slotAbility2, slotAbility2Overlay, slotAbility2Timer, getAbilityHudState(slotAbilities[1]?.key));
  updateAbilitySlot(slotAbility3, slotAbility3Overlay, slotAbility3Timer, getAbilityHudState(slotAbilities[2]?.key));
  updateAbilitySlot(ultimateSlot, ultimateSlotOverlay, ultimateSlotTimer, {
    ready: abilityState.ultimate.cooldown <= 0,
    charging: false,
    cooldownRatio: abilityState.ultimate.cooldown <= 0 ? 0 : abilityState.ultimate.cooldown / config.ultimateCooldown,
    timer: abilityState.ultimate.cooldown <= 0 ? "" : abilityState.ultimate.cooldown.toFixed(1),
  });
}

function updateAbilitySlot(slot, overlay, timerLabel, state) {
  slot.classList.toggle("ready", state.ready);
  slot.classList.toggle("charging", state.charging);
  const clampedRatio = Math.max(0, Math.min(1, state.cooldownRatio ?? 1));
  const degrees = Math.round(clampedRatio * 360);
  const shadowColor = state.charging ? "rgba(55, 33, 10, 0.82)" : "rgba(6, 10, 14, 0.88)";
  const clearColor = state.charging ? "rgba(55, 33, 10, 0.16)" : "rgba(6, 10, 14, 0.12)";
  overlay.style.background = `conic-gradient(from -90deg, ${shadowColor} 0deg ${degrees}deg, ${clearColor} ${degrees}deg 360deg)`;
  overlay.style.opacity = state.ready && !state.charging ? "0" : "1";
  timerLabel.textContent = state.timer;
}

function getAbilityHudState(abilityKey) {
  switch (abilityKey) {
    case "dash": {
      const ready = abilityState.dash.charges > 0;
      return {
        ready,
        charging: abilityState.dash.inputHeld && abilityState.dash.activeTime <= 0,
        cooldownRatio: ready ? 0 : Math.max(0, Math.min(1, abilityState.dash.rechargeTimer / getActiveDashCooldown())),
        timer: abilityState.dash.activeTime > 0 ? "GO" : ready ? "" : abilityState.dash.rechargeTimer.toFixed(1),
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
    case "empBurst":
      return {
        ready: abilityState.emp.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.emp.cooldown <= 0 ? 0 : abilityState.emp.cooldown / config.boosterCooldown,
        timer: abilityState.emp.cooldown <= 0 ? "" : abilityState.emp.cooldown.toFixed(1),
      };
    case "backstepBurst":
      return {
        ready: abilityState.backstep.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.backstep.cooldown <= 0 ? 0 : abilityState.backstep.cooldown / 3.6,
        timer: abilityState.backstep.cooldown <= 0 ? "" : abilityState.backstep.cooldown.toFixed(1),
      };
    case "chainLightning":
      return {
        ready: abilityState.chainLightning.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.chainLightning.cooldown <= 0 ? 0 : abilityState.chainLightning.cooldown / 5.4,
        timer: abilityState.chainLightning.cooldown <= 0 ? "" : abilityState.chainLightning.cooldown.toFixed(1),
      };
    case "blinkStep":
      return {
        ready: abilityState.blink.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.blink.cooldown <= 0 ? 0 : abilityState.blink.cooldown / 3.4,
        timer: abilityState.blink.cooldown <= 0 ? "" : abilityState.blink.cooldown.toFixed(1),
      };
    case "phaseDash":
      return {
        ready: abilityState.phaseDash.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.phaseDash.cooldown <= 0 ? 0 : abilityState.phaseDash.cooldown / 4.6,
        timer: abilityState.phaseDash.time > 0 ? "PHASE" : abilityState.phaseDash.cooldown <= 0 ? "" : abilityState.phaseDash.cooldown.toFixed(1),
      };
    case "pulseBurst":
      return {
        ready: abilityState.pulseBurst.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.pulseBurst.cooldown <= 0 ? 0 : abilityState.pulseBurst.cooldown / 3.2,
        timer: abilityState.pulseBurst.cooldown <= 0 ? "" : abilityState.pulseBurst.cooldown.toFixed(1),
      };
    case "railShot":
      return {
        ready: abilityState.railShot.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.railShot.cooldown <= 0 ? 0 : abilityState.railShot.cooldown / 5.1,
        timer: abilityState.railShot.cooldown <= 0 ? "" : abilityState.railShot.cooldown.toFixed(1),
      };
    case "gravityWell":
      return {
        ready: abilityState.gravityWell.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.gravityWell.cooldown <= 0 ? 0 : abilityState.gravityWell.cooldown / 5.8,
        timer: abilityState.gravityWell.cooldown <= 0 ? "" : abilityState.gravityWell.cooldown.toFixed(1),
      };
    case "phaseShift":
      return {
        ready: abilityState.phaseShift.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.phaseShift.cooldown <= 0 ? 0 : abilityState.phaseShift.cooldown / 5.6,
        timer: abilityState.phaseShift.time > 0 ? "SHIFT" : abilityState.phaseShift.cooldown <= 0 ? "" : abilityState.phaseShift.cooldown.toFixed(1),
      };
    case "hologramDecoy":
      return {
        ready: abilityState.hologramDecoy.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.hologramDecoy.cooldown <= 0 ? 0 : abilityState.hologramDecoy.cooldown / 6.2,
        timer: abilityState.hologramDecoy.cooldown <= 0 ? "" : abilityState.hologramDecoy.cooldown.toFixed(1),
      };
    case "speedSurge":
      return {
        ready: abilityState.speedSurge.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.speedSurge.cooldown <= 0 ? 0 : abilityState.speedSurge.cooldown / 4.2,
        timer: abilityState.speedSurge.cooldown <= 0 ? "" : abilityState.speedSurge.cooldown.toFixed(1),
      };
    default:
      return { ready: false, charging: false, cooldownRatio: 1, timer: "NA" };
  }
}

function setHudSlotPresentation(slotIcon, slotName, ability) {
  if (!slotIcon || !slotName || !ability) {
    return;
  }
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

  updatePortalCooldowns(dt);
  updatePlayer(dt);
  updateEnemy(dt);
  updateTrainingBots(dt);
  resolveCharacterBodyBlocking();
  updateBullets(bullets, dt);
  updateBullets(enemyBullets, dt);
  updateShockJavelins(dt);
  updateEnemyShockJavelins(dt);
  updateSupportZones(dt);
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
    startDashInput();
  }

  if (event.code === "Backspace") {
    event.preventDefault();
    relaunchCurrentSession();
    return;
  }

  if (event.code === "KeyQ" && !event.repeat) {
    startAbilityInput(0);
  }

  if (event.code === "KeyE" && !event.repeat) {
    startAbilityInput(1);
  }

  if (event.code === "KeyF" && !event.repeat) {
    startAbilityInput(2);
  }

  if (event.code === "KeyR" && !event.repeat) {
    castUltimate();
  }

  if (sandbox.mode !== sandboxModes.training.key) {
    return;
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

  if (event.code === "Digit4") {
    setWeapon(weapons.sniper.key);
  }

  if (event.code === "Digit5") {
    setWeapon(weapons.staff.key);
  }

  if (event.code === "Digit6") {
    setWeapon(weapons.injector.key);
  }
});

window.addEventListener("keyup", (event) => {
  if (uiState.prematchOpen) {
    return;
  }

  input.keys.delete(event.code);

  if (event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
    releaseDashInput();
  } else if (event.code === "KeyQ") {
    releaseAbilityInput(0);
  } else if (event.code === "KeyE") {
    releaseAbilityInput(1);
  } else if (event.code === "KeyF") {
    releaseAbilityInput(2);
  }
});

helpToggle.addEventListener("click", () => {
  toggleHelpPanel();
});

[menuButton, hudMenuButton].forEach((button) => {
  button?.addEventListener("click", () => openPrematch("mode"));
});

[rematchButton, hudRematchButton].forEach((button) => {
  button?.addEventListener("click", () => relaunchCurrentSession());
});

bindPrematchButton(modeDuel, "mode-duel");
bindPrematchButton(modeTraining, "mode-training");
bindPrematchButton(stepMode, "step-mode");
bindPrematchButton(stepMap, "step-map");
bindPrematchButton(stepBuild, "step-build");
bindPrematchButton(continueMap, "continue-map");
bindPrematchButton(continueBuild, "continue-build");
bindPrematchButton(backMode, "back-mode");
bindPrematchButton(backMap, "back-map");
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

botModeRandom?.addEventListener("click", () => {
  setBotBuildMode("random");
  statusLine.textContent = "Hunter bot set to randomized loadouts.";
});

botModeCustom?.addEventListener("click", () => {
  setBotBuildMode("custom");
  statusLine.textContent = "Hunter bot locked to a custom build.";
});

trainingFireOff?.addEventListener("click", () => {
  trainingToolState.botsFire = false;
  for (const bot of trainingBots) {
    bot.shootCooldown = 999;
  }
  renderPrematch();
  statusLine.textContent = "Training bots set to silent.";
});

trainingFireOn?.addEventListener("click", () => {
  trainingToolState.botsFire = true;
  trainingBots.forEach((bot, index) => {
    bot.shootCooldown = 0.35 + index * 0.08;
  });
  renderPrematch();
  statusLine.textContent = "Training bots now fire steady pulse shots.";
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
